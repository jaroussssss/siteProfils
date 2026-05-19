/**
 * Hook PostToolUse(Edit|Write) — Vérifie la syntaxe des fichiers JS modifiés.
 * Silencieux si OK, ajoute un warning si erreur de syntaxe.
 */

const { execSync } = require('child_process');
const input = JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf8'));
const filePath = input.file_path || input.path || '';

if (!filePath.endsWith('.js')) {
  process.exit(0);
}

try {
  execSync(`node --check "${filePath}"`, { stdio: 'pipe' });
  // Syntaxe OK — silencieux
} catch (err) {
  const msg = (err.stderr || err.stdout || '').toString().slice(0, 200);
  // Émet un warning visible dans Claude Code
  console.error(`⚠️  Erreur syntaxe JS dans ${filePath}:\n${msg}`);
  // Ne bloque pas (exit 0) — juste un avertissement
}
