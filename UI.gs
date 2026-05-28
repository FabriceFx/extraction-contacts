/**
 * ============================================================================
 *  EXTRACTION CONTACT - UI.gs
 * ============================================================================
 *  Auteur      : Fabrice Faucheux (https://faucheux.bzh)
 *  Projet      : FF Labs - Extraction contact
 *  Rôle        : Gestion de l'affichage de l'interface graphique utilisateur (Sidebar et boîtes de dialogue).
 *  Version     : 1.0.0
 * ============================================================================
 */

/**
 * Crée le menu personnalisé "🔍 Extracteur Contacts" lors de l'ouverture du fichier Google Sheets.
 * @author Fabrice Faucheux
 */

function onOpen() {
  const locale = Session.getActiveUserLocale().toLowerCase();
  const isFr = locale.startsWith('fr');
  const ui = SpreadsheetApp.getUi();
  
  const menuTitle = isFr ? '🔍 Extraction de contacts' : '🔍 Contact extraction';
  const itemIA = isFr ? '▶️ Lancer la synchro (Avec IA)' : '▶️ Run sync (With AI)';
  const itemNoIA = isFr ? '⚡ Lancer la synchro (Rapide sans IA)' : '⚡ Run sync (Quick without AI)';
  const itemExport = isFr ? '📥 Exporter vers Google Contacts' : '📥 Export to Google Contacts';
  const itemClean = isFr ? '🧹 Nettoyer les doublons' : '🧹 Clean duplicates';
  const itemRGPD = isFr ? '🗑️ Purge RGPD (Contacts > 2 ans)' : '🗑️ GDPR purge (Contacts > 2 years)';
  const itemTrigger = isFr ? '⏰ Gérer l\'automatisation' : '⏰ Manage automation';
  const itemConfig = isFr ? '⚙️ Configuration' : '⚙️ Settings';

  ui.createMenu(menuTitle)
    .addItem(itemIA, 'lancerExtractionAvecIA')
    .addItem(itemNoIA, 'lancerExtractionSansIA')
    .addSeparator()
    .addItem(itemExport, 'promptExporterContacts')
    .addSeparator()
    .addItem(itemClean, 'promptNettoyerDoublons')
    .addItem(itemRGPD, 'promptPurgerRGPD')
    .addSeparator()
    .addItem(itemTrigger, 'configurerDeclencheur')
    .addItem(itemConfig, 'afficherSidebarConfig')
    .addToUi();
}

/**
 * Lance le processus d'extraction des contacts en autorisant l'utilisation de l'IA Gemini.
 * Affiche une boîte de dialogue avec le rapport d'exécution à la fin.
 * @author Fabrice Faucheux
 */

function lancerExtractionAvecIA() {
  const locale = Session.getActiveUserLocale().toLowerCase();
  const isFr = locale.startsWith('fr');
  const ui = SpreadsheetApp.getUi();
  
  const toastMsg = isFr ? 'Extraction en cours... (jusqu\'à 4 min)' : 'Extraction in progress... (up to 4 min)';
  const toastTitle = isFr ? '⏳ Veuillez patienter' : '⏳ Please wait';
  SpreadsheetApp.getActiveSpreadsheet().toast(toastMsg, toastTitle, -1);
  
  try {
    const message = extraireContactsEmails(false);
    const toastDone = isFr ? 'Traitement terminé.' : 'Processing finished.';
    const toastDoneTitle = isFr ? '✅ Fini' : '✅ Done';
    SpreadsheetApp.getActiveSpreadsheet().toast(toastDone, toastDoneTitle, 3);
    
    const alertTitle = isFr ? 'Synchronisation terminée' : 'Sync completed';
    ui.alert(alertTitle, message, ui.ButtonSet.OK);
  } catch (err) {
    const toastErr = isFr ? 'Erreur lors du traitement.' : 'Error during processing.';
    const toastErrTitle = isFr ? '❌ Erreur' : '❌ Error';
    SpreadsheetApp.getActiveSpreadsheet().toast(toastErr, toastErrTitle, 3);
    
    const alertTitle = isFr ? 'Erreur' : 'Error';
    ui.alert(alertTitle, err.message, ui.ButtonSet.OK);
  }
}

