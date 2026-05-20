---
name: check-notifs
description: Vérifie l'état des notifications temps réel (WebSocket, events) dans NonChalanceApp. Diagnostique si quelque chose est cassé.
---

Quand l'utilisateur dit "vérifie les notifs", "les notifications marchent ?", "check le temps réel" :

1. Chercher dans le code les points clés WebSocket/events :
```bash
grep -r "WebSocket\|ws\.\|wss\.\|socket\|emit\|broadcast" server/ --include="*.js" -l
grep -r "reconnect\|setInterval\|heartbeat" server/ --include="*.js" -n
```

2. Vérifier les commits récents sur les fichiers de notifs :
```bash
git log --oneline -10 -- server/ | grep -i "notif\|websocket\|ws\|event\|socket"
```

3. Chercher les points de défaillance classiques :
   - Timer de reconnexion désactivé ou manquant
   - Listener jamais retiré (memory leak)
   - Heartbeat absent (connexion qui se coupe silencieusement)
   - Auth non vérifiée sur le socket

4. Rapport en français :
```
État des notifications temps réel

✓ / ✗  WebSocket server : [actif/inactif]
✓ / ✗  Reconnexion auto : [activée/désactivée]
✓ / ✗  Heartbeat : [présent/absent]
✓ / ✗  Auth sur socket : [vérifiée/non vérifiée]

Problèmes détectés :
[liste des problèmes avec fichier:ligne]

Dernier changement sur ce module :
[commit + date]

Recommandation :
[action à prendre]
```

Si un bug est trouvé, proposer de créer un ticket via `/create-ticket`.
