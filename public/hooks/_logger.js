/**
 * Utilitaire partagé — écriture JSONL avec rotation.
 * Utilisé par trace.js, perf-watch.js, session-end.js, etc.
 */

const fs   = require('fs');
const path = require('path');
const os   = require('os');

const AUDIT_DIR = path.join(os.homedir(), '.claude', 'audit');
const MAX_BYTES = 5 * 1024 * 1024;

function ensureDir(dir) {
  try { fs.mkdirSync(dir, { recursive: true }); } catch {}
}

/**
 * Appende une entrée JSON dans un fichier JSONL avec rotation automatique.
 * @param {string} filename  — nom du fichier (ex: 'trace.jsonl')
 * @param {object} entry     — objet à sérialiser
 */
function appendLog(filename, entry) {
  try {
    ensureDir(AUDIT_DIR);
    const active = path.join(AUDIT_DIR, filename);

    if (fs.existsSync(active) && fs.statSync(active).size > MAX_BYTES) {
      const ym      = new Date().toISOString().slice(0, 7);
      const base    = path.basename(filename, '.jsonl');
      const archive = path.join(AUDIT_DIR, `${base}.${ym}.jsonl`);
      fs.appendFileSync(archive, fs.readFileSync(active));
      fs.writeFileSync(active, '');
    }

    fs.appendFileSync(active, JSON.stringify(entry) + '\n');
  } catch {}
}

/**
 * Lit les N dernières lignes d'un fichier JSONL et les parse.
 */
function readLastN(filename, n = 100) {
  try {
    const file = path.join(AUDIT_DIR, filename);
    if (!fs.existsSync(file)) return [];
    const lines = fs.readFileSync(file, 'utf8')
      .split('\n')
      .filter(Boolean)
      .slice(-n);
    return lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  } catch { return []; }
}

module.exports = { appendLog, readLastN, AUDIT_DIR };
