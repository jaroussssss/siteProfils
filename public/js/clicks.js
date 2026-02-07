import { getClicksByRange } from './api.js';
import { renderClicksChart} from './charts.js';

// Charge la liste de toutes les visites de la temporailité et appelle les fonctions d'affichage
export async function loadClicksList() {
  const links = Array.from(document.querySelectorAll('#linksListBody input[type="checkbox"]'))
    .map(cb => cb.dataset.finalUrl)
    .filter(Boolean);
  
  try {
    if (links.length !== 0){
      const rangeSel = document.getElementById('rangeSelect');
      const range = (rangeSel && rangeSel.value) ? rangeSel.value : 'day';
      const data = await getClicksByRange(links, range);
      window.LAST_CLICKS_DATA = data;
    } else {
      window.LAST_CLICKS_DATA = {};
    }
    displayClicks();
    
    // Update specific chart if a value is selected
    const clickSelect = document.getElementById('clickSelect');
    if (clickSelect && clickSelect.value) {
      displaySpecificClicks(clickSelect.value);
    }
  } catch (e) {
    console.error(e);
  }
}

// Affichage des visites en fonction des liens sélectionnés 
export function displayClicks() {
  try{
    const data = window.LAST_CLICKS_DATA;
    if (!data || typeof data !== 'object') return;
    const checked = Array.from(document.querySelectorAll('#linksListBody input[type="checkbox"]'))
      .filter(cb => cb.checked)
      .map(cb => cb.dataset.finalUrl)
      .filter(Boolean);
    // Reset si vide
    if (checked.length === 0) {
      const clickBody = document.getElementById('clicksTableBody');
      if (clickBody) clickBody.innerHTML = '';
      const clickCanvas = document.getElementById('clicksChart');
      if (clickCanvas && window._clickChart) { window._clickChart.destroy(); window._clickChart = null; }
      return;
    }

    // Clicks par type 
    const clickBody = document.getElementById('clicksTableBody');
    if (clickBody) clickBody.innerHTML = '';
    let totals = [0, 0, 0, 0];
    for (const u of checked) {
      totals[0] += data[u]['OF'];
      totals[1] += data[u]['MY'];
      totals[2] += data[u]['IG'];
      totals[3] += data[u]['TG'];
    }
    const totalAll = totals[0] + totals[1] + totals[2] + totals[3];

    const type = ['OnlyFans', 'MYM', 'Instagram', 'Telegram'];  
    if (clickBody) {
      for (let i = 0; i < 4; i++) {
        const tr = document.createElement('tr');
        const tdName = document.createElement('td');
        const tdCount = document.createElement('td');
        const tdPct = document.createElement('td');
        tdName.textContent = type[i];
        tdCount.textContent = String(totals[i]);
        const pct = totalAll > 0 ? Math.round((totals[i] / totalAll) * 1000) / 10 : 0;
        tdPct.textContent = `${pct}%`;
        tr.appendChild(tdName);
        tr.appendChild(tdCount);
        tr.appendChild(tdPct);
        clickBody.appendChild(tr);
      }
    }

    const clickCanvas = document.getElementById('clicksChart');
    if (!clickCanvas) return;
    const entries = [[type[0], totals[0]], [type[1], totals[1]], [type[2], totals[2]], [type[3], totals[3]]];
    const labelsClicks = entries.map(([name]) => name);
    const valuesClicksPct = entries.map(([, v]) => totalAll > 0 ? (v / totalAll) * 100 : 0);
    renderClicksChart(clickCanvas, labelsClicks, valuesClicksPct);
  }
  catch (e) {
    console.error(e);
  }
}


// // Affichage des visites par pays pour un lien spécifique
// export function displaySpecificCountryVisits(tempURL) {
//   try {
//     const data = window.LAST_VISITS_DATA;
//     if (!data || !tempURL) return;

//     const info = data[tempURL];
//     const ctCanvas = document.getElementById('countriesChartSpecific');
    
//     if (!ctCanvas) return;
    
//     if (!info || !info.totalCountries) {
//       if (window._countriesChartSpecific) { 
//         window._countriesChartSpecific.destroy(); 
//         window._countriesChartSpecific = null; 
//       }
//       return;
//     }

//     const totals = new Map();
//     for (const [name, val] of Object.entries(info.totalCountries)) {
//       const c = Number(val) || 0;
//       totals.set(name, c);
//     }
    
//     const entries = Array.from(totals.entries()).sort((a, b) => b[1] - a[1]);
//     const totalAll = entries.reduce((acc, [, v]) => acc + v, 0);

//     const labelsCountries = entries.map(([name]) => name);
//     const valuesCountriesPct = entries.map(([, v]) => totalAll > 0 ? (v / totalAll) * 100 : 0);
    
//     renderCountriesChartSpecific(ctCanvas, labelsCountries, valuesCountriesPct);
//   } catch (e) {
//     console.error(e);
//   }
// }
