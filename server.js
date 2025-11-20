//Imports
import express from "express";
import path from "path";
import { fileURLToPath } from 'url';
import dotenv from "dotenv";
import { initializeDatabase } from './db/init.js';
import { ModelRepository, LinkRepository, VisitRepository, ClickRepository } from './repositories/index.js';
import { getCountryFromRequest } from './services/geo.js';
import { computeBackgroundGradientFromImage } from './services/profileUtilities.js';
import { validateLink, computeSignature, requireSignedOrApiKeyAndCaptcha, requireAdminApiKey } from './services/securityUtilities.js';

dotenv.config();

// Initialise la base de données
await initializeDatabase();

// Variables nécessaires pour __dirname en ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration de l'application
const app = express();
const PORT = process.env.PORT || 3000;

// Variable globale pour activer/désactiver le captcha
const CAPTCHA_ENABLED = process.env.CAPTCHA_ENABLED === 'true' || false;
const RECAPTCHA_SITE_KEY = process.env.RECAPTCHA_SITE_KEY;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// foward de port
app.set('trust proxy', true);

//Initialisation
async function startServer() {
    let profiles = [];
    try {
        profiles = await LinkRepository.findAll();
    } catch (e) {
        console.warn('⚠️ Impossible de récupérer les profils au démarrage (DB non disponible ?). Démarrage du serveur sans liste:', e?.message || e);
    }
    try {
        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
            for (const profile of profiles) {
                console.log(`http://localhost:${PORT}/p/${profile.tempURL}`);
            }
        });
    } catch (err) {
        console.error("Erreur lors de l'initialisation :", err);
        process.exit(1); // Quitte en cas d’erreur critique
    }
}

startServer();


// Routes
//Admin 
app.get('/', async (req, res) => {
    const allModels = await ModelRepository.list();
    res.render('admin', { models: allModels });
    // res.render('admin', { profiles: allProfiles });
    // res.render('admin', { profiles: sampleProfiles });
});

// Route page chargement via lien temporaire (/p/:link) avec vérification du lien
app.get('/p/:link', validateLink, async (req, res) => {
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

// Route page de profil final 
app.get('/profile/:finalURL', async (req, res) => {
    //Vérification de l'existence du profil
    try {
        const { finalURL } = req.params;
        const profile = await LinkRepository.findByFinalURL(finalURL);
        if (!profile) {
            return res.status(404).render('404');
        }

        // Enregistrer la visite avec le pays
        try {
            const countryCode = await getCountryFromRequest(req);
            await VisitRepository.create({ linkTempURL: profile.tempURL, location: countryCode });
            console.log("Pays enregistré !");
        } catch (logErr) {
            console.warn('Visit logging failed:', logErr);
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
        if (!finalURL || typeof finalURL !== 'string' || finalURL.length > 128) {
            return res.status(400).render('404');
        }
        if (!type || typeof type !== 'string' || !allowed.includes(type)) {
            return res.status(400).render('404');
        }

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

        if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) {
            return res.status(404).render('404');
        }

        // Logger le clic
        try {
            await ClickRepository.create({ linkFinalURL: finalURL, type });
        } catch (logErr) {
            console.warn('Click logging failed:', logErr);
        }

        // Rediriger vers l’URL cible
        return res.redirect(targetUrl);
    } catch (err) {
        console.error('Erreur redirection clic:', err);
        return res.status(500).render('404');
    }
});

// Route pour récupérer l'URL de profil à partir d'une URL temporaire, securisée
app.get('/api/getProfileUrl/:link', requireSignedOrApiKeyAndCaptcha, async (req, res) => {
    const { link } = req.params;
    // Récupère le host original (même derrière un proxy/tunnel)
    const host = req.get('x-forwarded-host') || req.get('host');
    const protocol = req.get('x-forwarded-proto') || req.protocol;
    // Récupération du suffixe final depuis la BDD 
    let finalUrl;
    try {
        const linkEntity = await LinkRepository.findByTempURL(link);
        const finalSuffix = linkEntity.finalURL;
        finalUrl = `${protocol}://${host}/profile/${finalSuffix}`;
    } catch (err) {
        console.error('Erreur récupération lien:', err);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
    res.json({ url: finalUrl });
});

// Ajouter une URL difficile
app.get('/api/models/:name/links', async (req, res) => {
    try {
        const { name } = req.params;
        if (!name || typeof name !== 'string' || name.length > 255) {
            return res.status(400).json({ error: 'Paramètre name invalide' });
        }
        const links = await LinkRepository.listByModelName(name);
        const data = links.map(l => ({
            tempURL: l.tempURL,
        }));
        return res.json({ links: data });
    } catch (err) {
        console.error('Erreur liste des liens:', err);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Créer un modèle (clé primaire = name)
app.post('/api/models', requireAdminApiKey, async (req, res) => {
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
        return res.status(201).json({ success: true, model });
    } catch (err) {
        console.error('Erreur création modèle:', err);
        return res.status(500).json({ success: false, error: 'Erreur serveur', details: err.message });
    }
});

// Créer un lien
app.post('/api/links', requireAdminApiKey, async (req, res) => {
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
            picture,
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

