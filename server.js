//Imports
import 'dotenv/config';
import express from "express";
import path from "path";
import { fileURLToPath } from 'url';
import { initializeDatabase } from './db/init.js';
import { ModelRepository, LinkRepository, VisitRepository, ClickRepository } from './repositories/index.js';
import { getCountryFromRequest } from './services/geo.js';
import { computeBackgroundGradientFromImage } from './services/profileUtilities.js';
import { validateLink, computeSignature, requireSignedOrApiKeyAndCaptcha, requireAdminApiKey } from 
'./services/securityUtilities.js';
import { parseVisits } from './services/adminUtilities.js';
import multer from 'multer';
import sharp from 'sharp';
import fs from 'fs/promises';

// Variables nécessaires pour __dirname en ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration de l'application
const app = express();

// CORRECTION 1 : Le port DOIT être 'passenger' sur PlanetHoster
// On priorise 'passenger' si on détecte qu'on n'est pas en local dev
let PORT = 'passenger';
if (process.env.NODE_ENV === 'development' && process.env.PORT && process.env.PORT !== 'passenger') {
    PORT = process.env.PORT; // Garde le port numérique seulement en dev local
}

// Pour être sûr sur PlanetHoster :
if (!process.env.LOCAL_DEV) {
    PORT = 'passenger';
}

// Variable globale pour activer/désactiver le captcha
const CAPTCHA_ENABLED = process.env.CAPTCHA_ENABLED === 'true' || false;
const RECAPTCHA_SITE_KEY = process.env.RECAPTCHA_SITE_KEY;
const ADMIN_URL_SECRET = process.env.ADMIN_URL_SECRET;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// foward de port
app.set('trust proxy', true);

//Initialisation
async function startServer() {
    console.log("🚀 Démarrage de l'initialisation...");
    
    // CORRECTION 2 : Déplacer l'init DB à l'intérieur pour ne pas bloquer le chargement du module
    try {
        await initializeDatabase();
        console.log("✅ Base de données initialisée.");
    } catch (e) {
        console.error("❌ Erreur critique DB:", e);
        // Sur PlanetHoster, il vaut mieux ne pas exit(1) tout de suite pour voir les logs
    }

    let profiles = [];
    try {
        profiles = await LinkRepository.findAll();
    } catch (e) {
        console.warn('⚠️ Impossible de récupérer les profils au démarrage:', e?.message || e);
    }

    try {
        // CORRECTION 3 : Le listen explicite sur 'passenger'
        app.listen(PORT, () => {
            console.log(`Server running on port: ${PORT}`);
            // Note: Sur PlanetHoster l'URL interne n'est pas localhost:passenger, c'est géré par Apache
            console.log(`Application accessible publiquement.`);
        });
    } catch (err) {
        console.error("❌ Erreur lors du app.listen :", err);
    }
}

// Lancement
startServer();


/*             Pages accessibles            */

