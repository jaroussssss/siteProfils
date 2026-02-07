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
    // Requête SQL: retourne le nombre total de clics
    const [rows] = await sequelize.query(
      `SELECT COUNT(*) AS count
       FROM clicks
       WHERE linkFinalURL = :finalURL AND type = :clickType AND createdAt >= NOW() - INTERVAL 30 DAY`,
      { replacements: { finalURL, clickType } }
    );
    return rows[0] ? Number(rows[0].count) : 0;
  },

  // Retourne le nombre de clics par demi-journée sur les 7 derniers jours pour un type de click
  async getLastWeek(finalURL, clickType) {
    // Requête SQL: retourne le nombre total de clics
    const [rows] = await sequelize.query(
      `SELECT COUNT(*) AS count
       FROM clicks
       WHERE linkFinalURL = :finalURL AND type = :clickType AND createdAt >= NOW() - INTERVAL 7 DAY`,
      { replacements: { finalURL, clickType } }
    );
    return rows[0] ? Number(rows[0].count) : 0;
  },

  // Retourne le nombre de clics par heure sur les 72 dernières heures pour un type de click
  async getLast3DaysByHour(finalURL, clickType) {
    // Requête SQL: retourne le nombre total de clics
    const [rows] = await sequelize.query(
      `SELECT COUNT(*) AS count
       FROM clicks
       WHERE linkFinalURL = :finalURL AND type = :clickType AND createdAt >= NOW() - INTERVAL 72 HOUR`,
      { replacements: { finalURL, clickType } }
    );
    return rows[0] ? Number(rows[0].count) : 0;
  },

   // Retourne le nombre de clics par heure sur les 48 dernières heures pour un type de click
  async getLast2DaysByHour(finalURL, clickType) {
    // Requête SQL: retourne le nombre total de clics
    const [rows] = await sequelize.query(
      `SELECT COUNT(*) AS count
       FROM clicks
       WHERE linkFinalURL = :finalURL AND type = :clickType AND createdAt >= NOW() - INTERVAL 48 HOUR`,
      { replacements: { finalURL, clickType } }
    );
    return rows[0] ? Number(rows[0].count) : 0;
  }, 
  
  // Retourne le nombre de clics par heure sur les 24 dernières heures pour un type de click
  async getLastDayByHour(finalURL, clickType) {
    // Requête SQL: retourne le nombre total de clics
    const [rows] = await sequelize.query(
      `SELECT COUNT(*) AS count
       FROM clicks
       WHERE linkFinalURL = :finalURL AND type = :clickType AND createdAt >= NOW() - INTERVAL 24 HOUR`,
      { replacements: { finalURL, clickType } }
    );
    return rows[0] ? Number(rows[0].count) : 0;
  },
};

export default ClickRepository;