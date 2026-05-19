#!/bin/bash
#
# Installation Claude Code — Profil NonChalance (collaborateur documentation)
# Compatible : macOS 12+ (Monterey ou plus récent), Intel & Apple Silicon
# Repo cloné : https://github.com/jaroussssss/NonChalanceApp (PUBLIC, lecture seule)
#
# Utilisation : bash install-nonchalance.sh
#

set -uo pipefail
export LANG="${LANG:-en_US.UTF-8}"

xattr -d com.apple.quarantine "$0" 2>/dev/null || true

# ── Vérifications préalables ─────────────────────────────────────────────────
[[ "$(uname)" == "Darwin" ]] || { echo "Ce script fonctionne uniquement sur macOS."; exit 1; }
[[ $EUID -ne 0 ]]            || { echo "Ne lance pas avec sudo. Relance sans sudo."; exit 1; }
[[ -t 0 ]]                   || { echo "Télécharge le fichier puis lance-le, ne le pipe pas."; exit 1; }

MACOS_MAJOR=$(sw_vers -productVersion | cut -d. -f1)
if [ "${MACOS_MAJOR:-0}" -lt 12 ]; then
  echo "Ce script nécessite macOS 12 ou plus récent. Détecté : $(sw_vers -productVersion)"; exit 1
fi

# ── Variables ─────────────────────────────────────────────────────────────────
CLAUDE_DIR="$HOME/.claude"
NC_DIR="$HOME/NonChalanceApp"
NPM_GLOBAL="$HOME/.npm-global"
LOG="$HOME/claude-nonchalance-install.log"
REPO_URL="https://github.com/jaroussssss/NonChalanceApp.git"
ARCH=$(uname -m)
BREW_PREFIX=$([[ "$ARCH" = "arm64" ]] && echo "/opt/homebrew" || echo "/usr/local")

touch "$LOG" 2>/dev/null || { echo "Erreur : impossible d'écrire dans $HOME"; exit 1; }
exec > >(tee -a "$LOG") 2>&1
echo "=== Installation démarrée le $(date) ==="

sep()  { echo ""; echo "──────────────────────────────────────────"; }
info() { echo "  → $*"; }
ok()   { echo "  ✓ $*"; }
warn() { echo "  ~ $*"; }
die()  { echo ""; echo "  ✗ ERREUR : $*"; echo ""; echo "  Log : $LOG"; exit 1; }

refresh_path() {
  [ -d "$BREW_PREFIX/bin" ] && export PATH="$BREW_PREFIX/bin:$BREW_PREFIX/sbin:$PATH"
  [ -d "$NPM_GLOBAL/bin" ]  && export PATH="$NPM_GLOBAL/bin:$PATH"
  hash -r 2>/dev/null || true
}

clear 2>/dev/null || true
echo ""
echo "  ╔══════════════════════════════════════════╗"
echo "  ║  Claude Code — Collaborateur NonChalance  ║"
echo "  ║  Installation macOS ($ARCH)               ║"
echo "  ╚══════════════════════════════════════════╝"
echo ""
info "Durée estimée : 5 à 10 minutes. Laisse tourner."
info "Log : $LOG"

# ── 1. Xcode CLT ──────────────────────────────────────────────────────────────
sep
echo "  [1/5] Outils système Apple"

if xcode-select -p &>/dev/null && [ -e "$(xcode-select -p 2>/dev/null)" ]; then
  ok "Outils système déjà installés"
else
  info "Une fenêtre Apple va s'ouvrir. Clique 'Installer' et accepte la licence."
  info "Ne ferme PAS cette fenêtre du Terminal."
  xcode-select --install 2>/dev/null || true
  MAX_WAIT=1200; ELAPSED=0
  while ! xcode-select -p &>/dev/null; do
    sleep 5; ELAPSED=$((ELAPSED + 5))
    [ $((ELAPSED % 30)) -eq 0 ] && echo "  ... ($((ELAPSED / 60)) min)"
    [ "$ELAPSED" -ge "$MAX_WAIT" ] && die "Outils non installés après 20 min. Relance le script."
  done
  ok "Outils système installés"
