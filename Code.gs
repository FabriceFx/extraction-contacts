/**
 * ============================================================================
 *  EXTRACTION CONTACT - Code.gs
 * ============================================================================
 *  Auteur      : Fabrice Faucheux (https://faucheux.bzh)
 *  Projet      : FF Labs - Extraction contact
 *  Rôle        : Point d'entrée principal, menus personnalisés et orchestrations des déclencheurs.
 *  Version     : 1.0.0
 * ============================================================================
 */


const SHEET_HEADERS = ["Nom", "Prénom", "Email", "Téléphone", "Poste", "Entreprise", "Date de dernière extraction", "Lien Mail", "Confiance IA"];


/**
 * Initialise la feuille Google Sheets avec les en-têtes requis, le formatage en gras, 
 * le fond gris et fige la première ligne. Ne fait rien si la feuille est déjà configurée.
 * @author Fabrice Faucheux
 * @returns {GoogleAppsScript.Spreadsheet.Sheet} L'objet Sheet actif.
 */

function initialiserSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getActiveSheet();

  const range = sheet.getRange("A1:I1");
  const values = range.getValues()[0];
  // Si la feuille n'a pas exactement notre en-tête ou si la colonne H n'est pas "Lien Mail", on réécrit
  if (values[0] !== "Nom" || values[7] !== "Lien Mail") {
    sheet.getRange(1, 1, 1, SHEET_HEADERS.length).setValues([SHEET_HEADERS]);
    sheet.getRange(1, 1, 1, SHEET_HEADERS.length).setFontWeight("bold").setBackground("#f3f3f3");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * Fonction principale (Core) : Parcours les récents fils de discussion Gmail, ignore les bots, 
 * extrait les signatures (via IA ou heuristique) et met à jour la feuille Google Sheets.
 * Gère l'insertion en lot (Batch Insert) et le contournement via cache pour optimiser les quotas.
 * @author Fabrice Faucheux
 * @param {boolean} [forceHeuristique=false] - Si true, désactive l'appel à l'API Gemini.
 * @returns {string} Le rapport d'exécution (ajouts, mises à jour, ignorés).
 */

function extraireContactsEmails(forceHeuristique = false) {
  const lock = LockService.getUserLock();
  // On attend jusqu'à 10 secondes pour obtenir le verrou
  if (!lock.tryLock(10000)) {
    throw new Error("Une synchronisation est déjà en cours (par vous ou en tâche de fond). Veuillez patienter quelques instants.");
  }

  try {
    const sheet = initialiserSheet();
    const data = sheet.getDataRange().getValues();
    // Mapping of existing row index by email (lowercase)
    const emailToRowIndex = {};
    for (let i = 1; i < data.length; i++) {
      const emailExistant = data[i][2]; // Email en colonne C (index 2)
      if (emailExistant) {
        emailToRowIndex[emailExistant.toLowerCase()] = i + 1;
      }
    }

    // On récupère la configuration (dont le nombre de jours)
    const configData = getListesConfig();
    const joursScan = configData.joursScan;
    const myEmail = Session.getActiveUser().getEmail().toLowerCase();

    // On utilise les catégories natives de Gmail pour ignorer massivement les bots et newsletters
    const query = `newer_than:${joursScan}d -from:me -category:promotions -category:social -category:updates -label:promotions -label:social -label:updates`;
    const threads = GmailApp.search(query, 0, 500);

    let contactsAjoutes = 0;
    let contactsMisAJour = 0;
    let cachedBypass = 0;
    const startTime = Date.now();
    let timeoutAtteint = false;

    // NOUVEAU : Tableau pour l'insertion en lot (Batch Insert)
    const nouveauxContactsAInserer = [];

    for (const thread of threads) {
      // Prévention du timeout (limite Apps Script = 6 minutes). On s'arrête proprement à 4min30 (270 000 ms)
      if (Date.now() - startTime > 270000) {
        timeoutAtteint = true;
        break;
      }

      const messages = thread.getMessages();
      const dernierMessage = messages[messages.length - 1];
      const rawFrom = dernierMessage.getFrom();
      const emailExpediteurMatch = rawFrom.match(/<(.+)>/);
      const emailExpediteur = (emailExpediteurMatch ? emailExpediteurMatch[1] : rawFrom).toLowerCase();

      // Ignorer sa propre adresse (si on participe à un thread)
      if (emailExpediteur === myEmail) continue;

      // Filtrer les envois automatiques plus agressivement (Configuration dynamique)
      const motsIgnores = getListesConfig().motsIgnores;
      if (motsIgnores.some(mot => emailExpediteur.includes(mot))) {
        continue;
      }

      const rowIndex = emailToRowIndex[emailExpediteur];
      let existingData = null;
      let estContactComplet = false;

      // CACHE OPTIMIZATION : Si l'utilisateur est déjà dans le sheet, on regarde s'il est complet
      if (rowIndex) {
        // On s'assure qu'on ne cherche pas une donnée qui est dans notre lot virtuel pas encore inséré
        if (rowIndex <= sheet.getLastRow()) {
          existingData = data[rowIndex - 1]; // Utilisation du tableau en mémoire (0-indexé)
          // Index 0:Nom, 1:Prénom, 3:Tél, 4:Poste, 5:Entreprise
          const champsIncomplets = [0, 1, 3, 4, 5].some(idx => !existingData[idx] || existingData[idx] === "Inconnu" || existingData[idx] === "");
          if (!champsIncomplets) {
            estContactComplet = true;
          }
        } else {
          // S'il a déjà été traité dans le batch de cette session, on l'ignore
          continue;
        }
      }

      if (estContactComplet) {
        // BYPASS IA & Heuristique : Le contact est déjà parfait, on met juste à jour la date
        existingData[6] = new Date();
        sheet.getRange(rowIndex, 1, 1, SHEET_HEADERS.length).setValues([existingData]);
        cachedBypass++;
        continue; // On passe au message suivant
      }

      // Si nouveau ou incomplet -> On analyse (Appel API ou heuristique)
      let corps = dernierMessage.getPlainBody();
      const delimiteurs = [
        /\r?\nLe .* a écrit\s?:/i,
        /\r?\nOn .* wrote\s?:/i,
        /\r?\n_{10,}/,
        /\r?\nDe\s?: /i,
        /\r?\nFrom\s?: /i
      ];
      for (const delim of delimiteurs) {
        const parties = corps.split(delim);
        if (parties.length > 1) {
          corps = parties[0]; // On ne garde que le message actuel et sa signature
        }
      }

      const infos = analyserSignature(corps, emailExpediteur, rawFrom, forceHeuristique);

      // Il faut au moins un nom ou prénom pour considérer que c'est une personne
      if (infos.nom === "Inconnu" && infos.prenom === "Inconnu") continue;

      const lienThread = thread.getPermalink();

      function sanitize(val, isPhone = false) {
        if (!val || val === "Inconnu") return val;
        
        // Si c'est un numéro de téléphone qui commence par 0, on le force au format texte
        if (isPhone && typeof val === 'string' && val.startsWith('0')) {
            return "'" + val;
        }
        
        // Si la chaîne commence par =, +, - ou @, on ajoute une apostrophe
        if (typeof val === 'string' && /^[=+\-@]/.test(val)) {
          return "'" + val;
        }
        return val;
      }

      const rowToInsertOrUpdate = [
        sanitize(infos.nom),
        sanitize(infos.prenom),
        sanitize(infos.email),
        sanitize(infos.telephone, true),
        sanitize(infos.poste),
        sanitize(infos.entreprise),
        new Date(),
        lienThread,
        sanitize(infos.confiance_ia)
      ];

      if (rowIndex && existingData) {
        // Mise à jour partielle (Upsert)
        let needsUpdate = false;
        for (let j = 0; j <= 5; j++) {
          if (!existingData[j] || existingData[j] === "Inconnu" || existingData[j] === "") {
            if (rowToInsertOrUpdate[j] && rowToInsertOrUpdate[j] !== "Inconnu") {
              existingData[j] = rowToInsertOrUpdate[j];
              needsUpdate = true;
            }
          }
        }

        if (needsUpdate || !existingData[7]) {
          existingData[6] = new Date();
          if (!existingData[7] && rowToInsertOrUpdate[7]) existingData[7] = rowToInsertOrUpdate[7];
          if (!existingData[8] && rowToInsertOrUpdate[8]) existingData[8] = rowToInsertOrUpdate[8];

          sheet.getRange(rowIndex, 1, 1, SHEET_HEADERS.length).setValues([existingData]);
          contactsMisAJour++;
        }
      } else {
        // Nouveau contact ! Ajout au lot
        nouveauxContactsAInserer.push(rowToInsertOrUpdate);
        // On met à jour l'index virtuellement pour la session en cours
        emailToRowIndex[infos.email] = sheet.getLastRow() + nouveauxContactsAInserer.length;
        contactsAjoutes++;
      }
    }

    // NOUVEAU : Insertion en lot (Batch Insert) des nouveaux contacts à la toute fin
    if (nouveauxContactsAInserer.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, nouveauxContactsAInserer.length, SHEET_HEADERS.length).setValues(nouveauxContactsAInserer);
    }

    let messageResultat = `Opération terminée :\n✅ ${contactsAjoutes} nouveaux contacts ajoutés\n🔄 ${contactsMisAJour} mis à jour\n⚡ ${cachedBypass} ignorés grâce au cache.`;
    if (timeoutAtteint) {
      messageResultat += "\n\n⚠️ Pause de sécurité : Le script s'est arrêté proprement pour éviter l'erreur de délai de Google (6 min max). Les données extraites ont été sauvegardées. Relancez simplement le script pour qu'il continue où il s'est arrêté !";
    }
    return messageResultat;

  } catch (error) {
    Logger.log("Erreur lors de l'extraction: " + error.message);
    throw error;
  } finally {
    lock.releaseLock();
  }
}

