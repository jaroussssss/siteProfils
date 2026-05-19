#!/bin/bash
# auto-update.sh — Pull les derniers scripts depuis GitHub au démarrage de session
# Lancé par le hook SessionStart de Claude Code.

set -euo pipefail

# Détecter le répertoire d'installation à partir du chemin de ce script (pas $HOME)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_ROOT="${CLAUDE_SETUP_ROOT:-$(dirname "$SCRIPT_DIR")}"

LOG="$INSTALL_ROOT/update.log"
STAMP="$INSTALL_ROOT/.last-update"

# Créer le dossier si besoin (Windows : peut ne pas exister au premier lancement)
mkdir -p "$INSTALL_ROOT"

# Rediriger stderr vers le log seulement après que le dossier existe
exec 2>>"$LOG"

# Vérifier curl disponible
if ! command -v curl &>/dev/null; then
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] SKIP: curl non disponible" >> "$LOG"
  exit 0
fi

# Throttle : une fois toutes les 24h maximum
NOW=$(date +%s)
if [ -f "$STAMP" ]; then
  LAST=$(cat "$STAMP" 2>/dev/null || echo "0")
  # Valider que LAST est un entier
  [[ "$LAST" =~ ^[0-9]+$ ]] || LAST=0
  DIFF=$((NOW - LAST))
  if [ "$DIFF" -lt 86400 ]; then
    exit 0
  fi
fi

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Auto-update démarré (INSTALL_ROOT=$INSTALL_ROOT)" >> "$LOG"

UPDATED=0

update_file() {
  local remote_path="$1"
  local local_path="$2"
  local dir
  dir=$(dirname "$local_path")
  mkdir -p "$dir"

  local tmp="$local_path.tmp"

  # Télécharger avec timeout
  if curl -fsSL \
    --max-time 30 \
    --connect-timeout 10 \
    "https://raw.githubusercontent.com/jaroussssss/siteProfils/main/$remote_path" \
    -o "$tmp" 2>>"$LOG"; then

    # Vérifier que le fichier n'est pas vide (proxy transparent, erreur réseau silencieuse)
    if [ -s "$tmp" ]; then
      mv "$tmp" "$local_path"
      echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Mis à jour : $local_path" >> "$LOG"
      UPDATED=$((UPDATED + 1))
    else
      rm -f "$tmp"
      echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] WARN: fichier vide reçu pour $remote_path" >> "$LOG"
    fi
  else
    rm -f "$tmp"
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] WARN: échec téléchargement $remote_path" >> "$LOG"
  fi
}

# Scripts à mettre à jour
update_file "public/scripts/github/create-pr.js"   "$INSTALL_ROOT/scripts/github/create-pr.js"
update_file "public/scripts/github/list-issues.js" "$INSTALL_ROOT/scripts/github/list-issues.js"
update_file "public/scripts/gmail/find-contact.js" "$INSTALL_ROOT/scripts/gmail/find-contact.js"
update_file "public/scripts/drive/upload.js"       "$INSTALL_ROOT/scripts/drive/upload.js"
update_file "public/scripts/drive/list.js"         "$INSTALL_ROOT/scripts/drive/list.js"
update_file "public/hooks/_stdin.js"               "$INSTALL_ROOT/hooks/_stdin.js"
update_file "public/hooks/guard-bash.js"           "$INSTALL_ROOT/hooks/guard-bash.js"
update_file "public/hooks/guard-write.js"          "$INSTALL_ROOT/hooks/guard-write.js"
update_file "public/hooks/syntax-check.js"         "$INSTALL_ROOT/hooks/syntax-check.js"
update_file "public/hooks/auto-push.js"            "$INSTALL_ROOT/hooks/auto-push.js"

# Écrire le stamp UNIQUEMENT si au moins un fichier a été mis à jour avec succès
if [ "$UPDATED" -gt 0 ]; then
  echo "$NOW" > "$STAMP"
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Auto-update terminé ($UPDATED fichier(s) mis à jour)" >> "$LOG"
else
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Auto-update terminé (aucun changement)" >> "$LOG"
  # Écrire quand même le stamp pour éviter de re-tenter toutes les 24h si tout est déjà à jour
  echo "$NOW" > "$STAMP"
fi
