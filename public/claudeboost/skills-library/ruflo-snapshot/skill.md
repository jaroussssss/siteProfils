---
name: ruflo-snapshot
description: Snapshot versionné de la config Ruflo (claude-flow) de tous tes projets. Lecture seule.
---

Quand l'utilisateur dit "snapshot ruflo", "versionne les ruflo", "sauvegarde les configs ruflo", "backup ruflo" :

## Skill Windows-spécifique (PowerShell)

Si tu es sur Windows et que tu as le script :
```powershell
powershell -File "$env:RUFLO_SNAPSHOT_SCRIPT" -Tag "DESCRIPTION"
```

avec `RUFLO_SNAPSHOT_SCRIPT` dans tes variables d'env (`$env:RUFLO_SNAPSHOT_SCRIPT = "C:\path\to\ruflo-snapshot.ps1"`).

## Sur Mac/Linux (équivalent bash)

```bash
SNAPSHOT_DIR="$HOME/ruflo-snapshots/$(date +%Y-%m-%d_%H-%M)_TAG"
mkdir -p "$SNAPSHOT_DIR"

for proj in $RUFLO_PROJECTS; do
  rsync -av --exclude='*.jsonl' --exclude='*.db-journal' --include='*.md' --include='*.json' \
    "$proj/.claude/" "$SNAPSHOT_DIR/$(basename $proj)/" 2>/dev/null
done
```

avec `RUFLO_PROJECTS` env var = liste de chemins séparés par espaces.

## Ce que le snapshot capture (lecture seule)

- `settings.json` + `settings.local.json` de chaque projet
- Fichiers `.md` et `.json` dans `memory/` et `skills/`
- Configs `.swarm/`
- `MEMORY.md` de tous les projets

## Ce qu'il NE touche PAS

- Les projets sources (jamais d'écriture)
- Les fichiers binaires lourds (>512KB)
- Les sessions/transcripts (`.jsonl`)
- Les bases SQLite (`memory.db`, `.db-journal`)

## Setup requis

```bash
export RUFLO_PROJECTS="$HOME/proj1 $HOME/proj2"  # bash/zsh
# OU sur Windows :
# $env:RUFLO_SNAPSHOT_SCRIPT = "C:\ClaudeSetup\scripts\ruflo-snapshot.ps1"
```

Règle : créer un snapshot AVANT toute opération de migration, upgrade, ou modification massive des configs Ruflo.
