# RAPPORT DEV — Round 1 (21/21 corrections)

## Critiques (7/7) ✅
| # | Correction | Fichier |
|---|-----------|---------|
| C1 | Validations route `/go/:finalURL/:type` décommentées + URL stricte via `new URL()` | server.js |
| C2 | Bug ClickRepository `clickType` → `type: clickType` | repositories/ClickRepository.js |
| C3 | Timing attack HMAC → `crypto.timingSafeEqual()` | services/securityUtilities.js |
| C4 | Path traversal DELETE → guard `resolvedPath.startsWith(publicDir)` | server.js |
| C5 | `requireAdminApiKey` ajouté sur GET routes API | server.js |
| C6 | Guard crash clicks.js `if (!finalUrl || !data[finalUrl]) return;` | public/js/clicks.js |
| C7 | Race condition LinkRepository → retry sur `SequelizeUniqueConstraintError` | repositories/LinkRepository.js |

## Hautes (14/14) ✅
| # | Correction | Fichier |
|---|-----------|---------|
| H1 | Headers sécurité: `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection` | server.js |
| H2 | Suppression `details: err.message` sur 5 occurrences | server.js |
| H3 | Fallback gradient `'white'` → gradient violet | views/profile.ejs, server.js |
| H4 | CSS `.modal-close`: `left: 556px` → `right: 12px` | public/css/admin.css |
| H5 | `countdownHours` borné [0, 8760] avec IIFE | server.js |
| H6 | Validation regex format `tempURL` côté serveur | server.js |
| H7 | Validation `target` upload dans `['fonds', 'photos']` | server.js |
| H8 | Guard `isValidImagePathStrict` sur `picture` et `background` | server.js |
| H9 | Contraste `--muted`: `#9ca3af` → `#b8bcc9` (AA 4.5:1) | public/css/admin.css |
| H10 | `loading="lazy"` sur 5 images profile.ejs | views/profile.ejs |
| H11 | `scope="col"` sur tous les `<th>` | views/admin.ejs |
| H12 | Label `#countrySelectLabel` = "Tous les pays" | views/admin.ejs |
| H13 | Duplication: vider tempURL + message clair | public/js/createProfilePopup.js |
| H14 | Messages erreur loading plus explicites | public/js/loading.js |
