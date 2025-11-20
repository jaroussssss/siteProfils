// Initialise la base de données
import db from './index.js';

export async function initializeDatabase() {
  try {
    const modeRaw = process.env.DB_SYNC_MODE;
    const mode = modeRaw ? String(modeRaw).toLowerCase().trim() : 'none';
    const forceUtf8mb4 = String(process.env.DB_FORCE_UTF8MB4 || 'false').toLowerCase().trim() === 'true';

    if (mode === 'force') {
      console.log('⚠️ DB sync mode: force (RESET des tables)');
      await db.sequelize.sync({ force: true });
    } else if (mode === 'alter') {
      console.log('⚠️ DB sync mode: alter (ALTER automatiques)');
      await db.sequelize.sync({ alter: true });
    } else if (mode === 'none') {
      console.log('ℹ️ DB sync désactivé (mode: none)');
    } else {
      console.warn(`ℹ️ DB sync: mode inconnu "${modeRaw}", désactivation`);
    }

    // Optionnel: conversion des tables existantes en utf8mb4
    if (forceUtf8mb4) {
      try {
        console.log('🔤 Conversion des tables en utf8mb4 …');
        const collate = process.env.DB_COLLATE || 'utf8mb4_unicode_ci';
        await db.sequelize.query(`ALTER TABLE links CONVERT TO CHARACTER SET utf8mb4 COLLATE ${collate}`);
        await db.sequelize.query(`ALTER TABLE models CONVERT TO CHARACTER SET utf8mb4 COLLATE ${collate}`);
        await db.sequelize.query(`ALTER TABLE clicks CONVERT TO CHARACTER SET utf8mb4 COLLATE ${collate}`);
        await db.sequelize.query(`ALTER TABLE visits CONVERT TO CHARACTER SET utf8mb4 COLLATE ${collate}`);
        console.log('✅ Conversion utf8mb4 terminée');
      } catch (convErr) {
        console.warn('⚠️ Échec conversion utf8mb4 (tables) :', convErr?.message || convErr);
      }
    }

    console.log('✅ Initialisation de la base de données terminée');
  } catch (err) {
    console.error('❌ Erreur lors de la synchronisation:', err);
    process.exit(1);
  }
}
