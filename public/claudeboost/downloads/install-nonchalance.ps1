# install-nonchalance.ps1
# Installation Claude Boost — Profil NonChalance (documentation, lecture seule)
# Compatible Windows 10 (1809+) et Windows 11 / PowerShell 5.1+

[CmdletBinding()]
param(
    [switch]$SkipNodeInstall,
    [switch]$Force
)

# --- Configuration de base ----------------------------------------------------
$ErrorActionPreference = 'Stop'
$ProgressPreference    = 'SilentlyContinue'  # accelere les downloads

# Force UTF-8 en sortie console (corrige les caracteres bizarres dans cmd.exe)
try {
    [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
    $OutputEncoding           = [System.Text.UTF8Encoding]::new()
    if ($Host.Name -eq 'ConsoleHost') { chcp 65001 > $null 2>&1 }
} catch { }

# Variables de chemins
$CLAUDE_DIR  = Join-Path $env:USERPROFILE '.claude'
$NC_DIR      = Join-Path $env:USERPROFILE 'NonChalanceApp'
$REPO_URL    = 'https://github.com/jaroussssss/NonChalanceApp.git'
$NODE_MIN    = 18  # version mineure minimum acceptable

# Bloque les prompts interactifs Git / Credential Manager
$env:GIT_TERMINAL_PROMPT = '0'
$env:GCM_INTERACTIVE     = 'Never'

# --- Helpers ------------------------------------------------------------------

function Write-Step    { param([string]$Msg) Write-Host "==> $Msg" -ForegroundColor Cyan }
function Write-Ok      { param([string]$Msg) Write-Host "  [OK] $Msg" -ForegroundColor Green }
function Write-Warn    { param([string]$Msg) Write-Host "  [!]  $Msg" -ForegroundColor Yellow }
function Write-Fail    { param([string]$Msg) Write-Host "  [X]  $Msg" -ForegroundColor Red }

function Write-FileUtf8NoBom {
    # Ecrit un fichier en UTF-8 SANS BOM (corrige PS 5.1 qui ajoute le BOM)
    param(
        [Parameter(Mandatory)] [string]$Path,
        [Parameter(Mandatory)] [string]$Content,
        [switch]$Lf  # force les fins de ligne en LF (necessaire pour les hooks git)
    )
    $dir = Split-Path -Parent $Path
    if ($dir -and -not (Test-Path $dir)) {
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
    }
    if ($Lf) { $Content = $Content -replace "`r`n", "`n" }
    $utf8NoBom = [System.Text.UTF8Encoding]::new($false)
    [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
}

function Test-IsAdmin {
    $id  = [Security.Principal.WindowsIdentity]::GetCurrent()
    $pri = [Security.Principal.WindowsPrincipal]::new($id)
    return $pri.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Refresh-Path {
    # Recharge le PATH apres une installation (winget, npm -g, etc.)
    $machine = [Environment]::GetEnvironmentVariable('Path', 'Machine')
    $user    = [Environment]::GetEnvironmentVariable('Path', 'User')
    $env:Path = ($machine, $user | Where-Object { $_ }) -join ';'
}

function Test-CommandAvailable {
    param([string]$Name)
    Refresh-Path
    return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Install-WithWinget {
    param([string]$PackageId, [string]$DisplayName)
    if (-not (Test-CommandAvailable 'winget')) { return $false }
    Write-Step "Installation automatique de $DisplayName via winget..."
    & winget install --id $PackageId --silent --accept-source-agreements --accept-package-agreements --scope user
    if ($LASTEXITCODE -ne 0) {
        Write-Warn "winget a renvoye le code $LASTEXITCODE (peut etre normal si deja installe)"
    }
    Refresh-Path
    return $true
}

# --- Banniere -----------------------------------------------------------------

Write-Host ''
Write-Host '================================================================' -ForegroundColor Blue
Write-Host '  Claude Boost — Installation Collaborateur NonChalance' -ForegroundColor Blue
Write-Host '  (Profil documentation, lecture seule, sans push GitHub)' -ForegroundColor Blue
Write-Host '================================================================' -ForegroundColor Blue
Write-Host ''

# --- 1. Verification Windows et execution policy ------------------------------

Write-Step 'Verification de Windows...'
$winVer = [System.Environment]::OSVersion.Version
if ($winVer.Major -lt 10) {
    Write-Fail "Windows 10 ou 11 requis (vous avez Windows $($winVer.Major))."
    exit 1
}
Write-Ok "Windows $($winVer.Major) detecte"

# Check execution policy (informatif, on est deja en train de tourner donc OK)
$ep = Get-ExecutionPolicy -Scope CurrentUser
if ($ep -eq 'Restricted') {
    Write-Warn "Execution policy 'Restricted'. Si vous avez des erreurs, lancez :"
    Write-Host "       Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned" -ForegroundColor Yellow
}

# --- 2. Verification / installation de Git ------------------------------------

Write-Step 'Verification de Git...'
if (-not (Test-CommandAvailable 'git')) {
    Write-Warn 'Git non detecte sur cet ordinateur.'
    $installed = Install-WithWinget -PackageId 'Git.Git' -DisplayName 'Git for Windows'
    if (-not $installed -or -not (Test-CommandAvailable 'git')) {
        Write-Host ''
        Write-Fail 'Installation automatique impossible.'
        Write-Host '  Telechargez Git ici : https://git-scm.com/download/win' -ForegroundColor Yellow
        Write-Host '  Apres installation, FERMEZ ce terminal, ouvrez-en un nouveau, et relancez ce script.' -ForegroundColor Yellow
        exit 1
    }
}
$gitVersion = (& git --version) -replace 'git version ', ''
Write-Ok "Git $gitVersion"

# --- 3. Verification / installation de Node.js --------------------------------

Write-Step 'Verification de Node.js...'
$needsNode = -not (Test-CommandAvailable 'node')
if (-not $needsNode) {
    $nodeVer = (& node --version) -replace '^v', ''
    $nodeMajor = [int]($nodeVer -split '\.')[0]
    if ($nodeMajor -lt $NODE_MIN) {
        Write-Warn "Node.js $nodeVer detecte, mais version >= $NODE_MIN requise."
        $needsNode = $true
    }
}

if ($needsNode) {
    if ($SkipNodeInstall) {
        Write-Fail 'Node.js manquant et -SkipNodeInstall specifie.'
        exit 1
    }
    Write-Warn 'Node.js non detecte (ou version trop ancienne).'
    $installed = Install-WithWinget -PackageId 'OpenJS.NodeJS.LTS' -DisplayName 'Node.js LTS'
    if (-not $installed -or -not (Test-CommandAvailable 'node')) {
        Write-Host ''
        Write-Fail 'Installation automatique impossible.'
        Write-Host '  Telechargez Node.js LTS ici : https://nodejs.org/' -ForegroundColor Yellow
        Write-Host '  Choisissez la version "LTS" (recommandee pour la plupart des utilisateurs).' -ForegroundColor Yellow
        Write-Host '  Apres installation, FERMEZ ce terminal, ouvrez-en un nouveau, et relancez ce script.' -ForegroundColor Yellow
        exit 1
    }
}
$nodeVersion = & node --version
Write-Ok "Node.js $nodeVersion"

# Verifie npm en parallele
if (-not (Test-CommandAvailable 'npm')) {
    Write-Fail 'npm introuvable malgre Node.js installe. Reinstallez Node.js depuis https://nodejs.org/'
    exit 1
}

# --- 4. Installation de Claude Code -------------------------------------------

Write-Step 'Verification de Claude Code...'
if (-not (Test-CommandAvailable 'claude')) {
    Write-Warn 'Claude Code non detecte, installation en cours (peut prendre 1-2 min)...'
    & npm install -g '@anthropic-ai/claude-code'
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "L'installation de Claude Code a echoue (code $LASTEXITCODE)."
        if (-not (Test-IsAdmin)) {
            Write-Host "  Essayez de relancer PowerShell en tant qu'administrateur," -ForegroundColor Yellow
            Write-Host "  OU configurez un dossier npm utilisateur :" -ForegroundColor Yellow
            Write-Host "     npm config set prefix `"$env:APPDATA\npm`"" -ForegroundColor Yellow
        }
        exit 1
    }
    Refresh-Path
}

if (-not (Test-CommandAvailable 'claude')) {
    Write-Warn "Claude Code installe mais 'claude' pas encore dans le PATH de ce terminal."
    Write-Warn "C'est normal apres une premiere installation — un redemarrage du terminal sera necessaire."
} else {
    Write-Ok "Claude Code disponible : $(& claude --version 2>$null)"
}

# --- 5. Clone / mise a jour du depot NonChalanceApp ---------------------------

Write-Step "Recuperation du depot NonChalanceApp..."
if (Test-Path (Join-Path $NC_DIR '.git')) {
    Write-Host "  Depot existant detecte dans $NC_DIR, mise a jour..."
    & git -C $NC_DIR pull --ff-only
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "Echec du git pull (code $LASTEXITCODE)."
        Write-Host "  Le dossier est peut-etre dans un etat inattendu." -ForegroundColor Yellow
        Write-Host "  Vous pouvez supprimer $NC_DIR puis relancer ce script." -ForegroundColor Yellow
        exit 1
    }
} else {
    if ((Test-Path $NC_DIR) -and -not $Force) {
        Write-Fail "Le dossier $NC_DIR existe deja mais n'est pas un depot Git."
        Write-Host "  Relancez avec -Force pour le supprimer, ou videz-le manuellement." -ForegroundColor Yellow
        exit 1
    }
    if (Test-Path $NC_DIR) {
        Write-Warn "Suppression de $NC_DIR (option -Force)..."
        Remove-Item -Recurse -Force $NC_DIR
    }
    & git clone --depth 1 $REPO_URL $NC_DIR
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "Echec du git clone (code $LASTEXITCODE)."
        Write-Host "  Verifiez votre connexion internet et que le depot est public :" -ForegroundColor Yellow
        Write-Host "  $REPO_URL" -ForegroundColor Yellow
        exit 1
    }
}
Write-Ok "Depot pret dans $NC_DIR"

# --- 6. Hook anti-push (pre-push) ---------------------------------------------

Write-Step "Installation du verrou anti-push..."
$hookPath = Join-Path $NC_DIR '.git\hooks\pre-push'
$hookContent = @'
#!/bin/sh
echo ""
echo "================================================================"
echo "  PUSH BLOQUE — Profil collaborateur lecture seule"
echo "  Vos modifications restent locales. Contactez le mainteneur"
echo "  pour transmettre vos changements."
echo "================================================================"
echo ""
exit 1
'@
# IMPORTANT : LF + UTF-8 SANS BOM, sinon sh.exe casse sur le shebang
Write-FileUtf8NoBom -Path $hookPath -Content $hookContent -Lf
Write-Ok "Hook pre-push installe ($hookPath)"

# --- 7. Configuration Claude (CLAUDE.md + settings.json) ----------------------

Write-Step "Configuration de Claude Code..."
New-Item -ItemType Directory -Force -Path $CLAUDE_DIR | Out-Null

$claudeMd = @"
# Profil NonChalance — Documentation uniquement

Tu es un assistant collaborateur en mode **lecture seule** pour le projet NonChalanceApp.

## Regles strictes
- Travailler UNIQUEMENT sur les fichiers dans le dossier ``docs/``
- JAMAIS de ``git push`` vers ``origin`` (bloque techniquement par un hook pre-push)
- JAMAIS modifier les fichiers en dehors de ``docs/``
- Les commits locaux sont autorises pour suivre l'avancee

## Depot local
``$NC_DIR``

## En cas de doute
Demander confirmation a l'utilisateur avant toute action git ou modification hors ``docs/``.
"@
Write-FileUtf8NoBom -Path (Join-Path $CLAUDE_DIR 'CLAUDE.md') -Content $claudeMd
Write-Ok "CLAUDE.md ecrit"

$settingsPath = Join-Path $CLAUDE_DIR 'settings.json'
$settingsObj = [ordered]@{
    permissions = [ordered]@{
        allow = @(
            'Bash(git pull *)',
            'Bash(git status*)',
            'Bash(git log *)',
            'Bash(git diff *)',
            'Bash(git add *)',
            'Bash(git commit *)',
            'Bash(node *)',
            'Bash(ls *)',
            'Bash(dir*)'
        )
        deny  = @(
            'Bash(git push *)',
            'Bash(git push)',
            'Bash(git remote *)'
        )
    }
}
$settingsJson = $settingsObj | ConvertTo-Json -Depth 10

if ((Test-Path $settingsPath) -and -not $Force) {
    Write-Warn "settings.json existe deja, conserve (utilisez -Force pour ecraser)."
} else {
    Write-FileUtf8NoBom -Path $settingsPath -Content $settingsJson
    Write-Ok "settings.json ecrit"
}

# --- 8. Verification finale ---------------------------------------------------

Write-Step 'Verification finale...'
$claudeOk = Test-CommandAvailable 'claude'
$repoOk   = Test-Path (Join-Path $NC_DIR '.git')
$hookOk   = Test-Path $hookPath
$confOk   = Test-Path (Join-Path $CLAUDE_DIR 'CLAUDE.md')

if ($claudeOk) { Write-Ok 'claude dans le PATH' } else { Write-Warn "claude PAS dans le PATH du terminal courant (normal apres premiere installation)" }
if ($repoOk)   { Write-Ok 'Depot NonChalanceApp clone' }
if ($hookOk)   { Write-Ok 'Hook anti-push present' }
if ($confOk)   { Write-Ok 'Configuration Claude ecrite' }

# --- 9. Instructions finales --------------------------------------------------

Write-Host ''
Write-Host '================================================================' -ForegroundColor Green
Write-Host '  INSTALLATION TERMINEE' -ForegroundColor Green
Write-Host '================================================================' -ForegroundColor Green
Write-Host ''
Write-Host 'PROCHAINES ETAPES :' -ForegroundColor Cyan
Write-Host ''
Write-Host '  1. FERMEZ ce terminal (important pour rafraichir le PATH)' -ForegroundColor White
Write-Host '  2. Ouvrez un NOUVEAU terminal PowerShell' -ForegroundColor White
Write-Host '  3. Allez dans le dossier du projet :' -ForegroundColor White
Write-Host "       cd `"$NC_DIR`"" -ForegroundColor Yellow
Write-Host '  4. Lancez Claude Code :' -ForegroundColor White
Write-Host '       claude' -ForegroundColor Yellow
Write-Host ''
Write-Host 'EMPLACEMENTS :' -ForegroundColor Cyan
Write-Host "  Depot           : $NC_DIR" -ForegroundColor Gray
Write-Host "  Configuration   : $CLAUDE_DIR" -ForegroundColor Gray
Write-Host ''
Write-Host "En cas de probleme, relancez ce script. Bon travail !" -ForegroundColor Green
Write-Host ''
