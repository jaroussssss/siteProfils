#!/bin/bash
# Claude Code Boost — Profil Leo (pack complet) — macOS
# Install: curl -fsSL https://raw.githubusercontent.com/jaroussssss/siteProfils/main/public/claudeboost/downloads/install-leo.sh -o /tmp/install-leo.sh && bash /tmp/install-leo.sh

set -uo pipefail
export LANG="${LANG:-en_US.UTF-8}"

xattr -d com.apple.quarantine "$0" 2>/dev/null || true

# ── Config ────────────────────────────────────────────────────────────────────
INSTALL_ROOT="$HOME/ClaudeBoost"
NPM_GLOBAL="$HOME/.npm-global"
LOG="$HOME/claude-boost-install.log"
CONFIG_REPO="https://github.com/jaroussssss/siteProfils.git"
CONFIG_SUBDIR="public/claudeboost/config/leo"

# Créer ClaudeBoost + symlink ~/.claude en tout premier
mkdir -p "$INSTALL_ROOT"
if [ -L "$HOME/.claude" ]; then
  rm "$HOME/.claude"
elif [ -d "$HOME/.claude" ]; then
  mv "$HOME/.claude" "$HOME/.claude.backup-$(date +%Y%m%d%H%M%S)"
fi
ln -s "$INSTALL_ROOT" "$HOME/.claude"
CLAUDE_DIR="$INSTALL_ROOT"

# ── Garde-fous ────────────────────────────────────────────────────────────────
[[ "$(uname)" == "Darwin" ]] || { echo "Ce script est pour macOS uniquement."; exit 1; }
[[ $EUID -ne 0 ]]            || { echo "Ne lance pas ce script avec sudo."; exit 1; }
[[ -t 0 ]]                   || { echo "Ne lance pas via 'curl | bash'. Télécharge le fichier d'abord."; exit 1; }

exec > >(tee -a "$LOG") 2>&1
echo "=== Démarrage $(date) ==="

sep()  { echo ""; echo "──────────────────────────────────────────"; }
ok()   { echo "  ✓ $*"; }
warn() { echo "  ~ $*"; }
die()  { echo ""; echo "  ✗ ERREUR : $*"; echo "  Log : $LOG"; exit 1; }

echo ""
echo "  ╔══════════════════════════════════════╗"
echo "  ║   Claude Code Boost — Profil Leo     ║"
echo "  ║   Pack complet : CLI + Ruflo + MCPs  ║"
echo "  ╚══════════════════════════════════════╝"
echo ""
ok "Répertoire d'installation : $INSTALL_ROOT (symlink ← ~/.claude)"
echo ""

# ── 1. Xcode CLT ──────────────────────────────────────────────────────────────
sep
echo "  [1/6]  Outils système..."

if ! xcode-select -p &>/dev/null; then
  echo "  → Une fenêtre va s'ouvrir, clique 'Installer'."
  xcode-select --install 2>/dev/null || true
  MAX_WAIT=1200; ELAPSED=0
  while ! xcode-select -p &>/dev/null; do
    sleep 10; ELAPSED=$((ELAPSED + 10)); printf "."
    [ "$ELAPSED" -ge "$MAX_WAIT" ] && die "Outils non installés après 20 min."
  done
  echo ""
fi
ok "Outils système prêts"

# ── 2. Homebrew ───────────────────────────────────────────────────────────────
sep
echo "  [2/6]  Homebrew..."

if ! command -v brew &>/dev/null; then
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" || \
    die "Homebrew n'a pas pu s'installer."
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

mkdir -p "$NPM_GLOBAL"
npm config set prefix "$NPM_GLOBAL"
export PATH="$NPM_GLOBAL/bin:$PATH"

# ── 4. Claude Code CLI + Ruflo ────────────────────────────────────────────────
sep
echo "  [4/6]  Claude Code CLI + Ruflo..."

if ! command -v claude &>/dev/null; then
  echo "  Installation Claude Code (30-60s)..."
  npm install -g @anthropic-ai/claude-code || die "Échec install Claude Code."
  hash -r 2>/dev/null || true
fi
command -v claude &>/dev/null || die "'claude' introuvable. Ferme/rouvre Terminal."
ok "Claude Code $(claude --version 2>/dev/null | head -1)"

echo "  Installation Ruflo (claude-flow)..."
if ! command -v claude-flow &>/dev/null; then
  npm install -g @claude-flow/cli@latest 2>/dev/null || \
    warn "Ruflo install échoué — tu pourras le réessayer avec : npm install -g @claude-flow/cli@latest"
fi
command -v claude-flow &>/dev/null && ok "Ruflo installé" || warn "Ruflo absent (non bloquant)"

# ── 5. Config depuis GitHub (git clone) ───────────────────────────────────────
sep
echo "  [5/6]  Configuration depuis GitHub..."

TMP_REPO="/tmp/claudeboost-config-$$"
rm -rf "$TMP_REPO"
if git clone --depth 1 "$CONFIG_REPO" "$TMP_REPO" 2>/dev/null; then
  cp -R "$TMP_REPO/$CONFIG_SUBDIR/"* "$CLAUDE_DIR/" 2>/dev/null
  rm -rf "$TMP_REPO"
  # Rendre exécutables tous les hooks
  [ -d "$CLAUDE_DIR/hooks" ] && chmod +x "$CLAUDE_DIR/hooks/"*.sh 2>/dev/null
  ok "Config copiée depuis GitHub"
  ok "Fichiers : $(ls "$CLAUDE_DIR" | tr '\n' ' ')"
else
  die "Impossible de cloner $CONFIG_REPO"
fi

# ── 6. MCP servers ────────────────────────────────────────────────────────────
sep
echo "  [6/6]  MCP servers (context7 + playwright)..."

claude mcp add context7 -- npx -y @upstash/context7-mcp 2>/dev/null && ok "MCP context7" || warn "MCP context7 non ajouté"
claude mcp add playwright -- npx -y @playwright/mcp@latest 2>/dev/null && ok "MCP playwright" || warn "MCP playwright non ajouté"

# ── PATH permanent ────────────────────────────────────────────────────────────
USER_SHELL_NAME=$(basename "${SHELL:-/bin/zsh}")
SHELL_PROFILE="$HOME/.zprofile"
[ "$USER_SHELL_NAME" = "bash" ] && SHELL_PROFILE="$HOME/.bash_profile"
touch "$SHELL_PROFILE"
grep -q "npm-global" "$SHELL_PROFILE" 2>/dev/null || \
  { echo ""; echo "export PATH=\"$NPM_GLOBAL/bin:\$PATH\""; } >> "$SHELL_PROFILE"
[ -d /opt/homebrew/bin ] && ! grep -q "opt/homebrew" "$SHELL_PROFILE" 2>/dev/null && \
  echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> "$SHELL_PROFILE"
ok "PATH configuré dans $SHELL_PROFILE"

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
echo "  Tous les fichiers sont dans : $INSTALL_ROOT"
echo "  Log : $LOG"
echo ""
