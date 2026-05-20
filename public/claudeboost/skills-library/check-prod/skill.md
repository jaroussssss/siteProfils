---
name: check-prod
description: Vérifie si un site en prod est opérationnel et diagnostique les erreurs Passenger (PlanetHoster N0C).
---

Quand l'utilisateur dit "la prod est ko", "vérifie le site", "est-ce que ça marche" :

1. Playwright → naviguer vers `$PROD_URL` (env var)
2. Si erreur Passenger → lancer le diagnostic via `$CHECK_PROD_SCRIPT` (env var, optionnel)
3. Checklist rapide :
   - `public_html` vide ?
   - `.htaccess` présent dans `public/` ?
   - `.env` complet (JWT_SECRET 32+ chars, CORS_ORIGIN, DB_*) ?
   - Serveur attendu : voir `$PROD_SERVER` (env var)

## Setup requis

Dans `~/.zprofile` :
```bash
export PROD_URL="https://tonsite.fr"
export PROD_SERVER="node33-ca.planethosters.com"
export CHECK_PROD_SCRIPT="$HOME/scripts/check-prod.sh"  # optionnel
```

Pour un diagnostic SSH manuel sur PlanetHoster N0C : voir doc PlanetHoster Passenger.