fi

command -v git &>/dev/null || die "git introuvable après installation. Redémarre le Mac et relance."
ok "git $(git --version)"

# ── 2. Homebrew ───────────────────────────────────────────────────────────────
sep
echo "  [2/5] Homebrew"

if ! command -v brew &>/dev/null && [ ! -x "$BREW_PREFIX/bin/brew" ]; then
  info "Installation de Homebrew (peut demander ton mot de passe Mac)..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" \
    || die "Homebrew n'a pas pu être installé. Vérifie ta connexion et relance."
fi

if [ -x "$BREW_PREFIX/bin/brew" ]; then
  eval "$("$BREW_PREFIX/bin/brew" shellenv)"
elif [ -x "/usr/local/bin/brew" ]; then
  eval "$("/usr/local/bin/brew" shellenv)"
else
  die "Homebrew introuvable après installation. Ferme le Terminal et relance."
fi
ok "Homebrew $(brew --version | head -1)"

# ── 3. Node.js ────────────────────────────────────────────────────────────────
sep
echo "  [3/5] Node.js"

NEEDS_NODE=true
if command -v node &>/dev/null; then
  NODE_MAJOR=$(node -v 2>/dev/null | sed -n 's/^v\([0-9][0-9]*\).*/\1/p')
  if [ -n "$NODE_MAJOR" ] && [ "$NODE_MAJOR" -ge 18 ] 2>/dev/null; then
    NEEDS_NODE=false
    ok "Node.js $(node --version)"
  fi
fi

if [ "$NEEDS_NODE" = true ]; then
  info "Installation de Node.js 20 (3-5 min)..."
  brew install node@20 || die "Node.js n'a pas pu s'installer."
  brew link --overwrite --force node@20 2>/dev/null || true
  refresh_path
fi

mkdir -p "$NPM_GLOBAL"
npm config set prefix "$NPM_GLOBAL"
refresh_path
ok "Node.js $(node --version)"

# ── 4. Claude Code ────────────────────────────────────────────────────────────
sep
echo "  [4/5] Claude Code"

if ! command -v claude &>/dev/null; then
  info "Installation (2-3 min)..."
  npm install -g @anthropic-ai/claude-code || die "Claude Code n'a pas pu s'installer."
  refresh_path
fi
command -v claude &>/dev/null || die "Claude Code installé mais introuvable. Ferme le Terminal et relance."
ok "Claude Code installé"

# ── 5. NonChalanceApp (lecture seule) ─────────────────────────────────────────
sep
echo "  [5/5] NonChalanceApp"

if [ -d "$NC_DIR/.git" ]; then
  GIT_TERMINAL_PROMPT=0 git -C "$NC_DIR" pull --ff-only -q 2>/dev/null || warn "Mise à jour impossible (conservé tel quel)"
elif [ -d "$NC_DIR" ]; then
  BACKUP="$NC_DIR.backup-$(date +%Y%m%d-%H%M%S)"
  warn "Dossier existant sans git. Sauvegarde vers $BACKUP"
  mv "$NC_DIR" "$BACKUP"
  GIT_TERMINAL_PROMPT=0 git clone --depth 1 "$REPO_URL" "$NC_DIR" -q \
    || die "Clone impossible. Vérifie ta connexion et que $REPO_URL est accessible."
else
  info "Téléchargement depuis GitHub (1-2 min)..."
  GIT_TERMINAL_PROMPT=0 git clone --depth 1 "$REPO_URL" "$NC_DIR" -q \
    || die "Clone impossible. Vérifie ta connexion et que $REPO_URL est accessible."
fi
ok "NonChalanceApp dans $NC_DIR"

