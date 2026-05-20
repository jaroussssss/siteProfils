---
name: drive-backup
description: Upload un fichier vers Google Drive dans un dossier configuré.
---

Quand l'utilisateur dit "sauvegarde sur Drive", "envoie sur Drive", "backup" :

## Via MCP Google Drive (recommandé si installé)

Utiliser l'outil `mcp__claude_ai_Google_Drive__create_file` pour uploader directement.

## Via script local (fallback)

```bash
node "$DRIVE_UPLOAD_SCRIPT" \
  --file "CHEMIN_FICHIER" \
  --name "NOM_SUR_DRIVE" \
  --folder "$GDRIVE_DEFAULT_FOLDER"
```

## Setup requis

Dans `~/.zprofile` :
```bash
export GDRIVE_DEFAULT_FOLDER="ID_DOSSIER_DRIVE"          # ID depuis l'URL du dossier
export DRIVE_UPLOAD_SCRIPT="$HOME/scripts/drive-upload.js"  # ton script local
export GOOGLE_TOKEN_PATH="$HOME/.config/gcloud/token.json"  # auth Google OAuth
```

Prérequis : avoir auth Google OAuth fait une fois (`gcloud auth application-default login` ou script `auth.js`).

Si `GOOGLE_TOKEN_PATH` absent : rappeler à l'utilisateur de faire l'auth Google avant.
