#!/bin/bash
# install-leo.sh — Claude Code Boost (Profil Leo) — macOS
# Usage : bash ~/Downloads/install-leo.sh
# Installe tout automatiquement : Homebrew, Node.js, Claude Code

set -uo pipefail
export LANG="${LANG:-en_US.UTF-8}"

# Retirer la quarantaine Gatekeeper si présente
xattr -d com.apple.quarantine "$0" 2>/dev/null || true

# ── Garde-fous ────────────────────────────────────────────────────────────────
[[ "$(uname)" == "Darwin" ]] || { echo "Ce script est pour macOS uniquement."; exit 1; }
[[ $EUID -ne 0 ]]           || { echo "Ne lance pas ce script avec sudo."; exit 1; }
[[ -t 0 ]]                  || { echo "Ne lance pas via 'curl | bash'. Télécharge le fichier d'abord."; exit 1; }

CLAUDE_DIR="$HOME/.claude"
NPM_GLOBAL="$HOME/.npm-global"
LOG="$HOME/claude-boost-install.log"

# Tout logger dans un fichier pour debug
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
if [ -z "$INSTALL_INPUT" ]; then
  INSTALL_ROOT="$DEFAULT_INSTALL"
else
  # Résoudre ~ manuellement si présent
  INSTALL_ROOT="${INSTALL_INPUT/#\~/$HOME}"
fi
echo ""
ok "Répertoire d'installation : $INSTALL_ROOT"
echo ""

# ── 1. Xcode Command Line Tools ───────────────────────────────────────────────
sep
echo "  [1/5]  Outils système..."

if ! xcode-select -p &>/dev/null; then
  echo "  Installation des outils Xcode (obligatoire)..."
  echo "  → Une fenêtre va s'ouvrir. Clique 'Installer' et attends."
  xcode-select --install 2>/dev/null || true
  echo ""
  echo "  En attente de la fin de l'installation Xcode..."
  while ! xcode-select -p &>/dev/null; do
    sleep 10
    printf "."
  done
  echo ""
fi
ok "Outils système prêts"

# ── 2. Homebrew ───────────────────────────────────────────────────────────────
sep
echo "  [2/5]  Homebrew..."

if ! command -v brew &>/dev/null; then
  echo "  Installation de Homebrew (peut prendre 2-5 min)..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" || \
    die "Homebrew n'a pas pu s'installer. Vérifie ta connexion internet."
fi

# Activer brew dans la session courante selon l'architecture
if [ -d /opt/homebrew/bin ]; then        # Apple Silicon (M1/M2/M3/M4)
  eval "$(/opt/homebrew/bin/brew shellenv)"
elif [ -f /usr/local/bin/brew ]; then    # Intel
  eval "$(/usr/local/bin/brew shellenv)"
fi

command -v brew &>/dev/null || die "Homebrew installé mais introuvable dans le PATH."
ok "Homebrew $(brew --version | head -1 | awk '{print $2}')"

# ── 3. Node.js ────────────────────────────────────────────────────────────────
sep
echo "  [3/5]  Node.js..."

NEEDS_NODE=false
if command -v node &>/dev/null; then
  NODE_MAJOR=$(node -v | sed 's/v\([0-9]*\).*/\1/')
  if [ "$NODE_MAJOR" -lt 18 ]; then
    warn "Node.js $NODE_MAJOR trop ancien — mise à jour requise"
    NEEDS_NODE=true
  fi
else
  NEEDS_NODE=true
fi

if [ "$NEEDS_NODE" = true ]; then
  echo "  Installation de Node.js 20 LTS..."
  brew install node@20 || die "Node.js n'a pas pu s'installer."
  brew link --overwrite node@20 2>/dev/null || true
fi

command -v node &>/dev/null || die "Node.js installé mais introuvable."
ok "Node.js $(node --version)"

# Préfixe npm utilisateur (évite EACCES sur macOS)
mkdir -p "$NPM_GLOBAL"
npm config set prefix "$NPM_GLOBAL"
export PATH="$NPM_GLOBAL/bin:$PATH"

# ── 4. Claude Code CLI ────────────────────────────────────────────────────────
sep
echo "  [4/5]  Claude Code CLI..."

if ! command -v claude &>/dev/null; then
  echo "  Installation (30-60 secondes)..."
  npm install -g @anthropic-ai/claude-code || die "Échec de l'installation. Réessaie ou va sur https://claude.ai/code"
  hash -r 2>/dev/null || true
fi

command -v claude &>/dev/null || die "'claude' introuvable après installation. Ferme et rouvre le Terminal, puis retape : claude"
ok "Claude Code $(claude --version 2>/dev/null | head -1)"

# ── 5. Configuration profil + PATH permanent ──────────────────────────────────
sep
echo "  [5/5]  Configuration..."

mkdir -p "$CLAUDE_DIR"

# Détecter le bon fichier de configuration shell
# macOS utilise zsh par défaut depuis Catalina (2019)
# Terminal.app ouvre des LOGIN shells → .zprofile pour PATH
USER_SHELL_NAME=$(basename "${SHELL:-/bin/zsh}")
if [ "$USER_SHELL_NAME" = "zsh" ]; then
  SHELL_PROFILE="$HOME/.zprofile"
  SHELL_RC="$HOME/.zshrc"
else
  SHELL_PROFILE="$HOME/.bash_profile"
  SHELL_RC="$HOME/.bash_profile"
fi

touch "$SHELL_PROFILE" "$SHELL_RC"

# Ajouter npm global au PATH de façon permanente
if ! grep -q "npm-global" "$SHELL_PROFILE" 2>/dev/null; then
  { echo ""; echo "# Claude Boost — npm global"; echo "export PATH=\"$NPM_GLOBAL/bin:\$PATH\""; } >> "$SHELL_PROFILE"
fi

# Homebrew sur Apple Silicon (doit être dans .zprofile)
if [ -d /opt/homebrew/bin ] && ! grep -q "opt/homebrew" "$SHELL_PROFILE" 2>/dev/null; then
  echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> "$SHELL_PROFILE"
fi

# CLAUDE.md profil Leo
cat > "$CLAUDE_DIR/CLAUDE.md" << 'CLAUDEEOF'
# Profil Leo — Claude Code Boost

## Comportement
- Réponses courtes et directes
- Code en anglais, messages en français
- Toujours demander avant merge/push vers main
- Jamais de token/secret affiché dans la réponse

## Premiers pas
Tape /help pour voir toutes les commandes disponibles.
Tape /config pour configurer ta clé API.
CLAUDEEOF

# Permissions
cat > "$CLAUDE_DIR/settings.json" << 'SETTINGSEOF'
{
  "permissions": {
    "allow": [
      "Bash(git *)", "Bash(node *)", "Bash(npm *)",
      "Bash(npx *)", "Bash(ls *)", "Bash(cat *)",
      "mcp__playwright__*", "mcp__context7__*"
    ],
    "deny": []
  }
}
SETTINGSEOF

ok "Profil Leo configuré"
ok "PATH mis à jour dans $SHELL_PROFILE"

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
