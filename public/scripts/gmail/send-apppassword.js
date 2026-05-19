/**
 * Envoie un email via Gmail App Password (nodemailer).
 *
 * Usage :
 *   node send-apppassword.js --to addr@mail.com --subject "Sujet" --body "Corps"
 *   node send-apppassword.js --to addr@mail.com --subject "S" --html path/to/file.html
 *
 * Variables d'env requises :
 *   GMAIL_USER     = jarousseau.arthur11@gmail.com
 *   GMAIL_APPPASS  = xxxx xxxx xxxx xxxx (App Password Google)
 */

const path = require('path');
const { parseArgs } = require('util');

// Chemin absolu vers nodemailer — indépendant du cwd
const nodemailer = require(path.join('D:', 'ClaudeSetup', 'node_modules', 'nodemailer'));

async function sendMail({ from, to, subject, body, html, appPass }) {
  // Validation basique des champs obligatoires
  if (!to || !subject) throw new Error('--to et --subject sont requis');
  if (!/^[^\s<>,;\r\n]+@[^\s<>,;\r\n]+\.[^\s<>,;\r\n]+$/.test(to)) {
    throw new Error(`Adresse email invalide : ${to}`);
  }
  if (/[\r\n]/.test(subject)) throw new Error('Subject ne doit pas contenir de retours à la ligne');
  if (subject.length > 200) throw new Error('Subject trop long (max 200 chars)');

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: from, pass: appPass },
    tls: {
      minVersion: 'TLSv1.2',
      rejectUnauthorized: true,
    },
    connectionTimeout: 10000,
    socketTimeout: 30000,
  });

  const mailOpts = { from, to, subject };
  if (html) {
    mailOpts.html = html;
    if (body) mailOpts.text = body; // version texte fallback
  } else {
    mailOpts.text = body || '';
  }

  const info = await transporter.sendMail(mailOpts);
  return { sent: true, messageId: info.messageId };
}

if (require.main === module) {
  const { values: args } = parseArgs({
    options: {
      to:      { type: 'string' },
      subject: { type: 'string' },
      body:    { type: 'string', default: '' },
      html:    { type: 'string', default: '' },
    },
    strict: false,
  });

  const from    = process.env.GMAIL_USER;
  const appPass = process.env.GMAIL_APPPASS;

  if (!from || !appPass) {
    console.error('Variables manquantes : GMAIL_USER et GMAIL_APPPASS requis');
    process.exit(1);
  }

  if (!args.to || !args.subject) {
    console.error('Usage : node send-apppassword.js --to addr --subject "S" [--body "B"] [--html file.html]');
    process.exit(1);
  }

  const fs = require('fs');
  const htmlContent = args.html ? fs.readFileSync(path.resolve(args.html), 'utf8') : undefined;

  sendMail({ from, to: args.to, subject: args.subject, body: args.body, html: htmlContent, appPass })
    .then(r => console.log('✓ Envoyé :', JSON.stringify(r)))
    .catch(e => { console.error('✗', e.message); process.exit(1); });
}

module.exports = { sendMail };
