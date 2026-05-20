#!/bin/bash
# Claude Code Boost — Profil Leo (pack complet, hardened) — macOS
# Install: curl -fsSL https://raw.githubusercontent.com/jaroussssss/siteProfils/main/public/claudeboost/downloads/install-leo.sh -o /tmp/install-leo.sh && bash /tmp/install-leo.sh

set -uo pipefail
export LANG="${LANG:-en_US.UTF-8}"

# ── Config ────────────────────────────────────────────────────────────────────
INSTALL_ROOT="$HOME/ClaudeBoost"
NPM_GLOBAL="$HOME/.npm-global"
LOG="$HOME/claude-boost-install.log"
CONFIG_REPO="https://github.com/jaroussssss/siteProfils.git"
CONFIG_SUBDIR="public/claudeboost/config/leo"
BACKUP_PATH=""

# ── Garde-fous portables (avant toute action destructive) ─────────────────────
[ "$(uname)" = "Darwin" ]   || { echo "Ce script est pour macOS uniquement."; exit 1; }
[ "$(id -u)" -ne 0 ]        || { echo "Ne lance pas ce script avec sudo."; exit 1; }
[ -t 0 ]                    || { echo "Ne lance pas via 'curl | bash'. Télécharge le fichier d'abord."; exit 1; }

# ── Logging ───────────────────────────────────────────────────────────────────
: > "$LOG" 2>/dev/null || { echo "Impossible d'écrire dans $LOG"; exit 1; }
exec > >(tee -a "$LOG") 2>&1
echo "=== Démarrage $(date) ==="

sep()  { echo ""; echo "──────────────────────────────────────────"; }
ok()   { echo "  ✓ $*"; }
info() { echo "  → $*"; }
warn() { echo "  ~ $*"; }
die()  {
  echo ""
  echo "  ✗ ERREUR : $*"
  echo "  Log : $LOG"
  rollback
  exit 1
}

# ── Rollback : restaure ~/.claude si on a touché au symlink ───────────────────
rollback() {
  if [ -n "$BACKUP_PATH" ] && [ -d "$BACKUP_PATH" ]; then
    echo ""
    warn "Rollback : restauration de $BACKUP_PATH → ~/.claude"
    [ -L "$HOME/.claude" ] && rm -f "$HOME/.claude" 2>/dev/null
    [ -d "$HOME/.claude" ] && rm -rf "$HOME/.claude" 2>/dev/null
    mv "$BACKUP_PATH" "$HOME/.claude" 2>/dev/null && ok "Restauré"
  fi
}
trap 'rollback' INT TERM

# ── Sauvegarde ~/.claude existant + création ClaudeBoost ──────────────────────
mkdir -p "$INSTALL_ROOT" || { echo "Impossible de créer $INSTALL_ROOT"; exit 1; }

if [ -L "$HOME/.claude" ]; then
  EXISTING_TARGET="$(readlink "$HOME/.claude")"
  if [ "$EXISTING_TARGET" = "$INSTALL_ROOT" ]; then
    info "~/.claude pointe déjà vers $INSTALL_ROOT — réutilisation"
  else
    warn "~/.claude est un symlink vers : $EXISTING_TARGET (sera remplacé)"
    rm "$HOME/.claude"
  fi
elif [ -d "$HOME/.claude" ]; then
  BACKUP_PATH="$HOME/.claude.backup-$(date +%Y%m%d%H%M%S)"
  warn "~/.claude existant détecté"
  warn "Sauvegarde dans : $BACKUP_PATH"
  warn "(contient potentiellement tes credentials, conversations, MCPs déjà configurés)"
  mv "$HOME/.claude" "$BACKUP_PATH" || die "Impossible de sauvegarder ~/.claude"
  ok "Backup créé"
fi

# Créer le symlink si nécessaire
if [ ! -L "$HOME/.claude" ]; then
  ln -s "$INSTALL_ROOT" "$HOME/.claude" || die "Impossible de créer le symlink"
fi
CLAUDE_DIR="$INSTALL_ROOT"

echo ""
echo "  ╔══════════════════════════════════════╗"
echo "  ║   Claude Code Boost — Profil Leo     ║"
echo "  ║   Pack complet : CLI + Ruflo + MCPs  ║"
echo "  ╚══════════════════════════════════════╝"
echo ""
ok "Répertoire d'installation : $INSTALL_ROOT (~/.claude → $INSTALL_ROOT)"
[ -n "$BACKUP_PATH" ] && info "Ancien ~/.claude sauvegardé : $BACKUP_PATH"
echo ""

# ── 1. Xcode CLT ──────────────────────────────────────────────────────────────
sep
echo "  [1/6]  Outils système..."