/**
 * Parcourt la feuille de bas en haut et supprime les lignes contenant des adresses e-mail en double.
 * Conserve uniquement l'entrée la plus récente (située le plus bas dans le document).
 * @author Fabrice Faucheux
 * @returns {string} Le message de résultat affichant le nombre de doublons supprimés.
 */

function nettoyerDoublonsManuels() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) return "Aucune donnée à nettoyer.";

  let doublonsSupprimes = 0;
  const emailsVus = {};
  
  const header = data[0];
  const newRows = [];

  // On parcourt de bas en haut pour garder le plus récent
  for (let i = data.length - 1; i > 0; i--) {
    const row = data[i];
    const email = String(row[2]).toLowerCase().trim();

    if (!email) continue;

    if (emailsVus[email]) {
      doublonsSupprimes++;
    } else {
      emailsVus[email] = true;
      newRows.unshift(row); // Ajout au début du tableau pour conserver l'ordre originel
    }
  }

  // Si on a supprimé au moins un doublon, on réécrit la feuille en lot
  if (doublonsSupprimes > 0) {
      if (sheet.getLastRow() > 1) {
          sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
      }
      if (newRows.length > 0) {
          sheet.getRange(2, 1, newRows.length, newRows[0].length).setValues(newRows);
      }
  }

  return `${doublonsSupprimes} ligne(s) en double supprimée(s).`;
}

