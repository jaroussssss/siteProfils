#!/bin/bash
# install-nonchalance.sh — Claude Code (Collaborateur NonChalance) — macOS
# Usage : bash ~/Downloads/install-nonchalance.sh

set -uo pipefail
export LANG="${LANG:-en_US.UTF-8}"

xattr -d com.apple.quarantine "$0" 2>/dev/null || true

[[ "$(uname)" == "Darwin" ]] || { echo "Ce script est pour macOS uniquement."; exit 1; }
[[ $EUID -ne 0 ]]           || { echo "Ne lance pas avec sudo."; exit 1; }
[[ -t 0 ]]                  || { echo "Télécharge le fichier, ne pipe pas."; exit 1; }

CLAUDE_DIR="$HOME/.claude"
NC_DIR="$HOME/NonChalanceApp"
NPM_GLOBAL="$HOME/.npm-global"
LOG="$HOME/claude-nonchalance-install.log"

exec > >(tee -a "$LOG") 2>&1
echo "=== Démarrage $(date) ==="

sep()  { echo ""; echo "──────────────────────────────────────────"; }
ok()   { echo "  ✓ $*"; }
die()  { echo ""; echo "  ✗ ERREUR : $*"; echo "  Log : $LOG"; exit 1; }

echo ""
echo "  ╔══════════════════════════════════════╗"
echo "  ║  Claude Code — Collaborateur         ║"
echo "  ║  NonChalance (docs uniquement)       ║"
echo "  ╚══════════════════════════════════════╝"
echo ""

# ── 1. Xcode CLT ──────────────────────────────────────────────────────────────
sep
echo "  [1/5]  Outils système..."
if ! xcode-select -p &>/dev/null; then
  echo "  → Une fenêtre va s'ouvrir. Clique 'Installer' et attends."
  xcode-select --install 2>/dev/null || true
  echo "  En attente..."
  while ! xcode-select -p &>/dev/null; do sleep 10; printf "."; done
  echo ""
fi
ok "Outils système prêts"

# ── 2. Homebrew ───────────────────────────────────────────────────────────────
sep
echo "  [2/5]  Homebrew + Node.js..."
if ! command -v brew &>/dev/null; then
  echo "  Installation de Homebrew..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" || \
    die "Homebrew n'a pas pu s'installer."
fi
[ -d /opt/homebrew/bin ] && eval "$(/opt/homebrew/bin/brew shellenv)" || \
  [ -f /usr/local/bin/brew ] && eval "$(/usr/local/bin/brew shellenv)" || true

NEEDS_NODE=false
command -v node &>/dev/null || NEEDS_NODE=true
if [ "$NEEDS_NODE" = false ] && [ "$(node -v | sed 's/v\([0-9]*\).*/\1/')" -lt 18 ]; then
  NEEDS_NODE=true
fi
if [ "$NEEDS_NODE" = true ]; then
  echo "  Installation de Node.js..."
  brew install node@20 || die "Node.js n'a pas pu s'installer."
  brew link --overwrite node@20 2>/dev/null || true
fi

mkdir -p "$NPM_GLOBAL"
npm config set prefix "$NPM_GLOBAL"
export PATH="$NPM_GLOBAL/bin:$PATH"
ok "Node.js $(node --version)"

# ── 3. Claude Code ────────────────────────────────────────────────────────────
sep
echo "  [3/5]  Claude Code CLI..."
if ! command -v claude &>/dev/null; then
  echo "  Installation (30-60 secondes)..."
  npm install -g @anthropic-ai/claude-code || die "Échec installation Claude Code."
  hash -r 2>/dev/null || true
fi
ok "Claude Code"

# ── 4. NonChalanceApp (lecture seule) ─────────────────────────────────────────
sep
echo "  [4/5]  NonChalanceApp..."
if [ -d "$NC_DIR/.git" ]; then
  GIT_TERMINAL_PROMPT=0 git -C "$NC_DIR" pull -q 2>/dev/null || true
  ok "NonChalanceApp mis à jour"
else
  GIT_TERMINAL_PROMPT=0 git clone https://github.com/jaroussssss/NonChalanceApp.git "$NC_DIR" -q || \
    die "Impossible de cloner NonChalanceApp. Vérifie ta connexion."
  ok "NonChalanceApp cloné dans $NC_DIR"
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
ok "Hook anti-push installé"

# ── 5. Configuration ──────────────────────────────────────────────────────────
sep
echo "  [5/5]  Configuration..."

mkdir -p "$CLAUDE_DIR"

USER_SHELL_NAME=$(basename "${SHELL:-/bin/zsh}")
SHELL_PROFILE="$HOME/.zprofile"
[ "$USER_SHELL_NAME" = "bash" ] && SHELL_PROFILE="$HOME/.bash_profile"
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
- Mettre à jour : git -C "$NC_DIR" pull

## Règles
1. Ne jamais suggérer git push vers origin
2. Ne modifier que docs/
3. Proposer les changements via Pull Request sur GitHub
CLAUDEEOF

cat > "$CLAUDE_DIR/settings.json" << 'SETTINGSEOF'
{
  "permissions": {
    "allow": ["Bash(git pull *)", "Bash(node *)", "Bash(ls *)", "Bash(cat *)"],
    "deny":  ["Bash(git push *)"]
  }
}
SETTINGSEOF

ok "Profil NonChalance configuré"
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
echo "  App clonée dans : $NC_DIR"
echo "  Configure ta clé API : /config"
echo "  → https://console.anthropic.com/settings/api-keys"
echo ""
