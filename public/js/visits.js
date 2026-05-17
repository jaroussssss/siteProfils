import { getVisitsByRange } from './api.js';
import { renderLinksChart, renderCountriesChart, renderCountriesChartSpecific } from './charts.js';

let visitsRequestId = 0;

// Charge la liste de toutes les visites de la temporailité et appelle les fonctions d'affichage
export async function loadVisitsList() {
  const myId = ++visitsRequestId;
  const links = Array.from(document.querySelectorAll('#linksListBody input[type="checkbox"]'))
    .map(cb => cb.dataset.tempUrl)
    .filter(Boolean);

  try {
    if (links.length !== 0){
      const rangeSel = document.getElementById('rangeSelect');
      const range = (rangeSel && rangeSel.value) ? rangeSel.value : 'day';
      const data = await getVisitsByRange(links, range);
      if (myId !== visitsRequestId) return;
      window.LAST_VISITS_DATA = data;
    } else {
      if (myId !== visitsRequestId) return;
      window.LAST_VISITS_DATA = {};
    }
    displayVisits();
    displayTopVisits();
    
    // Update specific chart if a value is selected
    const countrySelect = document.getElementById('countrySelect');
    if (countrySelect && countrySelect.value) {
      displaySpecificCountryVisits(countrySelect.value);
    }
  } catch (e) {
    console.error(e);
  }
}

// Affichage des visites en fonction des liens sélectionnés 
export function displayVisits() {
  try{
    const data = window.LAST_VISITS_DATA;
    if (!data || typeof data !== 'object') return;
    const checked = Array.from(document.querySelectorAll('#linksListBody input[type="checkbox"]'))
      .filter(cb => cb.checked)
      .map(cb => cb.dataset.tempUrl)
      .filter(Boolean);
    // Reset si vide
    if (checked.length === 0) {
      const tbody = document.getElementById('linksTableBody');
      if (tbody) tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:16px;color:var(--muted)">Aucun lien sélectionné</td></tr>';
      const canvas = document.getElementById('linksChart');
      if (canvas && window._linksChart) { window._linksChart.destroy(); window._linksChart = null; }
      const ctBody = document.getElementById('countriesTableBody');
      if (ctBody) ctBody.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:16px;color:var(--muted)">Aucun lien sélectionné</td></tr>';
      const ctCanvas = document.getElementById('countriesChart');
      if (ctCanvas && window._countriesChart) { window._countriesChart.destroy(); window._countriesChart = null; }
      return;
    }

    // Table Visites par lien 
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
        const href = `${origin}/${encodeURIComponent(u)}`;
        a.href = href;
        a.textContent = u;
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

    // Graph temporel visites par lien
    const canvas = document.getElementById('linksChart');
    if (!canvas) return;
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
    if (labels.length === 0) { if (window._linksChart) { window._linksChart.destroy(); window._linksChart = null; } return; }
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
    renderLinksChart(canvas, labels, datasets);

    // Table Visites par pays
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
    renderCountriesChart(ctCanvas, labelsCountries, valuesCountriesPct);
  }
  catch (e) {
    console.error(e);
  }
}

// Affichage des top visites, indépendament des liens sélectionnés
function displayTopVisits() {
  const tvBody = document.getElementById('topVisitsTableBody');
  try {
    if (tvBody) {
      tvBody.innerHTML = '';
      const allData = window.LAST_VISITS_DATA || {};
      const origin = window.location.origin;
      const topList = Object.entries(allData)
        .map(([u, info]) => ({ href: `${origin}/${encodeURIComponent(u)}`, count: Number(info?.total) || 0 }))
      topList.sort((a, b) => b.count - a.count);
      const items = topList.slice(0, 11);
      for (const it of items) {
        const tr = document.createElement('tr');
        const tdLink = document.createElement('td');
        const tdCount = document.createElement('td');
        const a = document.createElement('a');
        a.href = it.href;
        a.textContent = it.href.includes('/') ? it.href.slice(it.href.lastIndexOf('/') + 1) : it.href;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        tdLink.appendChild(a);
        tdCount.textContent = String(it.count);
        tr.appendChild(tdLink);
        tr.appendChild(tdCount);
        tvBody.appendChild(tr);
      }
    }
  } catch (e) {
    console.error(e);
  }
}

// Affichage des visites par pays pour un lien spécifique
export function displaySpecificCountryVisits(tempURL) {
  try {
    const data = window.LAST_VISITS_DATA;
    if (!data || !tempURL) return;

    const info = data[tempURL];
    const ctCanvas = document.getElementById('countriesChartSpecific');
    
    if (!ctCanvas) return;
    
    if (!info || !info.totalCountries) {
      if (window._countriesChartSpecific) { 
        window._countriesChartSpecific.destroy(); 
        window._countriesChartSpecific = null; 
      }
      return;
    }

    const totals = new Map();
    for (const [name, val] of Object.entries(info.totalCountries)) {
      const c = Number(val) || 0;
      totals.set(name, c);
    }
    
    const entries = Array.from(totals.entries()).sort((a, b) => b[1] - a[1]);
    const totalAll = entries.reduce((acc, [, v]) => acc + v, 0);

    const labelsCountries = entries.map(([name]) => name);
    const valuesCountriesPct = entries.map(([, v]) => totalAll > 0 ? (v / totalAll) * 100 : 0);
    
    renderCountriesChartSpecific(ctCanvas, labelsCountries, valuesCountriesPct);
  } catch (e) {
    console.error(e);
  }
}
