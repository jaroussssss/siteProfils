---
name: rename-project
description: Remplace un mot-clé partout dans un projet zippé — noms de fichiers, dossiers et contenus texte. Renvoie un nouveau ZIP par mail.
---

Quand l'utilisateur dit "remplace X par Y dans ce zip", "renomme partout", "change le nom du client dans le projet" :

## Étapes

1. **Extraire** le ZIP uploadé
2. **Remplacer dans les contenus** (fichiers texte/XML) :
```powershell
$textExts = @(".lvlib",".lvproj",".aliases",".lvlps",".ini",".txt",".xml",".json",".csv",".sql",".js",".ts",".py",".md")
Get-ChildItem $dst -Recurse -File | Where-Object { $textExts -contains $_.Extension } | ForEach-Object {
  $c = [System.IO.File]::ReadAllText($_.FullName, [System.Text.Encoding]::UTF8)
  if ($c -match $old) {
    [System.IO.File]::WriteAllText($_.FullName, ($c -replace $old, $new), [System.Text.UTF8Encoding]::new($false))
  }
}
```

3. **Renommer les fichiers** (pas les dossiers, encore) :
```powershell
Get-ChildItem $dst -Recurse -File | Where-Object { $_.Name -match $old } | ForEach-Object {
  Rename-Item $_.FullName -NewName ($_.Name -replace $old, $new)
}
```

4. **Renommer les dossiers** du plus profond au moins profond :
```powershell
Get-ChildItem $dst -Recurse -Directory | Sort-Object { $_.FullName.Length } -Descending | Where-Object { $_.Name -match $old } | ForEach-Object {
  Rename-Item $_.FullName -NewName ($_.Name -replace $old, $new)
}
```

5. **Rezipper et envoyer** par mail via send-mail ou send-apppassword.

## Règles
- Toujours traiter contenu AVANT noms de fichiers (sinon les chemins deviennent incohérents)
- Toujours trier les dossiers par longueur décroissante pour éviter les conflits de renommage imbriqué
- Les fichiers binaires (.vi, .ctl, .exe, .dll, .png...) : nommer seulement, ne pas toucher le contenu
- Faire une copie du dossier extrait AVANT modification (jamais modifier le zip source)
- Signaler dans le mail les fichiers binaires dont le contenu interne n'a PAS été modifié

## Extensions binaires à ignorer pour le contenu
.vi .ctl .exe .dll .so .dylib .png .jpg .gif .pdf .docx .xlsx .zip .bin .dat