/**
 * Parcourt la feuille et supprime les contacts dont la date de dernière extraction 
 * remonte à plus de 2 ans (730 jours) pour respecter la conformité RGPD.
 * @author Fabrice Faucheux
 * @returns {string} Le message de résultat affichant le nombre de contacts purgés.
 */

function purgerContactsRGPD() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) return "Aucun contact à purger.";

  const maintenant = new Date();
  const DEUX_ANS_MS = 2 * 365 * 24 * 60 * 60 * 1000;
  let lignesSupprimees = 0;
  
  const header = data[0];
  const newRows = [];

  // Parcourir de bas en haut
  for (let i = data.length - 1; i > 0; i--) {
    const row = data[i];
    const dateString = row[6]; // Date en colonne G (index 6)
    
    if (dateString instanceof Date) {
      const diff = maintenant.getTime() - dateString.getTime();
      if (diff > DEUX_ANS_MS) {
        lignesSupprimees++;
      } else {
        newRows.unshift(row);
      }
    } else {
        newRows.unshift(row);
    }
  }

  if (lignesSupprimees > 0) {
      if (sheet.getLastRow() > 1) {
          sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
      }
      if (newRows.length > 0) {
          sheet.getRange(2, 1, newRows.length, newRows[0].length).setValues(newRows);
      }
  }

  return `Purge RGPD terminée : ${lignesSupprimees} contact(s) inactif(s) depuis +2 ans supprimé(s).`;
}