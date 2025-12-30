import { uploadImage } from './api.js';

export function initUploader() {
  const drop = document.getElementById('uploaderDrop');
  const input = document.getElementById('uploaderInput');
  const targetPhotos = document.getElementById('uploaderTargetPhotos');
  const targetFonds = document.getElementById('uploaderTargetFonds');
  const profileStatus = document.getElementById('createProfileStatus');
  if (!drop || !input) return;
  const allowed = ['image/jpeg','image/png','image/gif'];
  const maxSize = 5 * 1024 * 1024;
  
  // MAJ du statut si erreur 
  function setError(t) { if (profileStatus) profileStatus.textContent = t; }
  
  // Validation des fichiers
  function validate(fs) {
    const out = [];
    for (const f of fs) {
      if (!allowed.includes(f.type)) { setError('Type non supporté'); continue; }
      if (f.size > maxSize) { setError('Fichier trop lourd'); continue; }
      out.push(f);
    }
    return out;
  }

  // Upload avec création d'un événement 'modelFilesUpdated' pour mettre à jour le sélecteur
  async function upload(fs) {
    const target = (targetFonds && targetFonds.checked) ? 'fonds' : 'photos';
    const activeLabel = document.getElementById('activeModelName');
    const modelName = activeLabel ? (activeLabel.textContent || '').trim() : '';
    let lastUrl = '';
    for (const f of fs) {
      const fd = new FormData();
      fd.append('image', f, f.name);
      fd.append('target', target);
      if (modelName && modelName !== 'Sélectionnez un modèle') {
        fd.append('modelName', modelName);
      }
      try {
        const res = await uploadImage(fd);
        if (!res.ok) {
          setError(res.status === 413 ? 'Fichier trop lourd' : 'Échec du transfert');
        }
        else {
          const j = await res.json().catch(() => ({}));
          lastUrl = j?.publicUrl || lastUrl;
        }
      } catch (err) {
        setError('Erreur réseau');
      }
    }
    const ev = new CustomEvent('modelFilesUpdated', { detail: { dir: target, url: lastUrl } });
    document.dispatchEvent(ev);
  }

  
  input.addEventListener('change', () => {
    const files = validate(Array.from(input.files));
    if (files.length > 0) upload(files);
  });
  ['dragenter','dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('dragover'); }));
  ['dragleave','drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('dragover'); }));
  
  drop.addEventListener('drop', e => {
    const dt = e.dataTransfer;
    const files = dt ? Array.from(dt.files) : [];
    const valid = validate(files);
    if (valid.length > 0) upload(valid);
  });
}
