/**
 * Liste les fichiers récents Google Drive.
 *
 * Usage :
 *   node list.js
 *   node list.js --query "name contains 'rapport'"
 *   node list.js --folder FOLDER_ID --limit 20
 *
 * Prérequis : token.json dans D:\Projects\Site famille\tools\google\
 */

const path   = require('path');
const { parseArgs } = require('util');
const { google } = require(path.join('D:', 'Projects', 'Site famille', 'node_modules', 'googleapis'));

const GOOGLE_TOOLS = path.join('D:', 'Projects', 'Site famille', 'tools', 'google');
const { getClient } = require(path.join(GOOGLE_TOOLS, '_client.js'));

async function listFiles({ query = '', folder = '', limit = '15' } = {}) {
  const auth  = getClient();
  const drive = google.drive({ version: 'v3', auth });

  const pageSize = Math.max(1, Math.min(parseInt(limit) || 15, 100));

  let q = 'trashed = false';
  if (folder) q += ` and '${folder.replace(/'/g, "\\'")}' in parents`;
  if (query) {
    // Envelopper la query utilisateur dans des parenthèses pour éviter l'injection logique
    // Refuser les opérateurs dangereux en position initiale
    const sanitized = query.trim();
    if (/^\s*(or|and)\b/i.test(sanitized)) {
      throw new Error(`Query invalide : ne pas commencer par 'or' ou 'and'`);
    }
    q += ` and (${sanitized})`;
  }

  const { data } = await drive.files.list({
    q,
    pageSize,
    orderBy: 'modifiedTime desc',
    fields:  'files(id,name,mimeType,modifiedTime,webViewLink)',
  });

  const files = data.files || [];

  if (!files.length) {
    console.log('Aucun fichier trouvé.');
    return [];
  }

  files.forEach(f => {
    const date = new Date(f.modifiedTime).toLocaleString('fr-FR');
    console.log(`${f.name} (modifié: ${date})`);
    console.log(`  → ${f.webViewLink}`);
  });

  return files;
}

if (require.main === module) {
  const { values } = parseArgs({
    options: {
      query:  { type: 'string', default: '' },
      folder: { type: 'string', default: '' },
      limit:  { type: 'string', default: '15' },
    },
    strict: false,
  });

  listFiles(values).catch(e => { console.error('✗', e.message); process.exit(1); });
}

module.exports = { listFiles };
