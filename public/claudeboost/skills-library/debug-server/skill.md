---
name: debug-server
description: Débogue les erreurs serveur Node.js/Express — crash, erreur DB, route cassée.
---

Quand l'utilisateur dit "ça plante", "erreur 500", "le serveur crash", "route qui marche pas" :

1. Identifier le type d'erreur (from logs, message, contexte)
2. Checklist selon le type :

CRASH AU DÉMARRAGE :
  - JWT_SECRET manquant ou < 32 chars → process.exit(1)
  - CORS_ORIGIN absent → process.exit(1)
  - DB inaccessible → initSchema() crash
  - Passenger : voir startup.log

ERREUR DB :
  - Vérifier les requêtes paramétrées (pas d'interpolation)
  - ON DELETE CASCADE manquant sur FK ?
  - INSERT OR IGNORE → INSERT IGNORE INTO (MariaDB)

ROUTE 404/500 :
  - Route dans index.js ? Middleware auth avant ?
  - Paramètre mal typé ? Validation manquante ?

Toujours regarder les logs complets avant de modifier le code.
