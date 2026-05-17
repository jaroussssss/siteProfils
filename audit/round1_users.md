# RAPPORT ÉQUIPE UTILISATEURS TYPES — Round 1

## 1. EXPÉRIENCE VISITEUR PUBLIC

1. **Page de redirection silencieuse** — `views/loading.ejs:41` — "Chargement du profil..." sans ETA ni message progressif. Si timeout → "Impossible de charger le profil" trop vague
2. **Redirection Instagram InApp** — `public/js/loading.js:81,100` — intent Android complexe sans indication visuelle → l'utilisateur pense que le site est cassé
3. **Aucune indication de barre de progression** — sensation d'avoir cliqué dans le vide sur mobile lent

## 2. EXPÉRIENCE ADMINISTRATEUR

1. **Confusion "modèle" vs "profil"** — nulle part expliqué qu'un "modèle" = dossier photos et un "profil" = lien partageable. Workflow opaque.
2. **Obligation de sélectionner un modèle AVANT d'ouvrir la modale** — erreur "Sélectionnez un modèle" apparaît APRÈS avoir rempli tout le formulaire
3. **Chemins de fichiers illisibles dans les selects** — `/photos/MonModèle/avatar.jpg` affiché brut → intimidant
4. **Prévisualisation lente sans loader** — iframe change de src sans aucun feedback "chargement..."
5. **Validation tardive côté serveur** — erreurs (fond requis, 1-3 liens) n'apparaissent qu'après clic "Enregistrer" (2s de latence)
6. **Duplication mal expliquée** — bouton "Dupliquer" remplit les champs mais conserve l'ancienne URL → utilisateur perdu

## 3. MESSAGES D'ERREUR INCOMPRÉHENSIBLES

| Message actuel | Problème | Fichier | Message suggéré |
|----------------|---------|---------|----------------|
| "Impossible de charger le profil" | Trop vague | loading.js:81 | "Nous n'arrivons pas à accéder à votre profil. Vérifiez que le lien est correct." |
| "Erreur serveur" | Technique | server.js (500) | "Une erreur s'est produite. Réessayez dans quelques instants." |
| "Captcha non chargé" | Jargon technique | loading.js | "Vérification de sécurité échouée. Rechargez la page." |
| "Entre 1 et 3 liens requis" | Tardif | createProfilePopup.js:118 | Validation temps réel avec compteur |
| "Sélectionnez un modèle" | Aurait dû être bloqué avant | createProfilePopup.js:110 | Griser le bouton "Nouveau lien" si aucun modèle sélectionné |
| "Erreur chargement des fichiers" | Vague | createProfilePopup.js:247 | "Impossible de charger les fichiers du modèle [NOM]" |

## 4. FONCTIONNALITÉS ATTENDUES ABSENTES

1. Pas de toggle mode clair/sombre pour l'admin
2. Copie en 1 clic du lien temporaire (bouton non visible immédiatement)
3. Clonage structurel rapide de profils similaires
4. Alertes en temps réel (clic OnlyFans, nouveau visiteur)
5. Guide/aide intégré — termes "tempURL", "finalURL", "modelName" jamais expliqués
6. Timeout visuel après 10s sur la page de chargement

## 5. PROBLÈMES DE CHARGEMENT / PERFORMANCE PERÇUE

1. **Spinner sans ETA** — `views/loading.ejs` — sur mobile lent, 10s+ → croit que le site est mort
2. **Modal 95vh sur mobile** — trop de champs, scroll infini, pas de sections pliables
3. **Graphiques Chart.js** — apparaissent vides puis se remplissent → donne l'impression qu'il n'y a pas de données

## 6. FORMULATIONS / TEXTES PROBLÉMATIQUES

| Texte actuel | Fichier:Ligne | Suggestion |
|-------------|--------------|-----------|
| "Modèles" (sidebar) | admin.ejs:18 | "Mes modèles (dossiers de photos)" |
| "Créer un modèle" | admin.ejs:27 | "Créer un nouveau modèle de profil" |
| "Nouveau lien" | admin.ejs:43 | "Créer un nouveau profil partageable" |
| "URL du profil" | admin.ejs:236 | "URL temporaire (ce que vous allez partager)" |
| "Heures de compte à rebours" | admin.ejs:292 | "Durée du décompte (en heures)" |
| "Arrière-plan" | admin.ejs:321 | Unifier avec "Fond" utilisé ailleurs |
| "Profil non trouvé" | 404.ejs | "Ce profil n'existe plus ou a expiré." |

## 7. MODIFICATIONS PRIORITAIRES

| # | Fichier | Ligne | Priorité |
|---|---------|-------|----------|
| 1 | `views/loading.ejs` + `public/js/loading.js` | 41, 81, 100 | 🔴 CRITIQUE |
| 2 | `views/admin.ejs` | 18, 27, 43 | 🟠 HIGH |
| 3 | `views/admin.ejs` | 214 + createProfilePopup.js:110 | 🟠 HIGH |
| 4 | `public/js/createProfilePopup.js` | 94-102 | 🟠 HIGH |
| 5 | `public/js/createProfilePopup.js` | 110-122 | 🟠 HIGH |
| 6 | `public/js/createProfilePopup.js` | 428-447 | 🟡 MEDIUM |
| 7 | `views/404.ejs` | 8 | 🟡 MEDIUM |
| 8 | `views/admin.ejs` | 236, 292, 321 | 🟡 MEDIUM |
