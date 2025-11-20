import { Visit } from '../db/visits.table.js';
import sequelize from '../config/database.js';

// Formatage en timezone locale
const pad2 = (n) => String(n).padStart(2, '0');
const formatDateLocal = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const formatHourLocal = (d) => `${formatDateLocal(d)} ${pad2(d.getHours())}:00:00`;

// Code pays to nom français
const countrySpecials = { XK: 'Kosovo' };
const normalizeRegion = (c) => {
  const s = String(c || '').trim().toUpperCase();
  if (s === 'UK') return 'GB';
  if (s === 'EL') return 'GR';
  return s;
};
const displayFr = new Intl.DisplayNames(['fr'], { type: 'region' });
export function toFrenchCountryName(code) {
  const c = normalizeRegion(code);
  if (countrySpecials[c]) return countrySpecials[c];
  if (!/^[A-Z]{2}$/.test(c)) return 'Inconnu';
  try {
    const name = displayFr.of(c);
    return (typeof name === 'string' && name !== 'région indéterminée') ? name : 'Inconnu';
  } catch {
    return 'Inconnu';
  }
}

export const VisitRepository = {
  // Création d'une nouvelle visite
  create(data, options = {}) {
    return Visit.create(data, options);
  },

  // Liste les visites d'une URL temporaire
  listByTempURL(tempURL, { limit = 50, offset = 0 } = {}){
    return Visit.findAll({ where: { linkTempURL: tempURL }, limit, offset, order: [['id', 'DESC']] });
  },

  // Compte le nombre de visites d'une URL temporaire
  countByTempURL(tempURL) {
    return Visit.count({ where: { linkTempURL: tempURL } });
  },

  // Retourne le nombre de visites par jour sur les 30 derniers jours
  async getLastMonthByDay(tempURL) {
    // Retourne le nombre de visites par jour sur les 30 derniers jours pour chaque location
    const [rows] = await sequelize.query(
      `SELECT DATE(createdAt) AS bucket, location, COUNT(*) AS count
       FROM visits
       WHERE linkTempURL = :tempURL AND createdAt >= NOW() - INTERVAL 30 DAY
       GROUP BY bucket, location
       ORDER BY bucket ASC, location ASC`,
      { replacements: { tempURL } }
    );

    // Ajout des jours vides si besoin, regroupe par jour et location
    const series = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const label = formatDateLocal(d);
      // Rassembler par location
      const bucketRows = rows.filter(r => String(r.bucket) === label);
      const byLocation = {};
      let total = 0;
      for (const r of bucketRows) {
        const loc = toFrenchCountryName(String(r.location));
        const c = Number(r.count);
        byLocation[loc] = (byLocation[loc] || 0) + c;
        total += c;
      }
      series.push({ date: label, total, byLocation });
    }
    return series;
  },

  // Retourne le nombre de visites par demi-journée sur les 7 derniers jours
  async getLastWeekByHalfDay(tempURL) {
    // Retourne le nombre de visites par demi-journée sur les 7 derniers jours pour chaque location
    const [rows] = await sequelize.query(
      `SELECT DATE(createdAt) AS day,
              FLOOR(HOUR(createdAt)/12) AS half,
              location,
              COUNT(*) AS count
       FROM visits
       WHERE linkTempURL = :tempURL AND createdAt >= NOW() - INTERVAL 7 DAY
       GROUP BY day, half, location
       ORDER BY day ASC, half ASC, location ASC`,
      { replacements: { tempURL } }
    );

    // Ajout des demi-jours vides si besoin, regroupe par jour, demi-journée et location
    const series = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dayLabel = formatDateLocal(d);
      for (let half = 0; half <= 1; half++) {
        const bucketRows = rows.filter(r => String(r.day) === dayLabel && Number(r.half) === half);
        const byLocation = {};
        let total = 0;
        for (const r of bucketRows) {
          const loc = toFrenchCountryName(String(r.location));
          const c = Number(r.count);
          byLocation[loc] = (byLocation[loc] || 0) + c;
          total += c;
        }
        series.push({ date: `${dayLabel} ${half === 0 ? 'AM' : 'PM'}`, total, byLocation });
      }
    }
    return series;
  },

  // Retourne le nombre de visites par heure sur les 72 dernières heures
  // Duplication pour pouvoir changer l'ogranisation si besoin (ex : regrouper par 3h)
  async getLast3DaysByHour(tempURL) {
    // Retourne le nombre de visites par heure sur les 72 dernières heures pour chaque location
    const [rows] = await sequelize.query(
      `SELECT DATE_FORMAT(createdAt, '%Y-%m-%d %H:00:00') AS hour_start,
              location,
              COUNT(*) AS count
       FROM visits
       WHERE linkTempURL = :tempURL AND createdAt >= NOW() - INTERVAL 72 HOUR
       GROUP BY hour_start, location
       ORDER BY hour_start ASC, location ASC`,
      { replacements: { tempURL } }
    );

    const series = [];
    const now = new Date();
    const rowsLocal = rows.map(r => ({
      hour_local: formatHourLocal(new Date(String(r.hour_start) + 'Z')),
      location: r.location,
      count: Number(r.count)
    }));
    for (let i = 71; i >= 0; i--) {
      const d = new Date(now);
      d.setHours(now.getHours() - i, 0, 0, 0);
      const label = formatHourLocal(d);
      const bucketRows = rowsLocal.filter(r => String(r.hour_local) === label);
      const byLocation = {};
      let total = 0;
      for (const r of bucketRows) {
        const loc = toFrenchCountryName(String(r.location));
        const c = Number(r.count);
        byLocation[loc] = (byLocation[loc] || 0) + c;
        total += c;
      }
      series.push({ date: label, total, byLocation });
    }
    return series;
  },

  // Retourne le nombre de visites par heure sur les 48 dernières heures
  // Duplication pour pouvoir changer l'ogranisation si besoin (ex : regrouper par 3h)
  async getLast2DaysByHour(tempURL) {
    // Retourne le nombre de visites par heure sur les 48 dernières heures pour chaque location
    const [rows] = await sequelize.query(
      `SELECT DATE_FORMAT(createdAt, '%Y-%m-%d %H:00:00') AS hour_start,
              location,
              COUNT(*) AS count
       FROM visits
       WHERE linkTempURL = :tempURL AND createdAt >= NOW() - INTERVAL 48 HOUR
       GROUP BY hour_start, location
       ORDER BY hour_start ASC, location ASC`,
      { replacements: { tempURL } }
    );

    const series = [];
    const now = new Date();
    const rowsLocal = rows.map(r => ({
      hour_local: formatHourLocal(new Date(String(r.hour_start) + 'Z')),
      location: r.location,
      count: Number(r.count)
    }));
    for (let i = 47; i >= 0; i--) {
      const d = new Date(now);
      d.setHours(now.getHours() - i, 0, 0, 0);
      const label = formatHourLocal(d);
      const bucketRows = rowsLocal.filter(r => String(r.hour_local) === label);
      const byLocation = {};
      let total = 0;
      for (const r of bucketRows) {
        const loc = toFrenchCountryName(String(r.location));
        const c = Number(r.count);
        byLocation[loc] = (byLocation[loc] || 0) + c;
        total += c;
      }
      series.push({ date: label, total, byLocation });
    }
    return series;
  },

  // Retourne le nombre de visites par heure sur les 24 dernières heures
  async getLastDayByHour(tempURL) {
    // Retourne le nombre de visites par heure sur les 24 dernières heures pour chaque location
    const [rows] = await sequelize.query(
      `SELECT DATE_FORMAT(createdAt, '%Y-%m-%d %H:00:00') AS hour_start,
              location,
              COUNT(*) AS count
       FROM visits
       WHERE linkTempURL = :tempURL AND createdAt >= NOW() - INTERVAL 24 HOUR
       GROUP BY hour_start, location
       ORDER BY hour_start ASC, location ASC`,
      { replacements: { tempURL } }
    );

    const series = [];
    const now = new Date();
    const rowsLocal = rows.map(r => ({
      hour_local: formatHourLocal(new Date(String(r.hour_start) + 'Z')),
      location: r.location,
      count: Number(r.count)
    }));
    for (let i = 23; i >= 0; i--) {
      const d = new Date(now);
      d.setHours(now.getHours() - i, 0, 0, 0);
      const label = formatHourLocal(d);
      const bucketRows = rowsLocal.filter(r => String(r.hour_local) === label);
      const byLocation = {};
      let total = 0;
      for (const r of bucketRows) {
        const loc = toFrenchCountryName(String(r.location));
        const c = Number(r.count);
        byLocation[loc] = (byLocation[loc] || 0) + c;
        total += c;
      }
      series.push({ date: label, total, byLocation });
    }
    return series;
  },
};

export default VisitRepository;