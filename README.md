# 📦 Email Contact Extractor — Extracteur de Contacts par IA

[🇫🇷 Version Française](#-version-française) | [🇬🇧 English Version](#-english-version)

---

## 🇫🇷 Version Française

> Un outil Google Apps Script sous forme de barre latérale (Sidebar) pour Google Sheets qui utilise l'intelligence artificielle Gemini pour analyser automatiquement les signatures d'emails Gmail et en extraire des contacts complets (Nom, Prénom, Téléphone, Poste, Entreprise) afin de les sauvegarder dans Google Contacts.

<a href="https://developers.google.com/apps-script"><img src="https://img.shields.io/badge/Google%20Apps%20Script-4285F4?style=for-the-badge&logo=google-apps-script&logoColor=white" alt="Google Apps Script"></a>
<a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-indigo?style=for-the-badge" alt="License: MIT"></a>
<a href="README.md"><img src="https://img.shields.io/badge/Status-Stable-brightgreen?style=for-the-badge" alt="Status: Stable"></a>

---

### ✨ Fonctionnalités Clés

- 🧠 **Extraction Intelligente par IA** : Analyse sémantique fine des blocs de signature d'e-mails Gmail via le modèle Gemini API (3.5 Flash) pour identifier avec précision les différents champs de contact.
- ⚙️ **Filtres de Sécurité Avancés** : Éradique les faux positifs grâce à des listes dynamiques d'expéditeurs ignorés (ex: no-reply, newsletter, etc.) et cible uniquement les e-mails professionnels contenant des mots-clés de poste (Directeur, Responsable, Manager, etc.).
- 📇 **Synchronisation Google Contacts** : Intégration directe avec la base Google Contacts (via l'API Google People) pour sauvegarder les fiches de contact enrichies en un clic.
- 📊 **Tableau de Bord de Suivi** : Visualisation claire et animée dans la barre latérale Sheets de l'avancement du scan de la boîte de réception.
- 🕒 **Fenêtre Temporelle Ajustable** : Choix flexible de la période de scan (ex : 30 jours, 365 jours) pour concentrer l'analyse uniquement sur vos communications récentes.

---

### 🚀 Installation & Configuration

1. Ouvrez votre document Google Sheets.
2. Accédez à **Extensions > Apps Script**.
3. Créez les fichiers correspondants à la structure du projet et copiez-y le code source.
4. Activez le service avancé **Google People API** dans votre projet Google Apps Script (dans l'onglet *Services* à gauche).
5. Sauvegardez et rechargez l'onglet Google Sheets. Un nouveau menu **"FF Extraction"** va apparaître !
6. Ouvrez la barre latérale et renseignez votre propre **Clé API Gemini** personnelle (à obtenir gratuitement sur [Google AI Studio](https://aistudio.google.com/)).

---

### 🛠️ Structure du Projet

Le projet contient les fichiers principaux suivants :
- **[Code.gs](file:///Users/fabrice/Documents/Mes%20développements/Extraction%20contact/Code.gs)** : Point d'entrée principal (menus, gestion du scan Gmail et routage).
- **[Config.gs](file:///Users/fabrice/Documents/Mes%20développements/Extraction%20contact/Config.gs)** : Module de configuration utilisateur stocké de manière sécurisée dans `UserProperties`.
- **[GeminiAPI.gs](file:///Users/fabrice/Documents/Mes%20développements/Extraction%20contact/GeminiAPI.gs)** : Moteur d'interfaçage d'intelligence artificielle gérant l'appel sémantique structuré à Gemini.
- **[UI.gs](file:///Users/fabrice/Documents/Mes%20développements/Extraction%20contact/UI.gs)** : Assistants visuels et ouverture de la Sidebar HTML.
- **[Extraction.gs](file:///Users/fabrice/Documents/Mes%20développements/Extraction%20contact/Extraction.gs)** : Moteur de parsing régulier des signatures d'e-mails.
- **[PeopleContacts.gs](file:///Users/fabrice/Documents/Mes%20développements/Extraction%20contact/PeopleContacts.gs)** : Interfaçage avec les APIs Google People pour la synchronisation des contacts.
- **[Sidebar.html](file:///Users/fabrice/Documents/Mes%20développements/Extraction%20contact/Sidebar.html)** : Interface utilisateur responsive et moderne conçue avec les principes du Material Design 3.

---

### 👤 Auteur

- **[Fabrice Faucheux](https://faucheux.bzh)** (FF Labs) - [GitHub](https://github.com/FabriceFx)

---

### 📄 Licence

Ce projet est disponible sous licence **MIT**.

---

## 🇬🇧 English Version

> An advanced Google Apps Script sidebar tool for Google Sheets that leverages Gemini AI to automatically parse Gmail email signatures and extract fully structured professional contacts (First name, Last name, Phone, Title, Company) to save them straight into Google Contacts.

<a href="https://developers.google.com/apps-script"><img src="https://img.shields.io/badge/Google%20Apps%20Script-4285F4?style=for-the-badge&logo=google-apps-script&logoColor=white" alt="Google Apps Script"></a>
<a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-indigo?style=for-the-badge" alt="License: MIT"></a>

---

### ✨ Key Features

- 🧠 **Intelligent AI Parsing**: Deep semantic analysis of Gmail signature blocks powered by Gemini API (3.5 Flash) to reliably identify contact data.
- ⚙️ **Smart Anti-Spam Filters**: Mutes unrelated domains (e.g. no-reply, newsletters) and filters threads using customized title keywords (Director, Head, Manager, etc.) to target professional senders only.
- 📇 **Google Contacts Sync**: Integrates natively with the Google Contacts directory (Google People API) to record updated profiles instantly.
- 📊 **Dynamic Progress Tracker**: Real-time status reporting directly within the Sheets side panel during box crawling operations.
- 🕒 **Flexible Time Scanning Window**: Set search thresholds (e.g. 30 days, 365 days) to focus only on active communication logs.

---

### 🚀 Installation & Setup

1. Open any Google Spreadsheet.
2. Select **Extensions > Apps Script**.
3. Create files corresponding to the project layout and paste the respective code files.
4. Enable the **Google People API** advanced service in your Apps Script project workspace (*Services* list on the left).
5. Save the project and refresh your sheet. A custom **"FF Extraction"** menu will appear!
6. Launch the sidebar and enter your **Gemini API Key** (generate one for free from [Google AI Studio](https://aistudio.google.com/)).

---

### 🛠️ Project Structure

- **[Code.gs](file:///Users/fabrice/Documents/Mes%20développements/Extraction%20contact/Code.gs)**: Setup entry point, menu items registration, and Gmail inbox indexing.
- **[Config.gs](file:///Users/fabrice/Documents/Mes%20développements/Extraction%20contact/Config.gs)**: Encrypted settings wrapper saving user preferences in `UserProperties`.
- **[GeminiAPI.gs](file:///Users/fabrice/Documents/Mes%20développements/Extraction%20contact/GeminiAPI.gs)**: Core API handler calling Gemini with structured JSON schemas.
- **[UI.gs](file:///Users/fabrice/Documents/Mes%20développements/Extraction%20contact/UI.gs)**: Layout assets and modal sidepanel triggers.
- **[Extraction.gs](file:///Users/fabrice/Documents/Mes%20développements/Extraction%20contact/Extraction.gs)**: Signatures segment locator logic.
- **[PeopleContacts.gs](file:///Users/fabrice/Documents/Mes%20développements/Extraction%20contact/PeopleContacts.gs)**: Google People REST endpoints binder for contact creation.
- **[Sidebar.html](file:///Users/fabrice/Documents/Mes%20développements/Extraction%20contact/Sidebar.html)**: Clean, high-fidelity Material Design 3 frontend layout.

---

### 👤 Author

- **[Fabrice Faucheux](https://faucheux.bzh)** (FF Labs) - [GitHub](https://github.com/FabriceFx)

---

### 📄 License

This project is licensed under the terms of the **MIT License**.

---
<p align="center"><a href="https://faucheux.bzh" target="_blank" style="color: inherit; text-decoration: none;">&lt;&gt; par Fabrice Faucheux</a></p>
