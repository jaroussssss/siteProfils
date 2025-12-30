let singleton = null;

export function setupConfirmPopup() {
  if (singleton) return singleton;
  const modal = document.getElementById('confirmModal');
  const backdrop = modal ? modal.querySelector('.modal-backdrop') : null;
  const panel = modal ? modal.querySelector('.modal-panel') : null;
  const titleEl = document.getElementById('confirmTitle');
  const contentEl = document.getElementById('confirmContent');
  const closeBtn = document.getElementById('confirmClose');
  const yesBtn = document.getElementById('confirmYes');

  let onConfirm = null;

  function open({ title, content, confirmLabel = 'Oui', onConfirm: onConf }) {
    titleEl.textContent = title || 'Confirmer';
    contentEl.textContent = content || '';
    yesBtn.textContent = confirmLabel || 'Oui';
    onConfirm = typeof onConf === 'function' ? onConf : null;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    panel && panel.classList.add('open');
    setTimeout(() => { yesBtn.focus(); }, 0);
  }

  function close() {
    modal.hidden = true;
    document.body.style.overflow = '';
    panel && panel.classList.remove('open');
    onConfirm = null;
  }

  async function handleConfirm() {
    if (!onConfirm) { close(); return; }
    yesBtn.disabled = true;
    try {
      const res = await onConfirm();
      if (res !== false) close();
    } catch (e) {
    } finally {
      yesBtn.disabled = false;
    }
  }

  closeBtn && closeBtn.addEventListener('click', close);
  if (backdrop) modal.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
  document.addEventListener('keydown', (e) => { if (!modal.hidden && e.key === 'Escape') close(); });
  yesBtn && yesBtn.addEventListener('click', handleConfirm);

  singleton = { open, close };
  return singleton;
}
