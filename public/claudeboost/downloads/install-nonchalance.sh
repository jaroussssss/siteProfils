#!/bin/bash
# install-nonchalance.sh — Claude Code (Collaborateur NonChalance) — macOS
# Usage : bash ~/Downloads/install-nonchalance.sh
# Accès documentation uniquement, jamais de push

set -euo pipefail

[[ "$(uname)" == "Darwin" ]] || { echo "Ce script est pour macOS uniquement."; exit 1; }
[[ $EUID -ne 0 ]]           || { echo "Ne lance pas avec sudo."; exit 1; }
[[ -t 0 ]]                  || { echo "Télécharge le fichier, ne pipe pas."; exit 1; }

CLAUDE_DIR="$HOME/.claude"
NC_DIR="$HOME/NonChalanceApp"
NPM_GLOBAL="$HOME/.npm-global"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  Claude Code — Collaborateur NonChalance  ║"
echo "╚══════════════════════════════════════════╝"
echo "  Accès documentation uniquement"
echo ""

# ── 1. Xcode CLT ──────────────────────────────────────────────────────────────
echo "[1/4] Outils système..."
if ! xcode-select -p &>/dev/null; then
  echo "  Installation requise — une fenêtre va s'ouvrir."
  echo "  Clique 'Installer', attends la fin, puis relance : bash ~/Downloads/install-nonchalance.sh"
  xcode-select --install 2>/dev/null || true
  exit 0
fi
echo "  ✓ Outils système OK"

# ── 2. Node.js ────────────────────────────────────────────────────────────────
echo "[2/4] Node.js..."
if ! command -v node &>/dev/null || [ "$(node -v | sed 's/v\([0-9]*\).*/\1/')" -lt 18 ]; then
  if ! command -v brew &>/dev/null; then
    echo "  Installation de Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    if [ -d /opt/homebrew/bin ]; then
      eval "$(/opt/homebrew/bin/brew shellenv)"
    else
      eval "$(/usr/local/bin/brew shellenv)"
    fi
  fi
  echo "  Installation de Node.js LTS..."
  brew install node@20 2>/dev/null || brew upgrade node@20 2>/dev/null || true
  brew link --overwrite node@20 2>/dev/null || true
fi
mkdir -p "$NPM_GLOBAL"
npm config set prefix "$NPM_GLOBAL"
export PATH="$NPM_GLOBAL/bin:$PATH"
echo "  ✓ Node.js $(node -v)"

# ── 3. Claude Code + cloner NonChalanceApp ────────────────────────────────────
echo "[3/4] Claude Code + NonChalanceApp..."

if ! command -v claude &>/dev/null; then
  echo "  Installation Claude Code..."
  npm install -g @anthropic-ai/claude-code
fi
echo "  ✓ Claude Code"

if [ -d "$NC_DIR/.git" ]; then
  git -C "$NC_DIR" pull origin main -q 2>/dev/null || true
  echo "  ✓ NonChalanceApp mis à jour"
else
  GIT_TERMINAL_PROMPT=0 git clone https://github.com/jaroussssss/NonChalanceApp.git "$NC_DIR" -q
  echo "  ✓ NonChalanceApp cloné dans $NC_DIR"
fi

# Hook anti-push
cat > "$NC_DIR/.git/hooks/pre-push" << 'HOOKEOF'
#!/bin/sh
echo ""
echo "⛔  Push bloqué — profil NonChalance (lecture seule)."
echo "    Propose tes modifications via une Pull Request sur GitHub."
echo ""
exit 1
HOOKEOF
chmod +x "$NC_DIR/.git/hooks/pre-push"
echo "  ✓ Hook anti-push installé"

# ── 4. Profil CLAUDE.md + PATH ────────────────────────────────────────────────
echo "[4/4] Profil..."
mkdir -p "$CLAUDE_DIR"

# Détecter shell et profil
USER_SHELL=$(dscl . -read "/Users/$USER" UserShell 2>/dev/null | awk '{print $2}' || echo "$SHELL")
case "$USER_SHELL" in
  */zsh)  SHELL_PROFILE="$HOME/.zprofile" ;;
  */bash) SHELL_PROFILE="$HOME/.bash_profile" ;;
  *)      SHELL_PROFILE="$HOME/.profile" ;;
esac

touch "$SHELL_PROFILE"
if ! grep -q "npm-global" "$SHELL_PROFILE" 2>/dev/null; then
  { echo ""; echo "export PATH=\"$NPM_GLOBAL/bin:\$PATH\""; } >> "$SHELL_PROFILE"
fi
if [ -d /opt/homebrew/bin ] && ! grep -q "opt/homebrew" "$SHELL_PROFILE" 2>/dev/null; then
  echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> "$SHELL_PROFILE"
fi

cat > "$CLAUDE_DIR/CLAUDE.md" << CLAUDEEOF
# Profil NonChalance — Documentation uniquement

## Rôle
Collaborateur documentation de NonChalanceApp.
Travail UNIQUEMENT sur les fichiers dans docs/.
JAMAIS de push direct vers origin.

## Repo local
- Dossier : $NC_DIR
- Mettre à jour : git -C $NC_DIR pull origin main

## Règles
1. Ne jamais suggérer git push vers origin
2. Ne modifier que docs/
3. Proposer les changements via Pull Request sur GitHub

## Pour configurer ta clé API
Tape dans Claude Code : /config
CLAUDEEOF

cat > "$CLAUDE_DIR/settings.json" << 'SETTINGSEOF'
{
  "permissions": {
    "allow": ["Bash(git pull *)", "Bash(node *)", "Bash(ls *)", "Bash(cat *)"],
    "deny":  ["Bash(git push *)"]
  }
}
SETTINGSEOF

echo "  ✓ Profil NonChalance configuré"

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
echo "App clonée dans : $NC_DIR"
echo "Configure ta clé API dans Claude Code : /config"
echo ""
