#!/bin/bash
# install-leo.sh — Claude Code Boost (Profil Leo) — macOS
# Usage : bash ~/Downloads/install-leo.sh

set -euo pipefail

# ── Garde-fous ────────────────────────────────────────────────────────────────
[[ "$(uname)" == "Darwin" ]] || { echo "Ce script est pour macOS uniquement."; exit 1; }
[[ $EUID -ne 0 ]]           || { echo "Ne lance pas ce script avec sudo."; exit 1; }
[[ -t 0 ]]                  || { echo "Ne lance pas via 'curl | bash'. Télécharge le fichier d'abord."; exit 1; }

CLAUDE_DIR="$HOME/.claude"
NPM_GLOBAL="$HOME/.npm-global"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║     Claude Code Boosté — Profil Leo      ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ── 1. Xcode Command Line Tools ───────────────────────────────────────────────
echo "[1/5] Outils système (Xcode CLT)..."
if ! xcode-select -p &>/dev/null; then
  echo "  Installation requise — une fenêtre va s'ouvrir."
  echo "  Clique sur 'Installer', attends la fin (5-15 min), puis relance ce script."
  xcode-select --install 2>/dev/null || true
  echo ""
  echo "  Relance le script une fois Xcode CLT installé : bash ~/Downloads/install-leo.sh"
  exit 0
fi
echo "  ✓ Outils système OK"

# ── 2. Homebrew + Node.js ─────────────────────────────────────────────────────
echo "[2/5] Node.js..."

if ! command -v node &>/dev/null || [ "$(node -v | sed 's/v\([0-9]*\).*/\1/')" -lt 18 ]; then

  # Installer Homebrew si absent
  if ! command -v brew &>/dev/null; then
    echo "  Installation de Homebrew (gestionnaire de paquets)..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    # Activer brew dans le shell courant (Apple Silicon = /opt/homebrew, Intel = /usr/local)
    if [ -d /opt/homebrew/bin ]; then
      eval "$(/opt/homebrew/bin/brew shellenv)"
    else
      eval "$(/usr/local/bin/brew shellenv)"
    fi
  fi

  echo "  Installation de Node.js LTS (peut prendre 2-3 min)..."
  brew install node@20 2>/dev/null || brew upgrade node@20 2>/dev/null || true
  brew link --overwrite node@20 2>/dev/null || true

fi

node -v &>/dev/null || { echo "  ✗ Node.js toujours absent. Va sur https://nodejs.org et installe Node 20 LTS."; exit 1; }
echo "  ✓ Node.js $(node -v)"

# ── 3. Préfixe npm utilisateur (évite les erreurs de permission) ──────────────
echo "[3/5] Configuration npm..."
mkdir -p "$NPM_GLOBAL"
npm config set prefix "$NPM_GLOBAL"
export PATH="$NPM_GLOBAL/bin:$PATH"
echo "  ✓ Préfixe npm configuré dans $NPM_GLOBAL"

# ── 4. Claude Code CLI ────────────────────────────────────────────────────────
echo "[4/5] Claude Code CLI..."
if ! command -v claude &>/dev/null; then
  echo "  Installation (peut prendre 1-2 min)..."
  npm install -g @anthropic-ai/claude-code
fi

command -v claude &>/dev/null || {
  echo "  ✗ Claude Code installé mais introuvable dans le PATH."
  echo "  Ferme COMPLÈTEMENT le Terminal (Cmd+Q), rouvre-le, et retape : claude"
  exit 1
}
echo "  ✓ Claude Code $(claude --version 2>/dev/null | head -1)"

# ── 5. Profil CLAUDE.md + permissions + PATH persistant ──────────────────────
echo "[5/5] Configuration du profil..."
mkdir -p "$CLAUDE_DIR"

# Détecter le bon fichier shell
# macOS Terminal ouvre des LOGIN shells → .zprofile pour PATH, .zshrc pour aliases
USER_SHELL=$(dscl . -read "/Users/$USER" UserShell 2>/dev/null | awk '{print $2}' || echo "$SHELL")
case "$USER_SHELL" in
  */zsh)  SHELL_PROFILE="$HOME/.zprofile";  SHELL_RC="$HOME/.zshrc" ;;
  */bash) SHELL_PROFILE="$HOME/.bash_profile"; SHELL_RC="$HOME/.bash_profile" ;;
  *)      SHELL_PROFILE="$HOME/.profile";   SHELL_RC="$HOME/.profile" ;;
esac

# PATH npm persistent
touch "$SHELL_PROFILE"
if ! grep -q "npm-global" "$SHELL_PROFILE" 2>/dev/null; then
  { echo ""; echo "# Claude Code — npm global"; echo "export PATH=\"$NPM_GLOBAL/bin:\$PATH\""; } >> "$SHELL_PROFILE"
fi

# Homebrew persistent (Apple Silicon)
if [ -d /opt/homebrew/bin ] && ! grep -q "opt/homebrew" "$SHELL_PROFILE" 2>/dev/null; then
  echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> "$SHELL_PROFILE"
fi

# CLAUDE.md profil Leo
cat > "$CLAUDE_DIR/CLAUDE.md" << 'CLAUDEEOF'
# Profil Leo — Claude Code Boosté

## Comportement
- Réponses courtes et directes
- Code en anglais, messages en français
- Toujours demander avant merge/push vers main
- Jamais de token/secret affiché dans la réponse

## Configuration clé API
Tape dans Claude Code : /config
Ou définis ANTHROPIC_API_KEY dans ton shell.

## Commandes utiles
- /config    → configurer ta clé API
- /help      → liste des commandes
- /clear     → effacer le contexte
CLAUDEEOF

# Settings permissions
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

# Alias dans .zshrc uniquement (pas dans .zprofile)
touch "$SHELL_RC"
if ! grep -q "claude-leo" "$SHELL_RC" 2>/dev/null; then
  echo "" >> "$SHELL_RC"
  echo "# Claude Code profil" >> "$SHELL_RC"
  echo "alias claude-leo='claude'" >> "$SHELL_RC"
fi

echo "  ✓ Profil Leo configuré"
echo "  ✓ PATH configuré dans $SHELL_PROFILE"

# ── Terminé ───────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║         ✓ Installation terminée !        ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "ÉTAPE FINALE OBLIGATOIRE :"
echo "  Ferme COMPLÈTEMENT le Terminal (Cmd+Q)"
echo "  Rouvre le Terminal"
echo "  Tape : claude"
echo ""
echo "Pour configurer ta clé API Anthropic :"
echo "  /config"
echo "  (Obtiens ta clé sur https://console.anthropic.com/settings/api-keys)"
echo ""
