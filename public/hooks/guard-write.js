/**
 * Hook PreToolUse(Write|Edit) — Bloque l'écriture dans les fichiers sensibles.
 * Cross-platform. Fail-closed sur erreur stdin.
 */

const readStdinJSON = require('./_stdin.js');

const input = readStdinJSON();
if (!input) {
  console.log(JSON.stringify({ decision: 'block', reason: 'guard-write: impossible de lire stdin' }));
  process.exit(0);
}

// PreToolUse : paramètres à la racine (pas dans tool_input)
const rawPath = (input.file_path || input.path || '');
const p = rawPath.toLowerCase().replace(/\\/g, '/');

const BLOCKED_PATTERNS = [
  // Variables d'environnement — autoriser .env.example / .env.sample / .env.template
  { re: /\.env$/, desc: '.env' },
  { re: /\.env\.(?!example|sample|template|dist|test|local\.example)/, desc: '.env.*' },
  // Credentials OAuth / API
  { re: /credentials\.json$/, desc: 'credentials.json' },
  { re: /service.?account.*\.json$/i, desc: 'service account JSON' },
  // Tokens OAuth
  { re: /\btoken\.json$/, desc: 'token.json' },
  { re: /\boauth.*\.json$/i, desc: 'OAuth JSON' },
  // Clés SSH
  { re: /\/\.ssh\/id_rsa$/, desc: 'clé SSH RSA' },
  { re: /\/\.ssh\/id_ed25519$/, desc: 'clé SSH Ed25519' },
  { re: /\/\.ssh\/id_ecdsa$/, desc: 'clé SSH ECDSA' },
  // Certificats / clés privées
  { re: /\.pem$/, desc: 'fichier PEM' },
  { re: /\.key$/, desc: 'fichier .key' },
  { re: /\.p12$/, desc: 'fichier PKCS12' },
  { re: /\.pfx$/, desc: 'fichier PFX' },
  // Config npm avec tokens
  { re: /\.npmrc$/, desc: '.npmrc (peut contenir des tokens)' },
  // Secrets YAML
  { re: /secrets?\.(yaml|yml)$/, desc: 'fichier secrets YAML' },
];

const matched = BLOCKED_PATTERNS.find(({ re }) => re.test(p));
if (matched) {
  console.log(JSON.stringify({
    decision: 'block',
    reason: `guard-write: écriture bloquée dans fichier sensible (${matched.desc}) : ${rawPath}`
  }));
} else {
  console.log(JSON.stringify({ decision: 'allow' }));
}
