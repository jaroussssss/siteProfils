---
name: search-gmail
description: Recherche des threads dans Gmail et résume les résultats. Utilise le MCP Gmail.
---

Quand l'utilisateur dit "cherche dans mes mails", "est-ce que j'ai reçu un mail de", "quel était ce mail sur" :

```
Outil : mcp__claude_ai_Gmail__search_threads
Query : convertir la demande en syntaxe Gmail :
  - "from:prenom" pour les mails d'une personne
  - "subject:mot" pour les objets
  - "newer_than:7d" pour les récents
  - "has:attachment" pour les pièces jointes
```

Résumer les threads trouvés en bullet points clairs.
Pour lire un thread complet : mcp__claude_ai_Gmail__get_thread
