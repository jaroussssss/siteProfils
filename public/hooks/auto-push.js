/**
 * Hook PostToolUse(Edit|Write) — Batterie de tests après écriture de code.
 * Flow :
 *   Claude écrit un fichier
 *   → Tests complets (npm test ou node --check)
 *   → ÉCHEC : affiche les erreurs → Claude les voit et corrige
 *   → SUCCÈS : git add + commit + push automatiquement
 *
 * Ne s'active que sur des fichiers de code (.js .ts .jsx .tsx .mjs .cjs)
 * Ignoré sur : HTML, CSS, MD, JSON de config, lock files, docs
 */

const { execSync, spawnSync } = require('child_process');
const fs   = require('fs');
const path = require('path');

const CODE_EXTS = new Set(['.js','.ts','.jsx','.tsx','.mjs','.cjs']);
const IGNORE_PATTERNS = [
  /node_modules/,
  /\.lock$/,
  /package-lock\.json$/,
  /\.min\./,
  /dist\//,
  /build\//,
  /coverage\//,
];

let input = '';
process.stdin.on('data', c => input += c);
process.stdin.on('end', () => {
  try {
    const tool = JSON.parse(input);
    const filePath = tool.file_path || tool.path || '';

    // Ignorer les fichiers non-code
    const ext = path.extname(filePath).toLowerCase();
    if (!CODE_EXTS.has(ext)) process.exit(0);
    if (IGNORE_PATTERNS.some(p => p.test(filePath))) process.exit(0);
    if (!fs.existsSync(filePath)) process.exit(0);

    // Trouver la racine git
    let cwd;
    try {
      cwd = execSync('git rev-parse --show-toplevel', {
        cwd: path.dirname(filePath),
        encoding: 'utf8',
      }).trim();
    } catch {
      process.exit(0);
    }

    const rel = path.relative(cwd, filePath);

    // ── 1. Vérification syntaxe JS rapide ────────────────────────────────────
    if (['.js','.mjs','.cjs'].includes(ext)) {
      const check = spawnSync('node', ['--check', filePath], { encoding:'utf8' });
      if (check.status !== 0) {
        const err = (check.stderr || check.stdout || '').trim();
        console.error(`\n❌ Syntaxe invalide dans ${rel}:\n${err}\n`);
        console.error('→ Corrige l\'erreur de syntaxe avant de continuer.');
        process.exit(1); // Claude voit l'erreur et corrige
      }
    }

    // ── 2. Tests complets ─────────────────────────────────────────────────────
    const pkgPath = path.join(cwd, 'package.json');
    if (!fs.existsSync(pkgPath)) process.exit(0);

    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const testScript = pkg.scripts?.test;
    const hasRealTests = testScript &&
      !testScript.includes('no test') &&
      !testScript.includes('echo') &&
      !testScript.includes('exit 0');

    if (hasRealTests) {
      const test = spawnSync('npm', ['test', '--', '--forceExit', '--passWithNoTests'], {
        cwd,
        timeout: 120000,
        encoding: 'utf8',
      });

      if (test.status !== 0) {
        const out = (test.stdout || '') + (test.stderr || '');
        // Extraire les lignes d'erreur pertinentes (max 50 lignes)
        const lines = out.split('\n')
          .filter(l => l.match(/FAIL|PASS|✕|✓|●|Error|expect|received|at /i))
          .slice(0, 50)
          .join('\n');

        console.error(`\n❌ Tests échoués après modification de ${rel}:\n`);
        console.error(lines || out.slice(0, 1000));
        console.error('\n→ Corrige les tests en échec avant le push.');
        process.exit(1); // Claude voit les échecs et corrige
      }
    }

    // ── 3. Tous les tests passent → commit + push auto ─────────────────────────
    try {
      // Vérifier s'il y a des changements à committer
      const status = execSync('git status --porcelain', { cwd, encoding:'utf8' }).trim();
      if (!status) process.exit(0); // Rien à committer

      const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd, encoding:'utf8' }).trim();

      // Sécurité : jamais d'auto-push sur main/master
      if (branch === 'main' || branch === 'master') {
        console.log(`✓ Tests OK — push manuel requis sur ${branch}`);
        process.exit(0);
      }

      // Auto commit + push
      execSync('git add -A', { cwd });
      const msg = `auto: ${rel} — tests OK`;
      execSync(`git commit -m "${msg}"`, { cwd });
      execSync(`git push --set-upstream origin ${branch}`, { cwd, timeout: 30000 });

      console.log(`\n✓ Tests OK → poussé sur origin/${branch}\n`);

    } catch (pushErr) {
      console.warn(`⚠️  Tests OK mais push échoué : ${pushErr.message.slice(0, 100)}`);
    }

  } catch {
    process.exit(0);
  }
});
