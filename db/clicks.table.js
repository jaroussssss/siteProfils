//Table contenant les liens et leurs infos
//Structure de la table : 
// id (clé primaire) int auto incrément
// linkFinalURL (clé étrangère vers links) text
// type text
// timestamp datetime
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import { Link } from './links.table.js';

export const Click = sequelize.define('Click', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  linkFinalURL: {
    type: DataTypes.STRING(128), // correspond à links.finalURL
    allowNull: false,
    references: {
      model: 'links',
      key: 'finalURL',
    },
    onUpdate: 'CASCADE', // Mettre à jour les clics si le lien final est modifié
    onDelete: 'CASCADE', // Supprimer les clics si le lien final est supprimé
  },
  type: { 
    type: DataTypes.CHAR(2), //OF, MY, IG, TG
    allowNull: false,
  },
}, {
  tableName: 'clicks',
});

// Associations
Link.hasMany(Click, { foreignKey: 'linkFinalURL', sourceKey: 'finalURL' });
Click.belongsTo(Link, { foreignKey: 'linkFinalURL', targetKey: 'finalURL' });