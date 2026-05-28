/**
 * ============================================================================
 *  EXTRACTION CONTACT - Extraction.gs
 * ============================================================================
 *  Auteur      : Fabrice Faucheux (https://faucheux.bzh)
 *  Projet      : FF Labs - Extraction contact
 *  Rôle        : Routines d'extraction de contacts et intégration avec les APIs tierces.
 *  Version     : 1.0.0
 * ============================================================================
 */

/**
 * Tente de déduire le nom de l'entreprise à partir du nom de domaine de l'adresse e-mail.
 * Ignore les domaines génériques grand public (gmail, yahoo, orange, etc.).
 * @author Fabrice Faucheux
 * @param {string} email - L'adresse e-mail à analyser.
 * @returns {string} Le nom de l'entreprise formaté, ou "Inconnu".
 */

function deduireEntrepriseDuDomaine(email) {
  const match = email.match(/@(.+)/);
  if (!match) return "Inconnu";
  const domaineComplet = match[1].toLowerCase();

  const domainesGeneriques = ["gmail.com", "yahoo.com", "yahoo.fr", "hotmail.com", "hotmail.fr", "outlook.com", "outlook.fr", "orange.fr", "free.fr", "sfr.fr", "laposte.net", "wanadoo.fr", "icloud.com", "me.com"];
  if (domainesGeneriques.includes(domaineComplet)) return "Inconnu";

  const parties = domaineComplet.split('.');
  if (parties.length >= 2) {
    let nomEntreprise = parties[parties.length - 2];
    nomEntreprise = nomEntreprise.split('-').map(word => {
      return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');

    return nomEntreprise;
  }
  return "Inconnu";
}

/**
 * Analyse les dernières lignes de l'e-mail pour trouver le poste (via mots-clés configurés)
 * et tente de déduire l'entreprise si elle est située sur la ligne suivante.
 * @author Fabrice Faucheux
 * @param {string} texteMessage - Le corps brut de l'e-mail.
 * @returns {Object} Un objet contenant le poste et l'entreprise suggérée ({ poste, entreprise }).
 */

function chercherPosteEtEntreprise(texteMessage) {
  const lignes = texteMessage.split('\n');
  const finMessage = lignes.slice(-15).map(l => l.trim()).filter(l => l.length > 0);

  const motsCles = getListesConfig().motsCles;
  let poste = "Inconnu";
  let entrepriseSuggeree = "Inconnu";

  for (let i = 0; i < finMessage.length; i++) {
    const ligne = finMessage[i].toLowerCase();
    if (ligne.length < 100) {
      for (const mot of motsCles) {
        if (ligne.includes(mot)) {
          poste = finMessage[i].replace(/^[-=|_*.:;,]+|[-=|_*.:;,]+$/g, '').trim();

          // NOUVEAUTÉ : On regarde la ligne suivante pour l'entreprise
          if (finMessage[i + 1] && !finMessage[i + 1].includes('@') && !finMessage[i + 1].match(/\d/)) {
            entrepriseSuggeree = finMessage[i + 1].replace(/^[-=|_*.:;,]+|[-=|_*.:;,]+$/g, '').trim();
          }
          return { poste: poste, entreprise: entrepriseSuggeree };
        }
      }
    }
  }
  return { poste: poste, entreprise: entrepriseSuggeree };
}

/**
 * Routeur d'analyse : Décide d'utiliser l'IA Gemini (si la clé est présente et valide) 
 * ou le Fallback Heuristique pour extraire l'intégralité des coordonnées de la signature.
 * @author Fabrice Faucheux
 * @param {string} texteMessage - Le corps nettoyé de l'e-mail.
 * @param {string} email - L'adresse e-mail de l'expéditeur.
 * @param {string} nomComplet - Le nom affiché de l'expéditeur.
 * @param {boolean} [forceHeuristique=false] - Forcer l'utilisation de l'heuristique sans IA.
 * @returns {Object} Objet standardisé contenant nom, prénom, email, téléphone, poste, entreprise et confiance.
 */

function analyserSignature(texteMessage, email, nomComplet, forceHeuristique = false) {

  const props = PropertiesService.getUserProperties();
  const hasGeminiKey = !!props.getProperty("GEMINI_API_KEY");
  const baseEmail = email.toLowerCase();
  const identite = extraireNomPrenom(nomComplet);

  if (hasGeminiKey && !forceHeuristique) {
    try {
      const infosAi = extraireInfosAvecGemini(texteMessage, email, nomComplet);
      if (infosAi) {
        return {
          nom: (infosAi.nom && infosAi.nom !== "Inconnu") ? infosAi.nom : identite.nom,
          prenom: (infosAi.prenom && infosAi.prenom !== "Inconnu") ? infosAi.prenom : identite.prenom,
          email: baseEmail,
          telephone: (infosAi.telephone && infosAi.telephone !== "") ? infosAi.telephone : extraireTelephone(texteMessage),
          poste: infosAi.poste || "Inconnu",
          entreprise: (infosAi.entreprise && infosAi.entreprise !== "Inconnu" && infosAi.entreprise !== "") ? infosAi.entreprise : deduireEntrepriseDuDomaine(email),
          confiance_ia: infosAi.confiance_ia || "N/A"
        };
      }
    } catch (e) {
      Logger.log("Gemini bypass, fallback heuristique: " + e.message);
    }
  }

  // Fallback Heuristique (ou si pas de clé API)
  const infosPoste = chercherPosteEtEntreprise(texteMessage);
  let entrepriseDeduite = deduireEntrepriseDuDomaine(email);

  // Si le domaine est générique (gmail, etc.), on privilégie l'entreprise trouvée sous le poste
  if (entrepriseDeduite === "Inconnu" && infosPoste.entreprise !== "Inconnu") {
    entrepriseDeduite = infosPoste.entreprise;
  }

  return {
    nom: identite.nom,
    prenom: identite.prenom,
    email: baseEmail,
    telephone: extraireTelephone(texteMessage),
    poste: infosPoste.poste,
    entreprise: entrepriseDeduite,
    confiance_ia: "Moteur heuristique"
  };
}

/**
 * Extrait un numéro de téléphone français standard à partir du bas de l'e-mail via une Expression Régulière.
 * @author Fabrice Faucheux
 * @param {string} texteMessage - Le corps brut de l'e-mail.
 * @returns {string} Le numéro de téléphone formaté, ou "Inconnu".
 */

function extraireTelephone(texteMessage) {
  const lignes = texteMessage.split('\n');
  const finMessage = lignes.slice(-15).join('\n');

  const regexTel = /(?:\+|00)[1-9][0-9\s.-]{7,20}|(?:0)[1-9](?:[\s.-]*\d{2}){4}/;
  const match = finMessage.match(regexTel);

  return match ? match[0].trim() : "Inconnu";
}

/**
 * Nettoie la chaîne d'expédition Gmail ("Nom Prénom <email>") pour séparer le prénom du nom de famille.
 * @author Fabrice Faucheux
 * @param {string} nomComplet - La chaîne brute de l'expéditeur.
 * @returns {Object} Un objet contenant le prénom et le nom ({ prenom, nom }).
 */

function extraireNomPrenom(nomComplet) {
  let nomPropre = nomComplet.replace(/<.*>|["']/g, '').trim();
  let prenom = "Inconnu";
  let nom = "Inconnu";

  const parties = nomPropre.split(' ').filter(p => p.length > 0);
  if (parties.length >= 2) {
    prenom = parties[0];
    nom = parties.slice(1).join(' ');
  } else if (parties.length === 1) {
    nom = parties[0];
  }

  if (prenom !== "Inconnu") prenom = prenom.charAt(0).toUpperCase() + prenom.slice(1).toLowerCase();

  return { prenom: prenom, nom: nom };
}

