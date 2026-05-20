---
name: freelance-brief
description: Génère un brief technique complet pour onboarder un freelance sur un module de NonChalanceApp.
---

Quand l'utilisateur dit "brief pour un freelance", "onboarde quelqu'un sur", "doc pour un nouveau dev" :

1. Identifier le module concerné (notifications, auth, dashboard, API, etc.)
2. Lire les fichiers pertinents du module
3. Générer un brief complet en Markdown :

```markdown
# Brief technique — [Module]

## Contexte
[Rôle du module dans l'app, en 2-3 phrases]

## Stack technique
- [Langage/framework côté serveur]
- [Langage/framework côté client]
- [Base de données, ORM]

## Architecture du module
[Description des fichiers clés et leur rôle]

## Comment ajouter / modifier [fonctionnalité type]
1. [Étape 1 avec fichier concerné]
2. [Étape 2]
3. [Étape 3]

## Conventions du projet
- Queries SQL : toujours paramétrées (`db.query('... WHERE id = ?', [id])`)
- Réponses API : `{ success: true, data: ... }` ou `{ success: false, error: "..." }`
- Messages utilisateur : en français
- Pas d'ORM, pas de bundler, pas de TypeScript

## Points d'attention
[Pièges connus, fichiers à ne pas toucher, dépendances critiques]

## Fichiers clés
- `server/[fichier]` — [rôle]
- `public/js/[fichier]` — [rôle]
```

4. Sauvegarder dans `docs/brief-[module]-[date].md`
5. Proposer d'envoyer par mail au freelance via `/send-mail`

Toujours baser sur le code réel. Sauvegarder dans docs/ uniquement.
