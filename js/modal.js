/* Shared modal: one dialog for every confirm / info message in the portal (styles: css/modal.css).

   Modal.open({
     tone:    'danger' | 'warning' | 'info' | 'success'   (icon + colour; default 'info')
     title:   'Delete markup #1061?'
     message: 'Plain text, or HTML when html: true'
     details: [['Label', 'value html'], …]               (optional: a short label / value list of what it's about;
                                                          a null entry starts a second table under the first)
     note:    'This can't be undone.'                     (optional: a highlighted line, e.g. consequences)
     noteTone: 'danger'                                   (optional: colour the note line on its own; default = the modal's tone)
     noteIcon: 'info'                                     (optional: the note's icon, one of the tone names; default 'warning')
     confirm: 'Delete'                                    (main button; omit for an info-only modal with one "OK")
     cancel:  'Cancel'                                    (default 'Cancel'; null = no cancel button)
     width:   640 | '40rem'                               (optional: a wider / narrower modal; a number is px. Default 460px.
                                                          Never wider than the window minus 16px each side)
   }) → Promise<boolean>  — true when the main button was pressed.

   Closes on ✕, Cancel, Esc or a click on the backdrop (→ false). Esc closes only the modal, not a drawer behind it.
   Focus starts on Cancel for 'danger' (the safe choice), otherwise on the main button; it returns to where it was. */
(() => {
  const ICONS = {
    danger: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3"/>',
    warning: '<path d="M12 3l10 18H2L12 3z"/><path d="M12 10v4.5M12 17.5v.5"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.5v.5"/>',
    success: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 9.8"/>',
  };
  const svg = (paths, size = 20) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  let dlg = null;
  function build() {
    dlg = document.createElement('dialog');
    dlg.className = 'modal';
    dlg.setAttribute('aria-labelledby', 'modal-title');
    dlg.setAttribute('aria-describedby', 'modal-message');
    dlg.innerHTML = `
      <button type="button" class="modal-x" aria-label="Close">${svg('<path d="M6 6l12 12M18 6L6 18"/>', 16)}</button>
      <div class="modal-head"><span class="modal-icon"></span><h2 id="modal-title"></h2></div>
      <div class="modal-body"><p id="modal-message"></p><dl class="modal-details"></dl><p class="modal-note"></p></div>
      <div class="modal-foot"><button type="button" class="btn btn-secondary modal-cancel"></button><button type="button" class="btn modal-ok"></button></div>`;
    document.body.append(dlg);
  }

  function open(o = {}) {
    if (!dlg) build();
    const tone = ICONS[o.tone] ? o.tone : 'info';
    const q = s => dlg.querySelector(s);
    dlg.dataset.tone = tone;
    const w = typeof o.width === 'number' ? `${o.width}px` : o.width;
    dlg.style.width = w ? `min(${w}, calc(100vw - 32px))` : '';   // '' = the default width from modal.css
    q('.modal-icon').innerHTML = svg(ICONS[tone]);
    q('#modal-title').textContent = o.title || '';
    const msg = q('#modal-message');
    msg.hidden = !o.message;
    if (o.html) msg.innerHTML = o.message || ''; else msg.textContent = o.message || '';
    const dl = q('.modal-details');
    dl.hidden = !o.details?.length;
    dlg.querySelectorAll('.modal-details.more').forEach(x => x.remove());
    const groups = [[]];
    (o.details || []).forEach(d => d ? groups.at(-1).push(d) : groups.push([]));
    const rows = g => g.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join('');
    dl.innerHTML = rows(groups[0]);
    groups.slice(1).reverse().forEach(g => dl.insertAdjacentHTML('afterend', `<dl class="modal-details more">${rows(g)}</dl>`));
    const note = q('.modal-note');
    note.hidden = !o.note;
    note.dataset.tone = o.noteTone || '';
    note.innerHTML = o.note ? `${svg(ICONS[o.noteIcon] || ICONS.warning, 14)}<span>${esc(o.note)}</span>` : '';
    const ok = q('.modal-ok'), cancel = q('.modal-cancel');
    const infoOnly = !o.confirm;
    ok.textContent = o.confirm || 'OK';
    ok.className = `btn modal-ok ${tone === 'danger' && !infoOnly ? 'btn-danger' : 'btn-primary'}`;
    cancel.hidden = infoOnly || o.cancel === null;
    cancel.textContent = o.cancel || 'Cancel';

    const back = document.activeElement;
    return new Promise(resolve => {
      const done = result => {
        dlg.removeEventListener('click', onClick);
        dlg.removeEventListener('keydown', onKey);
        dlg.removeEventListener('cancel', onCancel);
        dlg.close();
        back?.focus?.();
        resolve(result);
      };
      const onClick = e => {
        if (e.target === dlg || e.target.closest('.modal-x, .modal-cancel')) done(false);
        else if (e.target.closest('.modal-ok')) done(true);
      };
      const onKey = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); done(false); } };
      const onCancel = e => { e.preventDefault(); done(false); };
      dlg.addEventListener('click', onClick);
      dlg.addEventListener('keydown', onKey);
      dlg.addEventListener('cancel', onCancel);
      dlg.showModal();
      (tone === 'danger' && !cancel.hidden ? cancel : ok).focus();
    });
  }

  window.Modal = { open };
})();
