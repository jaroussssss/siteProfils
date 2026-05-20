---
name: explain-code
description: Explique une fonctionnalité, un bug ou une partie du code en français non-technique. Idéal en réunion ou pour un non-dev.
---

Quand l'utilisateur dit "explique-moi", "c'est quoi", "comment ça marche", "pourquoi ça bug" :

1. Identifier ce qui est demandé (feature, bug, module, route, comportement)
2. Lire les fichiers sources pertinents :
   - Features → `public/js/pages/`, `server/routes/`
   - Bugs → lire le code concerné + git log récent
   - Auth → `server/middleware/auth.js`
   - Notifs → `server/`, websocket/events
   - DB → schéma SQL

3. Répondre EN FRANÇAIS, langage simple, sans jargon technique :
   - Utiliser des analogies concrètes si besoin
   - Structurer : "Ce qui se passe → Pourquoi → Impact"
   - Mentionner les fichiers sources à la fin (entre parenthèses)
   - Si c'est un bug : préciser si c'est grave, si y'a un workaround, et l'effort de correction estimé

4. Format type :
```
[Titre clair]

[Explication en 3-5 lignes max, sans jargon]

✓ Ce qui marche bien
⚠ Ce qui pose problème (si applicable)

→ Source : [fichier:ligne]
→ Correction estimée : [durée] (si bug)
```

Toujours baser la réponse sur le code réel — jamais inventer.
