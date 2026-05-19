/**
 * Hook PreToolUse(Write|Edit) — Bloque si des secrets sont détectés dans le contenu.
 *
 * Protège contre l'écriture accidentelle de :
 *   - Clés API (Anthropic, GitHub, AWS, OpenAI, Stripe...)
 *   - Mots de passe en clair dans du code
 *   - App Passwords Gmail
 *   - JWT tokens hardcodés
 *   - Chaînes de connexion avec credentials
 *
 * IMPORTANT : n'inspecte pas les fichiers .env* (guard-write.js les bloque en amont).
 * Se concentre sur les fichiers de CODE (.js .ts .py .sh .json .yaml).
 */

const path = require('path');
const readStdinJSON = require('./_stdin.js');
const { appendLog } = require('./_logger.js');

const input = readStdinJSON();
if (!input) {
  console.log(JSON.stringify({ decision: 'allow' }));
  process.exit(0);
}

const filePath = (input.tool_input?.file_path || input.tool_input?.path || '').toLowerCase();
const content  = input.tool_input?.content || input.tool_input?.new_string || '';

// Extensions à inspecter (fichiers de code uniquement)
const SCAN_EXTS = new Set(['.js', '.ts', '.mjs', '.cjs', '.jsx', '.tsx',
  '.py', '.sh', '.bash', '.json', '.yaml', '.yml', '.env', '.toml']);

const ext = path.extname(filePath);
if (!SCAN_EXTS.has(ext) && ext !== '') {
  console.log(JSON.stringify({ decision: 'allow' }));
  process.exit(0);
}

// Patterns de secrets
const SECRET_PATTERNS = [
  // Anthropic
  { re: /sk-ant-[a-zA-Z0-9\-_]{20,}/,                  name: 'Clé Anthropic API' },
  // GitHub tokens
  { re: /ghp_[a-zA-Z0-9]{36}/,                          name: 'GitHub Personal Access Token' },
  { re: /ghs_[a-zA-Z0-9]{36}/,                          name: 'GitHub Actions Secret' },
  { re: /github_pat_[a-zA-Z0-9_]{80,}/,                 name: 'GitHub PAT (fine-grained)' },
  // AWS
  { re: /AKIA[0-9A-Z]{16}/,                             name: 'AWS Access Key ID' },
  { re: /aws[_\s]?secret[_\s]?access[_\s]?key\s*[:=]\s*['"]?[A-Za-z0-9+/]{40}/i, name: 'AWS Secret Key' },
  // OpenAI
  { re: /sk-[a-zA-Z0-9]{48}/,                           name: 'OpenAI API Key' },
  // Stripe
  { re: /sk_(live|test)_[a-zA-Z0-9]{24,}/,              name: 'Stripe Secret Key' },
  // Google App Password (16 caractères avec espaces)
  { re: /[a-z]{4}\s[a-z]{4}\s[a-z]{4}\s[a-z]{4}/,     name: 'Google App Password' },
  // JWT hardcodé (header.payload.signature réel, pas un placeholder)
  { re: /eyJ[a-zA-Z0-9\-_]{20,}\.eyJ[a-zA-Z0-9\-_]{20,}\.[a-zA-Z0-9\-_]{20,}/, name: 'JWT Token' },
  // Mots de passe dans chaînes de connexion
  { re: /password\s*[:=]\s*['"][^'"]{8,}['"]/i,         name: 'Mot de passe en clair' },
  { re: /mysql:\/\/[^:]+:[^@]{6,}@/i,                   name: 'DSN MySQL avec password' },
  { re: /postgres:\/\/[^:]+:[^@]{6,}@/i,                name: 'DSN Postgres avec password' },
  // Tokens génériques longs (heuristique)
  { re: /['"][a-zA-Z0-9\-_]{64,}['"]/,                  name: 'Token long potentiel (≥64 chars)' },
];

// Exceptions : placeholders, variables d'env, exemples de doc
const EXCEPTIONS = [
  /process\.env\./,
  /\$\{.*\}/,
  /\$[A-Z_]+/,
  /xxxx|XXXX|YOUR_|<your|example|placeholder|changeme|todo|test123|dummy/i,
  /sk-ant-\.\.\.|ghp_\.\.\./,
];

function containsSecret(text) {
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Ignorer les commentaires
    if (/^\s*(#|\/\/|\/\*)/.test(line)) continue;
    // Ignorer les lignes avec exceptions claires
    if (EXCEPTIONS.some(re => re.test(line))) continue;

    for (const { re, name } of SECRET_PATTERNS) {
      if (re.test(line)) {
        return { found: true, name, line: i + 1, snippet: line.trim().slice(0, 60) };
      }
    }
  }
  return { found: false };
}

const result = containsSecret(content);

if (result.found) {
  // Logger la détection (sans le contenu sensible)
  appendLog('security.jsonl', {
    ts: new Date().toISOString(),
    event: 'secret_blocked',
    file: filePath,
    secret_type: result.name,
    line: result.line,
  });

  console.log(JSON.stringify({
    decision: 'block',
    reason: `secret-scan: ${result.name} détecté ligne ${result.line} dans ${path.basename(filePath)} — utiliser process.env.VARIABLE à la place`,
  }));
} else {
  console.log(JSON.stringify({ decision: 'allow' }));
}
