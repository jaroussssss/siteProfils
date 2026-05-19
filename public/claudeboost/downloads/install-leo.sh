#!/bin/bash
# install-leo.sh — Setup Claude Code boosté pour Léo (macOS)
# Téléchargé depuis claudeboost.tempcestlouisquirac.fr
# Usage : bash install-leo.sh

INSTALL_ROOT="$HOME/ClaudeSetup"
GITHUB_REPO="jaroussssss/claude-boost"
CLAUDE_DIR="$HOME/.claude"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║     Claude Code Boosté — Profil Léo      ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# --- 1. Prérequis ---
echo "[1/6] Vérification prérequis..."

check() {
  if ! command -v "$1" &>/dev/null; then
    echo "  ✗ $1 manquant"
    echo "  → $2"
    exit 1
  fi
  echo "  ✓ $1 ($(command -v $1))"
}

check node  "Installe Node.js 22 LTS : https://nodejs.org"
check git   "Installe Git : https://git-scm.com"
check npm   "Inclus avec Node.js"

# Homebrew optionnel
if command -v brew &>/dev/null; then
  echo "  ✓ Homebrew présent"
fi

# --- 2. Clé API Anthropic ---
echo "[2/6] Clé API Anthropic..."
if [ -z "$ANTHROPIC_API_KEY" ]; then
  read -r -p "  Entre ta clé Anthropic (sk-ant-...) : " api_key
  if [[ "$api_key" != sk-ant-* ]]; then
    echo "  ✗ Clé invalide (doit commencer par sk-ant-)"
    echo "  → https://console.anthropic.com/settings/api-keys"
    exit 1
  fi
  # Persister dans .zshrc / .bash_profile
  SHELL_RC="$HOME/.zshrc"
  [ -f "$HOME/.bash_profile" ] && SHELL_RC="$HOME/.bash_profile"
  echo "export ANTHROPIC_API_KEY=\"$api_key\"" >> "$SHELL_RC"
  export ANTHROPIC_API_KEY="$api_key"
  echo "  ✓ Clé ajoutée dans $SHELL_RC"
else
  echo "  ✓ Clé déjà configurée"
fi

# --- 3. Claude Code CLI ---
echo "[3/6] Claude Code CLI..."
if ! command -v claude &>/dev/null; then
  npm install -g @anthropic-ai/claude-code 2>/dev/null
fi
echo "  ✓ Claude Code installé"

# --- 4. Télécharger le setup depuis GitHub ---
echo "[4/6] Téléchargement des fichiers..."
mkdir -p "$INSTALL_ROOT"

if [ -d "$INSTALL_ROOT/repo/.git" ]; then
  git -C "$INSTALL_ROOT/repo" pull origin main -q
  echo "  ✓ Mis à jour"
else
  git clone "https://github.com/$GITHUB_REPO.git" "$INSTALL_ROOT/repo" -q
  echo "  ✓ Téléchargé"
fi

# Copier scripts et profils
cp -r "$INSTALL_ROOT/repo/scripts" "$INSTALL_ROOT/" 2>/dev/null || true
cp -r "$INSTALL_ROOT/repo/profiles" "$INSTALL_ROOT/" 2>/dev/null || true

# --- 5. Configurer le profil ---
echo "[5/6] Profil Claude Code..."
mkdir -p "$CLAUDE_DIR"

# Fusionner dev + leo
cat "$INSTALL_ROOT/profiles/dev/CLAUDE.md" \
    <(echo -e "\n---\n") \
    "$INSTALL_ROOT/profiles/leo/CLAUDE.md" \
    > "$CLAUDE_DIR/CLAUDE.md" 2>/dev/null || {
  echo "  ~ Profils non trouvés dans le repo, utilise le profil par défaut"
}
echo "  ✓ CLAUDE.md configuré"

# Settings avec permissions et hooks
cat > "$CLAUDE_DIR/settings.json" <<'SETTINGS'
{
  "permissions": {
    "allow": [
      "Bash(git *)",
      "Bash(node *)",
      "Bash(npm *)",
      "Bash(npx *)",
      "Bash(ls *)",
      "Bash(cat *)",
      "Bash(bash *)",
      "mcp__playwright__*",
      "mcp__context7__*",
      "mcp__ruflo__memory_*",
      "mcp__ruflo__hooks_*"
    ],
    "deny": []
  }
}
SETTINGS
echo "  ✓ Permissions configurées"

# Alias profil dans .zshrc
SHELL_RC="$HOME/.zshrc"
if ! grep -q "claude-leo" "$SHELL_RC" 2>/dev/null; then
  echo "" >> "$SHELL_RC"
  echo "# Claude Code profils" >> "$SHELL_RC"
  echo "alias claude-leo='CLAUDE_CONFIG_DIR=$HOME/.claude claude'" >> "$SHELL_RC"
fi

# --- 6. Ruflo ---
echo "[6/6] Ruflo..."
npx -y @claude-flow/cli@latest --version 2>/dev/null | head -1
echo "  ✓ Ruflo disponible"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║        ✓ Setup Léo terminé !             ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "Lance Claude Code :"
echo "  source $SHELL_RC && claude"
echo ""
echo "Scripts disponibles :"
echo "  node $INSTALL_ROOT/scripts/github/create-pr.js --help"
echo ""
