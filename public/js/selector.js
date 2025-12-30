// Initialisation d'un sélecteur, fonction réelle
function createSelector({ hidden, button, list, label, items, onChange }) {
  if (!hidden || !button || !list || !label) return;

  updateSelectorValues({ hidden, list, label, items });
  setLabelFromHidden({ hidden, list, label });

  button.addEventListener('click', () => {
    const isOpen = list.classList.toggle('open');
    button.setAttribute('aria-expanded', String(isOpen));
    if (isOpen) list.focus();
  });

  list.addEventListener('click', (e) => {
    const li = e.target.closest('li[data-value]');
    if (!li) return;
    hidden.value = li.dataset.value;
    setLabelFromHidden({ hidden, list, label });
    list.classList.remove('open');
    button.setAttribute('aria-expanded', 'false');
    hidden.dispatchEvent(new Event('change', { bubbles: true }));
  });

  document.addEventListener('click', (e) => {
    if (!list.classList.contains('open')) return;
    if (e.target !== button && !button.contains(e.target) && !list.contains(e.target)) {
      list.classList.remove('open');
      button.setAttribute('aria-expanded', 'false');
    }
  });

  list.addEventListener('keydown', (e) => {
    const itemsEls = Array.from(list.querySelectorAll('li'));
    const currentIndex = itemsEls.findIndex(li => li.getAttribute('aria-selected') === 'true');
    if (e.key === 'Escape') {
      list.classList.remove('open');
      button.setAttribute('aria-expanded', 'false');
      button.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = itemsEls[Math.min(currentIndex + 1, itemsEls.length - 1)];
      itemsEls.forEach(li => li.setAttribute('aria-selected', 'false'));
      if (next) next.setAttribute('aria-selected', 'true');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = itemsEls[Math.max(currentIndex - 1, 0)];
      itemsEls.forEach(li => li.setAttribute('aria-selected', 'false'));
      if (prev) prev.setAttribute('aria-selected', 'true');
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const sel = itemsEls.find(li => li.getAttribute('aria-selected') === 'true');
      if (sel) {
        hidden.value = sel.dataset.value;
        setLabelFromHidden({ hidden, list, label });
        list.classList.remove('open');
        button.setAttribute('aria-expanded', 'false');
        hidden.dispatchEvent(new Event('change', { bubbles: true }));
        button.focus();
      }
    }
  });

  if (typeof onChange === 'function') {
    hidden.addEventListener('change', () => { onChange(hidden.value); });
  }
}

// Mise à jour du label en fonction de la valeur du hidden
function setLabelFromHidden({ hidden, list, label }) {
    const opt = hidden.querySelector ? hidden.querySelector(`option[value="${hidden.value}"]`) : null;
    label.textContent = opt ? opt.textContent : hidden.value;
    Array.from(list.querySelectorAll('li')).forEach(li => {
      li.setAttribute('aria-selected', String(li.dataset.value === hidden.value));
    });
}

// Changement des valeurs d'un selecteur, fonction réelle
function updateSelectorValues({ hidden, list, label, items, preserveValue = true }) {
    if (!hidden || !list || !label) return;
  const prev = hidden.value;
  const arr = Array.isArray(items) ? items : [];
  // console.log('prev:', prev);
  // console.log(arr);

  let next = '';
  if (preserveValue && arr.some(i => String(i.value) === String(prev))) {
    next = String(prev);
  } else if (arr.length > 0) {
    next = String(arr[0].value);
  }
  
  hidden.innerHTML = '';
  arr.forEach(({ value, text }) => {
    const opt = document.createElement('option');
    opt.value = String(value);
    opt.textContent = String(text ?? value);
    hidden.appendChild(opt);
  });
  hidden.value = next;

  list.innerHTML = '';
  arr.forEach(({ value, text }) => {
    const li = document.createElement('li');
    li.setAttribute('role', 'option');
    li.dataset.value = String(value);
    li.textContent = String(text ?? value);
    list.appendChild(li);
  });
  
  setLabelFromHidden({ hidden, list, label });
  if (prev !== next) {
    hidden.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

// Initialisation d'un sélecteur, fonction d'appel avec conversion des ID en éléments DOM
export function initSelector({ hiddenId, buttonId, listId, labelId, items, onChange }) {
  const hidden = typeof hiddenId === 'string' ? document.getElementById(hiddenId) : hiddenId;
  const button = typeof buttonId === 'string' ? document.getElementById(buttonId) : buttonId;
  const list = typeof listId === 'string' ? document.getElementById(listId) : listId;
  const label = typeof labelId === 'string' ? document.getElementById(labelId) : labelId;
  createSelector({ hidden, button, list, label, items, onChange });
}

// Initialisation du selecteur de temporralité, contenu statique
export function initRangeSelect(onChange) {
  const items = [
    { value: '24h', text: '24h' },
    { value: '48h', text: '48h' },
    { value: '72h', text: '72h' },
    { value: 'week', text: '1 semaine' },
    { value: 'month', text: '1 mois' },
  ];
  initSelector({ hiddenId: 'rangeSelect', buttonId: 'rangeSelectBtn', listId: 'rangeSelectList', labelId: 'rangeSelectLabel', items, onChange });
}

// Changement des valeurs d'un sélecteur, fonction d'appel avec conversion des ID en éléments DOM
export function updateSelector({ hiddenID, listID, labelID, items, preserveValue = true }) {
  const hidden = typeof hiddenID === 'string' ? document.getElementById(hiddenID) : hiddenID;
  const list = typeof listID === 'string' ? document.getElementById(listID) : listID;
  const label = typeof labelID === 'string' ? document.getElementById(labelID) : labelID;
  updateSelectorValues({ hidden, list, label, items, preserveValue });
}