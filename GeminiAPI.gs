/**
 * ============================================================================
 *  EXTRACTION CONTACT - GeminiAPI.gs
 * ============================================================================
 *  Auteur      : Fabrice Faucheux (https://faucheux.bzh)
 *  Projet      : FF Labs - Extraction contact
 *  Rôle        : Service de communication avec l'intelligence artificielle Google Gemini pour l'enrichissement des données.
 *  Version     : 1.0.0
 * ============================================================================
 */

/**
 * Effectue la requête HTTP POST vers l'API Google Gemini (modèle flash récent).
 * Force le format de réponse en JSON via le System Instruction.
 * @author Fabrice Faucheux
 * @param {string} prompt - Les instructions système détaillant le travail d'extraction.
 * @param {string} texte - Le corps du message à analyser.
 * @returns {Object|null} L'objet JSON retourné par l'IA, ou null en cas d'échec/erreur API.
 */

function appelerGemini(prompt, texte) {
const props = PropertiesService.getUserProperties();
const apiKey = props.getProperty("GEMINI_API_KEY");

if (!apiKey) return null;

// On utilise le dernier modèle performant gemini-3.5-flash pour l'extraction de contacts
const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=" + apiKey;

const systemInstruction = "Tu es un extracteur de données expert strict. " + prompt;

const payload = {
  "contents": [
    {
      "parts": [
        {
          "text": "Texte de l'email:\n\n" + texte 
        }
      ]
    }
  ],
  "systemInstruction": {
      "parts":[{"text": systemInstruction}]
  },
  // Force la réponse JSON 
  "generationConfig": {
      "responseMimeType": "application/json"
  }
};

const options = {
  "method": "post",
  "contentType": "application/json",
  "payload": JSON.stringify(payload),
  "muteHttpExceptions": true
};

const response = UrlFetchApp.fetch(endpoint, options);

if (response.getResponseCode() !== 200) {
  Logger.log("Erreur API Gemini: " + response.getContentText());
  return null;
}

const resData = JSON.parse(response.getContentText());
try {
    const textResponse = resData.candidates[0].content.parts[0].text;
    return JSON.parse(textResponse);
} catch (e) {
    Logger.log("Erreur parsing JSON Gemini: " + e.message);
    return null;
}
}

/**
 * Construit le prompt structuré (instructions et contexte d'expéditeur) pour extraire
 * de façon déterministe les coordonnées, et déclenche l'appel à Gemini.
 * @author Fabrice Faucheux
 * @param {string} texteMessage - Le corps nettoyé de l'e-mail.
 * @param {string} email - L'adresse e-mail de l'expéditeur.
 * @param {string} nomComplet - Le nom affiché de l'expéditeur pour guider l'IA.
 * @returns {Object|null} L'objet JSON contenant les données de contact, ou null.
 */

function extraireInfosAvecGemini(texteMessage, email, nomComplet) {
  const prompt = `Extrait scrupuleusement les informations de contact à partir de la signature de l'email.
L'expéditeur original est : ${nomComplet} (${email}).

INSTRUCTIONS ESSENTIELLES :
1. Retourne EXCLUSIVEMENT un objet JSON valide respectant les clés exactes demandées.
2. Clés requises : "nom", "prenom", "telephone", "poste", "entreprise", "confiance_ia".
3. Règle "Inconnu" : Si une information est introuvable, douteuse ou absente de la signature, retourne EXACTEMENT "Inconnu" (ne pas mettre de chaîne vide ni chercher à l'halluciner).
4. Pour "confiance_ia" : Estime la probabilité (0-100) que les informations soient exactes et bien formatées. Si tu as dû deviner l'entreprise ou que la signature est complexe, baisse le score.
5. Format du téléphone: Ajouter l'indicatif (+33...) si applicable, formaté en une seule chaîne.`;
  
  return appelerGemini(prompt, texteMessage);
}

/**
 * Teste la validité de la clé API saisie sans l'enregistrer.
 * @author Fabrice Faucheux
 * @param {string} apiKey - La clé API à tester.
 * @returns {Object} Un objet { success: boolean, message: string }.
 */
function testerCleGemini(apiKey) {
  if (!apiKey || apiKey.trim() === "") {
    return { success: false, message: "La clé est vide." };
  }
  
  if (!apiKey.trim().startsWith("AIza")) {
    return { success: false, message: "La clé doit commencer par 'AIza'." };
  }
  
  const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=" + apiKey.trim();
  const payload = {
    "contents": [{"parts": [{"text": "Dis simplement 'OK'"}]}]
  };
  
  const options = {
    "method": "post",
    "contentType": "application/json",
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };
  
  try {
    const response = UrlFetchApp.fetch(endpoint, options);
    if (response.getResponseCode() === 200) {
      return { success: true, message: "Clé valide ! Connexion réussie." };
    } else {
      let errorMsg = "Erreur API.";
      try {
        const resData = JSON.parse(response.getContentText());
        if (resData.error && resData.error.message) {
            errorMsg = resData.error.message;
        }
      } catch(e) {}
      return { success: false, message: "Erreur de connexion : " + errorMsg };
    }
  } catch (e) {
    return { success: false, message: "Erreur réseau : " + e.message };
  }
}