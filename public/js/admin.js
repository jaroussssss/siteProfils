/* Frontend minimal pour charger profils et stats, et rendre tableaux + graphiques */

let currentModelName = null;
let visits = [];

function $(sel) { return document.querySelector(sel); }
function $all(sel) { return Array.from(document.querySelectorAll(sel)); }

// Initialisation au chargement de la page
window.addEventListener('DOMContentLoaded', () => {
  // Sélectionner le premier modèle par défaut
  const first = document.querySelector('.models-item');
  if (first) {
    setActiveModel(first.dataset.name);
    loadLinksList();
  }
  attachEvents();
});

// Attache les événements aux éléments de la page
function attachEvents() {
  // Sélection modèle
  $all('.models-item').forEach(el => {
    el.addEventListener('click', () => {
      setActiveModel(el.dataset.name);
      loadLinksList();
    //   refresh();
    });
  });

  //Création de lien
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

  const rangeSelect = document.getElementById('rangeSelect');
  if (rangeSelect) {
    rangeSelect.addEventListener('change', () => {
      loadVisitsList();
    });
  }

}

// Met à jour la modèle active et la sélectionne visuellement
function setActiveModel(name) {
    if(!name) return;
    else{
      currentModelName = name;
      // UI active modèle
      $all('.models-item').forEach(el => {
          el.classList.toggle('active', el.dataset.name === name);
      });
      $('#activeModelName').textContent = currentModelName ? `${currentModelName}` : 'Sélectionnez un modèle';
    }
}

// Charge et créé la liste des liens pour le modèle actif
async function loadLinksList() {
    const tbody = $('#linksListBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (!currentModelName) return;

    try {
        const prefix = window.ADMIN_PREFIX || '';
        const res = await fetch(`${prefix}/api/models/${encodeURIComponent(currentModelName)}/links`);
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
            cb.checked = true;
            cb.dataset.tempUrl = l.tempURL;
            cb.addEventListener('change', () => {
              displayVisits();
            });
            tdSel.appendChild(cb);

            const a = document.createElement('a');
            const origin = window.location.origin;
            const full = `${origin}/${encodeURIComponent(l.tempURL)}`;
            a.href = full;
            a.textContent = full;
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
        loadVisitsList();
    } catch (e) {
        console.error(e);
    }
}

async function loadVisitsList() {
    const links = Array.from(document.querySelectorAll('#linksListBody input[type="checkbox"]'))
      .map(cb => cb.dataset.tempUrl)
      .filter(Boolean);

    if (links.length === 0) return;
    const rangeSel = document.getElementById('rangeSelect');
    const range = (rangeSel && rangeSel.value) ? rangeSel.value : 'day';
    try {
      const prefix = window.ADMIN_PREFIX || '';
      const res = await fetch(`${prefix}/api/visits/by-range`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tempURLs: links, range })
      });
      if (!res.ok) throw new Error('API visits failed');
      const data = await res.json();
      window.LAST_VISITS_DATA = data;
      displayVisits();
    } catch (e) {
      console.error(e);
    }
}

