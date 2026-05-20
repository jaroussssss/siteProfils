---
name: send-team-mail
description: Envoie un mail à toute une équipe depuis une instruction courte (destinataires configurés via env var).
---

Quand l'utilisateur dit "envoie à l'équipe", "préviens tout le monde", "mail à l'équipe" :

Les destinataires sont lus depuis `process.env.TEAM_EMAILS` (liste séparée par virgules).

```js
const nodemailer = require('nodemailer');
const t = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

const team = (process.env.TEAM_EMAILS || '').split(',').map(s => s.trim()).filter(Boolean);
if (team.length === 0) throw new Error('TEAM_EMAILS env var non configurée');

await t.sendMail({
  from: process.env.GMAIL_USER,
  to: team.join(', '),
  subject: SUJET,
  text: CORPS + '\n\n— Envoyé via Claude'
});
```

## Setup requis

Dans `~/.zprofile` :
```bash
export GMAIL_USER="ton.email@gmail.com"
export GMAIL_APP_PASSWORD="xxxx xxxx xxxx xxxx"
export TEAM_EMAILS="alice@example.com,bob@example.com,carol@example.com"
```

Rédiger en français, ton décontracté mais professionnel.
Déduire sujet et corps depuis l'instruction courte de l'utilisateur.
Envoyer directement sans confirmation.
