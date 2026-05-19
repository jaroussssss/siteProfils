# ruflo-snapshot.ps1 - Snapshot versionne Ruflo de tous les projets
# Lecture SEULE. N'ecrit jamais dans les projets sources.
# Destination : D:\ClaudeSetup\ruflo-snapshots\YYYY-MM-DD_HH-MM\
#
# Usage :
#   powershell -File D:\ClaudeSetup\scripts\ruflo-snapshot.ps1
#   powershell -File D:\ClaudeSetup\scripts\ruflo-snapshot.ps1 -Tag "avant-v1.3.0"

param(
  [string]$Tag = ""
)

$ErrorActionPreference = "SilentlyContinue"

$Timestamp   = Get-Date -Format "yyyy-MM-dd_HH-mm"
$SnapName    = if ($Tag) { "${Timestamp}_${Tag}" } else { $Timestamp }
$SnapRoot    = "D:\ClaudeSetup\ruflo-snapshots\$SnapName"
$ManifestPath = "$SnapRoot\MANIFEST.md"

$Projects = @(
  @{ Name = "site-famille";  Root = "D:\Projects\Site famille" },
  @{ Name = "nonchalance";   Root = "D:\Projects\NonChalanceApp" },
  @{ Name = "siteprofils";   Root = "D:\Projects\SiteProfils" },
  @{ Name = "global";        Root = "C:\Users\jarou\.claude" }
)

$CaptureFiles = @(
  ".claude\settings.json",
  ".claude\settings.local.json",
  ".claude\memory.db"
)

New-Item -ItemType Directory -Path $SnapRoot -Force | Out-Null

$Stats = @{ Projects = 0; Files = 0; TotalKB = 0 }
$Lines = @()
$Lines += "# Ruflo Snapshot $SnapName"
$Lines += ""
$Lines += "Date : $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
$Lines += "Tag  : $(if ($Tag) { $Tag } else { '(none)' })"
$Lines += ""

foreach ($Project in $Projects) {
  $projRoot = $Project.Root
  $projName = $Project.Name
  $projDest = "$SnapRoot\$projName"

  New-Item -ItemType Directory -Path $projDest -Force | Out-Null

  $Lines += "## $projName"
  $Lines += "Source : $projRoot"
  $Lines += ""

  $projFiles = 0

  # Fichiers individuels
  foreach ($target in $CaptureFiles) {
    $src = if ($projName -eq "global") {
      "$projRoot\$($target -replace '^\.claude\\','')"
    } else {
      "$projRoot\$target"
    }
    if (Test-Path $src) {
      $destFile = "$projDest\$($target -replace '\\','_')"
      Copy-Item -Path $src -Destination $destFile -Force
      $kb = [math]::Round((Get-Item $destFile).Length / 1024, 1)
      $Lines += "- $target ($kb KB)"
      $Stats.Files++
      $Stats.TotalKB += $kb
      $projFiles++
    }
  }

  # Dossiers memory/ et skills/ - copier .md et .json uniquement
  $dirsToCapture = @()
  if ($projName -eq "global") {
    $dirsToCapture = @("memory", "skills")
  } else {
    $dirsToCapture = @(".claude\memory", ".claude\skills")
  }

  foreach ($dir in $dirsToCapture) {
    $srcDir = "$projRoot\$dir"
    if (-not (Test-Path $srcDir)) { continue }

    $dirName = Split-Path $srcDir -Leaf
    $destDir = "$projDest\$dirName"
    New-Item -ItemType Directory -Path $destDir -Force | Out-Null

    $count = 0
    Get-ChildItem -Path $srcDir -File -Recurse |
      Where-Object { ($_.Extension -in @(".md",".json",".yaml",".yml",".txt")) -and ($_.Length -lt 512KB) } |
      ForEach-Object {
        $rel  = $_.FullName.Substring($srcDir.Length).TrimStart("\")
        $dest = "$destDir\$rel"
        New-Item -ItemType Directory -Path (Split-Path $dest) -Force | Out-Null
        Copy-Item $_.FullName $dest -Force
        $Stats.Files++
        $projFiles++
        $count++
      }

    if ($count -gt 0) {
      $Lines += "- $dir ($count fichiers .md/.json)"
    }
  }

  # .swarm/ - config uniquement
  $swarmDir = "$projRoot\.swarm"
  if ((Test-Path $swarmDir) -and ($projName -ne "global")) {
    $swarmDest = "$projDest\swarm"
    New-Item -ItemType Directory -Path $swarmDest -Force | Out-Null
    $count = 0
    Get-ChildItem -Path $swarmDir -File -Recurse |
      Where-Object { ($_.Extension -in @(".json",".yaml",".yml",".md")) -and ($_.Length -lt 200KB) } |
      ForEach-Object {
        $rel  = $_.FullName.Substring($swarmDir.Length).TrimStart("\")
        $dest = "$swarmDest\$rel"
        New-Item -ItemType Directory -Path (Split-Path $dest) -Force | Out-Null
        Copy-Item $_.FullName $dest -Force
        $Stats.Files++
        $projFiles++
        $count++
      }
    if ($count -gt 0) { $Lines += "- .swarm ($count fichiers)" }
  }

  if ($projFiles -gt 0) { $Stats.Projects++ }
  $Lines += ""
}

# MEMORY.md de tous les projets (depuis projects/)
$projsDir = "C:\Users\jarou\.claude\projects"
if (Test-Path $projsDir) {
  $memDest = "$SnapRoot\global\projects-memory"
  New-Item -ItemType Directory -Path $memDest -Force | Out-Null
  $count = 0
  Get-ChildItem -Path $projsDir -Filter "MEMORY.md" -Recurse |
    Where-Object { $_.Length -lt 100KB } |
    ForEach-Object {
      $key  = Split-Path $_.DirectoryName -Leaf
      $dest = "$memDest\${key}_MEMORY.md"
      Copy-Item $_.FullName $dest -Force
      $Stats.Files++
      $count++
    }
  if ($count -gt 0) {
    $Lines += "## MEMORY.md (tous projets)"
    $Lines += "$count fichiers captures dans projects-memory/"
    $Lines += ""
  }
}

$Lines += "---"
$Lines += "Projets captures : $($Stats.Projects)"
$Lines += "Fichiers totaux  : $($Stats.Files)"
$Lines += "Taille totale    : ~$($Stats.TotalKB) KB"
$Lines += "Snapshot         : $SnapRoot"
$Lines += ""
$Lines += "Genere par ruflo-snapshot.ps1 - lecture seule, aucun projet modifie"

[System.IO.File]::WriteAllLines($ManifestPath, $Lines, [System.Text.UTF8Encoding]::new($false))

Write-Output ""
Write-Output "=== Ruflo snapshot cree : $SnapName ==="
Write-Output "  Projets  : $($Stats.Projects)"
Write-Output "  Fichiers : $($Stats.Files)"
Write-Output "  Dest     : $SnapRoot"
