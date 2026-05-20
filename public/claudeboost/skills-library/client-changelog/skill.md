---
name: client-changelog
description: Génère un changelog lisible pour les clients depuis les derniers commits git. Sans jargon technique, style newsletter.
---

Quand l'utilisateur dit "changelog client", "nouveautés pour les clients", "résumé des mises à jour" :

1. Récupérer les commits récents :
```bash
git log --oneline --since="30 days ago"
# ou : git log --oneline -20
```

2. Filtrer et regrouper par catégorie :
   - Nouveau → feat:, add:, new:
   - Amélioration → improve:, perf:, refactor:
   - Correction → fix:, bug:
   - Sécurité → security:, auth:
   - Ignorer → chore:, ci:, test:, docs: internes

3. Rédiger en style newsletter, en français :
```
🚀 NonChalance — Nouveautés [mois année]

✨ Nouveau
• [description simple, bénéfice pour l'utilisateur]

⚡ Amélioration
• [ce qui est plus rapide / mieux]

🔐 Sécurité
• Mise à jour de sécurité [détails sur demande]
```

Règles :
- Jamais de noms de fichiers ou de fonctions dans le texte client
- Toujours formuler du point de vue de l'utilisateur ("vous pouvez maintenant...")
- Emojis pour rendre vivant
- Sauvegarder dans docs/CHANGELOG-client.md

Sauvegarder dans docs/ uniquement. Ne jamais modifier le code source.
