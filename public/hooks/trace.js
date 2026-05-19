/**
 * Hook PostToolUse(*) — Traçabilité complète des actions Claude Code.
 *
 * Chaque action est loggée en JSONL dans :
 *   ~/.claude/audit/trace.jsonl   (actif)
 *   ~/.claude/audit/trace.YYYY-MM.jsonl  (archivé par mois)
 *
 * Format d'une entrée :
 * {
 *   "ts": "2026-05-19T14:32:01.123Z",
 *   "session": "abc123",
 *   "seq": 42,
 *   "tool": "Edit",
 *   "file": "src/server.js",           // si applicable
 *   "cmd":  "git add ...",             // si Bash
 *   "git": { "branch": "dev", "hash": "a1b2c3d", "dirty": true },
 *   "summary": "Edit src/server.js (±42 lines)",
 *   "ok": true,
 *   "ms": 234
 * }
 *
 * Taille max par fichier : 5 MB → rotation automatique.
 * Silencieux en cas d'erreur (jamais bloquer Claude).
 */

const fs   = require('fs');
const path = require('path');
const os   = require('os');
const { spawnSync } = require('child_process');

const AUDIT_DIR = path.join(os.homedir(), '.claude', 'audit');
const ACTIVE    = path.join(AUDIT_DIR, 'trace.jsonl');
const SEQ_FILE  = path.join(AUDIT_DIR, '.seq');
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB par fichier

// ── Lecture stdin ──────────────────────────────────────────────────────────────
const readStdinJSON = require('./_stdin.js');

const t0    = Date.now();
const input = readStdinJSON();
if (!input) process.exit(0);

// ── Extraction des infos pertinentes ──────────────────────────────────────────
const tool      = input.tool_name || input.tool || 'unknown';
const toolInput = input.tool_input || {};
const toolResp  = input.tool_response || {};
const sessionId = input.session_id || process.env.CLAUDE_SESSION_ID || null;

// Déterminer le fichier ou la commande
const filePath = toolInput.file_path || toolInput.path || null;
const command  = toolInput.command || null;
const url      = toolInput.url || null;

// Résumé lisible
function makeSummary() {
  switch (tool) {
    case 'Edit':
    case 'Write':
    case 'MultiEdit': {
      const base = filePath ? path.basename(filePath) : '?';
      const old_str = toolInput.old_string || '';
      const new_str = toolInput.new_string || toolInput.content || '';
      const added   = (new_str.match(/\n/g) || []).length;
      const removed = (old_str.match(/\n/g) || []).length;
      return `${tool} ${base} (+${added}/-${removed} lignes)`;
    }
    case 'Bash':
      return `Bash: ${(command || '').slice(0, 80)}`;
    case 'Read':
      return `Read ${filePath ? path.basename(filePath) : '?'}`;
    case 'Glob':
      return `Glob ${toolInput.pattern || '?'}`;
    case 'Grep':
      return `Grep "${(toolInput.pattern || '').slice(0, 40)}"`;
    case 'WebFetch':
      return `Fetch ${url || '?'}`;
    case 'Agent':
      return `Agent [${toolInput.subagent_type || 'general'}] — ${(toolInput.description || '').slice(0, 60)}`;
    default:
      return `${tool}`;
  }
}

// Contexte git léger (uniquement pour Edit/Write/Bash)
function getGitCtx() {
  if (!['Edit', 'Write', 'Bash', 'MultiEdit'].includes(tool)) return null;
  const cwd = filePath ? path.dirname(path.resolve(filePath)) : process.cwd();
  try {
    const branch = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd, encoding: 'utf8', timeout: 2000, stdio: 'pipe',
    }).stdout.trim();
    const hash = spawnSync('git', ['rev-parse', '--short', 'HEAD'], {
      cwd, encoding: 'utf8', timeout: 2000, stdio: 'pipe',
    }).stdout.trim();
    const dirty = spawnSync('git', ['status', '--porcelain'], {
      cwd, encoding: 'utf8', timeout: 2000, stdio: 'pipe',
    }).stdout.trim().length > 0;

    if (!branch && !hash) return null;
    return { branch: branch || null, hash: hash || null, dirty };
  } catch {
    return null;
  }
}

// Succès ou erreur de l'outil
function isOk() {
  if (toolResp.error) return false;
  if (typeof toolResp === 'string' && toolResp.includes('error')) return false;
  return true;
}

// Numéro de séquence incrémental (persist entre appels)
function nextSeq() {
  try {
    const n = parseInt(fs.readFileSync(SEQ_FILE, 'utf8') || '0') + 1;
    fs.writeFileSync(SEQ_FILE, String(n));
    return n;
  } catch {
    try { fs.writeFileSync(SEQ_FILE, '1'); } catch {}
    return 1;
  }
}

// ── Construction de l'entrée ──────────────────────────────────────────────────
const entry = {
  ts:      new Date().toISOString(),
  session: sessionId,
  seq:     nextSeq(),
  tool,
  summary: makeSummary(),
  ok:      isOk(),
  ms:      Date.now() - t0,
};

if (filePath) entry.file = filePath;
if (command)  entry.cmd  = command.slice(0, 200);
if (url)      entry.url  = url;

const git = getGitCtx();
if (git) entry.git = git;

// Payload léger si Bash (premiers 200 chars de stdout)
if (tool === 'Bash' && toolResp.output) {
  entry.out = String(toolResp.output).slice(0, 200).replace(/\s+/g, ' ');
}

// ── Écriture JSONL ────────────────────────────────────────────────────────────
try {
  fs.mkdirSync(AUDIT_DIR, { recursive: true });

  // Rotation si > 5 MB
  if (fs.existsSync(ACTIVE)) {
    const size = fs.statSync(ACTIVE).size;
    if (size > MAX_BYTES) {
      const ym = new Date().toISOString().slice(0, 7); // YYYY-MM
      const archive = path.join(AUDIT_DIR, `trace.${ym}.jsonl`);
      fs.appendFileSync(archive, fs.readFileSync(ACTIVE));
      fs.writeFileSync(ACTIVE, '');
    }
  }

  fs.appendFileSync(ACTIVE, JSON.stringify(entry) + '\n');

} catch {
  // Silencieux — jamais bloquer Claude
}

process.exit(0);
