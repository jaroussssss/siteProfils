//Table contenant les liens et leurs infos
//Structure de la table : 
// tempURL (clé primaire) text
// modelName (clé étrangère vers models) text
// finalURL text
// displayName text
// picture text
// background text
// linkOF text
// linkMYM text
// linkIG text
// linkTG text
// titleOF text
// titleMYM text
// titleIG text
// titleTG text


import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import { ModelEntity } from './models.table.js';

export const Link = sequelize.define('Link', {
  tempURL: {
    type: DataTypes.STRING(255),
    primaryKey: true,
  },
  modelName: {
    type: DataTypes.STRING(255),
    allowNull: false,
    references: {
      model: 'models',
      key: 'name',
    },
    onUpdate: 'CASCADE', //Mise à jour du modèle affecte les liens
    onDelete: 'CASCADE', //Impossible de supprimer un modèle si il y a des liens associés
  },
  finalURL: {
    type: DataTypes.STRING(128),
    allowNull: false,
    unique: 'links_finalURL_unique',
  },
  displayName: { type: DataTypes.STRING(255), allowNull: true },
  picture: { type: DataTypes.STRING(255), allowNull: true  },
  background: { type: DataTypes.STRING(255), allowNull: false  },
  linkOF: { type: DataTypes.STRING(255), allowNull: true  },
  linkMYM: { type: DataTypes.STRING(255), allowNull: true  },
  linkIG: { type: DataTypes.STRING(255), allowNull: true  },
  linkTG: { type: DataTypes.STRING(255), allowNull: true  },
  titleOF: { type: DataTypes.STRING(255), allowNull: true },
  titleMYM: { type: DataTypes.STRING(255), allowNull: true },
  titleIG: { type: DataTypes.STRING(255), allowNull: true },
  titleTG: { type: DataTypes.STRING(255), allowNull: true },
  countdownHours: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  countdownTitle: { type: DataTypes.STRING(255), allowNull: true },
}, {
  tableName: 'links',
  timestamps: false,
});

// Association avec models (via name)
ModelEntity.hasMany(Link, { foreignKey: 'modelName', sourceKey: 'name' });
Link.belongsTo(ModelEntity, { foreignKey: 'modelName', targetKey: 'name' });
