/**
 * Hook PreToolUse(Write) — Bloque l'écriture dans les fichiers sensibles.
 */

const input = JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf8'));
const path = (input.file_path || input.path || '').toLowerCase();

const BLOCKED_PATTERNS = [
  /\.env$/,
  /\.env\./,
  /credentials\.json$/,
  /token\.json$/,
  /id_rsa$/,
  /id_ed25519$/,
];

const blocked = BLOCKED_PATTERNS.find(re => re.test(path));
if (blocked) {
  console.log(JSON.stringify({
    decision: 'block',
    reason: `Écriture bloquée dans fichier sensible : ${path}`
  }));
} else {
  console.log(JSON.stringify({ decision: 'allow' }));
}
