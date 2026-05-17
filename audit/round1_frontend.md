# RAPPORT ÉQUIPE FRONTEND UX/UI — Round 1

## 1. BUGS VISUELS

1. **Modal close button (position fixe)** — `public/css/admin.css:187` — `left: 556px` fixe → sort de l'écran sur mobile. Fix: `right: 12px; top: 12px;`
2. **Countdown vide** — `views/profile.ejs:64-75` — si `countdownSeconds <= 0` et `countdownTitle` vide, rien affiché
3. **Background fallback blanc** — `views/profile.ejs:5-11` — si `backgroundGradient` undefined, fond blanc + texte blanc = invisible. Fix: fallback gradient violet
4. **Config-row modal** — `public/css/admin.css:230,242` — `grid-template-columns: 1fr 1fr` se chevauche à 768px viewport
5. **`.sr-only` fragile** — `public/css/admin.css:88-89` — `white-space: nowrap` peut déborder

## 2. PROBLÈMES UX

1. **Pas de validation temps réel** — `public/js/createProfilePopup.js:106-123` — erreurs URL uniquement au Save. Fix: ajouter `blur` event avec check async
2. **Pas de spinner dans l'iframe preview** — `public/js/createProfilePopup.js:94-103` — changement de src sans feedback de chargement
3. **Messages validation vagues** — `public/js/createProfilePopup.js:110-118` — pas d'icône, pas d'indication du champ fautif, pas du nombre actuel de liens
4. **Bouton "Dupliquer" sans feedback** — `views/admin.ejs:229` — pas de notification de succès
5. **countrySelectLabel vide au démarrage** — `views/admin.ejs:135-142` — label vide → confusion. Fix: ajouter "Sélectionnez un pays" par défaut
6. **Champs requis non indiqués** — `views/admin.ejs:236-300` — aucun `*` ou indicateur visuel

## 3. ACCESSIBILITÉ

1. **Modal sans `aria-hidden`** — `views/admin.ejs:185` — modal cachée reste lisible par screen reader. Fix: ajouter `aria-hidden="true"` et le retirer à l'ouverture
2. **`<th>` sans `scope="col"`** — `views/admin.ejs:50-66` — Fix: ajouter `scope="col"` sur chaque `<th>`
3. **Contraste limite** — `public/css/admin.css:80` — `--muted: #9ca3af` sur `--bg: #0b1220` = 4.2:1 (< 4.5 requis AA). Fix: `#b8bcc9`
4. **Formulaire sans `<form>` wrapper** — `views/admin.ejs:215-350` — pas de navigation clavier Enter-to-submit
5. **Keyboard nav select custom** — pas de gestion `keydown` Arrow Up/Down/Escape pour la listbox

## 4. PERFORMANCE FRONTEND

1. **Pas de lazy-load images** — `views/profile.ejs:23,28,39,45,51,57` — toutes les images chargées immédiatement. Fix: `loading="lazy"`
2. **Canvas 500px × 60vw** — `public/css/admin.css:141-147` — canvas Chart.js non contraint → rendu haute résolution
3. **4 font-weights chargés** — `views/admin.ejs:10` — Inter wght 400;500;600;700. Si 500 inutilisé, supprimer
4. **Script countdown non-defer** — `views/profile.ejs:80-115` — bloque le thread principal. Fix: `defer` + `DOMContentLoaded`

## 5. RESPONSIVE / MOBILE

1. **Modal-large sur iPhone SE** — `public/css/admin.css:194` — `95vw` = 356px mais `config-row` reste en 2 colonnes jusqu'à 980px. Fix: media query `@media (max-width: 600px) { config-row: 1fr }`
2. **Sidebar mobile** — `public/css/admin.css:22-45` — `min-width: 200px` force scroll horizontal sur 375px. Fix: `@media (max-width: 768px) { flex-direction: column; }`
3. **Countdown overlap mobile** — `views/profile.ejs:65-75` — `top: calc(74vh)` se chevauche si profil dépasse la hauteur
4. **Links buttons** — `public/css/profile.css:119-141` — padding et font fixes sur petit écran

## 6. MODIFICATIONS PRIORITAIRES

| # | Fichier | Ligne | Priorité |
|---|---------|-------|----------|
| 1 | `public/css/admin.css` | 187 | 🔴 URGENT |
| 2 | `views/admin.ejs` | 50-66 | 🟠 HIGH |
| 3 | `views/admin.ejs` | 249-300 | 🟠 HIGH |
| 4 | `public/js/createProfilePopup.js` | 106-123 | 🟠 HIGH |
| 5 | `views/profile.ejs` | 5-11 | 🟠 HIGH |
| 6 | `public/css/admin.css` | 80 | 🟠 HIGH |
| 7 | `views/profile.ejs` | 23-57 | 🟡 MEDIUM |
| 8 | `public/css/admin.css` | 194-252 | 🟡 MEDIUM |
| 9 | `public/css/admin.css` | 22-45 | 🟡 MEDIUM |
| 10 | `views/admin.ejs` | 135-142 | 🟡 MEDIUM |
