/**
 * Hook SessionEnd — Rapport de session en Markdown.
 *
 * Génère : ~/.claude/audit/sessions/SESSION_ID.md
 * Contient :
 *   - Durée de la session
 *   - Fichiers modifiés (Edit/Write)
 *   - Commandes exécutées (Bash)
 *   - Outils utilisés (statistiques)
 *   - Commits créés pendant la session
 *   - Alertes (secrets bloqués, commandes lentes)
 */

const fs   = require('fs');
const path = require('path');
const os   = require('os');
const { readLastN, AUDIT_DIR } = require('./_logger.js');
const readStdinJSON = require('./_stdin.js');

const input = readStdinJSON();
const sessionId = input?.session_id || process.env.CLAUDE_SESSION_ID || 'unknown';

const SESSIONS_DIR = path.join(AUDIT_DIR, 'sessions');
fs.mkdirSync(SESSIONS_DIR, { recursive: true });

// Lire la trace de cette session (dernières 500 entrées)
const allEntries = readLastN('trace.jsonl', 500);
const session    = allEntries.filter(e => e.session === sessionId);

if (session.length === 0) process.exit(0);

// Durée
const first = new Date(session[0].ts);
const last  = new Date(session[session.length - 1].ts);
const durMs = last - first;
const dur   = durMs < 60000
  ? `${Math.round(durMs / 1000)}s`
  : `${Math.floor(durMs / 60000)}min ${Math.round((durMs % 60000) / 1000)}s`;

// Statistiques par outil
const toolCounts = {};
session.forEach(e => { toolCounts[e.tool] = (toolCounts[e.tool] || 0) + 1; });

// Fichiers modifiés
const edited = [...new Set(
  session
    .filter(e => ['Edit', 'Write', 'MultiEdit'].includes(e.tool) && e.file)
    .map(e => e.file)
)];

// Commandes bash
const cmds = session
  .filter(e => e.tool === 'Bash' && e.cmd)
  .map(e => e.cmd.slice(0, 100));

// Commits pendant la session (depuis perf.jsonl — git commit)
const perfEntries = readLastN('perf.jsonl', 200);
const commits = perfEntries.filter(e =>
  e.cmd?.includes('git commit') &&
  new Date(e.ts) >= first && new Date(e.ts) <= last
);

// Checkpoints
const checkpoints = readLastN('checkpoints.jsonl', 50).filter(e =>
  new Date(e.ts) >= first && new Date(e.ts) <= last
);

// Secrets bloqués
const security = readLastN('security.jsonl', 100).filter(e =>
  new Date(e.ts) >= first && new Date(e.ts) <= last
);

// Commandes lentes (depuis perf.jsonl)
const slowCmds = perfEntries.filter(e =>
  e.ms > 10000 &&
  new Date(e.ts) >= first && new Date(e.ts) <= last
);

// ── Génération du rapport Markdown ──────────────────────────────────────────
const date = first.toISOString().slice(0, 10);
const time = first.toISOString().slice(11, 16);

let md = `# Session ${date} ${time} UTC\n\n`;
md += `**ID** : \`${sessionId}\`  \n`;
md += `**Durée** : ${dur}  \n`;
md += `**Actions** : ${session.length} outils appelés\n\n`;

// Résumé outils
md += `## Outils utilisés\n\n`;
Object.entries(toolCounts)
  .sort((a, b) => b[1] - a[1])
  .forEach(([tool, count]) => { md += `- \`${tool}\` × ${count}\n`; });
md += '\n';

// Fichiers modifiés
if (edited.length) {
  md += `## Fichiers modifiés (${edited.length})\n\n`;
  edited.forEach(f => { md += `- \`${f}\`\n`; });
  md += '\n';
}

// Commits
if (commits.length || checkpoints.length) {
  md += `## Git\n\n`;
  commits.forEach(c => { md += `- commit: \`${c.cmd.slice(0, 80)}\`\n`; });
  checkpoints.forEach(c => { md += `- WIP checkpoint: branche \`${c.branch}\` (${c.edits} éditions)\n`; });
  md += '\n';
}

// Commandes bash importantes
const importantCmds = cmds.filter(c =>
  /^(git|npm|node|bash|curl|ssh|docker)/.test(c)
);
if (importantCmds.length) {
  md += `## Commandes principales\n\n`;
  importantCmds.slice(0, 20).forEach(c => { md += `\`\`\`\n${c}\n\`\`\`\n`; });
  md += '\n';
}

// Alertes
const alerts = [];
if (security.length) {
  security.forEach(s => {
    alerts.push(`🔴 Secret bloqué : ${s.secret_type} dans \`${s.file}\``);
  });
}
if (slowCmds.length) {
  slowCmds.forEach(s => {
    alerts.push(`⏱  Commande lente (${(s.ms/1000).toFixed(1)}s) : \`${s.cmd?.slice(0, 60)}\``);
  });
}
if (alerts.length) {
  md += `## Alertes\n\n`;
  alerts.forEach(a => { md += `- ${a}\n`; });
  md += '\n';
}

md += `---\n*Généré automatiquement par session-end.js*\n`;

// Écriture du rapport
const outFile = path.join(SESSIONS_DIR, `${date}_${sessionId.slice(0, 8)}.md`);
try {
  fs.writeFileSync(outFile, md);
  console.log(`📋 Rapport session sauvegardé : ${outFile}`);
} catch {}

process.exit(0);
