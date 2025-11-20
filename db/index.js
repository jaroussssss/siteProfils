//fichier de configuration de la base de données
import { Sequelize } from 'sequelize';
import sequelize from '../config/database.js';
import { ModelEntity } from './models.table.js';
import { Link } from './links.table.js';
import { Visit } from './visits.table.js';
import { Click } from './clicks.table.js';

export const db = {
  sequelize,
  Sequelize,
  ModelEntity,
  Link,
  Visit,
  Click,
};

export default db;
