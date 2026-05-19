/**
 * Hook PostToolUse(Bash) — Surveille les performances des commandes shell.
 *
 * - Log chaque commande avec sa durée dans ~/.claude/audit/perf.jsonl
 * - Alerte visible si commande > WARN_MS (défaut: 10s)
 * - Identifie les catégories de commandes lentes (npm, git, test, deploy...)
 * - Silencieux si commande rapide
 */

const readStdinJSON = require('./_stdin.js');
const { appendLog } = require('./_logger.js');

const WARN_MS  = 10_000;  // 10 secondes
const CRIT_MS  = 60_000;  // 1 minute

const input = readStdinJSON();
if (!input) process.exit(0);

const cmd      = (input.tool_input?.command || '').trim();
const duration = input.duration_ms || input.ms || null;
const exitCode = input.tool_response?.exit_code ?? null;
const hasError = !!(input.tool_response?.error);

if (!cmd) process.exit(0);

// Catégoriser la commande
function categorize(c) {
  if (/^npm\s+(install|ci|i\b)/.test(c))    return 'npm-install';
  if (/^npm\s+test/.test(c))                 return 'npm-test';
  if (/^npm\s+run/.test(c))                  return 'npm-run';
  if (/^git\s+push/.test(c))                 return 'git-push';
  if (/^git\s+pull/.test(c))                 return 'git-pull';
  if (/^git\s+clone/.test(c))                return 'git-clone';
  if (/^git\s+(fetch|merge|rebase)/.test(c)) return 'git-merge';
  if (/^git/.test(c))                        return 'git-other';
  if (/node\s+.*\.js/.test(c))               return 'node-run';
  if (/^(bash|sh)\s/.test(c))               return 'shell-script';
  if (/^curl|wget/.test(c))                  return 'network';
  if (/^ssh/.test(c))                        return 'ssh';
  if (/^docker/.test(c))                     return 'docker';
  return 'other';
}

const entry = {
  ts:       new Date().toISOString(),
  cmd:      cmd.slice(0, 150),
  cat:      categorize(cmd),
  ms:       duration,
  exit:     exitCode,
  error:    hasError,
};

// Logger dans perf.jsonl (même si durée inconnue)
appendLog('perf.jsonl', entry);

// Alerte si trop lent
if (duration !== null) {
  if (duration >= CRIT_MS) {
    console.error(`⏱  Commande très lente (${(duration/1000).toFixed(1)}s) : ${cmd.slice(0, 80)}`);
    console.error(`   Catégorie : ${entry.cat} — envisager optimisation ou cache`);
  } else if (duration >= WARN_MS) {
    console.error(`⏱  Commande lente (${(duration/1000).toFixed(1)}s) : ${cmd.slice(0, 60)}`);
  }
}

// Alerte si erreur + durée > seuil (commande longue qui a planté)
if (hasError && duration !== null && duration > 5000) {
  console.error(`⚠️  Commande en erreur après ${(duration/1000).toFixed(1)}s : ${cmd.slice(0, 80)}`);
}

process.exit(0);
