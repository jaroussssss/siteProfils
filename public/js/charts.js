export function renderLinksChart(canvas, labels, datasets) {
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
}

export function renderCountriesChart(canvas, labels, values) {
  if (window._countriesChart) { window._countriesChart.destroy(); }
  const pieColors = ['#2e86de','#e74c3c','#27ae60','#8e44ad','#f1c40f','#16a085','#d35400','#c0392b','#9b59b6','#1abc9c','#7f8c8d','#2980b9','#e67e22','#bdc3c7'];
  window._countriesChart = new Chart(canvas.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: labels.map((_, i) => pieColors[i % pieColors.length]),
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

export function renderCountriesChartSpecific(canvas, labels, values) {
  if (window._countriesChartSpecific) { window._countriesChartSpecific.destroy(); }
  const pieColors = ['#2e86de','#e74c3c','#27ae60','#8e44ad','#f1c40f','#16a085','#d35400','#c0392b','#9b59b6','#1abc9c','#7f8c8d','#2980b9','#e67e22','#bdc3c7'];
  window._countriesChartSpecific = new Chart(canvas.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: labels.map((_, i) => pieColors[i % pieColors.length]),
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