function displayVisits() {
  const data = window.LAST_VISITS_DATA;
  if (!data || typeof data !== 'object') return;
  const checked = Array.from(document.querySelectorAll('#linksListBody input[type="checkbox"]'))
    .filter(cb => cb.checked)
    .map(cb => cb.dataset.tempUrl)
    .filter(Boolean);
  if (checked.length === 0) { // Raz du graph et de la table
    const tbody = document.getElementById('linksTableBody');
    if (tbody) tbody.innerHTML = '';
    const canvas = document.getElementById('linksChart');
    if (canvas && window._linksChart) {
      window._linksChart.destroy();
      window._linksChart = null;
    }
    const ctBody = document.getElementById('countriesTableBody');
    if (ctBody) ctBody.innerHTML = '';
    const ctCanvas = document.getElementById('countriesChart');
    if (ctCanvas && window._countriesChart) {
      window._countriesChart.destroy();
      window._countriesChart = null;
    }
    return;
  }

  // Création de la liste du nombre de visites pour chaque lien sélectionné
  const tbody = document.getElementById('linksTableBody');
  if (tbody) {
    tbody.innerHTML = '';
    const totalSum = checked.reduce((acc, u) => acc + ((data[u] && Number(data[u].total)) || 0), 0);
    const origin = window.location.origin;
    for (const u of checked) {
      const info = data[u];
      if (!info) continue;
      const tr = document.createElement('tr');
      const tdLink = document.createElement('td');
      const tdCount = document.createElement('td');
      const tdPct = document.createElement('td');
      const a = document.createElement('a');
      const full = `${origin}/${encodeURIComponent(u)}`;
      a.href = full;
      a.textContent = full;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      tdLink.appendChild(a);
      const c = Number(info.total) || 0;
      tdCount.textContent = String(c);
      const pct = totalSum > 0 ? Math.round((c / totalSum) * 1000) / 10 : 0;
      tdPct.textContent = `${pct}%`;
      tr.appendChild(tdLink);
      tr.appendChild(tdCount);
      tr.appendChild(tdPct);
      tbody.appendChild(tr);
    }
  }

  // Création du graph temporel du nombre de visites pour chaque lien sélectionné
  const canvas = document.getElementById('linksChart');
  if (!canvas) return;
  // Création d'un set avec les légendes (dates) et d'une map avec les data
  const labelSet = new Set();
  const seriesByUrl = new Map();
  for (const u of checked) {
    const info = data[u];
    if (!info || !Array.isArray(info.dataXY)) continue;
    const map = new Map();
    for (const pt of info.dataXY) {
      const key = String(pt.date);
      const v = Number(pt.visits) || 0;
      labelSet.add(key);
      map.set(key, (map.get(key) || 0) + v);
    }
    seriesByUrl.set(u, map);
  }
  const labels = Array.from(labelSet.values()).sort((a, b) => a.localeCompare(b));
  if (labels.length === 0) {
    if (window._linksChart) { window._linksChart.destroy(); window._linksChart = null; }
    return;
  }
  // Préparation des data pour le graph
  const palette = ['#2e86de','#e74c3c','#27ae60','#8e44ad','#f1c40f','#16a085','#d35400','#c0392b','#9b59b6','#1abc9c'];
  const datasets = [];
  let idx = 0;
  for (const u of checked) {
    const map = seriesByUrl.get(u);
    if (!map) continue;
    const values = labels.map(d => map.get(d) || 0);
    const color = palette[idx % palette.length];
    idx++;
    datasets.push({
      label: u,
      data: values,
      borderColor: color,
      backgroundColor: 'transparent',
      fill: false,
      tension: 0.3,
      pointRadius: 0,
      borderWidth: 2,
      spanGaps: true,
    });
  }
  if (window._linksChart) { window._linksChart.destroy(); }
  window._linksChart = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { left: 24, right: 24, top: 24, bottom: 12 } },
      interaction: { mode: 'nearest', intersect: false },
      scales: {
        x: { ticks: { maxTicksLimit: 10, maxRotation: 0, minRotation: 0 }, grid: { color: 'rgba(120,120,120,0.2)' } },
        y: { beginAtZero: true, grid: { color: 'rgba(120,120,120,0.2)' } }
      },
      plugins: {
        legend: { display: true, position: 'bottom' },
        tooltip: { callbacks: { title: (items) => items[0]?.label || '' } }
      }
    }
  });

  // Création de la liste du nombre de visites par pays l'ensemble des liens sélectionnés
  const ctBody = document.getElementById('countriesTableBody');
  if (ctBody) ctBody.innerHTML = '';
  const totals = new Map();
  for (const u of checked) {
    const info = data[u];
    if (!info || !info.totalCountries) continue;
    for (const [name, val] of Object.entries(info.totalCountries)) {
      const c = Number(val) || 0;
      totals.set(name, (totals.get(name) || 0) + c);
    }
  }
  const entries = Array.from(totals.entries()).sort((a, b) => b[1] - a[1]);
  console.log(entries);
  const totalAll = entries.reduce((acc, [, v]) => acc + v, 0);
  if (ctBody) {
    for (const [name, count] of entries) {
      const tr = document.createElement('tr');
      const tdName = document.createElement('td');
      const tdCount = document.createElement('td');
      const tdPct = document.createElement('td');
      tdName.textContent = name;
      tdCount.textContent = String(count);
      const pct = totalAll > 0 ? Math.round((count / totalAll) * 1000) / 10 : 0;
      tdPct.textContent = `${pct}%`;
      tr.appendChild(tdName);
      tr.appendChild(tdCount);
      tr.appendChild(tdPct);
      ctBody.appendChild(tr);
    }
  }

  const ctCanvas = document.getElementById('countriesChart');
  if (!ctCanvas) return;
  const labelsCountries = entries.map(([name]) => name);
  const valuesCountriesPct = entries.map(([, v]) => totalAll > 0 ? (v / totalAll) * 100 : 0);
  if (window._countriesChart) { window._countriesChart.destroy(); }
  const pieColors = ['#2e86de','#e74c3c','#27ae60','#8e44ad','#f1c40f','#16a085','#d35400','#c0392b','#9b59b6','#1abc9c','#7f8c8d','#2980b9','#e67e22','#bdc3c7'];
  window._countriesChart = new Chart(ctCanvas.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: labelsCountries,
      datasets: [{
        data: valuesCountriesPct,
        backgroundColor: labelsCountries.map((_, i) => pieColors[i % pieColors.length]),
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { left: 24, right: 24, top: 24, bottom: 12 } },
      plugins: {
        legend: { display: true, position: 'bottom' },
        tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${ctx.parsed.toFixed(1)}%` } }
      }
    }
  });
}

