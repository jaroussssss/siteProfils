// Fichier client: init lecture via data-attributes et redirection
(function() {
  const messageEl = () => document.getElementById('message');
  const isInstagram = /Instagram/.test(navigator.userAgent);
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  function fetchWithTimeout(url, options={}, timeout = 15000) {
    return Promise.race([
      fetch(url, options),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
    ]);
  }

  function redirectExternal(url) {
    if (isInstagram && isMobile) {
      const cleanUrl = url.replace(/^https?:\/\//, '');
      if (/android/i.test(navigator.userAgent)) {
        const intentUrl = `intent://${cleanUrl}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(url)};end`;
        window.location.href = intentUrl;
      } else if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
        const xSafariUrl = `x-safari-https://${cleanUrl}`;
        let hasFocusChanged = false;
        const blurHandler = () => { hasFocusChanged = true; };
        window.addEventListener('blur', blurHandler);
        window.location.href = xSafariUrl;
        setTimeout(() => {
          if (!hasFocusChanged) {
            const secondTryUrl = `com-apple-mobilesafari-tab:${url}`;
            window.location.href = secondTryUrl;
            setTimeout(() => {
              if (!hasFocusChanged) {
                window.location.href = url;
              }
              window.removeEventListener('blur', blurHandler);
            }, 1500);
          } else {
            window.removeEventListener('blur', blurHandler);
          }
        }, 1500);
      } else {
        window.location.href = url;
      }
    } else {
      window.location.href = url;
    }
  }

  // Exposer init en global pour l’event listener inline
  window.init = function init() {
    const body = document.body;
    const profileId = body.dataset.profileId;
    const exp = body.dataset.signedExp;
    const sig = body.dataset.signedSig;
    const captchaEnabled = String(body.dataset.captchaEnabled) === 'true';
    const recaptchaSiteKey = body.dataset.recaptchaSiteKey;

    const baseUrl = `/api/getProfileUrl/${profileId}?exp=${encodeURIComponent(exp)}&sig=${encodeURIComponent(sig)}`;

    if (captchaEnabled) {
      // reCAPTCHA v3
      if (typeof grecaptcha === 'undefined') {
        console.error('grecaptcha non chargé');
        const el = messageEl();
        if (el) { el.textContent = 'Captcha non chargé'; el.classList.add('error'); }
        return;
      }
      grecaptcha.ready(() => {
        grecaptcha.execute(recaptchaSiteKey, { action: 'profile_load' }).then(token => {
          const apiUrl = `${baseUrl}&recaptcha_token=${encodeURIComponent(token)}`;
          fetchWithTimeout(apiUrl)
            .then(async response => {
              if (!response.ok) throw new Error(`Erreur API: ${response.status}`);
              const data = await response.json();
              if (data.error) throw new Error(data.error);
              redirectExternal(data.url);
            })
            .catch(err => {
              console.error(err);
              const el = messageEl();
              if (el) { 
                el.textContent = err.message || 'Impossible de charger le profil.'; 
                el.classList.add('error'); 
              }
            });
        });
      });
    } else {
      // Signature seule
      fetchWithTimeout(baseUrl)
        .then(async response => {
          if (!response.ok) throw new Error(`Erreur API: ${response.status}`);
          const data = await response.json();
          if (data.error) throw new Error(data.error);
          redirectExternal(data.url);
        })
        .catch(err => {
          console.error(err);
          const el = messageEl();
          if (el) { 
            el.textContent = err.message || 'Impossible de charger le profil.'; 
            el.classList.add('error'); 
          }
        });
    }
  };
})();