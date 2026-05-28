/**
 * ============================================================================
 *  EXTRACTION CONTACT - Config.gs
 * ============================================================================
 *  Auteur      : Fabrice Faucheux (https://faucheux.bzh)
 *  Projet      : FF Labs - Extraction contact
 *  Rôle        : Centralisation des constantes globales, des variables d'environnement et de configuration.
 *  Version     : 1.0.0
 * ============================================================================
 */

/**
 * Module de Configuration Globale
 */

const DEFAULT_MOTS_IGNORES = [
  "no-reply", "noreply", "donotreply", "nepasrepondre", "newsletter", "bounce",
  "info@", "infos@", "info.", "support@", "contact@", "notifications@", "notification@",
  "actu@", "news@", "community", "googlecloud@", "votre-", "ne_pas_repondre_22","relation-client"
];
const DEFAULT_MOTS_CLES_POSTE = [
  "directeur", "directrice", "responsable", "manager", "chef de",
  "assistant", "assistante", "président", "ceo", "cto", "cfo",
  "fondateur", "chargé", "chargée", "consultant", "ingénieur",
  "développeur", "technicien", "coordinateur"
];
const DEFAULT_JOURS_SCAN = "365";

/**
 * Récupère la configuration actuelle stockée dans les Propriétés Utilisateur du script.
 * Applique les valeurs par défaut si certaines données sont manquantes.
 * @author Fabrice Faucheux
 * @returns {Object} L'objet de configuration (geminiKey, motsIgnores, motsCles, joursScan).
 */

function getConfig() {
  const props = PropertiesService.getUserProperties();

  let motsIgnores = props.getProperty("MOTS_IGNORES");
  if (motsIgnores) {
    motsIgnores = JSON.parse(motsIgnores);
  } else {
    motsIgnores = DEFAULT_MOTS_IGNORES;
  }

  let motsCles = props.getProperty("MOTS_CLES_POSTE");
  if (motsCles) {
    motsCles = JSON.parse(motsCles);
  } else {
    motsCles = DEFAULT_MOTS_CLES_POSTE;
  }

  let joursScan = props.getProperty("JOURS_SCAN");
  if (!joursScan) {
    joursScan = DEFAULT_JOURS_SCAN;
  }

  return {
    geminiKey: props.getProperty("GEMINI_API_KEY") || "",
    motsIgnores: motsIgnores.join(", "),
    motsCles: motsCles.join(", "),
    joursScan: joursScan // NOUVEAU
  };
}

/**
 * Sauvegarde la configuration saisie dans la Sidebar vers les Propriétés Utilisateur.
 * Vérifie la validité de la clé API (doit commencer par "AIza") et le format des jours.
 * @author Fabrice Faucheux
 * @param {Object} config - L'objet contenant les paramètres à sauvegarder.
 * @returns {boolean} true si la sauvegarde a réussi.
 * @throws {Error} Si la clé API Gemini est mal formatée.
 */

function saveConfig(config) {
  const props = PropertiesService.getUserProperties();

  // Clé Gemini
  if (config.geminiKey && config.geminiKey.trim() !== "") {
    const key = config.geminiKey.trim();
    if (!key.startsWith("AIza")) {
      throw new Error("La clé API Gemini est invalide. Elle doit commencer par 'AIza'.");
    }
    props.setProperty("GEMINI_API_KEY", key);
  } else {
    props.deleteProperty("GEMINI_API_KEY");
  }

  // Mots ignorés
  const arrIgnores = config.motsIgnores.split(",").map(m => m.trim()).filter(m => m.length > 0);
  props.setProperty("MOTS_IGNORES", JSON.stringify(arrIgnores));

  // Mots clés
  const arrCles = config.motsCles.split(",").map(m => m.trim()).filter(m => m.length > 0);
  props.setProperty("MOTS_CLES_POSTE", JSON.stringify(arrCles));

  // NOUVEAU : Jours de scan (On s'assure que c'est un nombre valide)
  let jours = parseInt(config.joursScan, 10);
  if (isNaN(jours) || jours <= 0) jours = 365;
  props.setProperty("JOURS_SCAN", jours.toString());

  return true;
}

/**
 * Utilitaire interne pour retourner la configuration prête à être utilisée par le code métier 
 * (Transforme les chaînes de mots-clés en tableaux manipulables et définit la période de scan).
 * @author Fabrice Faucheux
 * @returns {Object} Objet contenant motsIgnores (Array), motsCles (Array) et joursScan (Number/String).
 */

function getListesConfig() {
  const props = PropertiesService.getUserProperties();

  let motsIgnores = props.getProperty("MOTS_IGNORES");
  motsIgnores = motsIgnores ? JSON.parse(motsIgnores) : DEFAULT_MOTS_IGNORES;

  let motsCles = props.getProperty("MOTS_CLES_POSTE");
  motsCles = motsCles ? JSON.parse(motsCles) : DEFAULT_MOTS_CLES_POSTE;

  let joursScan = props.getProperty("JOURS_SCAN");
  joursScan = joursScan ? joursScan : DEFAULT_JOURS_SCAN;

  return { motsIgnores, motsCles, joursScan };
}