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

    //Créé un finalURL unique
    const maxAttempts = 3;
    let generatedFinal = null;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const candidate = nanoid(128);
      const exists = await Link.findOne({ where: { finalURL: candidate } });
      if (!exists) {
        generatedFinal = candidate;
        break;
      }
    }
    if (!generatedFinal) {
      throw new Error('Impossible de générer un finalURL unique après plusieurs tentatives');
    }
    
    return Link.create({ ...rest, finalURL: generatedFinal }, options);
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