#!/bin/bash
# SessionStart hook — auto-update config Claude depuis GitHub
# Silencieux, ne bloque jamais Claude (timeout 8s côté settings)
# Préserve la mémoire user (memory/) et les credentials Claude (.credentials.json)

set +e

CLAUDE_DIR="$HOME/.claude"
CONFIG_REPO="https://github.com/jaroussssss/siteProfils.git"
CONFIG_SUBDIR="public/claudeboost/config/leo"
TMP_REPO="${TMPDIR:-/tmp}/claudeboost-update-$$"
LAST_UPDATE="$CLAUDE_DIR/.last-update"

# Validation pré-requis
command -v git >/dev/null 2>&1 || exit 0
[ -d "$CLAUDE_DIR" ] || exit 0

# Throttle : skip si dernière maj < 1h (portable BSD + GNU stat)
if [ -f "$LAST_UPDATE" ]; then
  LAST=$(stat -f %m "$LAST_UPDATE" 2>/dev/null || stat -c %Y "$LAST_UPDATE" 2>/dev/null || echo 0)
  NOW=$(date +%s)
  [ $((NOW - LAST)) -lt 3600 ] && exit 0
fi

# Clone silencieux
rm -rf "$TMP_REPO" 2>/dev/null
git clone --depth 1 --quiet "$CONFIG_REPO" "$TMP_REPO" >/dev/null 2>&1 || { rm -rf "$TMP_REPO"; exit 0; }

SRC="$TMP_REPO/$CONFIG_SUBDIR"
if [ ! -d "$SRC" ]; then
  rm -rf "$TMP_REPO"
  exit 0
fi

# Backup léger des fichiers qu'on va potentiellement écraser
BACKUP_DIR="$CLAUDE_DIR/.update-backup"
mkdir -p "$BACKUP_DIR"
[ -f "$CLAUDE_DIR/CLAUDE.md" ]     && cp -p "$CLAUDE_DIR/CLAUDE.md"     "$BACKUP_DIR/CLAUDE.md.prev"     2>/dev/null
[ -f "$CLAUDE_DIR/settings.json" ] && cp -p "$CLAUDE_DIR/settings.json" "$BACKUP_DIR/settings.json.prev" 2>/dev/null

# Copie avec préservation des permissions (-p)
# PAS la mémoire — données user. PAS .credentials.json — auth user.
cp -fp "$SRC/CLAUDE.md"     "$CLAUDE_DIR/CLAUDE.md"     2>/dev/null
cp -fp "$SRC/settings.json" "$CLAUDE_DIR/settings.json" 2>/dev/null

[ -d "$SRC/commands" ] && cp -Rfp "$SRC/commands" "$CLAUDE_DIR/" 2>/dev/null
[ -d "$SRC/skills" ]   && cp -Rfp "$SRC/skills"   "$CLAUDE_DIR/" 2>/dev/null
[ -d "$SRC/hooks" ]    && cp -Rfp "$SRC/hooks"    "$CLAUDE_DIR/" 2>/dev/null

# Initialiser memory/ uniquement si absent (cp -n no-clobber)
if [ -d "$SRC/memory" ]; then
  mkdir -p "$CLAUDE_DIR/memory"
  for f in "$SRC/memory"/*.md; do
    [ -f "$f" ] || continue
    [ -e "$CLAUDE_DIR/memory/$(basename "$f")" ] || cp -p "$f" "$CLAUDE_DIR/memory/" 2>/dev/null
  done
fi

# Garantir exécutable pour tous les hooks
if [ -d "$CLAUDE_DIR/hooks" ]; then
  find "$CLAUDE_DIR/hooks" -type f \( -name "*.sh" -o -perm -u+x \) -exec chmod +x {} \; 2>/dev/null
fi

rm -rf "$TMP_REPO"
date +%s > "$LAST_UPDATE"
exit 0
