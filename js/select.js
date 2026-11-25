/* Searchable dropdown for every <select> (css/select.css). Ported from the Map-UI screens.
   Hides the native select and drives it from a trigger button + a floating panel with a
   search box. Page code keeps using the select: .value / .disabled / "change" all work.
   - <select data-no-search> opts out.
   - <option data-n="7"> shows a count on the right of that option.
   - After changing option text, call select._searchableRefresh().
   - <option data-short="…">: the field shows that once the option is chosen; <select data-panel-width="240">: list at least that wide.
   - <select multiple>: options toggle (the panel stays open), the trigger shows "N selected" and the
     chosen options show as removable chips under it. Set option.selected from page code, then call
     select._searchableRefresh(). "change" fires on every toggle. data-unit="market" → "3 markets". */
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

    const multi = select.multiple;
    let chips = null;
    if (multi) {
      wrapper.classList.add('multi'); panel.classList.add('multi');
      chips = document.createElement('div');
      chips.className = 'searchable-select-chips';
      wrapper.appendChild(chips);
      chips.addEventListener('click', e => {
        const b = e.target.closest('[data-rm]'); if (!b) return;
        select.options[+b.dataset.rm].selected = false; syncLabel();
        select.dispatchEvent(new Event('change', { bubbles: true }));
        (chips.querySelector('[data-rm]') || trigger).focus();
      });
    }
    const isSel = o => multi ? o.selected : o.value === select.value;

    function syncLabel() {
      if (multi) {
        const sel = Array.from(select.selectedOptions);
        const unit = select.dataset.unit;
        label.textContent = sel.length === 1 ? sel[0].textContent
          : sel.length ? `${sel.length} ${unit ? unit + 's' : ''} selected`.replace('  ', ' ') : (select.getAttribute('placeholder') || 'Select');
        trigger.classList.toggle('placeholder', !sel.length);
        chips.innerHTML = sel.map(o => `<span class="ss-chip">${esc(o.textContent)}<button type="button" data-rm="${o.index}" aria-label="Remove ${esc(o.textContent)}"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg></button></span>`).join('');
        chips.hidden = !sel.length;
        return;
      }
      const o = select.options[select.selectedIndex];
      label.textContent = o ? (o.value && o.dataset.short) || o.textContent : '';   // data-short: shorter text once chosen (e.g. "+60" for "+60 Malaysia")
      // grey when nothing is chosen: a "Select …" option, or an empty option marked data-placeholder (e.g. a filter named after its field)
      trigger.classList.toggle('placeholder', !o || (!o.value && (/^select/i.test(o.textContent) || 'placeholder' in o.dataset)));
    }
    const syncDisabled = () => { trigger.disabled = select.disabled; };

    function render(q) {
      q = q.trim().toLowerCase();
      visible = q ? options().filter(o => o.textContent.toLowerCase().includes(q)) : options();
      list.innerHTML = visible.length
        ? visible.map((o, i) => `<div class="searchable-select-option${isSel(o) ? ' selected' : ''}" role="option" aria-selected="${isSel(o)}" data-index="${i}">${multi ? '<span class="ss-check" aria-hidden="true"></span>' : ''}<span class="ss-text">${esc(o.textContent)}</span>${o.dataset.n != null ? `<span class="opt-n">${esc(o.dataset.n)}</span>` : ''}</div>`).join('')
        : '<div class="searchable-select-empty">No matches found</div>';
      if (multi) list.setAttribute('aria-multiselectable', 'true');
      hi = multi ? Math.min(Math.max(hi, 0), visible.length - 1) : visible.findIndex(o => o.value === select.value);
      highlight();
    }
    function highlight() {
      list.querySelectorAll('.searchable-select-option').forEach((el, i) => el.classList.toggle('highlighted', i === hi));
      // scroll only the option list (scrollIntoView would also scroll the page / drawer behind the panel)
      const el = list.children[hi];
      if (el) {
        if (el.offsetTop < list.scrollTop) list.scrollTop = el.offsetTop;
        else if (el.offsetTop + el.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = el.offsetTop + el.offsetHeight - list.clientHeight;
      }
    }
    function position() {
      const r = trigger.getBoundingClientRect();
      panel.style.left = r.left + 'px';
      panel.style.width = Math.max(r.width, +(select.dataset.panelWidth || 0)) + 'px';   // data-panel-width: a wider list than the field
      panel.style.top = r.bottom + 4 + 'px';
      const h = panel.offsetHeight;
      if (innerHeight - r.bottom < h + 8 && r.top > h + 8) panel.style.top = r.top - h - 4 + 'px';
    }
    const isOpen = () => panel.classList.contains('open');
    function open() {
      if (select.disabled) return;
      document.querySelectorAll('.searchable-select-panel.open').forEach(p => p !== panel && p._close());
      panel.classList.add('open'); wrapper.classList.add('open'); trigger.setAttribute('aria-expanded', 'true');
      search.value = ''; hi = 0; render(''); position(); search.focus();
    }
    function close() { panel.classList.remove('open'); wrapper.classList.remove('open'); trigger.setAttribute('aria-expanded', 'false'); }
    panel._close = close;
    function choose(o) {
      if (multi) {
        o.selected = !o.selected; hi = visible.indexOf(o); syncLabel(); render(search.value); position();
        select.dispatchEvent(new Event('change', { bubbles: true }));
        return;
      }
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
    // composedPath: a multi-select re-renders its options on click, so e.target may already be detached
    document.addEventListener('click', e => { const path = e.composedPath(); if (isOpen() && !path.includes(wrapper) && !path.includes(panel)) close(); });
    // page / drawer scroll: the panel follows its trigger (stays open, so multi-select picking isn't interrupted);
    // it closes only once the trigger has scrolled out of view
    addEventListener('scroll', e => {
      if (!isOpen() || panel.contains(e.target)) return;
      const r = trigger.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) close(); else position();
    }, true);
    addEventListener('resize', () => isOpen() && close());

    // keep the trigger in sync when page code sets .value / .disabled directly (form reset, prefill)
    Object.defineProperty(select, 'value', { configurable: true, get() { return VALUE.get.call(select); }, set(v) { VALUE.set.call(select, v); syncLabel(); } });
    Object.defineProperty(select, 'disabled', { configurable: true, get() { return DISABLED.get.call(select); }, set(v) { DISABLED.set.call(select, v); syncDisabled(); } });
    select.form?.addEventListener('reset', () => setTimeout(syncLabel));
    select._searchableRefresh = () => { syncLabel(); syncDisabled(); if (isOpen()) render(search.value); };
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
