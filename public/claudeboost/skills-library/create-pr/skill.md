---
name: create-pr
description: Crée une Pull Request GitHub sur le repo courant via gh CLI.
---

Quand l'utilisateur dit "crée une PR", "ouvre une pull request", "propose les changements" :

```bash
# Récupère la branche courante
BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Crée la PR
gh pr create \
  --title "type: description" \
  --body "Description des changements" \
  --head "$BRANCH" \
  --base main
```

## Prérequis

- `gh` CLI installé (`brew install gh` sur Mac)
- Auth GitHub : `gh auth login` (une seule fois)

## Convention de titre

`type: description` où type ∈ {feat, fix, chore, docs, refactor, test}

Exemples :
- `feat: ajoute le hook auto-update`
- `fix: corrige le mkdir trop tard sur Mac`
- `docs: README setup install`

Le body devrait inclure :
- Résumé en 1-2 phrases
- Test plan (checklist markdown)
- Issues liées (`Fixes #123`)
