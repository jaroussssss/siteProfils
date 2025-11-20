/* Frontend minimal pour charger profils et stats, et rendre tableaux + graphiques */

let currentProfileName = null;
let currentModelName = null;

function $(sel) { return document.querySelector(sel); }
function $all(sel) { return Array.from(document.querySelectorAll(sel)); }

function setActiveModel(name) {
    if(!name) return;
    else{
        currentModelName = name;
        // UI active modèle
        $all('.models-item').forEach(el => {
            el.classList.toggle('active', el.dataset.name === name);
        });
        $('#activeModelName').textContent = currentModelName ? `Modèle actif: ${currentModelName}` : 'Sélectionnez un modèle';
    }
}

function attachEvents() {
  // Sélection modèle
  $all('.models-item').forEach(el => {
    el.addEventListener('click', () => {
      setActiveModel(el.dataset.name);
      loadLinksList();
    //   refresh();
    });
  });

  const createLinkBtn = $('#createLinkBtn');
  if (createLinkBtn) {
    createLinkBtn.addEventListener('click', () => {
      if (!currentModelName) {
        alert('Sélectionnez d’abord un modèle');
        return;
      }
      alert('Création de lien non implémentée dans cette version');
    });
  }

}

window.addEventListener('DOMContentLoaded', () => {
  // Sélectionner le premier modèle par défaut
  const first = document.querySelector('.models-item');
  if (first) {
    setActiveModel(first.dataset.name);
    loadLinksList();
  }
  attachEvents();
});

async function loadLinksList() {
    const tbody = $('#linksListBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (!currentModelName) return;

    try {
        const res = await fetch(`/api/models/${encodeURIComponent(currentModelName)}/links`);
        if (!res.ok) throw new Error('API links failed');
        const data = await res.json();
        const links = Array.isArray(data.links) ? data.links : [];
        for (const l of links) {
            const tr = document.createElement('tr');
            const tdSel = document.createElement('td');
            const tdUrl = document.createElement('td');
            const tdMod = document.createElement('td');
            const tdSupp = document.createElement('td');    
        
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.dataset.tempUrl = l.tempURL;
            tdSel.appendChild(cb);

            const a = document.createElement('a');
            a.href = l.publicURL || l.tempURL;
            a.textContent = l.publicURL || l.tempURL;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            tdUrl.appendChild(a);

            const editBtn = document.createElement('button');
            editBtn.className = 'btn btn-secondary';
            editBtn.textContent = 'Modifier le lien';
            editBtn.addEventListener('click', () => {
                alert('Modification du lien non implémentée dans cette version');
            });
            tdMod.appendChild(editBtn);

            const delBtn = document.createElement('button');
            delBtn.className = 'btn btn-danger';
            delBtn.style.marginLeft = '8px';
            delBtn.textContent = 'Supprimer le lien';
            delBtn.addEventListener('click', () => {
                alert('Suppression du lien non implémentée dans cette version');
            });
            tdSupp.appendChild(delBtn);

            tr.appendChild(tdSel);
            tr.appendChild(tdUrl);
            tr.appendChild(tdMod);
            tr.appendChild(tdSupp);
            tbody.appendChild(tr);
        }
    } catch (e) {
        console.error(e);
    }
}