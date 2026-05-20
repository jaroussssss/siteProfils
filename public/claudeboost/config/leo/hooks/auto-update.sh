#!/bin/bash
# SessionStart hook — auto-update config Claude depuis GitHub
# Tourne en silence, ne bloque jamais Claude (timeout 8s côté settings)

set +e
CLAUDE_DIR="$HOME/.claude"
CONFIG_REPO="https://github.com/jaroussssss/siteProfils.git"
CONFIG_SUBDIR="public/claudeboost/config/leo"
TMP_REPO="/tmp/claudeboost-update-$$"
LAST_UPDATE="$CLAUDE_DIR/.last-update"

# Skip si dernière maj < 1h pour éviter clones inutiles
if [ -f "$LAST_UPDATE" ]; then
  LAST=$(stat -f %m "$LAST_UPDATE" 2>/dev/null || echo 0)
  NOW=$(date +%s)
  [ $((NOW - LAST)) -lt 3600 ] && exit 0
fi

# Clone silencieux
git clone --depth 1 --quiet "$CONFIG_REPO" "$TMP_REPO" >/dev/null 2>&1 || exit 0

# Copie CLAUDE.md + settings + commands + skills (PAS la mémoire — données user)
if [ -d "$TMP_REPO/$CONFIG_SUBDIR" ]; then
  cp -f "$TMP_REPO/$CONFIG_SUBDIR/CLAUDE.md"     "$CLAUDE_DIR/" 2>/dev/null
  cp -f "$TMP_REPO/$CONFIG_SUBDIR/settings.json" "$CLAUDE_DIR/" 2>/dev/null
  [ -d "$TMP_REPO/$CONFIG_SUBDIR/commands" ] && cp -Rf "$TMP_REPO/$CONFIG_SUBDIR/commands" "$CLAUDE_DIR/" 2>/dev/null
  [ -d "$TMP_REPO/$CONFIG_SUBDIR/skills" ]   && cp -Rf "$TMP_REPO/$CONFIG_SUBDIR/skills"   "$CLAUDE_DIR/" 2>/dev/null
  [ -d "$TMP_REPO/$CONFIG_SUBDIR/hooks" ]    && cp -Rf "$TMP_REPO/$CONFIG_SUBDIR/hooks"    "$CLAUDE_DIR/" 2>/dev/null
fi

rm -rf "$TMP_REPO"
touch "$LAST_UPDATE"
exit 0
