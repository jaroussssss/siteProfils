import { createLink, updateLink, listFiles, deleteFile, listModelLinks, getLink, checkLinkExists } from './api.js';
import { initSelector, updateSelector } from './selector.js';
import { loadLinksList } from './links.js';

export function setupCreateProfilePopup() {
  const openBtn = document.getElementById('createLinkBtn');
  const modal = document.getElementById('createProfileModal');
  const backdrop = modal ? modal.querySelector('.modal-backdrop') : null;
  const iframe = document.getElementById('profilePreview');
  const closeBtn = document.getElementById('createProfileClose');
  const status = document.getElementById('createProfileStatus');
  const saveBtn = document.getElementById('createProfileSave');
  const titleEl = document.getElementById('createProfileTitle');

  const fields = {
    tempURL: document.getElementById('profileTempURL'),
    displayName: document.getElementById('profileDisplayName'),
    picture: document.getElementById('profilePicture'),
    background: document.getElementById('profileBackground'),
    linkOF: document.getElementById('profileLinkOF'),
    titleOF: document.getElementById('profileTitleOF'),
    linkMYM: document.getElementById('profileLinkMYM'),
    titleMYM: document.getElementById('profileTitleMYM'),
    linkIG: document.getElementById('profileLinkIG'),
    titleIG: document.getElementById('profileTitleIG'),
    linkTG: document.getElementById('profileLinkTG'),
    titleTG: document.getElementById('profileTitleTG'),
    countdownHours: document.getElementById('profileCountdownHours'),
    countdownTitle: document.getElementById('profileCountdownTitle'),
  };

  const selects = {
    photos: {
      hidden: document.getElementById('profilePictureSelect'),
      button: document.getElementById('profilePictureSelectBtn'),
      list: document.getElementById('profilePictureSelectList'),
      label: document.getElementById('profilePictureSelectLabel'),
    },
    fonds: {
      hidden: document.getElementById('profileBackgroundSelect'),
      button: document.getElementById('profileBackgroundSelectBtn'),
      list: document.getElementById('profileBackgroundSelectList'),
      label: document.getElementById('profileBackgroundSelectLabel'),
    },
  };
  const delBtns = {
    picture: document.getElementById('delProfilePicture'),
    background: document.getElementById('delProfileBackground'),
  };
  const duplicateSelect = {
    hidden: document.getElementById('duplicateLinkSelect'),
    button: document.getElementById('duplicateLinkSelectBtn'),
    list: document.getElementById('duplicateLinkSelectList'),
    label: document.getElementById('duplicateLinkSelectLabel'),
  };
  const duplicateBtn = document.getElementById('duplicateLinkBtn');
  const duplicateSelectorEl = document.getElementById('duplicateLinkSelector');

  let mode = 'create';
  let editingTempURL = null;

  function urlWithoutProtocol(url) {
    return String(url || '').replace(/^https?:\/\//i, '');
  }

  // Récupère le modèle actif sélectionné
  function getActiveModel() {
    const el = document.getElementById('activeModelName');
    const t = el ? el.textContent || '' : '';
    return t && t !== 'Sélectionnez un modèle' ? t : null;
  }

  // Génère la query string pour le rendu à partir des champs de formulaire
  function queryFromFields() {
    const params = new URLSearchParams();
    params.set('displayName', String(fields.displayName.value || ''));
    params.set('picture', String(fields.picture.value || ''));
    params.set('background', String(fields.background.value || ''));
    params.set('linkOF', urlWithoutProtocol(fields.linkOF.value));
    params.set('titleOF', String(fields.titleOF.value || ''));
    params.set('linkMYM', urlWithoutProtocol(fields.linkMYM.value));
    params.set('titleMYM', String(fields.titleMYM.value || ''));
    params.set('linkIG', urlWithoutProtocol(fields.linkIG.value));
    params.set('titleIG', String(fields.titleIG.value || ''));
    params.set('linkTG', urlWithoutProtocol(fields.linkTG.value));
    params.set('titleTG', String(fields.titleTG.value || ''));
    const h = Number(fields.countdownHours.value || '0');
    params.set('countdownHours', Number.isFinite(h) && h > 0 ? String(Math.floor(h)) : '0');
    params.set('countdownTitle', String(fields.countdownTitle.value || ''));
    return params.toString();
  }

  // Mise a jour du rendu 
  function updatePreview() {
    const prefix = window.ADMIN_PREFIX || '';
    const q = queryFromFields();
    const url = `${prefix}/preview/profile?${q}`;
    if (!iframe) return;
    const onload = () => { iframe.classList.remove('is-loading'); iframe.removeEventListener('load', onload); };
    iframe.addEventListener('load', onload);
    iframe.classList.add('is-loading');
    iframe.src = url;
  }

// Validation asynchrone des champs
  function validateAsync() {
    const tempURL = String(fields.tempURL.value || '').trim();
    const modelName = getActiveModel();
    const background = String(fields.background.value || '').trim();
    if (!modelName) { status.textContent = 'Sélectionnez un modèle'; return Promise.resolve(null); }
    if (!tempURL) { status.textContent = 'URL temporaire requise'; return Promise.resolve(null); }
    if (tempURL.length > 255) { status.textContent = 'URL temporaire trop longue'; return Promise.resolve(null); }
    if (!background) { status.textContent = 'Fond requis'; return Promise.resolve(null); }
    const linksCount = ['linkOF','linkMYM','linkIG','linkTG'].reduce((acc, k) => {
      const v = String((fields[k] && fields[k].value) || '').trim();
      return acc + (v ? 1 : 0);
    }, 0);
    if (linksCount < 1 || linksCount > 3) { status.textContent = 'Entre 1 et 3 liens requis'; return Promise.resolve(null); }
    return checkLinkExists(tempURL).then(data => {
      if (data && data.exists) { status.textContent = 'URL déjà utilisée'; return null; }
      return { tempURL, modelName };
    }).catch(() => ({ tempURL, modelName }));
  }

  // Création du payload de création avec validation des champs
  function payloadAsync() {
    return validateAsync().then(base => {
      if (!base) return null;
      const h = Number(fields.countdownHours.value || '0');
      if (h > 8760) { status.textContent = 'Maximum 8760 heures (1 an)'; return null; }
      return {
        tempURL: base.tempURL,
        modelName: base.modelName,
        displayName: String(fields.displayName.value || '').trim() || null,
        picture: String(fields.picture.value || '').trim(),
        background: String(fields.background.value || '').trim(),
        linkOF: urlWithoutProtocol(fields.linkOF.value),
        linkMYM: urlWithoutProtocol(fields.linkMYM.value),
        linkIG: urlWithoutProtocol(fields.linkIG.value),
        linkTG: urlWithoutProtocol(fields.linkTG.value),
        titleOF: String(fields.titleOF.value || '').trim() || null,
        titleMYM: String(fields.titleMYM.value || '').trim() || null,
        titleIG: String(fields.titleIG.value || '').trim() || null,
        titleTG: String(fields.titleTG.value || '').trim() || null,
        countdownHours: String(fields.countdownHours.value || '0'),
        countdownTitle: String(fields.countdownTitle.value || '').trim() || null,
      };
    });
  }

  // Retour d'un payload vide 
  function emptyPayload() {
    const out = {};
    for (const [k, el] of Object.entries(fields)) {
      out[k] = '';
    }
    return out;
  }

  // Application d'une valeur à un sélecteur
  function applySelectorValue(sel, v) {
    const h = sel.hidden; const l = sel.list; const lab = sel.label;
    if (!h || !l || !lab) return;
    h.value = v || '';
    Array.from(l.querySelectorAll('li')).forEach(li => li.setAttribute('aria-selected', String(li.dataset.value === h.value)));
    const found = l.querySelector(`li[data-value="${CSS.escape(h.value)}"]`);
    lab.textContent = found ? found.textContent : '— Aucune —';
    h.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // Visualisation du payload
  function applyPayload(payload) {
    for (const [k, v] of Object.entries(payload)) {
      const el = fields[k];
      if (el){
        if (k === 'picture' ) applySelectorValue(selects.photos, v);
        else if (k === 'background' ) applySelectorValue(selects.fonds, v);
        else el.value = v;
      } 
    }
  }

  // Creation d'un payload de patch 
  function patchAsync() {
    const modelName = getActiveModel();
    const background = String(fields.background.value || '').trim();
    if (!modelName) { status.textContent = 'Sélectionnez un modèle'; return Promise.resolve(null); }
    if (!background) { status.textContent = 'Fond requis'; return Promise.resolve(null); }
    const linksCount = ['linkOF','linkMYM','linkIG','linkTG'].reduce((acc, k) => {
      const v = String((fields[k] && fields[k].value) || '').trim();
      return acc + (v ? 1 : 0);
    }, 0);
    if (linksCount < 1 || linksCount > 3) { status.textContent = 'Entre 1 et 3 liens requis'; return Promise.resolve(null); }
    const h = Number(fields.countdownHours.value || '0');
    if (h > 8760) { status.textContent = 'Maximum 8760 heures (1 an)'; return Promise.resolve(null); }
    return Promise.resolve({
      displayName: String(fields.displayName.value || '').trim() || null,
      picture: String(fields.picture.value || '').trim(),
      background: String(fields.background.value || '').trim(),
      linkOF: urlWithoutProtocol(fields.linkOF.value),
      linkMYM: urlWithoutProtocol(fields.linkMYM.value),
      linkIG: urlWithoutProtocol(fields.linkIG.value),
      linkTG: urlWithoutProtocol(fields.linkTG.value),
      titleOF: String(fields.titleOF.value || '').trim() || null,
      titleMYM: String(fields.titleMYM.value || '').trim() || null,
      titleIG: String(fields.titleIG.value || '').trim() || null,
      titleTG: String(fields.titleTG.value || '').trim() || null,
      countdownHours: String(fields.countdownHours.value || '0'),
      countdownTitle: String(fields.countdownTitle.value || '').trim() || null,
    });
  }

  // Ouvre la modale en definissant le mode 
  async function open(createMode = true, tempURL = null) {
    status.textContent = '';
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    // Réinitialiser l'état des menus déroulants
    [selects.photos, selects.fonds, duplicateSelect].forEach(sel => {
      if (sel?.list) sel.list.classList.remove('open');
      if (sel?.button) sel.button.setAttribute('aria-expanded', 'false');
    });
    // Remplir sélecteurs via le modèle custom
    const model = getActiveModel();
    if (model) {
      try {
        const [ph, fo, lm] = await Promise.all([
          listFiles('photos', model).catch(() => ({ files: [] })),
          listFiles('fonds', model).catch(() => ({ files: [] })),
          listModelLinks(model).catch(() => ({ links: [] })),
        ]);
        const photoItems = [{ value: '', text: '— Aucune —' }, ...((Array.isArray(ph.files) ? ph.files : []).map(n => ({ value: `/photos/${model}/${n}`, text: n })))];
        const fondItems = [{ value: '', text: '— Aucune —' }, ...((Array.isArray(fo.files) ? fo.files : []).map(n => ({ value: `/fonds/${model}/${n}`, text: n })))];
        const dupItems = [{ value: '', text: '— Choisir un lien —' }, ...((Array.isArray(lm.links) ? lm.links : []).map(o => ({ value: o.tempURL, text: o.tempURL })))];

        const ensureSelector = (sel, items, onChange) => {
          try {
            const initialized = sel?.button && sel.button.dataset?.initialized === '1';
            if (!initialized) {
              initSelector({ hiddenId: sel.hidden, buttonId: sel.button, listId: sel.list, labelId: sel.label, items, onChange });
              if (sel?.button) sel.button.dataset.initialized = '1';
            } else {
              updateSelector({ hiddenID: sel.hidden, listID: sel.list, labelID: sel.label, items, preserveValue: true });
            }
          } catch (e) {}
        };
        ensureSelector(selects.photos, photoItems, (v) => { try { if (fields.picture) fields.picture.value = v || ''; updatePreview(); } catch (e) {} });
        ensureSelector(selects.fonds, fondItems, (v) => { try { if (fields.background) fields.background.value = v || ''; updatePreview(); } catch (e) {} });
        ensureSelector(duplicateSelect, dupItems);
      } catch (e) {
        status.textContent = 'Erreur chargement des fichiers';
      }

      mode = createMode ? 'create' : 'edit';
      if (createMode) {
        try {
          editingTempURL = null;
          applyPayload(emptyPayload());
          if (fields.tempURL) { fields.tempURL.disabled = false; }
          if (titleEl) titleEl.textContent = 'Créer un profil';
        } catch (e) {}
      } else {
        try {
          editingTempURL = tempURL;
          const data = await getLink(editingTempURL);
          if (!data) { status.textContent = 'Lien introuvable'; close(); return; }
          applyPayload({
            tempURL: data.tempURL,
            displayName: data.displayName || '',
            picture: data.picture || '',
            background: data.background || '',
            linkOF: data.linkOF || '',
            titleOF: data.titleOF || '',
            linkMYM: data.linkMYM || '',
            titleMYM: data.titleMYM || '',
            linkIG: data.linkIG || '',
            titleIG: data.titleIG || '',
            linkTG: data.linkTG || '',
            titleTG: data.titleTG || '',
            countdownHours: String(data.countdownHours || '0'),
            countdownTitle: data.countdownTitle || '',
          });
          if (fields.tempURL) { fields.tempURL.disabled = true; }
          if (titleEl) titleEl.textContent = `Modifier le profil ${editingTempURL}`;
        } catch (e) {
          status.textContent = 'Erreur chargement du lien';
        }
      }
      try { updatePreview(); } catch (e) {}
    }
    else close();

  }

  // Ferme la modale
  function close() {
    modal.hidden = true;
    document.body.style.overflow = '';
  }

  // Ouverture en mode création
  openBtn && openBtn.addEventListener('click', open);

  closeBtn && closeBtn.addEventListener('click', close);


  if (backdrop) modal.addEventListener('click', (e) => { if (e.target === backdrop) close(); });


  Object.values(fields).forEach(el => { el && el.addEventListener('change', updatePreview); });


  // Rafraîchir les sélecteurs après import
  document.addEventListener('modelFilesUpdated', async (e) => {
    const model = getActiveModel(); if (!model) return;
    const dir = e?.detail?.dir === 'fonds' ? 'fonds' : 'photos';
    const value = e?.detail?.url || '';
    try {
      const data = await listFiles(dir, model);
      const items = [{ value: '', text: '— Aucune —' }, ...((Array.isArray(data.files) ? data.files : []).map(n => ({ value: dir === 'fonds' ? `/fonds/${model}/${n}` : `/photos/${model}/${n}`, text: n })))];
      const sel = dir === 'fonds' ? selects.fonds : selects.photos;
      if (sel){
        updateSelector({ hiddenID: sel.hidden, listID: sel.list, labelID: sel.label, items, preserveValue: true });
        applySelectorValue(sel, value);
      }
    } catch {}
  });

  // Boutons de suppression des photos
  delBtns.picture && delBtns.picture.addEventListener('click', async () => {
    const v = String(fields.picture.value || '').trim();

    if (!v) { status.textContent = 'Sélectionnez une photo à supprimer'; return; }

    const m = v.match(/^\/(photos|fonds)\/([^\/]+)\/(.+)$/);
    if (!m) { status.textContent = 'Sélection invalide'; return; }

    const dir = m[1]; const model = m[2]; const name = m[3];
    try {
      const res = await deleteFile(dir, name, model);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        status.textContent = j?.error || 'Échec de la suppression';
        return;
      }

      const h = selects.photos.hidden; if (h) h.value = '';
      const l = selects.photos.list; if (l) Array.from(l.querySelectorAll('li')).forEach(li => li.setAttribute('aria-selected', String(li.dataset.value === '')));
      const lab = selects.photos.label; if (lab) lab.textContent = '— Aucune —';
      if (fields.picture) fields.picture.value = '';
      updatePreview();
      status.textContent = '';
      const ev = new CustomEvent('modelFilesUpdated', { detail: { dir } });
      document.dispatchEvent(ev);
    } catch (e) {
      status.textContent = 'Erreur réseau';
    }
  });
  
  delBtns.background && delBtns.background.addEventListener('click', async () => {
    const v = String(fields.background.value || '').trim();
    if (!v) { status.textContent = 'Sélectionnez une image à supprimer'; return; }
    const m = v.match(/^\/(photos|fonds)\/([^\/]+)\/(.+)$/);
    if (!m) { status.textContent = 'Sélection invalide'; return; }
    const dir = m[1]; const model = m[2]; const name = m[3];
    try {
      const res = await deleteFile(dir, name, model);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        status.textContent = j?.error || 'Échec de la suppression';
        return;
      }
      const h = selects.fonds.hidden; if (h) h.value = '';
      const l = selects.fonds.list; if (l) Array.from(l.querySelectorAll('li')).forEach(li => li.setAttribute('aria-selected', String(li.dataset.value === '')));
      const lab = selects.fonds.label; if (lab) lab.textContent = '— Aucune —';
      if (fields.background) fields.background.value = '';
      updatePreview();
      status.textContent = '';
      const ev = new CustomEvent('modelFilesUpdated', { detail: { dir } });
      document.dispatchEvent(ev);
    } catch (e) {
      status.textContent = 'Erreur réseau';
    }
  });

  // Sauvegarde du lien ou modification d'un lien en fonction du mode défini à l'ouverture 
  saveBtn && saveBtn.addEventListener('click', async () => {
    if (mode === 'create') {
      const p = await payloadAsync();
      if (!p) return;
      status.textContent = ‘Enregistrement en cours…’;
      saveBtn.disabled = true;
      saveBtn.classList.add(‘is-loading’);
      try {
        const res = await createLink(p);
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          status.textContent = j?.error || ‘Échec de l’enregistrement’;
          return;
        }
        close();
        const m = getActiveModel();
        if (m) loadLinksList(m);
      } catch (e) {
        status.textContent = ‘Erreur réseau’;
      } finally {
        saveBtn.disabled = false;
        saveBtn.classList.remove(‘is-loading’);
      }
    } else {
      const patch = await patchAsync();
      if (!patch) return;
      status.textContent = 'Mise à jour en cours…';
      saveBtn.disabled = true;
      saveBtn.classList.add('is-loading');
      try {
        const res = await updateLink(editingTempURL, patch);
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          status.textContent = j?.error || 'Échec de la mise à jour';
          return;
        }
        close();
        const m = getActiveModel();
        if (m) loadLinksList(m);
      } catch (e) {
        status.textContent = 'Erreur réseau';
      } finally {
        saveBtn.disabled = false;
        saveBtn.classList.remove('is-loading');
      }
    }
  });

  // Dupliquer un lien existant (copie champs sauf URL)
  let isLoadingDuplicate = false;
  duplicateBtn && duplicateBtn.addEventListener('click', async () => {
    if (isLoadingDuplicate) return; isLoadingDuplicate = true;
    const model = getActiveModel();
    if (!model) { status.textContent = 'Sélectionnez un modèle'; isLoadingDuplicate = false; return; }
    const temp = duplicateSelect.hidden ? duplicateSelect.hidden.value : '';
    if (!temp) { applyPayload(emptyPayload()); updatePreview(); isLoadingDuplicate = false; return; }
    status.textContent = 'Chargement du lien…';
    try {
      const data = await getLink(temp);
      if (data.modelName && data.modelName !== model) {
        status.textContent = `Le lien appartient au modèle ${data.modelName}`;
        return;
      }
      data.tempURL = ''; // Vider l'URL pour forcer la saisie d'une nouvelle
      if (fields.tempURL) fields.tempURL.value = '';
      applyPayload(data);
      updatePreview();
      status.textContent = 'Profil dupliqué — saisissez une nouvelle URL et enregistrez.';
    } catch (e) {
      status.textContent = 'Erreur réseau';
    } finally {
      isLoadingDuplicate = false;
    }
  });

  // Ouverture en mode modification 
  document.addEventListener('openEditProfile', async (e) => {
    try {
      const temp = e && e.detail && e.detail.tempURL;
      if (typeof temp === 'string' && temp.length > 0) await open(false, temp);
    } catch (err) {
      status.textContent = 'Erreur ouverture édition';
    }
  });
}