/**
 * Lance le processus d'extraction des contacts en forçant le Moteur heuristique (sans IA).
 * Affiche une boîte de dialogue avec le rapport d'exécution à la fin.
 * @author Fabrice Faucheux
 */

function lancerExtractionSansIA() {
  const locale = Session.getActiveUserLocale().toLowerCase();
  const isFr = locale.startsWith('fr');
  const ui = SpreadsheetApp.getUi();
  
  const toastMsg = isFr ? 'Extraction rapide en cours...' : 'Quick extraction in progress...';
  const toastTitle = isFr ? '⏳ Veuillez patienter' : '⏳ Please wait';
  SpreadsheetApp.getActiveSpreadsheet().toast(toastMsg, toastTitle, -1);
  
  try {
    const message = extraireContactsEmails(true);
    const toastDone = isFr ? 'Traitement terminé.' : 'Processing finished.';
    const toastDoneTitle = isFr ? '✅ Fini' : '✅ Done';
    SpreadsheetApp.getActiveSpreadsheet().toast(toastDone, toastDoneTitle, 3);
    
    const alertTitle = isFr ? 'Synchronisation terminée (Mode Rapide)' : 'Sync completed (Quick Mode)';
    ui.alert(alertTitle, message, ui.ButtonSet.OK);
  } catch (err) {
    const toastErr = isFr ? 'Erreur lors du traitement.' : 'Error during processing.';
    const toastErrTitle = isFr ? '❌ Erreur' : '❌ Error';
    SpreadsheetApp.getActiveSpreadsheet().toast(toastErr, toastErrTitle, 3);
    
    const alertTitle = isFr ? 'Erreur' : 'Error';
    ui.alert(alertTitle, err.message, ui.ButtonSet.OK);
  }
}

/**
 * Affiche une demande de confirmation avant de lancer l'exportation vers Google Contacts.
 * @author Fabrice Faucheux
 */

function promptExporterContacts() {
  const locale = Session.getActiveUserLocale().toLowerCase();
  const isFr = locale.startsWith('fr');
  const ui = SpreadsheetApp.getUi();
  
  const alertTitle = isFr ? 'Exporter vers Google Contacts' : 'Export to Google Contacts';
  const alertMsg = isFr 
    ? 'Voulez-vous ajouter tous les contacts de cette feuille dans votre carnet d\'adresses Google (via l\'API People) ?' 
    : 'Do you want to add all contacts from this sheet to your Google Contacts directory (via People API)?';
  
  const response = ui.alert(alertTitle, alertMsg, ui.ButtonSet.YES_NO);
  if (response == ui.Button.YES) {
    try {
      const result = exporterVersGoogleContacts();
      const exportTitle = isFr ? 'Export terminé' : 'Export completed';
      ui.alert(exportTitle, result, ui.ButtonSet.OK);
    } catch (e) {
      const alertErr = isFr ? 'Erreur' : 'Error';
      ui.alert(alertErr, e.message, ui.ButtonSet.OK);
    }
  }
}

/**
 * Affiche une demande de confirmation avant de lancer le nettoyage des doublons.
 * @author Fabrice Faucheux
 */

function promptNettoyerDoublons() {
  const locale = Session.getActiveUserLocale().toLowerCase();
  const isFr = locale.startsWith('fr');
  const ui = SpreadsheetApp.getUi();
  
  const alertTitle = isFr ? 'Nettoyage des doublons' : 'Clean duplicates';
  const alertMsg = isFr 
    ? 'Ce script va scrupuleusement fusionner ou supprimer les lignes contenant une adresse e-mail en double, en gardant l\'entrée la plus récente. Continuer ?' 
    : 'This script will merge or delete duplicate email address rows, keeping the most recent entry. Continue?';
  
  const response = ui.alert(alertTitle, alertMsg, ui.ButtonSet.YES_NO);
  if (response == ui.Button.YES) {
    try {
      const result = nettoyerDoublonsManuels();
      const doneTitle = isFr ? 'Succès' : 'Success';
      ui.alert(doneTitle, result, ui.ButtonSet.OK);
    } catch (e) {
      const alertErr = isFr ? 'Erreur' : 'Error';
      ui.alert(alertErr, e.message, ui.ButtonSet.OK);
    }
  }
}

/**
 * Affiche une demande de confirmation avant de purger les contacts vieux de plus de 2 ans.
 * @author Fabrice Faucheux
 */

