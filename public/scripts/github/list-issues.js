/**
 * Liste les issues GitHub d'un repo.
 *
 * Usage :
 *   node list-issues.js --repo OWNER/REPO
 *   node list-issues.js --repo jaroussssss/Family --state open
 *   node list-issues.js --repo OWNER/REPO --label bug --limit 20
 */

const https = require('https');
const { execSync } = require('child_process');

function getGithubToken() {
  const raw = execSync('git credential fill', {
    input: 'protocol=https\nhost=github.com\n',
    encoding: 'utf8',
  });
  const match = raw.match(/^password=(.+)$/m);
  if (!match) throw new Error('Token GitHub introuvable');
  return match[1].trim();
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) out[args[i].slice(2)] = args[i + 1] || '';
  }
  return out;
}

function apiGet(path, token) {
  return new Promise((resolve, reject) => {
    https.get({
      hostname: 'api.github.com',
      path,
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'claude-setup-script',
        'Accept': 'application/vnd.github+json',
      },
    }, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch { resolve(body); }
      });
    }).on('error', reject);
  });
}

async function main() {
  const args = parseArgs();
  const { repo, state = 'open', label = '', limit = '20' } = args;

  if (!repo) {
    console.error('Usage: node list-issues.js --repo OWNER/REPO [--state open|closed|all] [--label bug] [--limit 20]');
    process.exit(1);
  }

  const token = getGithubToken();
  let path = `/repos/${repo}/issues?state=${state}&per_page=${limit}`;
  if (label) path += `&labels=${encodeURIComponent(label)}`;

  const issues = await apiGet(path, token);

  if (!Array.isArray(issues)) {
    console.error('Erreur API:', JSON.stringify(issues, null, 2));
    process.exit(1);
  }

  if (!issues.length) {
    console.log('Aucune issue trouvée.');
    return;
  }

  issues.forEach(i => {
    const labels = i.labels.map(l => `[${l.name}]`).join(' ');
    console.log(`#${i.number} ${i.title} ${labels}`);
    console.log(`  → ${i.html_url}`);
  });
}

main().catch(e => { console.error('✗', e.message); process.exit(1); });
