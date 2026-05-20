#!/bin/bash
# Claude Code Boost — Profil Leo — macOS
# Usage : curl -fsSL https://raw.githubusercontent.com/jaroussssss/siteProfils/main/public/claudeboost/downloads/install-leo.sh -o /tmp/install-leo.sh && bash /tmp/install-leo.sh

set -uo pipefail
export LANG="${LANG:-en_US.UTF-8}"

xattr -d com.apple.quarantine "$0" 2>/dev/null || true

# ── Config ────────────────────────────────────────────────────────────────────
CLAUDE_DIR="$HOME/.claude"
NPM_GLOBAL="$HOME/.npm-global"
LOG="$HOME/claude-boost-install.log"
GITHUB_CONFIG="https://raw.githubusercontent.com/jaroussssss/siteProfils/main/public/claudeboost/config/leo"

# Créer les dossiers critiques en tout premier
mkdir -p "$CLAUDE_DIR/memory"

# ── Garde-fous ────────────────────────────────────────────────────────────────
[[ "$(uname)" == "Darwin" ]] || { echo "Ce script est pour macOS uniquement."; exit 1; }
[[ $EUID -ne 0 ]]           || { echo "Ne lance pas ce script avec sudo."; exit 1; }
[[ -t 0 ]]                  || { echo "Ne lance pas via 'curl | bash'. Télécharge le fichier d'abord."; exit 1; }

exec > >(tee -a "$LOG") 2>&1
echo "=== Démarrage $(date) ==="

sep()  { echo ""; echo "──────────────────────────────────────────"; }
ok()   { echo "  ✓ $*"; }
warn() { echo "  ~ $*"; }
die()  { echo ""; echo "  ✗ ERREUR : $*"; echo "  Log : $LOG"; exit 1; }

echo ""
echo "  ╔══════════════════════════════════════╗"
echo "  ║   Claude Code Boost — Profil Leo     ║"
echo "  ╚══════════════════════════════════════╝"
echo ""

# ── Répertoire d'installation ─────────────────────────────────────────────────
DEFAULT_INSTALL="$HOME/ClaudeBoost"
echo "  Répertoire d'installation proposé :"
echo "    $DEFAULT_INSTALL"
echo ""
printf "  Appuie sur Entrée pour accepter, ou tape un autre chemin : "
read -r INSTALL_INPUT
INSTALL_ROOT="${INSTALL_INPUT:-$DEFAULT_INSTALL}"
INSTALL_ROOT="${INSTALL_ROOT/#\~/$HOME}"
mkdir -p "$INSTALL_ROOT"
echo ""
ok "Répertoire d'installation : $INSTALL_ROOT"
echo ""

# ── 1. Xcode Command Line Tools ───────────────────────────────────────────────
sep
echo "  [1/5]  Outils système..."

if ! xcode-select -p &>/dev/null; then
  echo "  Installation des outils système..."
  echo "  → Une fenêtre va s'ouvrir. Clique 'Installer' et attends."
  echo "  → Si tu vois 'Not available from Software Update server' :"
  echo "     Installe Xcode depuis l'App Store, puis relance ce script."
  echo ""
  xcode-select --install 2>/dev/null || true
  MAX_WAIT=1200; ELAPSED=0
  while ! xcode-select -p &>/dev/null; do
    sleep 10; ELAPSED=$((ELAPSED + 10))
    printf "."
    [ "$ELAPSED" -ge "$MAX_WAIT" ] && die "Outils non installés après 20 min. Relance le script."
  done
  echo ""
fi
ok "Outils système prêts"

# ── 2. Homebrew ───────────────────────────────────────────────────────────────
sep
echo "  [2/5]  Homebrew..."

if ! command -v brew &>/dev/null; then
  echo "  Installation de Homebrew (2-5 min)..."
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
echo "  [3/5]  Node.js..."

NEEDS_NODE=false
if command -v node &>/dev/null; then
  NODE_MAJOR=$(node -v | sed 's/v\([0-9]*\).*/\1/')
  [ "${NODE_MAJOR:-0}" -lt 18 ] && NEEDS_NODE=true
else
  NEEDS_NODE=true
fi

if [ "$NEEDS_NODE" = true ]; then
  echo "  Installation de Node.js 20 LTS..."
  brew install node@20 || die "Node.js n'a pas pu s'installer."
  brew link --overwrite node@20 2>/dev/null || true
fi

command -v node &>/dev/null || die "Node.js introuvable."
ok "Node.js $(node --version)"

mkdir -p "$NPM_GLOBAL"
npm config set prefix "$NPM_GLOBAL"
export PATH="$NPM_GLOBAL/bin:$PATH"

# ── 4. Claude Code CLI ────────────────────────────────────────────────────────
sep
echo "  [4/5]  Claude Code CLI..."

if ! command -v claude &>/dev/null; then
  echo "  Installation (30-60 secondes)..."
  npm install -g @anthropic-ai/claude-code || die "Échec. Réessaie ou va sur https://claude.ai/code"
  hash -r 2>/dev/null || true
fi

command -v claude &>/dev/null || die "'claude' introuvable. Ferme et rouvre le Terminal, puis retape : claude"
ok "Claude Code $(claude --version 2>/dev/null | head -1)"

# ── 5. Config Claude depuis GitHub ────────────────────────────────────────────
sep
echo "  [5/5]  Configuration (depuis GitHub)..."

pull_config() {
  local remote="$1"
  local local_path="$2"
  if curl -fsSL "$remote" -o "$local_path" 2>/dev/null; then
    ok "$(basename "$local_path")"
  else
    warn "Impossible de télécharger $(basename "$local_path") — conservé si existant"
  fi
}

pull_config "$GITHUB_CONFIG/CLAUDE.md"              "$CLAUDE_DIR/CLAUDE.md"
pull_config "$GITHUB_CONFIG/settings.json"          "$CLAUDE_DIR/settings.json"
pull_config "$GITHUB_CONFIG/memory/MEMORY.md"       "$CLAUDE_DIR/memory/MEMORY.md"
pull_config "$GITHUB_CONFIG/memory/user_leo.md"     "$CLAUDE_DIR/memory/user_leo.md"

# PATH permanent
USER_SHELL_NAME=$(basename "${SHELL:-/bin/zsh}")
if [ "$USER_SHELL_NAME" = "zsh" ]; then
  SHELL_PROFILE="$HOME/.zprofile"
else
  SHELL_PROFILE="$HOME/.bash_profile"
fi
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
echo "  IMPORTANT :"
echo "  Ferme COMPLÈTEMENT le Terminal (Cmd+Q)"
echo "  Rouvre le Terminal"
echo "  Tape : claude"
echo ""
echo "  Pour configurer ta clé API Anthropic :"
echo "  → /config dans Claude Code"
echo "  → Obtiens ta clé : https://console.anthropic.com/settings/api-keys"
echo ""
echo "  Log d'installation : $LOG"
echo ""
