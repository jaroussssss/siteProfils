/**
 * Utilitaire cross-platform : lit stdin JSON.
 * Utilise fd 0 (portable Windows/Linux/Mac) — pas /dev/stdin.
 * En cas d'erreur retourne null → hooks doivent fail-safe.
 */
module.exports = function readStdinJSON() {
  try {
    const raw = require('fs').readFileSync(0, 'utf8');
    if (!raw || raw.length > 1_000_000) return null; // DoS guard
    return JSON.parse(raw);
  } catch {
    return null;
  }
};
