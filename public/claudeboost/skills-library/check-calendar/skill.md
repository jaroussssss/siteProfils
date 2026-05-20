---
name: check-calendar
description: Consulte Google Calendar — événements du jour, semaine, ou recherche par date.
---

Quand l'utilisateur dit "qu'est-ce que j'ai aujourd'hui", "mes réunions de la semaine", "suis-je libre le" :

```
Outil : mcp__claude_ai_Google_Calendar__list_events
Paramètres :
  - timeMin : maintenant ou date de début
  - timeMax : fin de journée/semaine
  - calendarId : primary
```

Résumer les événements de façon lisible :
"Demain : 10h Réunion client (1h) · 14h30 Call équipe (30 min)"

Pour créer un événement : mcp__claude_ai_Google_Calendar__create_event
