/**
 * Hook PreToolUse(Bash) — Bloque les commandes dangereuses.
 * Reçoit le tool input sur stdin (JSON), retourne décision sur stdout.
 */

const input = JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf8'));
const cmd = (input.command || '').trim();

const BLOCKED = [
  /rm\s+-rf\s+\/(?!\w)/,             // rm -rf / ou /home
  /git\s+push\s+.*--force.*main/,    // force push sur main
  /git\s+push\s+.*--force.*master/,  // force push sur master
  /git\s+push\s+.*-f\s+.*main/,
  /DROP\s+TABLE/i,                   // SQL DROP sans filet
  />\s*\/etc\//,                     // écriture dans /etc
];

const blocked = BLOCKED.find(re => re.test(cmd));
if (blocked) {
  console.log(JSON.stringify({
    decision: 'block',
    reason: `Commande bloquée par guard-bash : "${cmd.slice(0, 80)}"`
  }));
} else {
  console.log(JSON.stringify({ decision: 'allow' }));
}
