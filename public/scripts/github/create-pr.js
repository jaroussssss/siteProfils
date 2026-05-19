/**
 * Crée une Pull Request GitHub via l'API.
 *
 * Usage :
 *   node create-pr.js --repo OWNER/REPO --title "Titre" --body "Description" --head feature-branch --base main
 *   node create-pr.js --repo jaroussssss/Family --title "fix: bug" --head dev-saas --base main
 *
 * Dépendances : git credential fill disponible (Windows Credential Manager)
 */

const https = require('https');
const { execSync } = require('child_process');

function getGithubToken() {
  const raw = execSync('git credential fill', {
    input: 'protocol=https\nhost=github.com\n',
    encoding: 'utf8',
  });
  const match = raw.match(/^password=(.+)$/m);
  if (!match) throw new Error('Token GitHub introuvable dans le credential store');
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

function apiPost(path, body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request({
      hostname: 'api.github.com',
      path,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'claude-setup-script',
        'Accept': 'application/vnd.github+json',
        'Content-Length': Buffer.byteLength(data),
      },
    }, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
        catch { resolve({ status: res.statusCode, data: body }); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  const args = parseArgs();
  const { repo, title, body = '', head, base = 'main', draft = 'false' } = args;

  if (!repo || !title || !head) {
    console.error('Usage: node create-pr.js --repo OWNER/REPO --title "T" --head branch [--base main] [--body "B"] [--draft true]');
    process.exit(1);
  }

  const token = getGithubToken();
  const result = await apiPost(`/repos/${repo}/pulls`, {
    title,
    body,
    head,
    base,
    draft: draft === 'true',
  }, token);

  if (result.status === 201) {
    console.log(`✓ PR créée : ${result.data.html_url}`);
    console.log(JSON.stringify({ number: result.data.number, url: result.data.html_url }, null, 2));
  } else {
    console.error(`✗ Erreur ${result.status}:`, JSON.stringify(result.data, null, 2));
    process.exit(1);
  }
}

main().catch(e => { console.error('✗', e.message); process.exit(1); });
