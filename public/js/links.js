import { getLinksByModel, deleteLink } from './api.js';
import { loadVisitsList, displayVisits } from './visits.js';
import { loadClicksList, displayClicks } from './clicks.js';
import { setupConfirmPopup } from './confirmPopup.js';
import { updateSelector } from './selector.js';

let confirmPopupInstance = null;

export async function loadLinksList(currentModelName) {
  const tbody = document.getElementById('linksListBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  if (!currentModelName) return;
  if (!confirmPopupInstance) confirmPopupInstance = setupConfirmPopup();
  try {
    const data = await getLinksByModel(currentModelName);
    const links = Array.isArray(data.links) ? data.links : [];

    

    for (const l of links) {
      const tr = document.createElement('tr');
      const tdSel = document.createElement('td');
      const tdUrl = document.createElement('td');
      const tdMod = document.createElement('td');
      const tdSupp = document.createElement('td');
      const cb = document.createElement('input');

      cb.type = 'checkbox';
      cb.checked = true;
      cb.dataset.tempUrl = l.tempURL;
      cb.dataset.finalUrl = l.finalURL;
      cb.addEventListener('change', () => { 
        displayVisits(); 
        displayClicks();
      });
      tdSel.appendChild(cb);

      const a = document.createElement('a');
      const origin = window.location.origin;
      a.href = `${origin}/${encodeURIComponent(l.tempURL)}`;
      a.textContent = l.tempURL;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      tdUrl.appendChild(a);

      const editBtn = document.createElement('button');
      editBtn.className = 'btn btn-secondary';
      editBtn.textContent = 'Modifier le lien';
      editBtn.addEventListener('click', () => {
        const ev = new CustomEvent('openEditProfile', { detail: { tempURL: l.tempURL } });
        document.dispatchEvent(ev);
      });
      tdMod.appendChild(editBtn);

      const delBtn = document.createElement('button');
      delBtn.className = 'btn btn-danger';
      delBtn.style.marginLeft = '8px';
      delBtn.textContent = 'Supprimer le lien';
      delBtn.addEventListener('click', () => {
        const { open } = confirmPopupInstance || {};
        if (!open) return;
        open({
          title: 'Confirmation',
          content: `Supprimer le lien ${l.tempURL} ?`,
          confirmLabel: 'OK',
          onConfirm: async () => {
            const res = await deleteLink(l.tempURL);
            if (!res.ok) {
              try {
                const j = await res.json();
                if (j && j.error) alert(j.error);
              } catch {}
              return false;
            }
            try {
              await loadLinksList(currentModelName);
            } catch (e) {
              alert('Échec du rafraîchissement');
              return false;
            }
            return true;
          }
        });
      });
      tdSupp.appendChild(delBtn);

      tr.appendChild(tdSel);
      tr.appendChild(tdUrl);
      tr.appendChild(tdMod);
      tr.appendChild(tdSupp);
      tbody.appendChild(tr);
    }

    await loadVisitsList();
    await loadClicksList();
    
    updateSelector({
      hiddenID: 'countrySelect',
      listID: 'countrySelectList',
      labelID: 'countrySelectLabel',
      items: links.map(l => ({ value: l.tempURL, text: l.tempURL })),
      preserveValue: true
    });
  } catch (e) {
    console.error(e);
  }
}
