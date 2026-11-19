/* Shared filter bar (Map-UI hotel-system.html style). Styles: css/components.css (.filter-bar …).
   Markup inside a list card:
     <div class="filter-bar">
       <div class="search-input">…main text filter…</div>
       <button class="btn btn-primary" data-filters-go>Search</button>
       <button class="filters-toggle-btn" data-filters-toggle aria-expanded="false">Filters <span class="filters-count" data-filters-count hidden></span> <svg class="chevron">…</svg></button>
       <button class="btn btn-reset" data-filters-reset>Reset</button>
       (page actions with class="push-right")
       <div class="filters-summary" data-filters-summary hidden></div>
       <div class="filters-panel" data-filters-panel hidden> <div class="filter-field"><label>…</label>control</div> … </div>
     </div>
   FilterBar.init(root, { fields, onSearch, onReset }) -> { update(), setOpen(bool) }
     fields: [{ label, isSet() -> bool, text() -> string, clear() }]  (the panel's fields, i.e. what the count + chips cover)
   Behaviour (same as the reference):
     - Nothing filters the list until Search (or Enter in a text box). Search also closes the panel.
     - The count on "Filters" and the chips follow the fields as you change them.
     - Chips show only while the panel is closed; a chip's × clears that field (applies on the next Search).
     - Reset: the page puts every field back to its default and reloads the list right away. */
(function () {
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function init(root, opts) {
    const q = s => root.querySelector(s);
    const panel = q('[data-filters-panel]'), toggle = q('[data-filters-toggle]'), count = q('[data-filters-count]'), summary = q('[data-filters-summary]');
    const isOpen = () => !panel.hidden;

    function update() {
      const set = opts.fields.filter(f => f.isSet());
      count.textContent = set.length; count.hidden = !set.length;
      const showChips = !isOpen() && set.length > 0;
      summary.hidden = !showChips;
      summary.innerHTML = showChips ? set.map(f => `<span class="filter-chip">${esc(f.label)}: ${esc(f.text())}<button type="button" data-chip="${opts.fields.indexOf(f)}" aria-label="Clear ${esc(f.label)} filter">×</button></span>`).join('') : '';
    }
    function setOpen(open) {
      panel.hidden = !open;
      toggle.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
      update();
    }
    function search() { setOpen(false); opts.onSearch(); }

    toggle.addEventListener('click', () => setOpen(!isOpen()));
    q('[data-filters-go]').addEventListener('click', search);
    q('[data-filters-reset]').addEventListener('click', () => { opts.onReset(); update(); });
    summary.addEventListener('click', e => { const b = e.target.closest('[data-chip]'); if (b) { opts.fields[b.dataset.chip].clear(); update(); } });
    root.addEventListener('input', update);
    root.addEventListener('change', update);
    root.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('input[type=text], input[type=search], input:not([type])') && !e.target.readOnly) { e.preventDefault(); search(); } });
    setOpen(false);
    return { update, setOpen };
  }
  window.FilterBar = { init };
})();
