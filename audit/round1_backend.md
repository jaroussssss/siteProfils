# RAPPORT ÉQUIPE BACKEND — Round 1

## 1. BUGS FONCTIONNELS

1. **Validations court-circuitées** — `server.js:215-220, 244-246` — blocs de validation `finalURL` et `type` commentés → n'importe quel input passe dans `/go/:finalURL/:type`
2. **Champ inexistant ClickRepository** — `repositories/ClickRepository.js:21` — `countByFinalURL` cherche `clickType` mais le modèle s'appelle `type`. Fix: `{ type: clickType }`
3. **Timezone défaillante VisitRepository** — `repositories/VisitRepository.js:135-139` — ajout de 'Z' ne convertit pas, décale les heures locales
4. **Exposition chemins système** — `server.js:395,424,554,574` — `details: err.message` peut exposer des paths serveur dans les erreurs
5. **URI non décodé avant suppression** — `server.js:734` — `%2e%2e` non filtré avant `path.basename()`
6. **finalURL ignoré à la création** — `repositories/LinkRepository.js:6-7` — le finalURL fourni est ignoré et régénéré aléatoirement (comportement non documenté)

## 2. GESTION DES ERREURS

1. **Catch vide** — `server.js:71` — bloc `catch {}` sans log ni fallback
2. **`profiles` chargé mais inutilisé** — `server.js:61` — `profiles = await LinkRepository.findAll()` puis jamais utilisé
3. **Géolocalisation silencieuse** — `services/geo.js:57-65` — catch retourne 'ZZ' sans aucun log
4. **Requêtes SQL sans try-catch** — `repositories/VisitRepository.js:49-56` — erreurs Sequelize remontent non attrapées

## 3. VALIDATION DES ENTRÉES

1. **`target` upload non validé** — `server.js:691-695` — valeur libre, devrait être parmi `['fonds', 'photos']`
2. **`modelName` upload sans longueur max** — `server.js:693` — aucune limite de longueur
3. **Validation dupliquée liens 1-3** — `server.js:527-531` + `repositories/LinkRepository.js:10-14` — deux endroits désynchronisables
4. **`javascript:` non bloqué** — `server.js:256-259` — si `targetUrl = "javascript:alert(1)"`, le code force `https://` + l'URL dangereuse

## 4. PERFORMANCE BACKEND

1. **`findAll()` sans pagination** — `server.js:61` — charge TOUS les liens en mémoire → OOM si grande table
2. **Pas d'index sur colonnes FK** — `db/links.table.js, visits.table.js, clicks.table.js` — `linkTempURL`, `linkFinalURL`, `modelName` non indexés → scans complets
3. **Agrégation en JS au lieu de SQL** — `repositories/VisitRepository.js:59-77` — boucle 30j en JS sur des données déjà récupérées → O(n×30)
4. **4 requêtes séquentielles par type** — `server.js:652-655` — loop `for (const t of types)` → 4 round-trips DB au lieu d'un `GROUP BY type`
5. **Double conversion datetime** — `repositories/VisitRepository.js:122-129` — `DATE_FORMAT` SQL puis `formatHourLocal()` JS

## 5. ARCHITECTURE / QUALITÉ

1. **Duplication VisitRepository** — 5 fonctions quasi-identiques (`getLastMonthByDay`, `getLastWeekByHalfDay`, `getLast3DaysByHour`, etc.) — à extraire en `aggregateByInterval(tempURL, intervalType)`
2. **Duplication ClickRepository** — idem, 5 fonctions avec pattern `SELECT COUNT(*) ... INTERVAL X`
3. **`adminUtilities.js` fichier unique** — `parseVisits` seule fonction → devrait être dans VisitRepository
4. **Validation dupliquée routes/repos** — validation "1-3 liens" dans deux endroits
5. **Routes d'upload surchargées** — upload + listing + suppression + erreurs dans server.js → extraire en `FileRepository.js`
6. **Magic strings** — `['OF', 'MY', 'IG', 'TG']` répété partout → centraliser dans `constants/index.js`
7. **Logique PORT confuse** — `server.js:26-34` — double condition `NODE_ENV` + `LOCAL_DEV`

## 6. DÉPENDANCES

1. **`tar`** — `package.json` — jamais importé → supprimer
2. **`node-fetch`** — Node 18+ a `fetch` natif → supprimer si Node ≥ 18
3. **Pas de `express-validator`** — validation non centralisée
4. **Pas de gestion des transactions** — opérations multi-étapes non atomiques

## 7. MODIFICATIONS PRIORITAIRES

| # | Fichier | Ligne | Action | Priorité |
|---|---------|-------|--------|----------|
| 1 | `server.js` | 215-220, 244-246 | Décommenter les validations | 🔴 CRITIQUE |
| 2 | `repositories/ClickRepository.js` | 21 | `clickType` → `type: clickType` | 🔴 CRITIQUE |
| 3 | `server.js` | 734 | Décoder URI + vérifier `!resolvedPath.startsWith(publicDir)` | 🔴 CRITIQUE |
| 4 | `server.js` | 256-259 | Bloquer URLs non-http au lieu de préfixer `https://` | 🔴 CRITIQUE |
| 5 | DB (init.js) | — | Ajouter index sur `linkTempURL`, `linkFinalURL`, `modelName` | 🟠 HIGH |
| 6 | `server.js` | 61 | Ajouter pagination à `findAll()` | 🟠 HIGH |
| 7 | `repositories/ClickRepository.js` | 26-83 | Refactoriser en `getClicksByRange(finalURL, type, intervalSql)` | 🟡 MEDIUM |
| 8 | `repositories/VisitRepository.js` | 47-235 | Refactoriser en `aggregateByInterval(tempURL, intervalType)` | 🟡 MEDIUM |
| 9 | `server.js` | 691-695 | Valider `target` et `modelName` longueur | 🟡 MEDIUM |
| 10 | Nouveau fichier | — | Créer `constants/index.js` avec LINK_TYPES, VALID_FOLDERS, etc. | 🟢 LOW |
