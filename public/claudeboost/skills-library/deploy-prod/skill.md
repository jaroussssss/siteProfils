---
name: deploy-prod
description: Déploie un site sur PlanetHoster (N0C) — git pull + npm install + restart Passenger.
---

Quand l'utilisateur dit "deploy", "pousse en prod", "met à jour le serveur" :

## Option A — via script local (si configuré)

```bash
bash "$DEPLOY_SCRIPT"
```

avec `DEPLOY_SCRIPT` défini dans `~/.zprofile`.

## Option B — SSH direct PlanetHoster N0C

```bash
ssh "$PROD_SSH_USER@$PROD_SSH_HOST" "cd $PROD_APP_DIR && git pull && npm install && touch tmp/restart.txt"
```

## Setup requis

Dans `~/.zprofile` :
```bash
export DEPLOY_SCRIPT="$HOME/scripts/deploy-planethoster.sh"  # optionnel si tu as un script perso
export PROD_SSH_USER="ton_user"
export PROD_SSH_HOST="node33-ca.planethosters.com"
export PROD_APP_DIR="ton-app-dir"
export PROD_URL="https://tonsite.fr"
```

## Après deploy

- Vérifier avec Playwright : `$PROD_URL`
- Si erreur Passenger → lancer le skill `check-prod`

## Alternative GitHub Actions

Si tu as un workflow Actions configuré, pousser sur la branche de prod déclenche le deploy auto.
