//Table contenant les liens et leurs infos
//Structure de la table : 
// id (clé primaire) int auto incrément
// linkTempURL (clé étrangère vers links) text
// location text
// timestamp datetime
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import { Link } from './links.table.js';

export const Visit = sequelize.define('Visit', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  linkTempURL: {
    type: DataTypes.STRING(255), // correspond à links.tempURL
    allowNull: false,
    references: {
      model: 'links',
      key: 'tempURL',
    },
    onUpdate: 'CASCADE', // Mettre à jour les visites si le lien temporaire est modifié
    onDelete: 'CASCADE', // Supprimer les visites si le lien temporaire est supprimé
  },
  location: { 
    type: DataTypes.CHAR(2), // FR, US, UK, ...
    allowNull: false,
  },
}, {
  tableName: 'visits',
});

// Associations
Link.hasMany(Visit, { foreignKey: 'linkTempURL', sourceKey: 'tempURL' });
Visit.belongsTo(Link, { foreignKey: 'linkTempURL', targetKey: 'tempURL' });