# Triple verrou anti-push
mkdir -p "$NC_DIR/.git/hooks"
cat > "$NC_DIR/.git/hooks/pre-push" << 'HOOKEOF'
#!/bin/sh
echo ""
echo "  ⛔ PUSH BLOQUÉ — Accès lecture seule (profil NonChalance)."
echo "  Propose tes modifications via une Pull Request sur GitHub."
echo ""
exit 1
HOOKEOF
chmod +x "$NC_DIR/.git/hooks/pre-push"
git -C "$NC_DIR" remote set-url --push origin "no-push://readonly" 2>/dev/null || true
echo "Ce dossier est en lecture seule." > "$NC_DIR/.READ_ONLY"
ok "Triple protection anti-push activée"

# ── Config shell + CLAUDE.md ──────────────────────────────────────────────────
mkdir -p "$CLAUDE_DIR"

USER_SHELL_NAME=$(basename "${SHELL:-/bin/zsh}")
if [ "$USER_SHELL_NAME" = "bash" ]; then
  PROFILES=("$HOME/.bash_profile" "$HOME/.bashrc")
else
  PROFILES=("$HOME/.zprofile" "$HOME/.zshrc")
fi

for PROFILE in "${PROFILES[@]}"; do
  touch "$PROFILE"
  grep -qF "$NPM_GLOBAL/bin" "$PROFILE" 2>/dev/null || \
    { echo ""; echo "export PATH=\"$NPM_GLOBAL/bin:\$PATH\""; } >> "$PROFILE"
  [ -x "$BREW_PREFIX/bin/brew" ] && ! grep -qF "$BREW_PREFIX/bin/brew shellenv" "$PROFILE" 2>/dev/null && \
    echo "eval \"\$($BREW_PREFIX/bin/brew shellenv)\"" >> "$PROFILE"
done
ok "PATH configuré"

cat > "$CLAUDE_DIR/CLAUDE.md" << 'CLAUDEEOF'
# Profil NonChalance — Collaborateur Documentation

## Rôle
Collaborateur documentation de NonChalanceApp.
Travail UNIQUEMENT sur les fichiers dans docs/.
JAMAIS de push vers origin.

## Règles
- Modifier uniquement les fichiers `.md` dans `docs/`
- Ne jamais exécuter `git push`, `git commit --amend`, `git reset --hard`
- Pour partager : créer un fichier `docs/suggestions/AAAA-MM-JJ_titre.md`

## Pour configurer ta clé API
Tape dans Claude Code : /config
CLAUDEEOF

# Substituer le chemin repo dans CLAUDE.md
NC_ESCAPED=$(printf '%s' "$NC_DIR" | sed 's/[\/&]/\\&/g')
sed -i.bak "s|REPO_PATH|$NC_DIR|g" "$CLAUDE_DIR/CLAUDE.md" 2>/dev/null || true
rm -f "$CLAUDE_DIR/CLAUDE.md.bak"

cat > "$CLAUDE_DIR/settings.json" << 'SETTINGSEOF'
{
  "permissions": {
    "allow": [
      "Bash(git pull)", "Bash(git pull *)",
      "Bash(git status)", "Bash(git status *)",
      "Bash(git log)", "Bash(git log *)",
      "Bash(git diff)", "Bash(git diff *)",
      "Bash(ls)", "Bash(ls *)",
      "Bash(cat *)"
    ],
    "deny": [
      "Bash(git push *)", "Bash(git commit *)",
      "Bash(git reset *)", "Bash(rm -rf *)", "Bash(sudo *)"
    ]
  }
}
SETTINGSEOF
ok "Profil NonChalance configuré"

# ── Terminé ───────────────────────────────────────────────────────────────────
sep
echo ""
echo "  ╔══════════════════════════════════════════╗"
echo "  ║     ✓ Installation terminée !            ║"
echo "  ╚══════════════════════════════════════════╝"
echo ""
echo "  Dossier : $NC_DIR"
echo "  Log     : $LOG"
echo ""
echo "  ÉTAPES FINALES :"
echo "  1. Ferme cette fenêtre Terminal (Cmd+Q)"
echo "  2. Rouvre le Terminal"
echo "  3. Tape :  cd ~/NonChalanceApp && claude"
echo "  4. Dans Claude Code : /config  (pour ta clé API)"
echo ""
