# install-nonchalance.ps1 — Setup Claude Code (Collaborateur NonChalance)
# Si Windows bloque ce fichier : clic droit > Proprietes > Decocher "Bloque" > OK
# Acces : documentation uniquement, jamais de push

param()

$CLAUDE_DIR = "$env:USERPROFILE\.claude"
$NC_DIR     = "$env:USERPROFILE\NonChalanceApp"

Write-Host "=== Claude Boost — Collaborateur NonChalance ===" -ForegroundColor Blue
Write-Host "  Acces documentation uniquement" -ForegroundColor Gray
Write-Host ""

# 1. Verifier Node.js et Git
foreach ($cmd in @("node", "git")) {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
        Write-Host "$cmd requis" -ForegroundColor Red
        exit 1
    }
}
Write-Host "Prerequisites OK" -ForegroundColor Green

# 2. Installer Claude Code CLI
if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
    npm install -g @anthropic-ai/claude-code
}
Write-Host "Claude Code OK" -ForegroundColor Green

# 3. Cloner NonChalanceApp (lecture seule)
if (-not (Test-Path "$NC_DIR\.git")) {
    git clone https://github.com/jaroussssss/NonChalanceApp.git $NC_DIR
} else {
    git -C $NC_DIR pull origin main
}
Write-Host "NonChalanceApp clone dans $NC_DIR" -ForegroundColor Green

# 4. Hook anti-push
$hookContent = "#!/bin/sh`necho 'Push bloque sur ce profil. Cree une Pull Request.'`nexit 1"
$hookPath = "$NC_DIR\.git\hooks\pre-push"
$hookContent | Set-Content -Encoding utf8 $hookPath
Write-Host "Hook anti-push installe" -ForegroundColor Green

# 5. Configurer CLAUDE.md
New-Item -ItemType Directory -Force -Path $CLAUDE_DIR | Out-Null

$claudeMd = @"
# Profil NonChalance — Documentation uniquement

## Role
Collaborateur documentation de NonChalanceApp.
Travail UNIQUEMENT sur les fichiers dans docs/.
JAMAIS de push direct vers origin.

## Repo
- Local : $NC_DIR
- Mettre a jour : git -C $NC_DIR pull origin main

## Regles
1. Ne jamais suggerer git push vers origin
2. Ne modifier que docs/
3. Proposer les changements via Pull Request sur GitHub
"@
$claudeMd | Set-Content -Encoding utf8 "$CLAUDE_DIR\CLAUDE.md"

$settings = '{"permissions":{"allow":["Bash(git pull *)","Bash(node *)","Bash(ls *)"],"deny":["Bash(git push *)"]}}'
if (-not (Test-Path "$CLAUDE_DIR\settings.json")) {
    $settings | Set-Content -Encoding utf8 "$CLAUDE_DIR\settings.json"
}

Write-Host ""
Write-Host "=== Termine ! ===" -ForegroundColor Green
Write-Host "App dans : $NC_DIR" -ForegroundColor White
Write-Host "Lance Claude Code : claude" -ForegroundColor Cyan
Write-Host "Configure ta cle API : /config" -ForegroundColor Cyan
