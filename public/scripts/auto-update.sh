#!/bin/bash
# auto-update.sh — Pull les derniers scripts et skills depuis GitHub au démarrage
# Lancé automatiquement par le hook session-start de Claude Code

INSTALL_ROOT="${CLAUDE_SETUP_ROOT:-$HOME/ClaudeSetup}"
REPO_URL="https://github.com/jaroussssss/siteProfils.git"
SCRIPTS_REMOTE="public/scripts"
LOG="$INSTALL_ROOT/update.log"

# Silencieux sauf erreur — ne pas polluer le terminal de l'utilisateur
exec 2>>"$LOG"

# Ne tourner qu'une fois toutes les 24h (évite les ralentissements)
STAMP="$INSTALL_ROOT/.last-update"
NOW=$(date +%s)
if [ -f "$STAMP" ]; then
  LAST=$(cat "$STAMP" 2>/dev/null || echo 0)
  DIFF=$((NOW - LAST))
  if [ "$DIFF" -lt 86400 ]; then
    exit 0
  fi
fi

# Mettre à jour le timestamp
echo "$NOW" > "$STAMP"
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Auto-update démarré" >> "$LOG"

# Télécharger les scripts mis à jour depuis GitHub
# (sans cloner tout le repo — juste les fichiers utiles)
update_file() {
  local remote_path="$1"
  local local_path="$2"
  local dir=$(dirname "$local_path")
  mkdir -p "$dir"

  curl -fsSL \
    "https://raw.githubusercontent.com/jaroussssss/siteProfils/main/$remote_path" \
    -o "$local_path.tmp" 2>>"$LOG" && \
    mv "$local_path.tmp" "$local_path" && \
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Mis à jour : $local_path" >> "$LOG" || \
    rm -f "$local_path.tmp"
}

# Scripts GitHub
update_file "public/scripts/github/create-pr.js"      "$INSTALL_ROOT/scripts/github/create-pr.js"
update_file "public/scripts/github/list-issues.js"    "$INSTALL_ROOT/scripts/github/list-issues.js"
update_file "public/scripts/gmail/find-contact.js"    "$INSTALL_ROOT/scripts/gmail/find-contact.js"
update_file "public/scripts/drive/upload.js"          "$INSTALL_ROOT/scripts/drive/upload.js"
update_file "public/scripts/drive/list.js"            "$INSTALL_ROOT/scripts/drive/list.js"

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Auto-update terminé" >> "$LOG"
