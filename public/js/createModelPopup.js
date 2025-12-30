import { createModel } from './api.js';
import { loadLinksList } from './links.js';
import { setActiveModel } from './admin.js';

export function setupCreateModelPopup() {
  const openBtn = document.getElementById('createModelBtn');
  const modal = document.getElementById('createModelModal');
  const backdrop = modal ? modal.querySelector('.modal-backdrop') : null;
  const input = document.getElementById('createModelInput');
  const status = document.getElementById('createModelStatus');
  const ok = document.getElementById('createModelOk');
  const closeBtn = document.getElementById('createModelClose');
  if (!openBtn || !modal || !input || !status || !ok || !closeBtn) return;

  function open() {
    status.textContent = '';
    input.value = '';
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(() => { input.focus(); }, 0);
  }

  function close() {
    modal.hidden = true;
    document.body.style.overflow = '';
  }

  openBtn.addEventListener('click', open);

  closeBtn.addEventListener('click', close);

  if (backdrop) modal.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
  
  document.addEventListener('keydown', (e) => { if (!modal.hidden && e.key === 'Escape') close(); else if (!modal.hidden && e.key === 'Enter') { e.preventDefault(); ok.click(); } });
  
  ok.addEventListener('click', async () => {
    const name = String(input.value || '').trim();
    if (!name) { status.textContent = 'Nom requis'; return; }
    if (name.length > 255) { status.textContent = 'Nom trop long'; return; }
    status.textContent = 'Création en cours…';
    try {
      const res = await createModel(name);
      if (!res.ok) {
        if (res.status === 409) { status.textContent = 'Nom du modèle déjà pris'; return; }
        const j = await res.json().catch(() => ({}));
        status.textContent = j?.error || 'Échec de la création';
        return;
      }
      close();
      const list = document.getElementById('modelsList');
      if (list) {
        const li = document.createElement('li');
        li.className = 'models-item';
        li.dataset.name = name;
        const span = document.createElement('span');
        span.className = 'models-name';
        span.textContent = name;
        const del = document.createElement('button');
        del.className = 'icon-btn delete-model-btn';
        del.setAttribute('aria-label', `Supprimer ${name}`);
        del.title = 'Supprimer';
        del.dataset.name = name;
        del.textContent = '🗑️';
        li.appendChild(span);
        li.appendChild(del);
        li.addEventListener('click', () => { setActiveModel(name); loadLinksList(name); });
        list.appendChild(li);
      }
      setActiveModel(name);
      loadLinksList(name);
    } catch (e) {
      status.textContent = 'Erreur réseau';
    }
  });
}
