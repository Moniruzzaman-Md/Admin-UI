/* Searchable dropdown for every <select> (css/select.css). Ported from the Map-UI screens.
   Hides the native select and drives it from a trigger button + a floating panel with a
   search box. Page code keeps using the select: .value / .disabled / "change" all work.
   - <select data-no-search> opts out.
   - <option data-n="7"> shows a count on the right of that option.
   - After changing option text, call select._searchableRefresh(). */
(function () {
  const VALUE = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
  const DISABLED = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'disabled');
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function enhance(select) {
    if (select._searchableEnhanced || select.hasAttribute('data-no-search')) return;
    select._searchableEnhanced = true;

    const wrapper = document.createElement('div');
    wrapper.className = 'searchable-select';
    const cls = select.className;
    select.classList.add('searchable-select-native');
    select.parentNode.insertBefore(wrapper, select);
    wrapper.appendChild(select);

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = (cls + ' searchable-select-trigger').trim();
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    const lbl = select.getAttribute('aria-label') || (select.id && document.querySelector(`label[for="${select.id}"]`)?.textContent.replace('*', '').trim());
    if (lbl) trigger.setAttribute('aria-label', lbl);
    if (select.id) { trigger.id = select.id + '-btn'; document.querySelector(`label[for="${select.id}"]`)?.setAttribute('for', trigger.id); }
    trigger.innerHTML = '<span class="searchable-select-label"></span><svg class="searchable-select-caret" width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    wrapper.appendChild(trigger);
    const label = trigger.querySelector('.searchable-select-label');

    const panel = document.createElement('div');
    panel.className = 'searchable-select-panel';
    panel.innerHTML = '<input type="text" class="searchable-select-search" placeholder="Search..." autocomplete="off" aria-label="Search options"><div class="searchable-select-options" role="listbox"></div>';
    document.body.appendChild(panel);
    const search = panel.querySelector('.searchable-select-search');
    const list = panel.querySelector('.searchable-select-options');

    let visible = [], hi = -1;
    const options = () => Array.from(select.options).filter(o => !o.disabled);

    function syncLabel() {
      const o = select.options[select.selectedIndex];
      label.textContent = o ? o.textContent : '';
      trigger.classList.toggle('placeholder', !o || (!o.value && /^select/i.test(o.textContent)));
    }
    const syncDisabled = () => { trigger.disabled = select.disabled; };

    function render(q) {
      q = q.trim().toLowerCase();
      visible = q ? options().filter(o => o.textContent.toLowerCase().includes(q)) : options();
      list.innerHTML = visible.length
        ? visible.map((o, i) => `<div class="searchable-select-option${o.value === select.value ? ' selected' : ''}" role="option" aria-selected="${o.value === select.value}" data-index="${i}"><span>${esc(o.textContent)}</span>${o.dataset.n != null ? `<span class="opt-n">${esc(o.dataset.n)}</span>` : ''}</div>`).join('')
        : '<div class="searchable-select-empty">No matches found</div>';
      hi = visible.findIndex(o => o.value === select.value);
      highlight();
    }
    function highlight() {
      list.querySelectorAll('.searchable-select-option').forEach((el, i) => el.classList.toggle('highlighted', i === hi));
      list.children[hi]?.scrollIntoView({ block: 'nearest' });
    }
    function position() {
      const r = trigger.getBoundingClientRect();
      panel.style.left = r.left + 'px';
      panel.style.width = r.width + 'px';
      panel.style.top = r.bottom + 4 + 'px';
      const h = panel.offsetHeight;
      if (innerHeight - r.bottom < h + 8 && r.top > h + 8) panel.style.top = r.top - h - 4 + 'px';
    }
    const isOpen = () => panel.classList.contains('open');
    function open() {
      if (select.disabled) return;
      document.querySelectorAll('.searchable-select-panel.open').forEach(p => p !== panel && p._close());
      panel.classList.add('open'); wrapper.classList.add('open'); trigger.setAttribute('aria-expanded', 'true');
      search.value = ''; render(''); position(); search.focus();
    }
    function close() { panel.classList.remove('open'); wrapper.classList.remove('open'); trigger.setAttribute('aria-expanded', 'false'); }
    panel._close = close;
    function choose(o) {
      select.value = o.value; close(); trigger.focus();
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }

    trigger.addEventListener('click', () => (isOpen() ? close() : open()));
    trigger.addEventListener('keydown', e => { if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) { e.preventDefault(); open(); } });
    search.addEventListener('input', () => render(search.value));
    search.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); hi = Math.min(hi + 1, visible.length - 1); highlight(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); hi = Math.max(hi - 1, 0); highlight(); }
      else if (e.key === 'Enter') { e.preventDefault(); if (visible[hi]) choose(visible[hi]); }
      else if (e.key === 'Escape') { e.stopPropagation(); close(); trigger.focus(); }
      else if (e.key === 'Tab') close();
    });
    list.addEventListener('click', e => { const el = e.target.closest('.searchable-select-option'); if (el) choose(visible[+el.dataset.index]); });
    document.addEventListener('click', e => { if (isOpen() && !wrapper.contains(e.target) && !panel.contains(e.target)) close(); });
    addEventListener('scroll', e => { if (isOpen() && !panel.contains(e.target)) close(); }, true);
    addEventListener('resize', () => isOpen() && close());

    // keep the trigger in sync when page code sets .value / .disabled directly (form reset, prefill)
    Object.defineProperty(select, 'value', { configurable: true, get() { return VALUE.get.call(select); }, set(v) { VALUE.set.call(select, v); syncLabel(); } });
    Object.defineProperty(select, 'disabled', { configurable: true, get() { return DISABLED.get.call(select); }, set(v) { DISABLED.set.call(select, v); syncDisabled(); } });
    select.form?.addEventListener('reset', () => setTimeout(syncLabel));
    select._searchableRefresh = () => { syncLabel(); syncDisabled(); };
    syncLabel(); syncDisabled();
  }

  function init() {
    document.querySelectorAll('select').forEach(enhance);
    new MutationObserver(ms => ms.forEach(m => {
      m.addedNodes.forEach(n => { if (n.nodeType !== 1) return; if (n.matches('select')) enhance(n); n.querySelectorAll('select').forEach(enhance); });
      if (m.target.matches?.('select') && m.target._searchableRefresh) m.target._searchableRefresh();
    })).observe(document.body, { childList: true, subtree: true });
  }
  window.SearchableSelect = { enhance, init };
})();
