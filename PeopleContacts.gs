/**
 * ============================================================================
 *  EXTRACTION CONTACT - PeopleContacts.gs
 * ============================================================================
 *  Auteur      : Fabrice Faucheux (https://faucheux.bzh)
 *  Projet      : FF Labs - Extraction contact
 *  Rôle        : Intégration et synchronisation avec les contacts Google People API.
 *  Version     : 1.0.0
 * ============================================================================
 */

/**
 * Lit l'intégralité de la Google Sheet et utilise le Service Avancé "People API" 
 * pour créer de nouveaux fiches contacts dans le carnet d'adresses Google de l'utilisateur.
 * @author Fabrice Faucheux
 * @returns {string} Le rapport d'exécution (nombre d'ajouts et d'erreurs éventuelles).
 */

function exporterVersGoogleContacts() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) return "Aucun contact à exporter.";
  
  let ajouts = 0;
  let erreurs = 0;
  
  const startTime = Date.now();
  let timeoutAtteint = false;

  // Les index : 0:Nom, 1:Prénom, 2:Email, 3:Téléphone, 4:Poste, 5:Entreprise
  for (let i = 1; i < data.length; i++) {
    // Coupe-circuit : on s'arrête à 4min30 (270 000 ms) pour éviter l'erreur Google de 6 minutes
    if (Date.now() - startTime > 270000) {
        timeoutAtteint = true;
        break;
    }
    const row = data[i];
    const email = row[2];
    
    if (!email || email === "Inconnu") continue;
    
    const nom = row[0] !== "Inconnu" ? row[0] : "";
    const prenom = row[1] !== "Inconnu" ? row[1] : "";
    let tel = row[3] !== "Inconnu" ? row[3] : "";
    
    // Nettoyer le tel (enlever l'apostrophe)
    if (typeof tel === 'string' && tel.startsWith("'")) {
        tel = tel.substring(1);
    }
    
    const poste = row[4] !== "Inconnu" ? row[4] : "";
    const entreprise = row[5] !== "Inconnu" ? row[5] : "";
    
    const contactPayload = {
      "names": [{ "givenName": prenom, "familyName": nom }],
      "emailAddresses": [{ "value": email, "type": "work" }]
    };
    
    if (tel) {
      contactPayload.phoneNumbers = [{ "value": tel, "type": "work" }];
    }
    
    if (entreprise || poste) {
      contactPayload.organizations = [{
          "name": entreprise,
          "title": poste,
          "type": "work"
      }];
    }
    
    try {
        // Nécessite d'activer le Service Avancé "People API" dans l'éditeur Google Apps Script !
        People.People.createContact(contactPayload);
        ajouts++;
    } catch (e) {
        Logger.log("Erreur création contact " + email + " : " + e.message);
        erreurs++;
    }
    
    // Pause pour quotas
    Utilities.sleep(300);
  }
  
  let msg = `Export terminé : ${ajouts} contact(s) créé(s) (${erreurs} erreur(s)).`;
  if (timeoutAtteint) {
      msg += "\n\n⚠️ Pause de sécurité : Le script s'est arrêté proprement pour éviter l'erreur de délai de Google (6 min max). Relancez simplement l'export pour qu'il continue (les doublons ne seront pas créés si vous nettoyez votre sheet ou gérez vos ajouts).";
  }
  return msg;
}