#!/bin/bash
# install-nonchalance.sh — Setup Claude Code pour collaborateurs NonChalanceApp (macOS)
# Accès documentation uniquement, jamais de push
# Usage : bash install-nonchalance.sh

NC_REPO="jaroussssss/NonChalanceApp"
NC_DIR="$HOME/NonChalanceApp"
CLAUDE_DIR="$HOME/.claude"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  Claude Code — Collaborateur NonChalance  ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "  Accès : documentation uniquement (pas de push)"
echo ""

# --- 1. Prérequis ---
echo "[1/4] Vérification prérequis..."
for cmd in node git; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "  ✗ $cmd manquant"
    exit 1
  fi
  echo "  ✓ $cmd"
done

# --- 2. Clé API ---
echo "[2/4] Clé API Anthropic..."
if [ -z "$ANTHROPIC_API_KEY" ]; then
  read -r -p "  Entre ta clé (sk-ant-...) : " api_key
  if [[ "$api_key" != sk-ant-* ]]; then
    echo "  ✗ Clé invalide"
    exit 1
  fi
  SHELL_RC="$HOME/.zshrc"
  [ -f "$HOME/.bash_profile" ] && SHELL_RC="$HOME/.bash_profile"
  echo "export ANTHROPIC_API_KEY=\"$api_key\"" >> "$SHELL_RC"
  export ANTHROPIC_API_KEY="$api_key"
fi
echo "  ✓ Clé configurée"

# --- 3. Claude Code + cloner NonChalanceApp ---
echo "[3/4] Claude Code + NonChalanceApp..."
if ! command -v claude &>/dev/null; then
  npm install -g @anthropic-ai/claude-code 2>/dev/null
fi

if [ -d "$NC_DIR/.git" ]; then
  git -C "$NC_DIR" pull origin main -q
  echo "  ✓ NonChalanceApp à jour dans $NC_DIR"
else
  git clone "https://github.com/$NC_REPO.git" "$NC_DIR" -q
  echo "  ✓ NonChalanceApp cloné dans $NC_DIR"
fi

# Hook anti-push
cat > "$NC_DIR/.git/hooks/pre-push" <<'HOOK'
#!/bin/sh
echo ""
echo "⛔  PUSH BLOQUÉ — Profil NonChalance (lecture seule)"
echo "    Crée une Pull Request via l'interface GitHub."
echo ""
exit 1
HOOK
chmod +x "$NC_DIR/.git/hooks/pre-push"
echo "  ✓ Hook anti-push installé"

# --- 4. Configurer le profil ---
echo "[4/4] Profil Claude Code..."
mkdir -p "$CLAUDE_DIR"

cat > "$CLAUDE_DIR/CLAUDE.md" <<PROFILE
# CLAUDE.md — Collaborateur NonChalanceApp

## Rôle
Collaborateur documentation de NonChalanceApp.
Travail UNIQUEMENT sur les fichiers dans docs/.
JAMAIS de push direct.

## Repo
- GitHub : https://github.com/$NC_REPO
- Dossier local : $NC_DIR
- Mettre à jour : git -C $NC_DIR pull origin main

## Règles absolues
1. NE JAMAIS suggérer git push vers origin
2. NE JAMAIS modifier de fichiers hors de docs/
3. NE JAMAIS accéder aux .env ou credentials
4. Pour proposer des changements → ouvrir une PR sur GitHub

## Comportement
- Réponses en français
- Focus documentation uniquement
- Refuser poliment toute modif de code source
PROFILE

cat > "$CLAUDE_DIR/settings.json" <<'SETTINGS'
{
  "permissions": {
    "allow": ["Bash(git pull *)", "Bash(node *)", "Bash(ls *)"],
    "deny":  ["Bash(git push *)"]
  }
}
SETTINGS
echo "  ✓ Profil configuré"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║    ✓ Setup NonChalance terminé !         ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "  App clonée dans : $NC_DIR"
echo "  Lance Claude Code : source ~/.zshrc && claude"
echo ""
