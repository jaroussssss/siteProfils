---
name: generate-doc
description: Génère de la documentation depuis le code — README, changelog, spec technique, guide utilisateur.
---

Quand l'utilisateur dit "génère la doc", "écris le README", "fait le changelog" :

1. Identifier le type de doc demandé :
   - README → structure projet, installation, usage
   - Changelog → derniers commits en langage client
   - Spec technique → architecture, routes API, schéma DB
   - Guide utilisateur → étapes d'utilisation sans jargon

2. Lire les fichiers sources pertinents (server/, public/, package.json, schema.sql)

3. Générer le document en Markdown

4. Sauvegarder dans docs/ (ne pas modifier le code source)

Toujours vérifier que le doc reflète ce qui est réellement implémenté, pas ce qui était prévu.
