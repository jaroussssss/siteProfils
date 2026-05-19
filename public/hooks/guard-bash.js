/**
 * Hook PreToolUse(Bash) — Bloque les commandes destructrices.
 * Cross-platform : Windows + Unix. Fail-closed (bloc si erreur).
 */

const readStdinJSON = require('./_stdin.js');

const input = readStdinJSON();
if (!input) {
  // Fail-closed : erreur lecture stdin → bloquer par sécurité
  console.log(JSON.stringify({ decision: 'block', reason: 'guard-bash: impossible de lire stdin' }));
  process.exit(0);
}

const cmd = (input.command || '').trim();

// Refuser les commandes trop longues (ReDoS guard)
if (cmd.length > 8000) {
  console.log(JSON.stringify({ decision: 'block', reason: 'guard-bash: commande trop longue' }));
  process.exit(0);
}

// Découper sur les opérateurs shell pour inspecter chaque sous-commande
// Couvre : ; && || | & (et les variantes espacées)
function splitCommands(str) {
  return str
    .split(/;|&&|\|\||[|&]/)
    .map(s => s.trim())
    .filter(Boolean);
}

const subCmds = splitCommands(cmd);

// Patterns bloqués — Unix
const BLOCKED_UNIX = [
  /\brm\s+.*-[a-zA-Z]*r[a-zA-Z]*\s+/i,     // rm -r* (récursif)
  /\brm\s+-[a-zA-Z]*f[a-zA-Z]*\s+[~\/\.]/i, // rm -f ~, /, .
  /\bfind\s+.*-delete\b/i,                   // find -delete
  /\bdd\s+.*of=\/dev\//i,                    // dd sur device
  /\bmkfs\b/i,                               // formater partition
  /\bshred\b/i,                              // effacement sécurisé
  /\bchmod\s+-R\s+0+\s+\//i,               // chmod -R 000 /
  /\bchown\s+-R\s+.*\s+\//i,               // chown -R ... /
  /:\(\)\s*\{.*:\s*\|.*\}/,                 // fork bomb
  /\beval\b.*base64/i,                       // eval + base64 (obfuscation)
  /\bsh\s+-c\b/i,                            // sh -c "..."
  /\bbash\s+-c\b/i,                          // bash -c "..."
  /curl\s+.*\|\s*(bash|sh)\b/i,             // curl | bash
  /wget\s+.*-O-\s*\|\s*(bash|sh)\b/i,       // wget | bash
  /git\s+push\s+.*--force.*\b(main|master|prod)\b/i,
  /git\s+push\s+.*-f\s+.*\b(main|master|prod)\b/i,
  /git\s+push\s+.*\+\w+:(main|master|prod)\b/i, // force via refspec +
  /\bDROP\s+TABLE\b/i,
  /\bDROP\s+DATABASE\b/i,
  />\s*\/etc\//,
  />\s*\/boot\//,
  />\s*\/sys\//,
];

// Patterns bloqués — Windows spécifique
const BLOCKED_WINDOWS = [
  /\bRemove-Item\b.*-Recurse.*-Force/i,
  /\bRemove-Item\b.*-Force.*-Recurse/i,
  /\brmdir\s+\/[SsQq]/i,                    // rmdir /S /Q
  /\bdel\s+\/[FSQfsq]/i,                    // del /F /S /Q
  /\bformat\s+[A-Z]:/i,                      // format C:
  /\bcipher\s+\/w:/i,                        // effacement sécurisé
  /\bshutdown\s+\/[sfr]/i,                   // shutdown /s /f /r
  /\bStop-Computer\b/i,
  /\bReset-Computer\b/i,
  /\bClear-Disk\b/i,
  /\breg\s+add\s+HKLM/i,                     // modification registre système
  /\bschtasks\s+\/create\b/i,                // tâche planifiée (persistance)
  /\bRegister-ScheduledTask\b/i,
  /\bNew-ScheduledTask\b/i,
  /Invoke-WebRequest.*\|\s*iex\b/i,          // IWR | iex
  /\bIEX\s*\(/i,                             // Invoke-Expression (obfuscation)
  /\bDownloadString\b.*\bIEX\b/i,
];

const ALL_BLOCKED = [...BLOCKED_UNIX, ...BLOCKED_WINDOWS];

let blockedCmd = null;
let blockedPattern = null;
outer: for (const sub of subCmds) {
  for (const re of ALL_BLOCKED) {
    if (re.test(sub)) {
      blockedCmd = sub.slice(0, 120);
      blockedPattern = re.toString().slice(0, 60);
      break outer;
    }
  }
}

if (blockedCmd) {
  console.log(JSON.stringify({
    decision: 'block',
    reason: `guard-bash: commande bloquée — "${blockedCmd}" (pattern: ${blockedPattern})`
  }));
} else {
  console.log(JSON.stringify({ decision: 'allow' }));
}
