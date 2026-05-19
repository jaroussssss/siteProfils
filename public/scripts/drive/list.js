/**
 * Liste les fichiers récents Google Drive.
 *
 * Usage :
 *   node list.js
 *   node list.js --query "name contains 'rapport'"
 *   node list.js --folder FOLDER_ID --limit 20
 */

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

async function listFiles({ query = '', folder = '', limit = '15' } = {}) {
  const auth = getClient();
  const drive = google.drive({ version: 'v3', auth });

  let q = "trashed = false";
  if (folder) q += ` and '${folder}' in parents`;
  if (query)  q += ` and ${query}`;

  const { data } = await drive.files.list({
    q,
    pageSize: parseInt(limit),
    orderBy: 'modifiedTime desc',
    fields: 'files(id,name,mimeType,modifiedTime,webViewLink)',
  });

  if (!data.files.length) {
    console.log('Aucun fichier trouvé.');
    return [];
  }

  data.files.forEach(f => {
    const date = new Date(f.modifiedTime).toLocaleString('fr-FR');
    console.log(`${f.name} (modifié: ${date})`);
    console.log(`  → ${f.webViewLink}`);
  });

  return data.files;
}

if (require.main === module) {
  listFiles(parseArgs()).catch(e => { console.error('✗', e.message); process.exit(1); });
}

module.exports = { listFiles };
