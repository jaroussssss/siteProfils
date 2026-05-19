/**
 * Upload un fichier vers Google Drive.
 *
 * Usage :
 *   node upload.js --file chemin/fichier.html --name "Rapport 2026-05"
 *   node upload.js --file rapport.pdf --name "Doc" --folder FOLDER_ID
 *
 * Prérequis : token.json dans D:\Projects\Site famille\tools\google\
 */

const fs = require('fs');
const path = require('path');
const { google } = require(path.join('D:', 'Projects', 'Site famille', 'node_modules', 'googleapis'));

const GOOGLE_TOOLS = path.join('D:', 'Projects', 'Site famille', 'tools', 'google');
const { getClient } = require(path.join(GOOGLE_TOOLS, '_client.js'));

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) out[args[i].slice(2)] = args[i + 1] || '';
  }
  return out;
}

async function upload({ file, name, folder }) {
  if (!file || !name) {
    console.error('Usage: node upload.js --file chemin --name "Nom Drive" [--folder FOLDER_ID]');
    process.exit(1);
  }

  const filePath = path.resolve(file);
  if (!fs.existsSync(filePath)) {
    console.error(`Fichier introuvable : ${filePath}`);
    process.exit(1);
  }

  const ext = path.extname(filePath).slice(1).toLowerCase();
  const mimeTypes = {
    html: 'text/html', pdf: 'application/pdf',
    png: 'image/png', jpg: 'image/jpeg',
    json: 'application/json', txt: 'text/plain',
    md: 'text/markdown',
  };
  const mimeType = mimeTypes[ext] || 'application/octet-stream';

  const auth = getClient();
  const drive = google.drive({ version: 'v3', auth });

  const meta = { name };
  if (folder) meta.parents = [folder];

  const { data } = await drive.files.create({
    requestBody: meta,
    media: { mimeType, body: fs.createReadStream(filePath) },
    fields: 'id,name,webViewLink',
  });

  console.log(`✓ Uploadé : ${data.name}`);
  console.log(JSON.stringify({ id: data.id, url: data.webViewLink }, null, 2));
  return data;
}

if (require.main === module) {
  upload(parseArgs()).catch(e => { console.error('✗', e.message); process.exit(1); });
}

module.exports = { upload };
