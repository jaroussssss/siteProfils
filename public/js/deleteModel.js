import { deleteModel } from './api.js';
import { setupConfirmPopup } from './confirmPopup.js';

export function setupDeleteModel() {
  const { open } = setupConfirmPopup();
  const list = document.getElementById('modelsList');
  if (!list) return;

  list.addEventListener('click', (e) => {
    const btn = e.target && e.target.closest('.delete-model-btn');
    if (!btn) return;
    e.stopPropagation();
    e.preventDefault();
    const name = btn.getAttribute('data-name') || '';
    if (!name) return;
    open({
      title: 'Confirmation',
      content: `Supprimer ${name} ?`,
      confirmLabel: 'Oui',
      onConfirm: async () => {
        const res = await deleteModel(name);
        if (!res.ok) {
          try {
            const j = await res.json();
            if (j && j.error) alert(j.error);
          } catch {}
          return false;
        }
        const activeEl = document.querySelector('.models-item.active');
        const li = list.querySelector(`.models-item[data-name="${CSS.escape(name)}"]`);
        if (li) li.remove();
        const activeName = activeEl ? activeEl.dataset.name : null;
        if (activeName === name) {
          const first = list.querySelector('.models-item');
          if (first) {
            first.click();
          } else {
            const label = document.getElementById('activeModelName');
            if (label) label.textContent = 'Sélectionnez un modèle';
          }
        }
        return true;
      }
    });
  }, { capture: true }); // Empeche la sélection de l'élément parent
}
