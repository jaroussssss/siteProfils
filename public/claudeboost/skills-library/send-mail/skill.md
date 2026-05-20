---
name: send-mail
description: Envoie un email via Gmail App Password. Cherche d'abord le contact dans Gmail si l'adresse n'est pas fournie.
---

Quand l'utilisateur dit "envoie un mail à [prénom/nom]" :
1. Si pas d'email fourni → utiliser le skill `find-contact` d'abord
2. Envoyer via nodemailer (nodemailer doit être installé : `npm install -g nodemailer`)

```js
const nodemailer = require('nodemailer');
const t = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});
await t.sendMail({
  from: process.env.GMAIL_USER,
  to: EMAIL,
  subject: SUJET,
  text: CORPS
});
```

## Setup requis (une seule fois)

Dans `~/.zprofile` (ou `~/.bash_profile`) :
```bash
export GMAIL_USER="ton.email@gmail.com"
export GMAIL_APP_PASSWORD="xxxx xxxx xxxx xxxx"  # 16 chars depuis https://myaccount.google.com/apppasswords
```

Recharger : `source ~/.zprofile`

Règle : envoyer directement sans demander confirmation (préférence utilisateur).
