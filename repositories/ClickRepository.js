import { Click } from '../db/clicks.table.js';
import sequelize from '../config/database.js';

// Helpers de formatage en timezone locale
const pad2 = (n) => String(n).padStart(2, '0');
const formatDateLocal = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const formatHourLocal = (d) => `${formatDateLocal(d)} ${pad2(d.getHours())}:00:00`;

export const ClickRepository = {
  // Création d'un click 
  create(data, options = {}) {
    return Click.create(data, options);
  },

  // Listing de tous les clicks par URL finale
  listByFinalURL(finalURL, { limit = 50, offset = 0 } = {}) {
    return Click.findAll({ where: { linkFinalURL: finalURL }, limit, offset, order: [['id', 'DESC']] });
  },

  // Comptage de tous les clicks par URL finale et type de click
  countByFinalURL(finalURL, clickType) {
    return Click.count({ where: { linkFinalURL: finalURL, clickType } });
  },

  // Retourne le nombre de clics par jour sur les 30 derniers jours pour un type de click
  async getLastMonthByDay(finalURL, clickType) {
    // Requête SQL: retourne un tableau d'objets avec la date et le nombre de clics
    const [rows] = await sequelize.query(
      `SELECT DATE(createdAt) AS bucket, COUNT(*) AS count
       FROM clicks
       WHERE linkFinalURL = :finalURL AND clickType = :clickType AND createdAt >= NOW() - INTERVAL 30 DAY
       GROUP BY DATE(createdAt)
       ORDER BY bucket ASC`,
      { replacements: { finalURL, clickType } }
    );

    // Ajout des jours vides si besoin
    const series = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const label = formatDateLocal(d);
      const row = rows.find(r => String(r.bucket) === label);
      series.push({ day: label, count: row ? Number(row.count) : 0 });
    }
    return series;
  },

  // Retourne le nombre de clics par demi-journée sur les 7 derniers jours pour un type de click
  async getLastWeekByHalfDay(finalURL, clickType) {
    // Requête SQL: retourne un tableau d'objets avec la date, la demi-journée et le nombre de clics
    const [rows] = await sequelize.query(
      `SELECT DATE(createdAt) AS day,
              FLOOR(HOUR(createdAt)/12) AS half,
              COUNT(*) AS count
       FROM clicks
       WHERE linkFinalURL = :finalURL AND clickType = :clickType AND createdAt >= NOW() - INTERVAL 7 DAY
       GROUP BY day, half
       ORDER BY day ASC, half ASC`,
      { replacements: { finalURL, clickType } }
    );

    // Ajout des demi-journées vides si besoin
    const series = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dayLabel = formatDateLocal(d);
      for (let half = 0; half <= 1; half++) {
        const row = rows.find(r => String(r.day) === dayLabel && Number(r.half) === half);
        series.push({ day: dayLabel, half: half === 0 ? 'AM' : 'PM', count: row ? Number(row.count) : 0 });
      }
    }
    return series;
  },

  // Retourne le nombre de clics par heure sur les 24 dernières heures pour un type de click
  async aggregateLastDayByHour(finalURL, clickType) {
    // Requête SQL: retourne un tableau d'objets avec l'heure et le nombre de clics
    const [rows] = await sequelize.query(
      `SELECT DATE_FORMAT(createdAt, '%Y-%m-%d %H:00:00') AS hour_start,
              COUNT(*) AS count
       FROM clicks
       WHERE linkFinalURL = :finalURL AND clickType = :clickType AND createdAt >= NOW() - INTERVAL 24 HOUR
       GROUP BY hour_start
       ORDER BY hour_start ASC`,
      { replacements: { finalURL, clickType } }
    );

    // Ajout des heures vides si besoin
    const series = [];
    const now = new Date();
    for (let i = 23; i >= 0; i--) {
      const d = new Date(now);
      d.setHours(now.getHours() - i, 0, 0, 0);
      const label = formatHourLocal(d);
      const row = rows.find(r => String(r.hour_start) === label);
      series.push({ hour: label, count: row ? Number(row.count) : 0 });
    }
    return series;
  },
};

export default ClickRepository;