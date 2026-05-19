/**
 * Crée une Pull Request GitHub via l'API.
 *
 * Usage :
 *   node create-pr.js --repo OWNER/REPO --title "Titre" --body "Description" --head feature-branch --base main
 */

const https  = require('https');
const { execFileSync } = require('child_process');
const { parseArgs }    = require('util');

function getGithubToken() {
  // Double \n final requis par git credential fill pour signaler fin d'input
  const raw = execFileSync('git', ['credential', 'fill'], {
    input: 'protocol=https\nhost=github.com\n\n',
    encoding: 'utf8',
    timeout: 15000,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const match = raw.match(/^password=(.+)$/m);
  if (!match) throw new Error('Token GitHub introuvable dans le credential store');
  return match[1].trim();
}

function apiPost(apiPath, body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request({
      hostname: 'api.github.com',
      path: apiPath,
      method: 'POST',
      headers: {
        Authorization:   `Bearer ${token}`,
        'Content-Type':  'application/json',
        'User-Agent':    'claude-boost-scripts',
        Accept:          'application/vnd.github+json',
        'Content-Length': Buffer.byteLength(data),
      },
    }, res => {
      let buf = '';
      res.on('data', d => (buf += d));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(buf) }); }
        catch { resolve({ status: res.statusCode, data: buf }); }
      });
    });

    req.setTimeout(15000, () => req.destroy(new Error('Timeout API GitHub')));
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function validateRepo(repo) {
  if (!/^[\w.\-]{1,39}\/[\w.\-]{1,100}$/.test(repo)) {
    throw new Error(`Format repo invalide : ${repo} (attendu: owner/repo)`);
  }
}

function validateBranch(branch, name) {
  if (!/^[\w.\-/]{1,255}$/.test(branch) || branch.includes('..')) {
    throw new Error(`Nom de branche ${name} invalide : ${branch}`);
  }
}

async function main() {
  const { values } = parseArgs({
    options: {
      repo:  { type: 'string' },
      title: { type: 'string' },
      body:  { type: 'string', default: '' },
      head:  { type: 'string' },
      base:  { type: 'string', default: 'main' },
      draft: { type: 'string', default: 'false' },
    },
    strict: false,
  });

  const { repo, title, body, head, base, draft } = values;

  if (!repo || !title || !head) {
    console.error('Usage: node create-pr.js --repo OWNER/REPO --title "T" --head branch [--base main] [--body "B"] [--draft true]');
    process.exit(1);
  }

  validateRepo(repo);
  validateBranch(head, 'head');
  validateBranch(base, 'base');

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
  } else if (result.status === 422) {
    console.error(`✗ PR invalide (422) : branche inexistante, PR déjà ouverte, ou head déjà merged ?`);
    console.error(JSON.stringify(result.data?.errors || result.data, null, 2));
    process.exit(1);
  } else {
    console.error(`✗ Erreur ${result.status}`);
    process.exit(1);
  }
}

main().catch(e => { console.error('✗', e.message); process.exit(1); });
