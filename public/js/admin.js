import { initRangeSelect, initSelector } from './selector.js';
import { initUploader } from './uploader.js';
import { loadLinksList } from './links.js';
import { loadVisitsList } from './visits.js';
import { loadClicksList } from './clicks.js';
import { setupCreateModelPopup } from './createModelPopup.js';
import { setupCreateProfilePopup } from './createProfilePopup.js';
import { setupDeleteModel } from './deleteModel.js';
import { displaySpecificCountryVisits } from './visits.js';
 

let currentModelName = null;

export function setActiveModel(name) {
  if (!name) return;
  currentModelName = name;
  Array.from(document.querySelectorAll('.models-item')).forEach(el => {
    el.classList.toggle('active', el.dataset.name === name);
  });
  const el = document.getElementById('activeModelName');
  if (el) el.textContent = currentModelName ? `${currentModelName}` : 'Sélectionnez un modèle';
}

function attachEvents() {
  Array.from(document.querySelectorAll('.models-item')).forEach(el => {
    el.addEventListener('click', () => {
      setActiveModel(el.dataset.name);
      loadLinksList(currentModelName);
    });
  });
}

window.addEventListener('DOMContentLoaded', () => {
  const first = document.querySelector('.models-item');
  if (first) {
    setActiveModel(first.dataset.name);
    loadLinksList(currentModelName);
  }
  attachEvents();
  initRangeSelect(() => { loadVisitsList(); loadClicksList(); });
  initSelector({
    hiddenId: 'countrySelect',
    buttonId: 'countrySelectBtn',
    listId: 'countrySelectList',
    labelId: 'countrySelectLabel',
    items: [],
    onChange: (val) => { displaySpecificCountryVisits(val); }
  });
  initUploader();
  setupCreateModelPopup();
  setupCreateProfilePopup();
  setupDeleteModel();
  
});


 



