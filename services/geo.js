import maxmind from 'maxmind';
import net from 'net';

let countryReader;

async function initGeo() {
  if (countryReader) return countryReader;
  const dbPath = process.env.GEO_DB_PATH || 'config/GeoLite2-Country.mmdb';
  countryReader = await maxmind.open(dbPath);
  return countryReader;
}

function isPrivateIP(ip) {
  if (!ip) return true;
  const family = net.isIP(ip);
  if (!family) return true;
  if (family === 4) {
    if (ip.startsWith('10.')) return true;
    if (ip.startsWith('192.168.')) return true;
    if (ip.startsWith('127.')) return true;
    if (ip.startsWith('169.254.')) return true;
    if (ip.startsWith('172.')) {
      const parts = ip.split('.');
      const second = Number(parts[1]);
      if (second >= 16 && second <= 31) return true;
    }
    return false;
  }
  // IPv6
  const ipLower = ip.toLowerCase();
  if (ipLower === '::1') return true; // loopback
  if (ipLower.startsWith('fc') || ipLower.startsWith('fd')) return true; // unique local
  if (ipLower.startsWith('fe80')) return true; // link-local
  return false;
}

function pickPublicIP(req) {
  const candidates = [];
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string') {
    candidates.push(...xff.split(',').map(s => s.trim()));
  }
  const xri = req.headers['x-real-ip'];
  if (typeof xri === 'string') candidates.push(xri.trim());
  if (typeof req.ip === 'string') candidates.push(req.ip);
  for (const ip of candidates) {
    if (ip && !isPrivateIP(ip)) return ip;
  }
  return candidates.find(ip => ip) || undefined;
}

export async function getCountryFromRequest(req) {
  const cf = req.headers['cf-ipcountry'];
  if (typeof cf === 'string' && /^[A-Z]{2}$/.test(cf)) {
    return cf;
  }
  try {
    const reader = await initGeo();
    const ip = pickPublicIP(req);
    if (!ip) return 'ZZ';
    const res = reader.get(ip);
    return (res && (res.country?.iso_code || res.registered_country?.iso_code)) || 'ZZ';
  } catch (e) {
    return 'ZZ';
  }
}

export default { getCountryFromRequest };