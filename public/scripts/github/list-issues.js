/**
 * Liste les issues GitHub d'un repo.
 *
 * Usage :
 *   node list-issues.js --repo OWNER/REPO
 *   node list-issues.js --repo jaroussssss/NonChalanceApp --state open
 *   node list-issues.js --repo OWNER/REPO --label bug --limit 50
 */

const https = require('https');
const { execFileSync } = require('child_process');
const { parseArgs }    = require('util');

function getGithubToken() {
  const raw = execFileSync('git', ['credential', 'fill'], {
    input: 'protocol=https\nhost=github.com\n\n',
    encoding: 'utf8',
    timeout: 15000,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const match = raw.match(/^password=(.+)$/m);
  if (!match) throw new Error('Token GitHub introuvable');
  return match[1].trim();
}

function apiGet(apiPath, token) {
  return new Promise((resolve, reject) => {
    const req = https.get({
      hostname: 'api.github.com',
      path: apiPath,
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent':  'claude-boost-scripts',
        Accept:        'application/vnd.github+json',
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
  });
}

async function main() {
  const { values } = parseArgs({
    options: {
      repo:  { type: 'string' },
      state: { type: 'string', default: 'open' },
      label: { type: 'string', default: '' },
      limit: { type: 'string', default: '30' },
      page:  { type: 'string', default: '1' },
    },
    strict: false,
  });

  const { repo, state, label, limit, page } = values;

  if (!repo) {
    console.error('Usage: node list-issues.js --repo OWNER/REPO [--state open|closed|all] [--label bug] [--limit 30]');
    process.exit(1);
  }

  if (!/^[\w.\-]{1,39}\/[\w.\-]{1,100}$/.test(repo)) {
    console.error(`Format repo invalide : ${repo}`);
    process.exit(1);
  }

  const perPage = Math.min(Math.max(parseInt(limit) || 30, 1), 100);
  const pageNum = Math.max(parseInt(page) || 1, 1);

  const token = getGithubToken();
  let apiPath = `/repos/${repo}/issues?state=${state}&per_page=${perPage}&page=${pageNum}`;
  if (label) apiPath += `&labels=${encodeURIComponent(label)}`;

  const { status, data: issues } = await apiGet(apiPath, token);

  if (status !== 200 || !Array.isArray(issues)) {
    console.error(`Erreur API (${status}):`, JSON.stringify(issues, null, 2));
    process.exit(1);
  }

  if (!issues.length) {
    console.log(`Aucune issue ${state} trouvée.`);
    return;
  }

  issues.forEach(i => {
    const labels = (i.labels || []).map(l => `[${l.name}]`).join(' ');
    const assignee = i.assignee ? ` @${i.assignee.login}` : '';
    console.log(`#${i.number} ${i.title} ${labels}${assignee}`);
    console.log(`  → ${i.html_url}`);
  });

  if (issues.length === perPage) {
    console.log(`\n(${issues.length} résultats — utilisez --page ${pageNum + 1} pour la suite)`);
  }
}

main().catch(e => { console.error('✗', e.message); process.exit(1); });
