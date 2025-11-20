import dotenv from "dotenv";
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import zlib from 'zlib';
import tar from 'tar';
import fetch from 'node-fetch';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EDITION_ID = process.env.MAXMIND_EDITION_ID || 'GeoLite2-Country';
const LICENSE_KEY = process.env.MAXMIND_LICENSE_KEY;
const DEST_PATH = process.env.GEO_DB_PATH || 'config/GeoLite2-Country.mmdb';

if (!LICENSE_KEY) {
  console.error('MAXMIND_LICENSE_KEY manquant. Configurez-le dans votre .env.');
  process.exit(1);
}

const downloadUrl = `https://download.maxmind.com/app/geoip_download?edition_id=${EDITION_ID}&license_key=${LICENSE_KEY}&suffix=tar.gz`;

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function findMmdbFile(rootDir) {
  const entries = await fs.promises.readdir(rootDir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(rootDir, e.name);
    if (e.isDirectory()) {
      const found = await findMmdbFile(full);
      if (found) return found;
    } else if (e.isFile() && e.name.toLowerCase().endsWith('.mmdb')) {
      return full;
    }
  }
  return null;
}

async function main() {
  console.log(`Téléchargement MaxMind (${EDITION_ID})…`);
  const res = await fetch(downloadUrl);
  if (!res.ok || !res.body) {
    console.error(`Échec du téléchargement: ${res.status} ${res.statusText}`);
    process.exit(1);
  }

  const tmpBase = path.join(os.tmpdir(), `maxmind-${Date.now()}`);
  await ensureDir(tmpBase);

  console.log('Extraction de l’archive…');
  await new Promise((resolve, reject) => {
    const gunzip = zlib.createGunzip();
    const extractor = tar.x({ cwd: tmpBase, strict: true });
    res.body.on('error', reject);
    gunzip.on('error', reject);
    extractor.on('error', reject);
    extractor.on('close', resolve);
    res.body.pipe(gunzip).pipe(extractor);
  });

  const mmdb = await findMmdbFile(tmpBase);
  if (!mmdb) {
    console.error('Fichier .mmdb introuvable dans l’archive.');
    process.exit(1);
  }

  const destAbs = path.isAbsolute(DEST_PATH) ? DEST_PATH : path.join(path.dirname(__dirname), DEST_PATH);
  await ensureDir(path.dirname(destAbs));

  await fs.promises.copyFile(mmdb, destAbs);
  console.log(`Base GeoLite2 installée/mise à jour: ${destAbs}`);

  // Nettoyage (best-effort)
  try {
    await fs.promises.rm(tmpBase, { recursive: true, force: true });
  } catch {}
}

main().catch((e) => {
  console.error('Erreur de mise à jour GeoLite2:', e);
  process.exit(1);
});