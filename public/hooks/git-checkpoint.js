/**
 * Hook PostToolUse(Edit|Write) — WIP checkpoint git automatique.
 *
 * Crée un commit "wip: checkpoint" après N éditions sans commit dans la session,
 * pour éviter de perdre le travail si la session plante ou est interrompue.
 *
 * Déclenchement : ≥ CHECKPOINT_AFTER éditions de fichiers de code sans commit intermédiaire.
 * Sécurité : jamais sur main/master/prod. Jamais si dirty avec fichiers sensibles.
 * Marqué WIP dans le message → facilement identifiable, squashable.
 */

const fs   = require('fs');
const path = require('path');
const os   = require('os');
const { execFileSync, spawnSync } = require('child_process');
const readStdinJSON = require('./_stdin.js');
const { appendLog } = require('./_logger.js');

const CHECKPOINT_AFTER  = 5;   // éditions avant checkpoint
const PROTECTED = new Set(['main', 'master', 'prod', 'production', 'release']);
const COUNTER_DIR = path.join(os.homedir(), '.claude', 'audit');
const COUNTER_FILE = path.join(COUNTER_DIR, '.edit-counter.json');

const CODE_EXTS = new Set(['.js','.ts','.jsx','.tsx','.mjs','.cjs','.py','.sh','.json','.yaml','.yml']);
const SENSITIVE = [/\.env(\.|$)/i, /credentials\.json$/i, /token\.json$/i, /\.pem$/, /\.key$/];

const input = readStdinJSON();
if (!input) process.exit(0);

const filePath = input.tool_input?.file_path || input.tool_input?.path || '';
if (!filePath) process.exit(0);

const ext = path.extname(filePath).toLowerCase();
if (!CODE_EXTS.has(ext)) process.exit(0);

// Lire/mettre à jour le compteur d'éditions de la session
function getCounter() {
  try {
    fs.mkdirSync(COUNTER_DIR, { recursive: true });
    if (!fs.existsSync(COUNTER_FILE)) return {};
    return JSON.parse(fs.readFileSync(COUNTER_FILE, 'utf8'));
  } catch { return {}; }
}

function saveCounter(data) {
  try { fs.writeFileSync(COUNTER_FILE, JSON.stringify(data)); } catch {}
}

// Trouver la racine git du fichier édité
let cwd;
try {
  cwd = execFileSync('git', ['rev-parse', '--show-toplevel'], {
    cwd: path.dirname(path.resolve(filePath)),
    encoding: 'utf8',
    timeout: 3000,
    stdio: 'pipe',
  }).trim();
} catch { process.exit(0); }

const sessionKey = (input.session_id || 'default') + ':' + cwd;
const counter    = getCounter();
counter[sessionKey] = (counter[sessionKey] || 0) + 1;
saveCounter(counter);

const editCount = counter[sessionKey];

// Pas encore au seuil
if (editCount < CHECKPOINT_AFTER) process.exit(0);

// Vérifier la branche
let branch;
try {
  branch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
    cwd, encoding: 'utf8', timeout: 3000, stdio: 'pipe',
  }).trim();
} catch { process.exit(0); }

if (PROTECTED.has(branch) || branch === 'HEAD') process.exit(0);

// Vérifier s'il y a des modifications à committer
const status = spawnSync('git', ['status', '--porcelain'], {
  cwd, encoding: 'utf8', timeout: 3000, stdio: 'pipe',
}).stdout.trim();

if (!status) process.exit(0);

// Vérifier qu'aucun fichier sensible n'est staged/modified
const changedFiles = status.split('\n').map(l => l.slice(3).trim());
const hasSensitive = changedFiles.some(f => SENSITIVE.some(re => re.test(f)));
if (hasSensitive) {
  console.warn(`⚠️  git-checkpoint: fichier sensible détecté — checkpoint ignoré`);
  process.exit(0);
}

// Vérifier qu'un commit existe (évite checkpoint sur repo vide)
try {
  execFileSync('git', ['rev-parse', 'HEAD'], { cwd, stdio: 'pipe', timeout: 2000 });
} catch { process.exit(0); }

// Créer le checkpoint
try {
  spawnSync('git', ['add', '-A'], { cwd, stdio: 'pipe', timeout: 5000 });

  const ts  = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const msg = `wip: checkpoint session (${editCount} éditions) — ${ts}`;

  const commit = spawnSync('git', ['commit', '-m', msg], {
    cwd, encoding: 'utf8', timeout: 10000, stdio: 'pipe',
  });

  if (commit.status === 0) {
    // Réinitialiser le compteur après checkpoint
    counter[sessionKey] = 0;
    saveCounter(counter);

    appendLog('checkpoints.jsonl', {
      ts: new Date().toISOString(),
      branch,
      cwd,
      edits: editCount,
      msg,
    });

    console.log(`\n💾 Checkpoint WIP créé (${editCount} éditions) — ${branch}\n`);
  }
} catch {}

process.exit(0);
