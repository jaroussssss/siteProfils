---
name: quick-commit
description: git add des fichiers modifiés + commit avec message auto basé sur les changements.
---

Quand l'utilisateur dit "commit ça", "enregistre", "sauvegarde les changements" :

1. `git status --short` pour voir les fichiers
2. `git diff --stat` pour comprendre les changements
3. Générer un message de commit conventionnel : "type: résumé court"
   - feat: nouvelle fonctionnalité
   - fix: correction de bug
   - docs: documentation
   - chore: maintenance
4. `git add <fichiers spécifiques>` (jamais git add -A)
5. `git commit -m "message"`

Ne JAMAIS pousser sur main/master sans confirmation explicite.