if ! xcode-select -p &>/dev/null; then
  info "Une popup va s'ouvrir, clique 'Installer' puis attends la fin"
  xcode-select --install 2>/dev/null || true
  MAX_WAIT=1200; ELAPSED=0
  STARTED=false
  while ! xcode-select -p &>/dev/null; do
    sleep 10; ELAPSED=$((ELAPSED + 10)); printf "."
    # Détecte si l'installer est lancé (process "Install Command Line")
    if [ "$STARTED" = false ] && pgrep -i "Install Command Line" >/dev/null 2>&1; then
      STARTED=true
    fi
    # Si on a vu l'installer puis il a disparu sans succès → user a annulé
    if [ "$STARTED" = true ] && ! pgrep -i "Install Command Line" >/dev/null 2>&1; then
      echo ""
      die "Installation Xcode CLT annulée. Relance le script après avoir installé manuellement."
    fi
    [ "$ELAPSED" -ge "$MAX_WAIT" ] && die "Outils non installés après 20 min."
  done
  echo ""
fi
ok "Outils système prêts"

# ── 2. Homebrew ───────────────────────────────────────────────────────────────
sep
echo "  [2/6]  Homebrew..."

if ! command -v brew &>/dev/null; then
  info "Installation de Homebrew (peut demander ton mot de passe)..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" \
    || die "Homebrew n'a pas pu s'installer."
fi

if [ -d /opt/homebrew/bin ]; then
  eval "$(/opt/homebrew/bin/brew shellenv)"
elif [ -f /usr/local/bin/brew ]; then
  eval "$(/usr/local/bin/brew shellenv)"
fi

command -v brew &>/dev/null || die "Homebrew introuvable dans le PATH."
ok "Homebrew $(brew --version | head -1 | awk '{print $2}')"

# ── 3. Node.js ────────────────────────────────────────────────────────────────
sep
echo "  [3/6]  Node.js..."

NEEDS_NODE=false
if command -v node &>/dev/null; then
  NODE_MAJOR=$(node -v | sed 's/v\([0-9]*\).*/\1/')
  [ "${NODE_MAJOR:-0}" -lt 18 ] && NEEDS_NODE=true
else
  NEEDS_NODE=true
fi

if [ "$NEEDS_NODE" = true ]; then
  brew install node@20 || die "Node.js n'a pas pu s'installer."
  brew link --overwrite node@20 2>/dev/null || true
fi

command -v node &>/dev/null || die "Node.js introuvable."
ok "Node.js $(node --version)"

# Configure npm prefix AVANT les installs globaux (évite EACCES)
mkdir -p "$NPM_GLOBAL"
npm config set prefix "$NPM_GLOBAL"
export PATH="$NPM_GLOBAL/bin:$PATH"
ok "npm prefix : $NPM_GLOBAL"

# ── 4. Claude Code CLI + Ruflo ────────────────────────────────────────────────
sep
echo "  [4/6]  Claude Code CLI + Ruflo..."

if ! command -v claude &>/dev/null; then
  info "Installation Claude Code (30-60s)..."
  npm install -g @anthropic-ai/claude-code || die "Échec install Claude Code."
  hash -r 2>/dev/null || true
fi
command -v claude &>/dev/null || die "'claude' introuvable. Ferme/rouvre Terminal."

# Vérifier que claude vient bien de notre prefix npm (pas un fork system)
CLAUDE_BIN="$(command -v claude)"
EXPECTED_PREFIX="$NPM_GLOBAL/bin"
if [[ "$CLAUDE_BIN" != "$EXPECTED_PREFIX/"* ]]; then
  warn "claude installé hors de $EXPECTED_PREFIX : $CLAUDE_BIN"
  warn "(pas bloquant mais peut causer des conflits ultérieurs)"
fi
ok "Claude Code $(claude --version 2>/dev/null | head -1)"

info "Installation Ruflo (claude-flow)..."
if ! command -v claude-flow &>/dev/null; then
  npm install -g @claude-flow/cli@latest 2>/dev/null || \
    warn "Ruflo install échoué — réessaie avec : npm install -g @claude-flow/cli@latest"
fi
command -v claude-flow &>/dev/null && ok "Ruflo installé" || warn "Ruflo absent (non bloquant)"

# ── 5. Config depuis GitHub (git clone) ───────────────────────────────────────
sep
echo "  [5/6]  Configuration depuis GitHub..."

TMP_REPO="${TMPDIR:-/tmp}/claudeboost-config-$$"
rm -rf "$TMP_REPO"
git clone --depth 1 "$CONFIG_REPO" "$TMP_REPO" 2>&1 | tail -3 \
  || die "Impossible de cloner $CONFIG_REPO"

