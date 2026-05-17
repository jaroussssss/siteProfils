import { Link } from '../db/links.table.js';
import { nanoid } from 'nanoid';

export const LinkRepository = {
  // Crée un profil
  async create(data = {}, options = {}) {
    const { finalURL, ...rest } = data; // ignore toute valeur fournie

    // Verifie le nombre de liens 
    const links = [rest.linkOF, rest.linkMYM, rest.linkIG, rest.linkTG];
    const providedCount = links.filter(v => typeof v === 'string' && v.trim().length > 0).length;
    if (providedCount < 1 || providedCount > 3) {
      throw new Error('Un profil doit contenir entre 1 et 3 liens (OF, MYM, IG, TG)');
    }

    // Créé un finalURL unique de manière atomique (retry sur conflit d'unicité)
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        return await Link.create({ ...rest, finalURL: nanoid(128) }, options);
      } catch (err) {
        if (err.name !== 'SequelizeUniqueConstraintError') throw err;
      }
    }
    throw new Error('Impossible de générer un finalURL unique');
  },

  // Retourne tous les liens
  findAll() {
    return Link.findAll();
  },

  // Retourne un profil par son URL temporaire
  findByTempURL(tempURL) {
    return Link.findByPk(tempURL);
  },

  // Retourne un profil par son URL finale
  findByFinalURL(finalURL) {
    return Link.findOne({ where: { finalURL } });
  },

  // Retourne tous les profils d'un modèle
  listByModelName(modelName) {
    return Link.findAll({ where: { modelName } });
  },

  // Met à jour un profil par son URL temporaire
  updateByTempURL(tempURL, patch, options = {}) {
    return Link.update(patch, { where: { tempURL }, ...options });
  },

  // Supprime un profil par son URL temporaire
  deleteByTempURL(tempURL) {
    return Link.destroy({ where: { tempURL } });
  },
};

export default LinkRepository;