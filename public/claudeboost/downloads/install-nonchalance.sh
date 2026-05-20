#!/bin/bash
#
# Installation Claude Code — Profil NonChalance (collaborateur documentation)
# Architecture : hub centralisé claude-hub (profils + skills + sync auto)
# Compatible   : macOS 12+ (Monterey ou plus récent), Intel & Apple Silicon
# Repo cloné   : https://github.com/jaroussssss/NonChalanceApp (PUBLIC, lecture seule)
# Hub source   : https://github.com/jaroussssss/claude-hub (PUBLIC)
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
HUB_DIR="$HOME/.claude-hub"
NC_DIR="$HOME/NonChalanceApp"
NPM_GLOBAL="$HOME/.npm-global"
LOG="$HOME/claude-nonchalance-install.log"
REPO_URL="https://github.com/jaroussssss/NonChalanceApp.git"
HUB_URL="https://github.com/jaroussssss/claude-hub.git"
PROFILE_NAME="nonchalance-collab"
ARCH=$(uname -m)
BREW_PREFIX=$([[ "$ARCH" = "arm64" ]] && echo "/opt/homebrew" || echo "/usr/local")

mkdir -p "$CLAUDE_DIR" "$CLAUDE_DIR/memory" "$CLAUDE_DIR/hooks" "$CLAUDE_DIR/skills"

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

# ── Greeting personnalisé ─────────────────────────────────────────────────────
echo ""
read -r -p "  Quel est ton prénom ? " COLLAB_NAME
COLLAB_NAME="${COLLAB_NAME:-Collaborateur}"
echo ""
info "Bienvenue $COLLAB_NAME, on lance l'install."

# ── 1. Xcode CLT ──────────────────────────────────────────────────────────────
sep
echo "  [1/6] Outils système Apple"

if xcode-select -p &>/dev/null && [ -e "$(xcode-select -p 2>/dev/null)" ]; then
  ok "Outils système déjà installés"
else
  info "Une fenêtre Apple va s'ouvrir. Clique 'Installer' et accepte."
  info "Si tu vois 'Can't install the software' :"
  info "  → App Store → cherche 'Xcode' → Installer (gratuit, ~15 min)"
  info "  → Ou : https://developer.apple.com/download/all/ (cherche 'Command Line Tools')"
  info "  → Puis relance ce script."
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
echo "  [2/6] Homebrew"

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
echo "  [3/6] Node.js"

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
echo "  [4/6] Claude Code"

if ! command -v claude &>/dev/null; then
  info "Installation (2-3 min)..."
  npm install -g @anthropic-ai/claude-code || die "Claude Code n'a pas pu s'installer."
  refresh_path
fi
command -v claude &>/dev/null || die "Claude Code installé mais introuvable. Ferme le Terminal et relance."
ok "Claude Code installé"

# ── 5. NonChalanceApp (lecture seule + double-lock commit/push) ───────────────
sep
echo "  [5/6] NonChalanceApp"

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

# Verrou 1 : hook pre-push (bloque tout push)
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

# Verrou 2 : remote pushurl invalide
git -C "$NC_DIR" remote set-url --push origin "no-push://readonly" 2>/dev/null || true

# Verrou 3 : marker .READ_ONLY
echo "Ce dossier est en lecture seule. Modifications autorisées : docs/ uniquement." > "$NC_DIR/.READ_ONLY"

# Verrou 4 (NOUVEAU) : hook pre-commit — refuse tout staged hors docs/
cat > "$NC_DIR/.git/hooks/pre-commit" << 'PRECOMMITEOF'
#!/bin/sh
# Refuse tout commit qui touche en-dehors de docs/
FILES_OUT=$(git diff --cached --name-only | grep -v '^docs/' || true)
if [ -n "$FILES_OUT" ]; then
  echo ""
  echo "  ⛔ COMMIT BLOQUÉ — Profil NonChalance : seul docs/ est modifiable."
  echo ""
  echo "  Fichiers hors docs/ détectés :"
  echo "$FILES_OUT" | sed 's/^/    - /'
  echo ""
  echo "  Retire-les avec : git restore --staged <fichier>"
  echo ""
  exit 1