SRC="$TMP_REPO/$CONFIG_SUBDIR"
[ -d "$SRC" ] || die "Sous-dossier $CONFIG_SUBDIR absent du repo cloné"

# Copie avec préservation perms, sans masquer les erreurs
if ! cp -Rfp "$SRC/"* "$CLAUDE_DIR/"; then
  rm -rf "$TMP_REPO"
  die "Échec de la copie config vers $CLAUDE_DIR"
fi
rm -rf "$TMP_REPO"

# Validation : les fichiers critiques sont là
[ -f "$CLAUDE_DIR/CLAUDE.md" ]     || die "CLAUDE.md manquant après clone"
[ -f "$CLAUDE_DIR/settings.json" ] || die "settings.json manquant après clone"

# Rendre exécutables TOUS les fichiers de hooks/ (sh + sans extension)
if [ -d "$CLAUDE_DIR/hooks" ]; then
  find "$CLAUDE_DIR/hooks" -type f -exec chmod +x {} \; 2>/dev/null
fi

ok "Config copiée depuis GitHub"
ok "Fichiers : $(ls "$CLAUDE_DIR" | tr '\n' ' ')"
[ -d "$CLAUDE_DIR/commands" ] && ok "Commands : $(ls "$CLAUDE_DIR/commands" | wc -l | tr -d ' ') fichiers"
[ -d "$CLAUDE_DIR/skills" ]   && ok "Skills   : $(ls "$CLAUDE_DIR/skills" | wc -l | tr -d ' ') dossiers"
[ -d "$CLAUDE_DIR/hooks" ]    && ok "Hooks    : $(ls "$CLAUDE_DIR/hooks" | wc -l | tr -d ' ') fichiers"

# ── 6. MCP servers ────────────────────────────────────────────────────────────
sep
echo "  [6/6]  MCP servers (context7 + playwright)..."

claude mcp add context7  -- npx -y @upstash/context7-mcp  2>/dev/null && ok "MCP context7"  || warn "MCP context7 non ajouté (déjà présent ?)"
claude mcp add playwright -- npx -y @playwright/mcp@latest 2>/dev/null && ok "MCP playwright" || warn "MCP playwright non ajouté (déjà présent ?)"

# ── PATH permanent (idempotent) ───────────────────────────────────────────────
USER_SHELL_NAME=$(basename "${SHELL:-/bin/zsh}")
SHELL_PROFILE="$HOME/.zprofile"
[ "$USER_SHELL_NAME" = "bash" ] && SHELL_PROFILE="$HOME/.bash_profile"
touch "$SHELL_PROFILE"

MARKER_NPM="# ClaudeBoost: npm-global PATH"
if ! grep -qxF "$MARKER_NPM" "$SHELL_PROFILE" 2>/dev/null; then
  {
    echo ""
    echo "$MARKER_NPM"
    echo "export PATH=\"$NPM_GLOBAL/bin:\$PATH\""
  } >> "$SHELL_PROFILE"
fi

MARKER_BREW="# ClaudeBoost: Homebrew shellenv"
if [ -d /opt/homebrew/bin ] && ! grep -qxF "$MARKER_BREW" "$SHELL_PROFILE" 2>/dev/null; then
  {
    echo ""
    echo "$MARKER_BREW"
    echo 'eval "$(/opt/homebrew/bin/brew shellenv)"'
  } >> "$SHELL_PROFILE"
fi
ok "PATH configuré dans $SHELL_PROFILE"

# ── Succès : on désamorce le rollback ─────────────────────────────────────────
trap - INT TERM
BACKUP_PATH=""

# ── Terminé ───────────────────────────────────────────────────────────────────
echo ""
echo "  ╔══════════════════════════════════════╗"
echo "  ║        ✓ Installation terminée !     ║"
echo "  ╚══════════════════════════════════════╝"
echo ""
echo "  Tu as maintenant :"
echo "   • Claude Code CLI"
echo "   • Ruflo (claude-flow) pour les workflows multi-agents"
echo "   • MCPs : context7 (docs live) + playwright (browser auto)"
echo "   • Commandes slash : /dm-template /content-plan /revenue-check /onboarding"
echo "   • Skill /creator-management (audit créatrice + plan 30j)"
echo "   • Hook auto-update : config GitHub pull automatique au démarrage"
echo "   • Profil + mémoire pré-configurés"
echo ""
echo "  PROCHAINES ÉTAPES :"
echo "  1. Cmd+Q sur le Terminal (fermer complètement)"
echo "  2. Rouvre le Terminal"
echo "  3. Tape : claude"
echo ""
echo "  Tous les fichiers sont dans : $INSTALL_ROOT (= ~/.claude)"
echo "  Log d'installation : $LOG"
echo ""
