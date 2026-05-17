# RAPPORT ÉQUIPE QA — Round 1

## 1. CAS DE TEST MANQUANTS

### Gestion des modèles
- Création avec nom vide (non validé côté client avant API)
- Création avec caractères spéciaux (`< > " ' $ ;`) → risque injection
- Suppression modèle avec liens actifs → CASCADE vérifié en test ?
- Tentative dupliquer modèle avec nom existant → pas de gestion doublon
- Limite de 10+ modèles → performance liste admin

### Gestion des profils/liens
- `tempURL` très long (>255 chars) → validé client mais **pas revalidé serveur:453**
- `tempURL` avec caractères spéciaux → **AUCUNE VALIDATION DE FORMAT**
- `countdownHours` négatif → `Math.floor()` accepte
- `countdownHours` très grand (999999) → aucune limite
- `titleOF/MYM/IG/TG` > 255 chars → DB tronque silencieusement

### Flux visiteur
- tempURL avec injection SQL → uniquement longueur vérifiée, pas format
- `/profile/:finalURL` avec `..` ou `/` → sanitization non évidente

### Analytics
- Clic avec type `undefined` ou `null` → validation commentée (server.js:218-220)
- `data[undefined]` dans clicks.js → crash si finalUrl non trouvé

## 2. EDGE CASES NON GÉRÉS

| Champ | Edge Case | Comportement actuel | Risque |
|-------|-----------|-------------------|--------|
| `tempURL` | Caractères spéciaux | Aucune validation | Injection si encodage front bypassé |
| `background` | Chemin `../` ou absolu | Aucune validation format | Path traversal |
| `countdownHours` | `-5`, `3.7`, `Infinity`, `NaN` | `Math.floor()` non sûr | `Infinity` ou `NaN` en DB |
| `titleOF/MYM/IG/TG` | > 255 chars | Tronqué silencieusement en DB | Perte de données sans erreur |
| `picture` | Vide + non-vide même req | Accepté | État incohérent |
| Race condition | Deux requêtes même tempURL | Conflict DB | Erreur 500 non gérée |

## 3. FLUX CASSÉS OU INCOMPLETS

1. **Mode edit** — `public/js/createProfilePopup.js:279` — `fields.tempURL` est disabled → pas de bouton "copier"
2. **Duplication** — conserve ancien `tempURL`, utilisateur doit le changer manuellement, pas clair dans l'UI
3. **Analytics clicks.js:99-112** — `data[finalUrl]` crash si `finalUrl === undefined`
4. **Clics validation commentée** — `server.js:214-220` — accepte n'importe quel type en DB

## 4. COHÉRENCE DES DONNÉES

| Risque | Statut |
|--------|--------|
| Image `picture`/`background` référencée inexistante | Aucune vérification d'existence → 404 frontend |
| Suppression modèle → liens → visites/clics | CASCADE ✓ mais historique perdu définitivement |
| Lien créé, upload échoue | Lien orphelin sans photo |
| countdownHours Infinity → DB | NaN/Infinity possibles en DB |

## 5. TESTS DE RÉGRESSION NÉCESSAIRES

| Fonctionnalité | Raison |
|----------------|--------|
| Suppression modèle → liens disparus | CASCADE correctement appliquée |
| Modification lien → ancien finalURL inaccessible | Atomicité update |
| Upload image + création lien → image accessible | Transactionnel |
| Requêtes clics parallèles → pas de double comptage | Concurrence |
| Validations front vs serveur | Pas de mismatch |
| Génération `finalURL` unique | Pas de collision |
| Timezone locale visites/clics | Formatage date-heure |
| CountdownSeconds (heures × 3600) | Calcul correct |

## 6. MODIFICATIONS PRIORITAIRES (CODE)

### Bug critique 1 — Crash clicks.js
**Fichier:** `public/js/clicks.js:99-112`
```javascript
// AVANT (crash si finalUrl undefined):
const entries = [[type[0], data[finalUrl]['OF']], ...];

// APRÈS:
if (!finalUrl || !data[finalUrl]) {
  if (window._clickChartSpecific) { window._clickChartSpecific.destroy(); window._clickChartSpecific = null; }
  return;
}
```

### Bug critique 2 — Validation type clic commentée
**Fichier:** `server.js:214-220`
```javascript
// Décommenter:
if (!finalURL || typeof finalURL !== 'string' || finalURL.length !== 128) return res.status(400).render('404');
if (!type || typeof type !== 'string' || !allowed.includes(type)) return res.status(400).render('404');
```

### Bug critique 3 — Race condition tempURL
**Fichier:** `repositories/LinkRepository.js:17-29`
```javascript
// Remplacer la boucle check→create par create direct avec retry sur UniqueConstraintError:
for (let attempt = 0; attempt < 5; attempt++) {
  try {
    return await Link.create({ ...rest, finalURL: nanoid(128) }, options);
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') continue;
    throw err;
  }
}
throw new Error('Impossible de générer un finalURL unique');
```

### Bug moyen — countdownHours non borné
**Fichier:** `server.js:480,546`
```javascript
countdownHours: (() => {
  const h = Number(countdownHours);
  if (!Number.isFinite(h) || h <= 0 || h > 8760) return 0;
  return Math.floor(h);
})(),
```

### Bug moyen — Validation format tempURL côté serveur
**Fichier:** `server.js:453`
```javascript
if (!/^[a-zA-Z0-9_-]+$/.test(tempURL) || tempURL.length < 3 || tempURL.length > 255) {
  return res.status(400).json({ error: 'tempURL: 3-255 chars alphanumériques/tirets/underscores' });
}
```

### Bug moyen — Validation paths images
**Fichier:** `server.js:452,522-524`
```javascript
function validateImagePath(p) {
  if (!p || typeof p !== 'string' || p.length > 255) return false;
  if (p.startsWith('/') || p.includes('..') || p.includes('\\')) return false;
  return /^[a-zA-Z0-9._/-]+$/.test(p);
}
```

## 7. PLAN DE TESTS RECOMMANDÉ

### Tier 1 — Critiques (ASAP)
- TC-001: Création profil 0/1/2/3/4 liens
- TC-002: Validation tempURL vide / trop long / caractères spéciaux
- TC-003: Clic type invalide → rejeté
- TC-004: Visite location FR / null
- TC-005: clicks.js avec finalUrl undefined → pas de crash

### Tier 2 — Sécurité
- TC-006: Injection SQL dans tous les champs string
- TC-007: Path traversal dans picture/background
- TC-008: Race condition tempURL (2 requêtes parallèles)

### Tier 3 — Régression (chaque deploy)
- Workflow complet: créer modèle → profil → upload → accès public → clic → analytics
- Suppression modèle → analytics vidées
- Redirection clics URL sans https://