function promptPurgerRGPD() {
  const locale = Session.getActiveUserLocale().toLowerCase();
  const isFr = locale.startsWith('fr');
  const ui = SpreadsheetApp.getUi();
  
  const alertTitle = isFr ? 'Purge RGPD' : 'GDPR Purge';
  const alertMsg = isFr 
    ? 'ATTENTION : Cette action supprimera définitivement tous les contacts de ce document avec lesquels vous n\'avez pas eu d\'échange d\'email depuis plus de 2 ans (Conformité RGPD). Êtes-vous sûr ?' 
    : 'WARNING: This action will permanently delete all contacts in this document with whom you have not exchanged emails for more than 2 years (GDPR Compliance). Are you sure?';
  
  const response = ui.alert(alertTitle, alertMsg, ui.ButtonSet.YES_NO);
  if (response == ui.Button.YES) {
    try {
      const result = purgerContactsRGPD();
      const doneTitle = isFr ? 'Purge terminée' : 'Purge completed';
      ui.alert(doneTitle, result, ui.ButtonSet.OK);
    } catch (e) {
      const alertErr = isFr ? 'Erreur' : 'Error';
      ui.alert(alertErr, e.message, ui.ButtonSet.OK);
    }
  }
}

/**
 * Configure un déclencheur temporel (Time-driven trigger) pour exécuter l'extraction
 * automatiquement tous les jours à 2h du matin.
 * Vérifie au préalable si un déclencheur existe déjà pour éviter les doublons.
 * @author Fabrice Faucheux
 */

function configurerDeclencheur() {
  const locale = Session.getActiveUserLocale().toLowerCase();
  const isFr = locale.startsWith('fr');
  const ui = SpreadsheetApp.getUi();
  
  const triggers = ScriptApp.getProjectTriggers();
  let existingTrigger = null;
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'extraireContactsEmails') { 
        existingTrigger = triggers[i]; 
        break; 
    }
  }

  if (existingTrigger) {
    const activeTitle = isFr ? 'Désactiver ?' : 'Deactivate?';
    const activeMsg = isFr 
      ? 'Une exécution automatique est déjà planifiée de nuit.\nVoulez-vous la DÉSACTIVER ?' 
      : 'A nightly automatic sync is already scheduled.\nDo you want to DEACTIVATE it?';
    const response = ui.alert(activeTitle, activeMsg, ui.ButtonSet.YES_NO);
    if (response == ui.Button.YES) {
       ScriptApp.deleteTrigger(existingTrigger);
       const doneTitle = isFr ? 'Succès' : 'Success';
       const doneMsg = isFr ? 'Le scan automatique a été désactivé.' : 'Automatic scan has been deactivated.';
       ui.alert(doneTitle, doneMsg, ui.ButtonSet.OK);
    }
    return;
  }

  const triggerTitle = isFr ? 'Activer ?' : 'Activate?';
  const triggerMsg = isFr 
    ? 'Activer la synchronisation auto de nuit (2h du matin) ?' 
    : 'Activate automatic nightly sync (2 AM)?';
  const response = ui.alert(triggerTitle, triggerMsg, ui.ButtonSet.YES_NO);
  if (response == ui.Button.YES) {
    ScriptApp.newTrigger('extraireContactsEmails').timeBased().everyDays(1).atHour(2).create();
    const doneTitle = isFr ? 'Succès' : 'Success';
    const doneMsg = isFr 
      ? 'Le robot analysera vos mails tous les jours à 2h du matin.' 
      : 'The robot will scan your emails every day at 2 AM.';
    ui.alert(doneTitle, doneMsg, ui.ButtonSet.OK);
  }
}

/**
 * Ouvre le panneau latéral (Sidebar) contenant l'interface de configuration HTML.
 * @author Fabrice Faucheux
 */

function afficherSidebarConfig() {
  const template = HtmlService.createTemplateFromFile('Sidebar');
  template.locale = Session.getActiveUserLocale();
  
  const locale = Session.getActiveUserLocale().toLowerCase();
  const isFr = locale.startsWith('fr');
  const title = isFr ? "Configuration de l'extraction" : "Extraction configuration";
  
  const html = template.evaluate()
    .setTitle(title)
    .setWidth(300);
  SpreadsheetApp.getUi().showSidebar(html);
}