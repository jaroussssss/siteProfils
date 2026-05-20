---
name: find-contact
description: Cherche l'email d'un contact dans Gmail par prénom/nom. Utilise le MCP Gmail prioritairement.
---

# Trouver l'email d'un contact

Quand l'utilisateur dit "envoie un mail à [prénom]" sans donner l'adresse, cherche d'abord dans Gmail avant de demander.

## Via MCP Gmail (prioritaire)

```
Outil : mcp__claude_ai_Gmail__search_threads
Query : "[prénom] OR [nom]" newer_than:12m
```

Parser les résultats pour extraire : `sender`, `toRecipients`, `ccRecipients`.
Choisir l'adresse qui correspond au prénom/nom mentionné (exclure `process.env.GMAIL_USER`).

## Via script local (fallback)

Si tu as un script `find-contact.js` configuré localement :
```bash
node "$GMAIL_SEARCH_SCRIPT" "[prénom]"
```

avec `GMAIL_SEARCH_SCRIPT` défini dans `~/.zprofile`.

## Règle

- Si 1 résultat → utiliser directement sans demander confirmation
- Si plusieurs résultats → afficher les options et demander lequel
- Si 0 résultat → demander l'email à l'utilisateur
- Toujours sauvegarder le contact trouvé en mémoire (`memory/user_[prénom].md`)
