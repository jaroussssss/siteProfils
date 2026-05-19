#!/bin/bash
# Récupère le token GitHub depuis le credential store Windows
# Usage : TOKEN=$(bash get-token.sh) && echo $TOKEN
# Ou    : eval $(bash get-token.sh --export) puis $GITHUB_TOKEN

set -e

RAW=$(git credential fill <<EOF
protocol=https
host=github.com
EOF
)

TOKEN=$(echo "$RAW" | grep '^password=' | cut -d= -f2-)
USER=$(echo "$RAW" | grep '^username=' | cut -d= -f2-)

if [ -z "$TOKEN" ]; then
  echo "ERREUR: aucun token GitHub trouvé dans le credential store." >&2
  echo "Lance : git config --global credential.helper manager" >&2
  exit 1
fi

if [ "$1" = "--export" ]; then
  echo "export GITHUB_TOKEN=$TOKEN"
  echo "export GITHUB_USER=$USER"
elif [ "$1" = "--json" ]; then
  echo "{\"token\":\"$TOKEN\",\"user\":\"$USER\"}"
else
  echo "$TOKEN"
fi
