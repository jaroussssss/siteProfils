# install-nonchalance.ps1 — Setup Claude Code pour collaborateurs NonChalanceApp (Windows)
# Accès : documentation uniquement, jamais de push
# Usage : powershell -ExecutionPolicy Bypass -File install-nonchalance.ps1

$INSTALL_ROOT = "D:\ClaudeSetup"
$NC_REPO      = "jaroussssss/NonChalanceApp"
$GITHUB_REPO  = "jaroussssss/claude-boost"

Write-Host ""
Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Blue
Write-Host "║  Claude Code — Collaborateur NonChalance  ║" -ForegroundColor Blue
Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Blue
Write-Host ""
Write-Host "  Accès : documentation uniquement (pas de push autorisé)" -ForegroundColor Gray
Write-Host ""

# --- 1. Prérequis ---
Write-Host "[1/5] Vérification prérequis..." -ForegroundColor Yellow
foreach ($cmd in @("node", "git")) {
  $ver = & $cmd --version 2>$null
  if (-not $ver) {
    Write-Host "  ✗ $cmd manquant" -ForegroundColor Red
    exit 1
  }
  Write-Host "  ✓ $cmd" -ForegroundColor Green
}

# --- 2. Clé API ---
Write-Host "[2/5] Clé API Anthropic..." -ForegroundColor Yellow
if (-not $env:ANTHROPIC_API_KEY) {
  $apiKey = Read-Host "  Entre ta clé Anthropic (sk-ant-...)"
  if (-not $apiKey.StartsWith("sk-ant-")) {
    Write-Host "  ✗ Clé invalide" -ForegroundColor Red
    exit 1
  }
  [System.Environment]::SetEnvironmentVariable("ANTHROPIC_API_KEY", $apiKey, "User")
  $env:ANTHROPIC_API_KEY = $apiKey
}
Write-Host "  ✓ Clé configurée" -ForegroundColor Green

# --- 3. Claude Code ---
Write-Host "[3/5] Claude Code CLI..." -ForegroundColor Yellow
if (-not (claude --version 2>$null)) { npm install -g @anthropic-ai/claude-code 2>&1 | Out-Null }
Write-Host "  ✓ Claude Code installé" -ForegroundColor Green

# --- 4. Cloner NonChalanceApp (lecture seule) + hook anti-push ---
Write-Host "[4/5] NonChalanceApp (lecture seule)..." -ForegroundColor Yellow

$ncDir = "$env:USERPROFILE\NonChalanceApp"
if (-not (Test-Path "$ncDir\.git")) {
  git clone "https://github.com/$NC_REPO.git" $ncDir 2>&1 | Out-Null
  Write-Host "  ✓ NonChalanceApp cloné dans $ncDir" -ForegroundColor Green
} else {
  git -C $ncDir pull origin main 2>&1 | Out-Null
  Write-Host "  ✓ NonChalanceApp à jour" -ForegroundColor Green
}

# Hook qui bloque les push
$hookPath = "$ncDir\.git\hooks\pre-push"
@'
#!/bin/sh
echo ""
echo "⛔  PUSH BLOQUÉ — Profil NonChalance (lecture seule)"
echo "    Crée une Pull Request depuis l'interface GitHub."
echo ""
exit 1
'@ | Set-Content -Encoding utf8 $hookPath

# Hook executable (Git Bash le respecte sur Windows)
Write-Host "  ✓ Hook anti-push installé" -ForegroundColor Green

# --- 5. Configurer CLAUDE.md profil NonChalance ---
Write-Host "[5/5] Profil Claude Code..." -ForegroundColor Yellow

$claudeDir = "$env:USERPROFILE\.claude"
if (-not (Test-Path $claudeDir)) { New-Item -ItemType Directory -Force -Path $claudeDir | Out-Null }

# Télécharger le CLAUDE.md depuis GitHub si disponible, sinon inline
$ncProfile = @"
# CLAUDE.md — Collaborateur NonChalanceApp

## Rôle
Tu es un collaborateur documentation de NonChalanceApp.
Tu travailles UNIQUEMENT sur les fichiers dans docs/.
Tu ne pousses JAMAIS de code.

## Repo
- GitHub : https://github.com/$NC_REPO
- Dossier local : $ncDir
- Pull uniquement : git -C $ncDir pull origin main

## Règles absolues
1. NE JAMAIS suggérer git push vers origin
2. NE JAMAIS modifier de fichiers hors de docs/
3. NE JAMAIS accéder aux .env ou configs serveur
4. Pour proposer des changements → ouvrir une PR

## Workflow
```bash
# Mettre à jour
git -C $ncDir pull origin main

# Travailler sur la doc
# (modifier uniquement docs/)

# Créer une PR via l'interface GitHub
```

## Comportement
- Réponses en français
- Focus documentation uniquement
- Refuser poliment toute demande de modif code source
"@

$ncProfile | Set-Content -Encoding utf8 "$claudeDir\CLAUDE.md"
Write-Host "  ✓ Profil NonChalance configuré" -ForegroundColor Green

# Settings minimaux
$settings = @{ permissions = @{ allow = @("Bash(git pull *)", "Bash(node *)", "Bash(ls *)"); deny = @("Bash(git push *)") } }
$settingsPath = "$claudeDir\settings.json"
if (-not (Test-Path $settingsPath)) {
  $settings | ConvertTo-Json -Depth 10 | Set-Content -Encoding utf8 $settingsPath
}

Write-Host ""
Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║    ✓ Setup NonChalance terminé !         ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "  App clonée dans : $ncDir" -ForegroundColor White
Write-Host "  Lance Claude Code : claude" -ForegroundColor Cyan
Write-Host ""
