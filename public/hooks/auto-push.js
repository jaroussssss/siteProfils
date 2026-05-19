/**
 * Hook PostToolUse(Edit|Write) — Tests complets après écriture.
 * Flow : syntaxe → tests → commit (fichier précis) → push si branche non protégée.
 *
 * SÉCURITÉ :
 * - Jamais de git add -A (risque de committer .env, tokens, etc.)
 * - Commit via execFileSync (pas de shell → pas d'injection via nom de fichier)
 * - Push uniquement sur branches non protégées
 * - npm lancé avec shell:true pour compatibilité Windows (npm.cmd)
 */

const { execFileSync, spawnSync } = require('child_process');
const fs   = require('fs');
const path = require('path');

const CODE_EXTS = new Set(['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs']);
const PROTECTED_BRANCHES = new Set(['main', 'master', 'prod', 'production', 'release']);

const IGNORE_PATTERNS = [
  /node_modules/,
  /\.lock$/,
  /package-lock\.json$/,
  /\.min\./,
  /dist\//,
  /build\//,
  /coverage\//,
];

// Patterns de fichiers sensibles — ne jamais committer
const SENSITIVE = [
  /\.env(\.|$)/,
  /credentials\.json$/i,
  /token\.json$/i,
  /\.pem$/,
  /\.key$/,
  /id_rsa/,
  /id_ed25519/,
];

let input = '';
process.stdin.on('data', c => (input += c));
process.stdin.on('end', () => {
  try {
    if (!input || input.length > 1_000_000) process.exit(0);

    const tool = JSON.parse(input);
    const filePath = tool.file_path || tool.path || '';

    const ext = path.extname(filePath).toLowerCase();
    if (!CODE_EXTS.has(ext)) process.exit(0);
    if (IGNORE_PATTERNS.some(p => p.test(filePath))) process.exit(0);
    if (!fs.existsSync(filePath)) process.exit(0);

    // Refus absolu si le fichier est sensible
    const base = path.basename(filePath).toLowerCase();
    if (SENSITIVE.some(re => re.test(base))) {
      console.log(`⚠️  auto-push: fichier sensible ignoré : ${path.basename(filePath)}`);
      process.exit(0);
    }

    // Trouver la racine git
    let cwd;
    try {
      cwd = execFileSync('git', ['rev-parse', '--show-toplevel'], {
        cwd: path.dirname(filePath),
        encoding: 'utf8',
        timeout: 5000,
        stdio: 'pipe',
      }).trim();
    } catch {
      process.exit(0);
    }

    const rel = path.relative(cwd, filePath);

    // ── 1. Vérification syntaxe JS ──────────────────────────────────────────
    if (['.js', '.mjs', '.cjs'].includes(ext)) {
      const check = spawnSync('node', ['--check', filePath], {
        encoding: 'utf8',
        timeout: 10000,
        stdio: 'pipe',
      });
      if (check.status !== 0) {
        const err = (check.stderr || check.stdout || '').trim();
        console.error(`\n❌ Syntaxe invalide dans ${rel}:\n${err}\n`);
        console.error('→ Corrige l\'erreur de syntaxe avant de continuer.');
        process.exit(1);
      }
    }

    // ── 2. Tests ──────────────────────────────────────────────────────────────
    const pkgPath = path.join(cwd, 'package.json');
    if (!fs.existsSync(pkgPath)) process.exit(0);

    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const testScript = pkg.scripts?.test || '';
    const hasRealTests =
      testScript &&
      !testScript.includes('no test') &&
      !testScript.includes('echo') &&
      !testScript.includes('exit 0') &&
      /jest|mocha|vitest|tap|ava|node:test/.test(testScript);

    if (hasRealTests) {
      const testArgs = ['test', '--', '--passWithNoTests'];
      // --forceExit uniquement pour Jest
      if (/jest/.test(testScript)) testArgs.push('--forceExit');

      const test = spawnSync('npm', testArgs, {
        cwd,
        timeout: 120000,
        encoding: 'utf8',
        shell: true, // Requis sur Windows (npm = npm.cmd)
        killSignal: 'SIGKILL',
      });

      if (test.status !== 0) {
        const out = (test.stdout || '') + (test.stderr || '');
        const lines = out
          .split('\n')
          .filter(l => /FAIL|PASS|✕|✓|●|Error|expect|received|at /i.test(l))
          .slice(0, 50)
          .join('\n');

        console.error(`\n❌ Tests échoués après modification de ${rel}:\n`);
        console.error(lines || out.slice(0, 1000));
        console.error('\n→ Corrige les tests en échec avant le push.');
        process.exit(1);
      }
    }

    // ── 3. Commit + push auto ──────────────────────────────────────────────────
    try {
      const status = execFileSync('git', ['status', '--porcelain'], {
        cwd,
        encoding: 'utf8',
        timeout: 5000,
        stdio: 'pipe',
      }).trim();
      if (!status) process.exit(0);

      const branch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
        cwd,
        encoding: 'utf8',
        timeout: 5000,
        stdio: 'pipe',
      }).trim();

      // Jamais d'auto-push sur branches protégées
      if (PROTECTED_BRANCHES.has(branch) || branch === 'HEAD') {
        console.log(`✓ Tests OK — push manuel requis sur ${branch}`);
        process.exit(0);
      }

      // Valider le nom de branche (sécurité)
      if (!/^[\w.\-/]{1,100}$/.test(branch)) {
        console.log(`⚠️  Nom de branche suspect ignoré : ${branch}`);
        process.exit(0);
      }

      // Vérifier origin existe
      try {
        execFileSync('git', ['remote', 'get-url', 'origin'], {
          cwd,
          stdio: 'pipe',
          timeout: 3000,
        });
      } catch {
        console.log('⚠️  auto-push: pas de remote origin, skip push.');
        process.exit(0);
      }

      // Add UNIQUEMENT le fichier modifié (jamais -A)
      execFileSync('git', ['add', '--', filePath], { cwd, stdio: 'pipe', timeout: 5000 });

      // Revérifier qu'il y a quelque chose à committer
      const staged = execFileSync('git', ['diff', '--cached', '--name-only'], {
        cwd,
        encoding: 'utf8',
        timeout: 3000,
        stdio: 'pipe',
      }).trim();
      if (!staged) process.exit(0);

      // Commit via array d'args — JAMAIS de shell (immunise contre injection noms de fichiers)
      const msg = `auto: ${rel} — tests OK`;
      execFileSync('git', ['commit', '-m', msg], {
        cwd,
        stdio: 'pipe',
        timeout: 10000,
      });

      // Push
      execFileSync('git', ['push', '--set-upstream', 'origin', branch], {
        cwd,
        timeout: 30000,
        stdio: 'pipe',
      });

      console.log(`\n✓ Tests OK → poussé sur origin/${branch}\n`);
    } catch (pushErr) {
      console.warn(`⚠️  Tests OK mais commit/push échoué : ${pushErr.message.slice(0, 150)}`);
    }
  } catch (e) {
    console.error(`auto-push erreur: ${e.message}`);
    process.exit(0);
  }
});
