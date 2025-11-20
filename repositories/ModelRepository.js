import { ModelEntity } from '../db/models.table.js';

export const ModelRepository = {
  // Crée un modèle
  create(data, options = {}) {
    return ModelEntity.create(data, options);
  },
  
  // Retourne un modèle par son nom
  findByName(name) {
    return ModelEntity.findOne({ where: { name } });
  },

  // Retourne tous les modèles
  list() {
    return ModelEntity.findAll({ order: [['name', 'ASC']] });
  },

  // Retourne le nombre total de modèles
  count() {
    return ModelEntity.count();
  },

  updateByName(name, patch, options = {}) {
    return ModelEntity.update(patch, { where: { name }, ...options });
  },

  deleteByName(name) {
    return ModelEntity.destroy({ where: { name } });
  },
};

export default ModelRepository;