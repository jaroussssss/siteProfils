# install-leo.ps1 — Setup Claude Code (Profil Leo)
# Si Windows bloque ce fichier : clic droit > Proprietes > Decocher "Bloque" > OK

param()

$INSTALL_ROOT = "$env:USERPROFILE\ClaudeSetup"
$CLAUDE_DIR   = "$env:USERPROFILE\.claude"

Write-Host "=== Claude Boost — Profil Leo ===" -ForegroundColor Cyan
Write-Host ""

# 1. Verifier Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Node.js requis : https://nodejs.org" -ForegroundColor Red
    Start-Process "https://nodejs.org"
    exit 1
}
Write-Host "Node.js OK : $(node --version)" -ForegroundColor Green

# 2. Installer Claude Code CLI
if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
    Write-Host "Installation Claude Code..." -ForegroundColor Yellow
    npm install -g @anthropic-ai/claude-code
}
Write-Host "Claude Code OK" -ForegroundColor Green

# 3. Creer les dossiers
New-Item -ItemType Directory -Force -Path "$INSTALL_ROOT\scripts\github" | Out-Null
New-Item -ItemType Directory -Force -Path "$CLAUDE_DIR" | Out-Null

# 4. Ecrire le CLAUDE.md profil Leo
$claudeMd = @'
# Profil Leo (Artchounimek) — Claude Code Booste

## Conventions
- Reponses courtes et directes
- Code en anglais, messages en francais
- Toujours demander avant merge/push vers main
- Jamais de token/secret affiche dans la reponse

## Scripts disponibles
- GitHub PR    : node %USERPROFILE%\ClaudeSetup\scripts\github\create-pr.js
- GitHub token : bash %USERPROFILE%\ClaudeSetup\scripts\github\get-token.sh

## Configuration cle API
Tape dans Claude Code : /config
Ou definis ANTHROPIC_API_KEY dans tes variables d environnement systeme.
'@
$claudeMd | Set-Content -Encoding utf8 "$CLAUDE_DIR\CLAUDE.md"
Write-Host "Profil Leo configure" -ForegroundColor Green

# 5. Permissions
$settings = '{"permissions":{"allow":["Bash(git *)","Bash(node *)","Bash(npm *)","Bash(npx *)","Bash(ls *)","mcp__playwright__*","mcp__context7__*"],"deny":[]}}'
if (-not (Test-Path "$CLAUDE_DIR\settings.json")) {
    $settings | Set-Content -Encoding utf8 "$CLAUDE_DIR\settings.json"
}

Write-Host ""
Write-Host "=== Termine ! ===" -ForegroundColor Green
Write-Host "Lance Claude Code : claude" -ForegroundColor Cyan
Write-Host "Configure ta cle API : /config" -ForegroundColor Cyan
