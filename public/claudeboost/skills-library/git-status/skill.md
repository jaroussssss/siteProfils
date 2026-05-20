---
name: git-status
description: Affiche un résumé lisible de l'état git du projet courant avec les branches, commits en attente et fichiers modifiés.
---

Quand l'utilisateur dit "état du projet", "qu'est-ce qui a changé", "résumé git" :

```bash
git status --short
git log --oneline -5
git branch -a | head -10
git diff --stat HEAD
```

Présenter le résultat en bullet points clairs, pas de dump brut.
