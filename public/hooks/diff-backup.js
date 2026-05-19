/**
 * Hook PreToolUse(Edit) — Snapshot du fichier original avant modification.
 *
 * Sauvegarde dans : ~/.claude/audit/backups/YYYY-MM-DD/basename_HHMMSS.orig
 * Limite : fichiers ≤ 500 KB, max 100 backups/jour (nettoyage automatique des anciens).
 * Silencieux — ne bloque jamais.
 *
 * Rollback manuel : copier le .orig à la place du fichier courant.
 */

const fs   = require('fs');
const path = require('path');
const os   = require('os');
const readStdinJSON = require('./_stdin.js');

const MAX_SIZE    = 500 * 1024; // 500 KB
const MAX_BACKUPS = 100;
const BACKUP_BASE = path.join(os.homedir(), '.claude', 'audit', 'backups');

const input = readStdinJSON();

// Toujours allow — ce hook ne bloque jamais
const allow = () => { console.log(JSON.stringify({ decision: 'allow' })); process.exit(0); };

if (!input) return allow();

const filePath = input.tool_input?.file_path || input.tool_input?.path || '';
if (!filePath || !fs.existsSync(filePath)) return allow();

try {
  const stat = fs.statSync(filePath);
  if (stat.size > MAX_SIZE) return allow(); // trop gros, skip

  // Créer le dossier du jour
  const today = new Date().toISOString().slice(0, 10);
  const dir   = path.join(BACKUP_BASE, today);
  fs.mkdirSync(dir, { recursive: true });

  // Nettoyer si trop de backups
  const existing = fs.readdirSync(dir).sort();
  if (existing.length >= MAX_BACKUPS) {
    // Supprimer les plus anciens
    existing.slice(0, existing.length - MAX_BACKUPS + 1)
      .forEach(f => { try { fs.unlinkSync(path.join(dir, f)); } catch {} });
  }

  // Nom du snapshot : basename_HHMMSS.orig
  const ts   = new Date().toISOString().slice(11, 19).replace(/:/g, '');
  const base = path.basename(filePath).replace(/[^a-zA-Z0-9._\-]/g, '_');
  const dest = path.join(dir, `${base}_${ts}.orig`);

  fs.copyFileSync(filePath, dest);

} catch {
  // Silencieux
}

allow();
