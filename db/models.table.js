//Table contenant les modèles 
//Structure de la table : 
// name (clé primaire) string unique
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

export const ModelEntity = sequelize.define('ModelEntity', {
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    primaryKey: true,
  },
}, {
  tableName: 'models',
  timestamps: false,
});