fi
exit 0
PRECOMMITEOF
chmod +x "$NC_DIR/.git/hooks/pre-commit"

ok "Quadruple protection activée (push + commit hors docs/ bloqués)"

# ── 6. Hub Claude Code (profil + skills + sync auto) ─────────────────────────
sep
echo "  [6/6] Hub Claude Code (profil + skills partagés)"

if [ -d "$HUB_DIR/.git" ]; then
  info "Hub déjà cloné, mise à jour..."
  GIT_TERMINAL_PROMPT=0 git -C "$HUB_DIR" pull --ff-only -q 2>/dev/null || warn "Pull hub impossible (conservé tel quel)"
else
  info "Clone du hub centralisé..."
  GIT_TERMINAL_PROMPT=0 git clone --depth 1 "$HUB_URL" "$HUB_DIR" -q \
    || die "Clone du hub impossible. Vérifie $HUB_URL"
fi
ok "Hub disponible dans $HUB_DIR"

PROFILE_DIR="$HUB_DIR/profiles/$PROFILE_NAME"
[ -d "$PROFILE_DIR" ] || die "Profil $PROFILE_NAME introuvable dans le hub ($PROFILE_DIR)"

info "Copie du profil collaborateur..."
[ -f "$PROFILE_DIR/CLAUDE.md" ]    && cp "$PROFILE_DIR/CLAUDE.md"    "$CLAUDE_DIR/CLAUDE.md"
[ -f "$PROFILE_DIR/settings.json" ] && cp "$PROFILE_DIR/settings.json" "$CLAUDE_DIR/settings.json"
if [ -d "$PROFILE_DIR/hooks" ]; then
  cp -R "$PROFILE_DIR/hooks/." "$CLAUDE_DIR/hooks/" 2>/dev/null || true
fi
ok "Profil $PROFILE_NAME appliqué"

# Skills doc + utilités générales depuis le hub
SHARED_SKILLS_DIR="$HUB_DIR/shared/skills"
DOC_SKILLS=(git-status search-gmail find-contact generate-doc client-changelog explain-code send-mail)
if [ -d "$SHARED_SKILLS_DIR" ]; then
  info "Installation des skills doc partagés..."
  for SKILL in "${DOC_SKILLS[@]}"; do
    if [ -d "$SHARED_SKILLS_DIR/$SKILL" ]; then
      rm -rf "$CLAUDE_DIR/skills/$SKILL"
      cp -R "$SHARED_SKILLS_DIR/$SKILL" "$CLAUDE_DIR/skills/$SKILL"
    else
      warn "Skill manquant dans le hub : $SKILL"
    fi
  done
  ok "Skills doc installés (${#DOC_SKILLS[@]} skills)"
else
  warn "Dossier shared/skills introuvable dans le hub"
fi

# ── Fallback : si le hub n'a pas fourni CLAUDE.md / settings.json ────────────
if [ ! -f "$CLAUDE_DIR/CLAUDE.md" ]; then
  warn "Profil hub sans CLAUDE.md, écriture du fallback minimal"
  cat > "$CLAUDE_DIR/CLAUDE.md" << 'CLAUDEEOF'
# Profil NonChalance — Collaborateur Documentation

## Rôle
Collaborateur documentation de NonChalanceApp.
Travail UNIQUEMENT sur les fichiers dans docs/.
JAMAIS de push vers origin, jamais de commit hors docs/.

## Règles
- Modifier uniquement les fichiers dans `docs/`
- Ne jamais exécuter `git push`, `git commit --amend`, `git reset --hard`
- Pour partager : créer un fichier `docs/suggestions/AAAA-MM-JJ_titre.md`

## Pour configurer ta clé API
Tape dans Claude Code : /config
CLAUDEEOF
fi

