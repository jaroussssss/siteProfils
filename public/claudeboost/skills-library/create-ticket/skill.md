---
name: create-ticket
description: Crée un GitHub Issue structuré depuis une description naturelle (bug, UX, feature).
---

Quand l'utilisateur dit "crée un ticket", "signale un bug", "ouvre une issue" :

1. Extraire du message : type (bug/feature/UX), description, reproduction si bug, priorité, assigné
2. Préférer `gh` CLI si installé, sinon API directe

## Option A — gh CLI (recommandée)

```bash
gh issue create \
  --repo "$GITHUB_REPO" \
  --title "TITRE" \
  --body "$(cat <<'EOF'
## Description
[description claire]

## Reproduction (si bug)
1. [étape 1]
2. [étape 2]

## Impact
Priorité : [haute/moyenne/basse]
Appareil : [si pertinent]

## Assigné à
@[username]
EOF
)" \
  --label "TYPE" \
  --assignee "ASSIGNEE"
```

## Option B — API GitHub (fallback)

```js
const token = process.env.GITHUB_TOKEN;
const repo  = process.env.GITHUB_REPO; // ex: "owner/repo"

const res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: TITRE,
    body: CORPS_MARKDOWN,
    labels: [TYPE],          // bug | enhancement | ux
    assignees: [ASSIGNEE]
  })
});
console.log('Issue créée :', (await res.json()).html_url);
```

## Setup requis

Dans `~/.zprofile` :
```bash
export GITHUB_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxx"  # https://github.com/settings/tokens
export GITHUB_REPO="ton-user/ton-repo"
```

Créer directement sans confirmation.
