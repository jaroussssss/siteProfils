import crypto from 'crypto';
import fetch from 'node-fetch';
import { LinkRepository } from '../repositories/index.js';

// Middleware pour valider un lien temporaire (tempURL)
async function validateLink(req, res, next) {
    const { link } = req.params;
    // Vérification simple de longueur
    if (typeof link !== 'string' || link.length < 1 || link.length > 255) {
        return res.status(400).json({ error: 'Lien temporaire invalide' });
    }
    try {
        const linkEntity = await LinkRepository.findByTempURL(link);
        if (!linkEntity) {
            return res.status(404).render('404');
        }
        next();
    } catch (err) {
        console.error('Erreur validateLink:', err);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
}

// Middleware vérification reCAPTCHA v3
async function verifyRecaptcha(token, ip) {
    const secret = process.env.RECAPTCHA_SECRET;
    if (!secret) {
        throw new Error('RECAPTCHA_SECRET non configuré');
    }
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ secret, response: token, remoteip: ip || '' })
    });
    const data = await response.json();
    return data.success && data.score >= 0.5;
}

// Utilitaire HMAC pour signer l'URL d'API
function computeSignature(link, exp) {
    const secret = process.env.API_SIGNING_SECRET;
    if (!secret) {
        throw new Error("API_SIGNING_SECRET non configuré");
    }
    const payload = `${link}|${exp}`;
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

// Middleware d'authentification API (admin uniquement)
function requireAdminApiKey(req, res, next) {
    const ADMIN_API_KEY = process.env.ADMIN_API_KEY;
    if (!ADMIN_API_KEY) {
        console.warn("ADMIN_API_KEY non configurée dans l'environnement");
        return res.status(500).json({ error: 'API admin non configurée' });
    }
    
    const headerKey = req.get('x-api-key');
    const bearer = req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.slice(7)
        : undefined;
    const key = headerKey || bearer;
    if (!key || key !== ADMIN_API_KEY) {
        return res.status(401).json({ error: 'Accès refusé' });
    }
    next();
}

// Middleware: clé admin OU (signature obligatoire + captcha si activé)
async function requireSignedOrApiKeyAndCaptcha(req, res, next) {
    const ADMIN_API_KEY = process.env.ADMIN_API_KEY;
    // 1) Bypass par clé API admin
    const headerKey = req.get('x-api-key');
    const bearer = req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.slice(7)
        : undefined;
    const apiKey = headerKey || bearer;
    if (ADMIN_API_KEY && apiKey === ADMIN_API_KEY) {
        return next();
    }

    // 2) Signature obligatoire (si pas de clé admin)
    const { link } = req.params;
    const expStr = req.query.exp;
    const sig = req.query.sig;
    const now = Date.now();
    const maxSkewMs = 5_000;

    const API_SIGNING_SECRET = process.env.API_SIGNING_SECRET;
    if (!API_SIGNING_SECRET) {
        console.warn("API_SIGNING_SECRET manquant: accès refusé sans clé admin");
        return res.status(403).json({ error: 'Accès refusé' });
    }
    if (!expStr || !sig) {
        return res.status(400).json({ error: 'Paramètres signés manquants (exp, sig)' });
    }
    const exp = Number(expStr);
    if (!Number.isFinite(exp)) {
        return res.status(400).json({ error: 'exp invalide' });
    }
    if (exp + maxSkewMs < now) {
        return res.status(403).json({ error: 'Lien expiré' });
    }
    const expected = computeSignature(link, exp);
    if (expected !== sig) {
        return res.status(403).json({ error: 'Signature invalide' });
    }
    console.log('✅ Signature vérifiée pour:', link);

    // 3) Captcha obligatoire si activé
    const CAPTCHA_ENABLED = process.env.CAPTCHA_ENABLED === 'true' || false;
    if (CAPTCHA_ENABLED) {
        const recaptchaToken = req.query.recaptcha_token;
        if (!recaptchaToken) {
            return res.status(400).json({ error: 'recaptcha_token requis' });
        }
        try {
            const ok = await verifyRecaptcha(recaptchaToken, req.ip);
            if (!ok) {
                return res.status(403).json({ error: 'Captcha invalide' });
            }
        } catch (e) {
            console.error('Erreur vérification reCAPTCHA:', e);
            return res.status(500).json({ error: 'Erreur vérification reCAPTCHA' });
        }
    }
    console.log('✅ Captcha vérifié pour:', link);

    return next();
}

export { validateLink, verifyRecaptcha, computeSignature, requireAdminApiKey, requireSignedOrApiKeyAndCaptcha };