if [ ! -f "$CLAUDE_DIR/settings.json" ]; then
  warn "Profil hub sans settings.json, écriture du fallback restrictif"
  cat > "$CLAUDE_DIR/settings.json" << 'SETTINGSEOF'
{
  "permissions": {
    "allow": [
      "Bash(git pull)", "Bash(git pull *)",
      "Bash(git status)", "Bash(git status *)",
      "Bash(git log)", "Bash(git log *)",
      "Bash(git diff)", "Bash(git diff *)",
      "Bash(ls)", "Bash(ls *)",
      "Bash(cat *)",
      "Edit(docs/**)", "Write(docs/**)",
      "Edit(**/docs/**)", "Write(**/docs/**)"
    ],
    "deny": [
      "Bash(git push *)", "Bash(git commit *)",
      "Bash(git reset *)", "Bash(rm -rf *)", "Bash(sudo *)",
      "Edit(**)", "Write(**)"
    ]
  },
  "hooks": {
    "SessionStart": [
      { "matcher": "*", "hooks": [ { "type": "command", "command": "bash $HOME/.claude-hub/sync/macos/sync-down.sh" } ] }
    ]
  }
}
SETTINGSEOF
fi

# ── Hook SessionStart : auto-pull du hub (throttle 30min) ────────────────────
SYNC_SCRIPT="$CLAUDE_DIR/hooks/hub-sync.sh"
cat > "$SYNC_SCRIPT" << 'SYNCEOF'
#!/bin/bash
# Pull automatique du hub claude-hub avec throttle 30 minutes
HUB_DIR="$HOME/.claude-hub"
LAST_SYNC="$HUB_DIR/.last-sync"
THROTTLE=1800  # 30 min en secondes

[ -d "$HUB_DIR/.git" ] || exit 0

NOW=$(date +%s)
if [ -f "$LAST_SYNC" ]; then
  LAST=$(cat "$LAST_SYNC" 2>/dev/null || echo 0)
  DIFF=$((NOW - LAST))
  [ "$DIFF" -lt "$THROTTLE" ] && exit 0
fi

# Préfère le script de sync officiel du hub s'il existe
if [ -x "$HUB_DIR/sync/macos/sync-down.sh" ]; then
  bash "$HUB_DIR/sync/macos/sync-down.sh" >/dev/null 2>&1 || true
else
  GIT_TERMINAL_PROMPT=0 git -C "$HUB_DIR" pull --ff-only -q >/dev/null 2>&1 || true
fi

echo "$NOW" > "$LAST_SYNC"
exit 0
SYNCEOF
chmod +x "$SYNC_SCRIPT"

# Si settings.json n'a pas déjà un hook SessionStart, on l'ajoute via patch JSON simple
if ! grep -q '"SessionStart"' "$CLAUDE_DIR/settings.json" 2>/dev/null; then
  warn "Pas de hook SessionStart dans settings.json, ajout manuel impossible (JSON merge non géré). Le sync se fera au prochain redéploiement du profil hub."
fi
ok "Auto-sync hub configuré (throttle 30min)"

# ── Mémoire collaborateur ────────────────────────────────────────────────────
cat > "$CLAUDE_DIR/memory/user_collab.md" << MEMEOF
# Collaborateur NonChalance

- Prénom : $COLLAB_NAME
- Profil : $PROFILE_NAME (read-only sur le code, écriture docs/ uniquement)
- Installé le : $(date '+%Y-%m-%d %H:%M')
- Machine : macOS $(sw_vers -productVersion) ($ARCH)
- Repo local : $NC_DIR
- Hub : $HUB_DIR

## Salutation
Dis bonjour à $COLLAB_NAME à chaque démarrage de session.
MEMEOF
ok "Mémoire collaborateur enregistrée ($COLLAB_NAME)"

# ── Config shell ─────────────────────────────────────────────────────────────
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

# ── Terminé ───────────────────────────────────────────────────────────────────
sep
echo ""
echo "  ╔══════════════════════════════════════════╗"
echo "  ║     ✓ Installation terminée !            ║"
echo "  ╚══════════════════════════════════════════╝"
echo ""
echo "  Salut $COLLAB_NAME, tout est prêt."
echo ""
echo "  Dossier repo : $NC_DIR"
echo "  Hub Claude   : $HUB_DIR (auto-sync 30min)"
echo "  Log          : $LOG"
echo ""
echo "  ÉTAPES FINALES :"
echo "  1. Ferme cette fenêtre Terminal (Cmd+Q)"
echo "  2. Rouvre le Terminal"
echo "  3. Tape :  cd ~/NonChalanceApp && claude"
echo "  4. Dans Claude Code : /config  (pour ta clé API)"
echo ""
