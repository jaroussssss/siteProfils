# RAPPORT ÉQUIPE CYBERSÉCURITÉ — Round 1

## VULNÉRABILITÉS CRITIQUES (CVSS 9-10)

### 1. Timing Attack sur HMAC (CVSS 9.8)
**Fichier:** `services/securityUtilities.js:104`
```javascript
if (expected !== sig) { ... } // Comparaison sensible au timing → attaquant peut deviner byte par byte
```
**Fix:** Utiliser `crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))`

### 2. Path Traversal Upload (CVSS 9.1)
**Fichier:** `server.js:668-705`
- `path.basename()` contournable selon l'OS
- MIME type validé mais peut être falsifié côté client
- `modelName` de `req.body` sans validation regex
**Fix:** Regex strict `/^[a-zA-Z0-9_\-. ]{1,255}$/` + vérification `realpathSync` reste dans `public/`

### 3. IDOR — Routes API non protégées (CVSS 8.9)
**Fichier:** `server.js:298-314, 317-345`
- Routes `GET /{ADMIN_URL_SECRET}/api/models/:name/links` et `/api/links/:tempURL` sans `requireAdminApiKey`
- Toute personne connaissant le secret URL peut énumérer tous les liens/modèles
**Fix:** Ajouter `requireAdminApiKey` middleware sur toutes les routes API admin

### 4. Replay Attack sur Signatures HMAC (CVSS 8.2)
**Fichier:** `services/securityUtilities.js:86`
- Signature valide 30s → attaquant peut la rejouer pour générer de fausses visites
**Fix:** Ajouter un nonce unique par requête + store des nonces utilisés (Map avec TTL 30s)

## VULNÉRABILITÉS HAUTES (CVSS 7-8)

### 5. XSS Stocké sur Titres de Liens (CVSS 7.5)
**Fichier:** `views/profile.ejs:40,46,52,58`
- `titleOF/MYM/IG/TG` et `countdownTitle` potentiellement rendus non-échappés
**Fix:** Confirmer l'utilisation de `<%= %>` (échappe) et NON `<%-  %>` (raw) sur tous les champs utilisateur

### 6. Rate Limiting Absent (CVSS 7.3)
**Fichier:** Toutes les routes API
- Aucune limite de requêtes → brute-force HMAC, flood logs, DoS
**Fix:** `express-rate-limit` — 100 req/15min général, 30 req/min API, 5 req/15min auth

### 7. CSRF sur Routes POST/PUT/DELETE (CVSS 7.1)
**Fichier:** `server.js:366-576`
- Aucun token CSRF → page malveillante peut supprimer tous les modèles
**Fix:** `csurf` middleware + token dans chaque requête fetch

### 8. Information Disclosure (CVSS 7.2)
**Fichier:** `server.js:395,424,487,554,574`
- `details: err.message` exposé en production → révèle chemins système, schéma DB
**Fix:** `...(isDev && { details: err.message })` — seulement en développement

## VULNÉRABILITÉS MOYENNES (CVSS 4-6)

### 9. Schéma URL dangereux accepté (CVSS 5.3)
**Fichier:** `server.js:256`
- `javascript:alert(1)` ou `data:text/html` acceptés puis préfixés `https://` → URL malformée
**Fix:** Validation stricte via `new URL()` → `url.protocol === 'https:'`

### 10. Pas de validation URLs sociales (CVSS 5.4)
**Fichier:** `server.js:429-489`
- `linkOF/MYM/IG/TG` stockés sans validation → URLs malveillantes possibles
**Fix:** Fonction `validateAndSanitizeUrl()` avec `new URL()` + protocole http/https uniquement

### 11. URLs sociales en clair en DB (CVSS 5.2)
- Si DB compromise → toutes les URLs OnlyFans/MYM exposées
**Fix:** Chiffrement AES-256 des URLs sensibles (clé dans env)

### 12. Authentification admin insuffisante (CVSS 5.8)
- Seul secret URL = pas de 2FA, pas de session, pas de whitelist IP
**Fix:** JWT + TOTP (speakeasy), rate limiting login, logs d'accès

## VULNÉRABILITÉS FAIBLES (CVSS 1-3)

### 13. Headers de sécurité absents (CVSS 3.6)
- Pas de `Content-Security-Policy`, `X-Frame-Options`, `HSTS`, etc.
**Fix:** `helmet` middleware

### 14. Logs non structurés (CVSS 2.5)
- `console.log/error` sans rotation, peuvent contenir données sensibles
**Fix:** `winston` avec fichiers rotatifs et niveau `info`/`error`

## MODIFICATIONS PRIORITAIRES

| # | Fichier | Ligne | Vulnérabilité | Priorité |
|---|---------|-------|---------------|----------|
| 1 | `services/securityUtilities.js` | 104 | Timing attack HMAC | 🔴 CRITIQUE |
| 2 | `server.js` | 668-705 | Path traversal upload | 🔴 CRITIQUE |
| 3 | `server.js` | 298-345 | IDOR routes non protégées | 🔴 CRITIQUE |
| 4 | `services/securityUtilities.js` | 86 | Replay attack nonce | 🔴 CRITIQUE |
| 5 | `views/profile.ejs` | 40,46,52,58 | XSS titres | 🟠 HIGH |
| 6 | `server.js` | Toutes routes | Rate limiting | 🟠 HIGH |
| 7 | `server.js` | 366-576 | CSRF | 🟠 HIGH |
| 8 | `server.js` | 395,424,554 | Info disclosure | 🟠 HIGH |
| 9 | `server.js` | 256 | URL scheme validation | 🟡 MEDIUM |
| 10 | `server.js` | 429-489 | Validation URLs sociales | 🟡 MEDIUM |
| 11 | `server.js` | global | Headers sécurité (helmet) | 🟡 MEDIUM |