//Admin protégé par préfixe URL depuis .env
if (ADMIN_URL_SECRET && typeof ADMIN_URL_SECRET === 'string' && ADMIN_URL_SECRET.length === 128) {
    
    app.get(`/${ADMIN_URL_SECRET}`, async (req, res) => {
        try {
            const models = await ModelRepository.list();
            return res.render('admin', { models, adminPrefix: `/${ADMIN_URL_SECRET}` });
        } catch (e) {
            console.error('Erreur chargement admin:', e);
            return res.status(500).render('404');
        }
    });
    
    app.get(`/${ADMIN_URL_SECRET}/preview/profile`, async (req, res) => {
        try {
            const q = req.query || {};
            const renderProfile = {
                name: q.displayName || q.modelName || '',
                image: (() => {
                    const p = q.picture;
                    if (!p || !String(p).trim()) return '';
                    return String(p).startsWith('/') ? String(p) : `/${String(p)}`;
                })(),
                backgroundImage: (() => {
                    const b = q.background;
                    if (!b || !String(b).trim()) return '';
                    return String(b).startsWith('/') ? String(b) : `/${String(b)}`;
                })(),
                lienOF: q.linkOF || '',
                lienMYM: q.linkMYM || '',
                lienIG: q.linkIG || '',
                lienTG: q.linkTG || '',
                titleOF: q.titleOF || q.linkOF || '',
                titleMYM: q.titleMYM || q.linkMYM || '',
                titleIG: q.titleIG || q.linkIG || '',
                titleTG: q.titleTG || q.linkTG || '',
                finalURL: 'preview',
                countdownSeconds: Math.round((Number(q.countdownHours) || 0) * 3600),
                countdownTitle: q.countdownTitle || '',
            };
            try {
                const bgUrl = renderProfile.backgroundImage;
                const absPath = bgUrl ? path.join(__dirname, 'public', bgUrl.replace(/^\//, '')) : '';
                const gradient = await computeBackgroundGradientFromImage(absPath);
                renderProfile.backgroundGradient = gradient || 'white';
            } catch (e) {
                renderProfile.backgroundGradient = 'white';
            }
            return res.render('profilePreview', { profile: renderProfile });
        } catch (err) {
            return res.status(500).render('404');
        }
    });
} else {
    console.warn('ADMIN_URL_SECRET non configuré ou longueur ≠ 128: page admin désactivée');
}

// Route page chargement via lien temporaire (/:link) avec vérification du lien
app.get('/:link', validateLink, async (req, res) => {
    const { link } = req.params;
    const exp = Date.now() + 30_000; // 30s de validité
    let sig = 'invalid';
    try {
        sig = computeSignature(link, exp);
    } catch (e) {
        console.error('Signature API manquante:', e);
    }
    res.render('loading', {
        profileId: link,
        signedExp: exp,
        signedSig: sig,
        recaptchaSiteKey: RECAPTCHA_SITE_KEY,
        captchaEnabled: CAPTCHA_ENABLED,
    });
});

// Route rendu page de profil final 
app.get('/profile/:finalURL', async (req, res) => {
    //Vérification de l'existence du profil
    try {
        const { finalURL } = req.params;
        const profile = await LinkRepository.findByFinalURL(finalURL);
        if (!profile) {
            return res.status(404).render('404');
        }      

        const renderProfile = {
            name: profile.displayName || profile.modelName,
            image: (() => {
                const p = profile.picture;
                if (!p || !String(p).trim()) return '';
                return String(p).startsWith('/') ? String(p) : `/photos/${String(p)}`;
            })(),
            backgroundImage: profile.background?.startsWith('/') ? profile.background : `/fonds/${profile.background}`,
            // URLs
            lienOF: profile.linkOF || '',
            lienMYM: profile.linkMYM || '',
            lienIG: profile.linkIG || '',
            lienTG: profile.linkTG || '',
            // Titres (fallback sur l’URL si titre non défini)
            titleOF: profile.titleOF || profile.linkOF || '',
            titleMYM: profile.titleMYM || profile.linkMYM || '',
            titleIG: profile.titleIG || profile.linkIG || '',
            titleTG: profile.titleTG || profile.linkTG || '',
            finalURL,
            countdownSeconds: Math.round(profile.countdownHours * 3600),
            countdownTitle: profile.countdownTitle || '',
        };

        // Compute du dégradé linéaire sur l'image de fond
        try {
            const bgUrl = renderProfile.backgroundImage;
            const absPath = bgUrl ? path.join(__dirname, 'public', bgUrl.replace(/^\//, '')) : '';
            const gradient = await computeBackgroundGradientFromImage(absPath, {
                primaryColor: profile.primaryColor,
                secondaryColor: profile.secondaryColor,
            });
            renderProfile.backgroundGradient = gradient || 'white';
        } catch (e) {
            console.warn('Background gradient computation failed:', e);
            renderProfile.backgroundGradient = 'white';
        }

        return res.render('profile', { profile : renderProfile });
    } catch (err) {
        console.error('Erreur chargement profil:', err);
        return res.status(500).render('404');
    }
});

// Route de redirection qui journalise le clic côté serveur, puis redirige
app.get('/go/:finalURL/:type', async (req, res) => {
    try {
        const { finalURL, type } = req.params;
        const allowed = ['OF', 'MY', 'IG', 'TG'];
        // if (!finalURL || typeof finalURL !== 'string' || finalURL.length > 128) {
        //     return res.status(400).render('404');
        // }
        // if (!type || typeof type !== 'string' || !allowed.includes(type)) {
        //     return res.status(400).render('404');
        // }

        const link = await LinkRepository.findByFinalURL(finalURL);
        if (!link) {
            return res.status(404).render('404');
        }

        // Sélectionner l’URL cible selon le type
        let targetUrl = '';
        switch (type) {
            case 'OF':
                targetUrl = link.linkOF || '';
                break;
            case 'MY':
                targetUrl = link.linkMYM || '';
                break;
            case 'IG':
                targetUrl = link.linkIG || '';
                break;
            case 'TG':
                targetUrl = link.linkTG || '';
                break;
        }

        // if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) {
        //     return res.status(404).render('404');
        // }

        // Logger le clic
        try {
            await ClickRepository.create({ linkFinalURL: finalURL, type });
        } catch (logErr) {
            console.warn('Click logging failed:', logErr);
        }

        // Rediriger vers l’URL cible
        if (targetUrl && !/^https?:\/\//i.test(targetUrl)) {
            targetUrl = 'https://' + targetUrl;
        }
        return res.redirect(targetUrl);
    } catch (err) {
        console.error('Erreur redirection clic:', err);
        return res.status(500).render('404');
    }
});



/*            API get            */

// Route pour récupérer l'URL de profil à partir d'une URL temporaire, securisée
app.get('/api/getProfileUrl/:link', requireSignedOrApiKeyAndCaptcha, async (req, res) => {
    const { link } = req.params;
    // Récupère le host original (même derrière un proxy/tunnel)
    const host = req.get('x-forwarded-host') || req.get('host');
    // Récupération du suffixe final depuis la BDD 
    let finalUrl;
    try {
        const linkEntity = await LinkRepository.findByTempURL(link);
        const finalSuffix = linkEntity.finalURL;
        finalUrl = `https://${host}/profile/${finalSuffix}`;

         // Enregistrer la visite avec le pays
        try {
            const countryCode = await getCountryFromRequest(req);
            await VisitRepository.create({ linkTempURL: link, location: countryCode });
        } catch (logErr) {
            console.warn('Visit logging failed:', logErr);
        }

    } catch (err) {
        console.error('Erreur récupération lien:', err);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
    res.json({ url: finalUrl });
});

// Route liste des liens d'un modèle (admin)
app.get(`/${ADMIN_URL_SECRET}/api/models/:name/links`, async (req, res) => {
    try {
        const { name } = req.params;
        if (!name || typeof name !== 'string' || name.length > 255) {
            return res.status(400).json({ error: 'Paramètre name invalide' });
        }
        const links = await LinkRepository.listByModelName(name);
        const data = links.map(l => ({
            tempURL: l.tempURL,
            finalURL: l.finalURL,
        }));
        return res.json({ links: data });
    } catch (err) {
        console.error('Erreur liste des liens:', err);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Détails d'un lien (admin)
app.get(`/${ADMIN_URL_SECRET}/api/links/:tempURL`, async (req, res) => {
    try {
        const { tempURL } = req.params;
        if (!tempURL || typeof tempURL !== 'string' || tempURL.length > 255) {
            return res.status(400).json({ error: 'Paramètre tempURL invalide' });
        }
        const link = await LinkRepository.findByTempURL(tempURL);
        if (!link) return res.status(404).json({ error: 'Lien introuvable' });
        return res.json({
            tempURL: link.tempURL,
            modelName: link.modelName,
            displayName: link.displayName,
            picture: link.picture,
            background: link.background,
            linkOF: link.linkOF,
            linkMYM: link.linkMYM,
            linkIG: link.linkIG,
            linkTG: link.linkTG,
            titleOF: link.titleOF,
            titleMYM: link.titleMYM,
            titleIG: link.titleIG,
            titleTG: link.titleTG,
            countdownHours: link.countdownHours,
            countdownTitle: link.countdownTitle,
        });
    } catch (err) {
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Vérifier l'existence d'un lien 
app.get(`/${ADMIN_URL_SECRET}/api/links/exists/:tempURL`, async (req, res) => {
    try {
        const { tempURL } = req.params;
        if (!tempURL || typeof tempURL !== 'string' || tempURL.length > 255) {
            return res.status(400).json({ error: 'Paramètre tempURL invalide' });
        }
        const link = await LinkRepository.findByTempURL(tempURL);
        return res.json({ exists: !!link });
    } catch (err) {
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});



/*             API post              */

// Créer un modèle (clé primaire = name) (admin)
app.post(`/${ADMIN_URL_SECRET}/api/models`, async (req, res) => {
    try {
        const { name } = req.body;
        if (!name || typeof name !== 'string') {
            return res.status(400).json({ success: false, error: 'Paramètre name requis (string)' });
        }
        if (name.length > 255) {
            return res.status(400).json({ success: false, error: 'name doit faire ≤ 255 caractères' });
        }

        const exists = await ModelRepository.findByName(name);
        if (exists) {
            return res.status(409).json({ success: false, error: 'Modèle déjà existant' });
        }

        const model = await ModelRepository.create({ name });
        try {
            const safe = path.basename(String(name));
            const photosDir = path.join(__dirname, 'public', 'photos', safe);
            const fondsDir = path.join(__dirname, 'public', 'fonds', safe);
            await fs.mkdir(photosDir, { recursive: true });
            await fs.mkdir(fondsDir, { recursive: true });
        } catch (e) {
            console.warn('Création des dossiers du modèle échouée:', e?.message || e);
        }
        return res.status(201).json({ success: true, model });
        
    } catch (err) {
        console.error('Erreur création modèle:', err);
        return res.status(500).json({ success: false, error: 'Erreur serveur', details: err.message });
    }
});

// Supprimer un modèle (admin)
app.delete(`/${ADMIN_URL_SECRET}/api/models/:name`, async (req, res) => {
    try {
        const { name } = req.params;
        if (!name || typeof name !== 'string' || name.length > 255) {
            return res.status(400).json({ success: false, error: 'Paramètre name invalide' });
        }
        const model = await ModelRepository.findByName(name);
        if (!model) {
            return res.status(404).json({ success: false, error: 'Modèle introuvable' });
        }
        
        await ModelRepository.deleteByName(name);
        try {
            const safe = path.basename(String(name));
            const photosDir = path.join(__dirname, 'public', 'photos', safe);
            const fondsDir = path.join(__dirname, 'public', 'fonds', safe);
            await fs.rm(photosDir, { recursive: true, force: true });
            await fs.rm(fondsDir, { recursive: true, force: true });
        } catch (e) {
            console.warn('Suppression des dossiers du modèle échouée:', e?.message || e);
        }
        return res.json({ success: true });
    } catch (err) {
        console.error('Erreur suppression modèle:', err);
        return res.status(500).json({ success: false, error: 'Erreur serveur', details: err.message });
    }
});

// Créer un lien (admin)
app.post(`/${ADMIN_URL_SECRET}/api/links`, async (req, res) => {
    try {
        const {
            tempURL,
            modelName,
            displayName,
            picture,
            background,
            linkOF,
            linkMYM,
            linkIG,
            linkTG,
            titleOF,
            titleMYM,
            titleIG,
            titleTG,
            countdownHours,
            countdownTitle,
        } = req.body;

        // Validation minimale
        if (!tempURL || !modelName || !background) {
            return res.status(400).json({ success: false, error: 'Paramètres requis: tempURL, modelName, picture, background' });
        }
        if (String(tempURL).length > 255) {
            return res.status(400).json({ success: false, error: 'tempURL doit faire ≤ 255 caractères' });
        }
        if (String(modelName).length > 255) {
            return res.status(400).json({ success: false, error: 'modelName doit faire ≤ 255 caractères' });
        }

        // Vérifier existence du modèle
        const model = await ModelRepository.findByName(modelName);
        if (!model) {
            return res.status(404).json({ success: false, error: 'Modèle introuvable (modelName)' });
        }

        const link = await LinkRepository.create({
            tempURL,
            modelName,
            displayName: displayName ?? null,
            picture: picture ?? '',
            background,
            linkOF: linkOF ?? null,
            linkMYM: linkMYM ?? null,
            linkIG: linkIG ?? null,
            linkTG: linkTG ?? null,
            titleOF: titleOF ?? null,
            titleMYM: titleMYM ?? null,
            titleIG: titleIG ?? null,
            titleTG: titleTG ?? null,
            countdownHours: (Number.isFinite(Number(countdownHours)) && Number(countdownHours) > 0) ? Math.floor(Number(countdownHours)) : 0,
            countdownTitle: countdownTitle ?? null
        });

        return res.status(201).json({ success: true, link });
    } catch (err) {
        console.error('Erreur création lien:', err);
        return res.status(500).json({ success: false, error: 'Erreur serveur', details: err.message });
    }
});

// Mettre à jour un lien (admin)
app.put(`/${ADMIN_URL_SECRET}/api/links/:tempURL`, async (req, res) => {
    try {
        const { tempURL } = req.params;
        if (!tempURL || typeof tempURL !== 'string' || tempURL.length > 255) {
            return res.status(400).json({ success: false, error: 'Paramètre tempURL invalide' });
        }

        const existing = await LinkRepository.findByTempURL(tempURL);
        if (!existing) {
            return res.status(404).json({ success: false, error: 'Lien introuvable' });
        }

        const {
            displayName,
            picture,
            background,
            linkOF,
            linkMYM,
            linkIG,
            linkTG,
            titleOF,
            titleMYM,
            titleIG,
            titleTG,
            countdownHours,
            countdownTitle,
            // Ignorés: tempURL, finalURL
        } = req.body || {};

        // Validation minimale
        if (!background || typeof background !== 'string') {
            return res.status(400).json({ success: false, error: 'Paramètre background requis' });
        }

        // Vérifier le nombre de liens (entre 1 et 3)
        const links = [linkOF, linkMYM, linkIG, linkTG];
        const providedCount = links.filter(v => typeof v === 'string' && v.trim().length > 0).length;
        if (providedCount < 1 || providedCount > 3) {
            return res.status(400).json({ success: false, error: 'Un profil doit contenir entre 1 et 3 liens (OF, MYM, IG, TG)' });
        }

        // Construction du patch en excluant les champs non modifiables
        const patch = {
            displayName: displayName ?? null,
            picture: picture ?? '',
            background,
            linkOF: linkOF ?? null,
            linkMYM: linkMYM ?? null,
            linkIG: linkIG ?? null,
            linkTG: linkTG ?? null,
            titleOF: titleOF ?? null,
            titleMYM: titleMYM ?? null,
            titleIG: titleIG ?? null,
            titleTG: titleTG ?? null,
            countdownHours: (Number.isFinite(Number(countdownHours)) && Number(countdownHours) > 0) ? Math.floor(Number(countdownHours)) : 0,
            countdownTitle: countdownTitle ?? null,
        };

        await LinkRepository.updateByTempURL(tempURL, patch);
        return res.json({ success: true });
    } catch (err) {
        console.error('Erreur mise à jour lien:', err);
        return res.status(500).json({ success: false, error: 'Erreur serveur', details: err.message });
    }
});

app.delete(`/${ADMIN_URL_SECRET}/api/links/:tempURL`, async (req, res) => {
    try {
        const { tempURL } = req.params;
        if (!tempURL || typeof tempURL !== 'string' || tempURL.length > 255) {
            return res.status(400).json({ success: false, error: 'Paramètre tempURL invalide' });
        }

        const existing = await LinkRepository.findByTempURL(tempURL);
        if (!existing) {
            return res.status(404).json({ success: false, error: 'Lien introuvable' });
        }

        await LinkRepository.deleteByTempURL(tempURL);
        return res.json({ success: true });
    } catch (err) {
        console.error('Erreur suppression lien:', err);
        return res.status(500).json({ success: false, error: 'Erreur serveur', details: err.message });
    }
});

// Récupération des visites par temporalité (admin)
app.post(`/${ADMIN_URL_SECRET}/api/visits/by-range`, async (req, res) => {
    try {
        // Vérifications des paramètres
        const { tempURLs, range } = req.body;
        if (!Array.isArray(tempURLs) || tempURLs.length === 0) {
            return res.status(400).json({ error: 'tempURLs requis (array non vide)' });
        }
        const urls = Array.from(new Set(tempURLs.map(s => String(s || '').trim()).filter(s => s.length > 0 && s.length <= 255)));
        if (urls.length === 0) {
            return res.status(400).json({ error: 'Aucune URL valide' });
        }
        const r = String(range || '').trim();
        if (!['month', 'week', '24h', '48h', '72h'].includes(r)) {
            return res.status(400).json({ error: 'Temporalité invalide' });
        }

        // Récupération des visites
        const byLink = {};
        const fetchers = {
            'month': (u) => VisitRepository.getLastMonthByDay(u),
            'week': (u) => VisitRepository.getLastWeekByHalfDay(u),
            '24h': (u) => VisitRepository.getLastDayByHour(u),
            '48h': (u) => VisitRepository.getLast2DaysByHour(u),
            '72h': (u) => VisitRepository.getLast3DaysByHour(u),
        };
        const fetcher = fetchers[r] || fetchers['24h'];
        for (const u of urls) {
            const s = await fetcher(u);
            byLink[u] = parseVisits(s);
        }
        return res.json(byLink);
        
    } catch (err) {
        console.error('Erreur visites par temporalité:', err);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Récupération des clicks par temporalité (admin)
app.post(`/${ADMIN_URL_SECRET}/api/clicks/by-range`, async (req, res) => {
    try {
        // Vérifications des paramètres
        const { finalURLs, range } = req.body;

        if (!Array.isArray(finalURLs) || finalURLs.length === 0) {
            return res.status(400).json({ error: 'finalURLs requis (array non vide)' });
        }
        
        const urls = Array.from(new Set(finalURLs.map(s => String(s || '').trim()).filter(s => s.length === 128)));
        if (urls.length === 0) {
            return res.status(400).json({ error: 'Aucune URL valide' });
        }

        const r = String(range || '').trim();
        if (!['month', 'week', '24h', '48h', '72h'].includes(r)) {
            return res.status(400).json({ error: 'Temporalité invalide' });
        }
        
        // Récupération des clicks
        const byLink = {};
        const types = ['OF', 'MY', 'IG', 'TG'];
        const fetchers = {
            'month': (u, type) => ClickRepository.getLastMonthByDay(u, type),
            'week': (u, type) => ClickRepository.getLastWeek(u, type),
            '24h': (u, type) => ClickRepository.getLastDayByHour(u, type),
            '48h': (u, type) => ClickRepository.getLast2DaysByHour(u, type),
            '72h': (u, type) => ClickRepository.getLast3DaysByHour(u, type),
        };
        const fetcher = fetchers[r] || fetchers['24h'];

        for (const u of urls) {
            let byType = {};
            let total = 0;
            for (const t of types) {
                byType[t] = await fetcher(u, t);
                total += byType[t] || 0;
            }
            byType['Total'] = total;
            byLink[u] = byType;
        }
        return res.json(byLink);
        
    } catch (err) {
        console.error('Erreur clicks par temporalité:', err);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Upload d'image (admin)
app.post(`/${ADMIN_URL_SECRET}/api/upload-image`, (req, res, next) => {
    const upload = multer({
        storage: multer.memoryStorage(),
        limits: { fileSize: 5 * 1024 * 1024 },
        fileFilter: (req, file, cb) => {
            const allowed = ['image/jpeg', 'image/png', 'image/gif'];
            if (allowed.includes(file.mimetype)) cb(null, true); else cb(new Error('TYPE_NOT_ALLOWED'));
        }
    });
    upload.single('image')(req, res, (err) => {
        if (err) {
            if (err.message === 'TYPE_NOT_ALLOWED') return res.status(400).json({ error: 'TYPE_NOT_SUPPORTED' });
            if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'FILE_TOO_LARGE' });
            console.error('Upload error (multer):', err);
            return res.status(500).json({ error: 'UPLOAD_FAILED' });
        }
        next();
    });
}, async (req, res) => {
    try {
        const f = req.file;
        if (!f) return res.status(400).json({ error: 'NO_FILE' });
        const base = path.basename(f.originalname);
        const target = String(req.body.target || 'photos');
        const folder = target === 'fonds' ? 'fonds' : 'photos';
        const modelName = String(req.body.modelName || '').trim();
        const safeModel = modelName ? path.basename(modelName) : '';
        const destDir = safeModel ? path.join(__dirname, 'public', folder, safeModel) : path.join(__dirname, 'public', folder);
        await fs.mkdir(destDir, { recursive: true });
        const dest = path.join(destDir, base);
        await fs.writeFile(dest, f.buffer);
        const url = safeModel ? `/${folder}/${encodeURIComponent(safeModel)}/${encodeURIComponent(base)}` : `/${folder}/${encodeURIComponent(base)}`;
        return res.json({ ok: true, fileName: base, publicUrl: url });
    } catch (e) {
        console.error('Upload error (handler):', e);
        return res.status(500).json({ error: 'UPLOAD_FAILED' });
    }
});

// Liste des fichiers (admin)
app.get(`/${ADMIN_URL_SECRET}/api/files`, async (req, res) => {
    try {
        const dir = String(req.query.dir || 'photos');
        const folder = dir === 'fonds' ? 'fonds' : 'photos';
        const model = String(req.query.model || '').trim();
        const safeModel = model ? path.basename(model) : '';
        const p = safeModel ? path.join(__dirname, 'public', folder, safeModel) : path.join(__dirname, 'public', folder);
        await fs.mkdir(p, { recursive: true });
        const entries = await fs.readdir(p, { withFileTypes: true });
        const files = entries.filter(e => e.isFile()).map(e => e.name).filter(n => /\.(jpe?g|png|gif)$/i.test(n));
        return res.json({ files });
    } catch (e) {
        console.error('List files error:', e);
        return res.status(500).json({ error: 'FILES_LIST_FAILED' });
    }
});

// Suppression d'un fichier (admin)
app.delete(`/${ADMIN_URL_SECRET}/api/file`, async (req, res) => {
    try {
        const dir = String(req.query.dir || 'photos');
        const name = String(req.query.name || '');
        if (!name) return res.status(400).json({ error: 'NAME_REQUIRED' });
        const folder = dir === 'fonds' ? 'fonds' : 'photos';
        const model = String(req.query.model || '').trim();
        const safeModel = model ? path.basename(model) : '';
        const baseName = path.basename(name);
        const p = safeModel ? path.join(__dirname, 'public', folder, safeModel, baseName) : path.join(__dirname, 'public', folder, baseName);
        await fs.unlink(p);
        return res.json({ ok: true });
    } catch (e) {
        if (e && e.code === 'ENOENT') return res.status(404).json({ error: 'NOT_FOUND' });
        console.error('Delete file error:', e);
        return res.status(500).json({ error: 'DELETE_FAILED' });
    }
});

 

 

