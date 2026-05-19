/**
 * Hook PostToolUse(Edit|Write) — Vérifie la syntaxe des fichiers JS/MJS/CJS modifiés.
 * Silencieux si OK. Warning si erreur de syntaxe.
 */

const { spawnSync } = require('child_process');
const readStdinJSON = require('./_stdin.js');

const input = readStdinJSON();
if (!input) process.exit(0);

const filePath = input.file_path || input.path || '';

// Vérifier les extensions JS supportées par node --check
if (!/\.(c|m)?jsx?$/.test(filePath)) process.exit(0);

// spawnSync évite l'interpolation shell (pas de risque injection via filePath)
const result = spawnSync('node', ['--check', filePath], {
  encoding: 'utf8',
  timeout: 10000,
  stdio: 'pipe',
});

if (result.status !== 0 || result.error) {
  const msg = (result.stderr || result.stdout || result.error?.message || '').toString().slice(0, 300);
  console.error(`⚠️  Erreur syntaxe JS dans ${filePath}:\n${msg}`);
  // Ne bloque pas (exit 0) — avertissement uniquement
}
