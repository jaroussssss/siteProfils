# install-leo.ps1 — Setup Claude Code boosté pour Léo (Windows)
# Téléchargé depuis claudeboost.tempcestlouisquirac.fr
# Usage : powershell -ExecutionPolicy Bypass -File install-leo.ps1

$PROFILE_NAME = "leo"
$INSTALL_ROOT = "D:\ClaudeSetup"
$GITHUB_REPO  = "jaroussssss/claude-boost"

Write-Host ""
Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     Claude Code Boosté — Profil Léo      ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# --- 1. Prérequis ---
Write-Host "[1/6] Vérification prérequis..." -ForegroundColor Yellow

$nodeVer = node --version 2>$null
if (-not $nodeVer) {
  Write-Host "  ✗ Node.js manquant" -ForegroundColor Red
  Write-Host "  → Installe Node.js 22 LTS : https://nodejs.org"
  Read-Host "  Installe-le puis relance ce script. [Entrée pour quitter]"
  exit 1
}
Write-Host "  ✓ Node.js $nodeVer" -ForegroundColor Green

$gitVer = git --version 2>$null
if (-not $gitVer) {
  Write-Host "  ✗ Git manquant" -ForegroundColor Red
  Write-Host "  → Installe Git : https://git-scm.com"
  Read-Host "  [Entrée pour quitter]"
  exit 1
}
Write-Host "  ✓ Git" -ForegroundColor Green

# --- 2. Clé API Anthropic ---
Write-Host "[2/6] Clé API Anthropic..." -ForegroundColor Yellow
$apiKey = $env:ANTHROPIC_API_KEY
if (-not $apiKey) {
  $apiKey = Read-Host "  Entre ta clé Anthropic (sk-ant-...)"
  if (-not $apiKey.StartsWith("sk-ant-")) {
    Write-Host "  ✗ Clé invalide (doit commencer par sk-ant-)" -ForegroundColor Red
    Write-Host "  → Obtiens ta clé : https://console.anthropic.com/settings/api-keys"
    exit 1
  }
  [System.Environment]::SetEnvironmentVariable("ANTHROPIC_API_KEY", $apiKey, "User")
  $env:ANTHROPIC_API_KEY = $apiKey
}
Write-Host "  ✓ Clé API configurée" -ForegroundColor Green

# --- 3. Claude Code CLI ---
Write-Host "[3/6] Claude Code CLI..." -ForegroundColor Yellow
$claudeVer = claude --version 2>$null
if (-not $claudeVer) {
  Write-Host "  Installation..." -ForegroundColor Gray
  npm install -g @anthropic-ai/claude-code 2>&1 | Out-Null
}
Write-Host "  ✓ Claude Code installé" -ForegroundColor Green

# --- 4. Télécharger les fichiers depuis GitHub ---
Write-Host "[4/6] Téléchargement des fichiers setup..." -ForegroundColor Yellow

if (-not (Test-Path $INSTALL_ROOT)) {
  New-Item -ItemType Directory -Force -Path $INSTALL_ROOT | Out-Null
}

# Clone ou pull le repo
$repoDir = "$INSTALL_ROOT\repo"
if (Test-Path "$repoDir\.git") {
  git -C $repoDir pull origin main 2>&1 | Out-Null
  Write-Host "  ✓ Mis à jour depuis GitHub" -ForegroundColor Green
} else {
  git clone "https://github.com/$GITHUB_REPO.git" $repoDir 2>&1 | Out-Null
  Write-Host "  ✓ Téléchargé depuis GitHub" -ForegroundColor Green
}

# Copier les scripts et profils
$dirs = @("scripts", "profiles\dev", "profiles\leo")
foreach ($d in $dirs) {
  $src = "$repoDir\$d"
  $dst = "$INSTALL_ROOT\$d"
  if (Test-Path $src) {
    Copy-Item -Recurse -Force $src $dst
  }
}

# --- 5. Configurer le profil Claude Code ---
Write-Host "[5/6] Configuration profil Claude Code..." -ForegroundColor Yellow

$claudeDir = "$env:USERPROFILE\.claude"
if (-not (Test-Path $claudeDir)) { New-Item -ItemType Directory -Force -Path $claudeDir | Out-Null }

# Copier les deux CLAUDE.md (dev + leo) fusionnés
$devMd       = Get-Content "$INSTALL_ROOT\profiles\dev\CLAUDE.md" -Raw -ErrorAction SilentlyContinue
$leoMd       = Get-Content "$INSTALL_ROOT\profiles\leo\CLAUDE.md" -Raw -ErrorAction SilentlyContinue
$merged      = "# Profil Dev (base technique)`n$devMd`n`n---`n`n# Profil Léo (personnel)`n$leoMd"
$merged | Set-Content -Encoding utf8 "$claudeDir\CLAUDE.md"
Write-Host "  ✓ CLAUDE.md configuré" -ForegroundColor Green

# Permissions settings.json
$settings = @{
  permissions = @{
    allow = @(
      "Bash(git *)", "Bash(node *)", "Bash(npm *)", "Bash(npx *)",
      "Bash(ls *)", "Bash(cat *)", "Bash(bash *)",
      "mcp__playwright__*", "mcp__context7__*",
      "mcp__ruflo__memory_*", "mcp__ruflo__hooks_*"
    )
    deny = @()
  }
}
$settingsPath = "$claudeDir\settings.json"
if (-not (Test-Path $settingsPath)) {
  $settings | ConvertTo-Json -Depth 10 | Set-Content -Encoding utf8 $settingsPath
  Write-Host "  ✓ Permissions configurées" -ForegroundColor Green
} else {
  Write-Host "  ~ settings.json existant conservé" -ForegroundColor Yellow
}

# --- 6. Ruflo init ---
Write-Host "[6/6] Ruflo (claude-flow)..." -ForegroundColor Yellow
npx -y @claude-flow/cli@latest --version 2>&1 | Out-Null
Write-Host "  ✓ Ruflo disponible" -ForegroundColor Green

# --- Done ---
Write-Host ""
Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║        ✓ Setup Léo terminé !             ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "Lance Claude Code :" -ForegroundColor White
Write-Host "  claude" -ForegroundColor Cyan
Write-Host ""
Write-Host "Scripts disponibles :" -ForegroundColor White
Write-Host "  node $INSTALL_ROOT\scripts\github\create-pr.js --help"
Write-Host "  node $INSTALL_ROOT\scripts\gmail\send.js --help"
Write-Host ""
