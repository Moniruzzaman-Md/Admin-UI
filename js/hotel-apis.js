/* Supplier List page prototype (hotel-apis.html). Dummy data only. */
(function () {
  const CURRENCIES = HotelApis.CURRENCIES;
  const apis = HotelApis.list;   // shared + saved (js/data.js)
  // small "Temp" pill shown after a temporary supplier's name (list, history)
  const TEMP_TAG = '<span class="tbl-tag warn" title="Temporary supplier"><span aria-hidden="true">Temp</span><span class="visually-hidden">Temporary</span></span>';

  /* ---------- helpers ---------- */
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // reusable-table cells: status pill + on/off flag
  const status = on => `<span class="tbl-status ${on ? 'on' : 'off'}">${on ? 'Active' : 'Inactive'}</span>`;
  const flag = (on, sub) => `<span class="tbl-flag ${on ? 'on' : 'off'}">${on ? 'Enabled' : 'Disabled'}${on && sub ? `<span class="tbl-flag-sub">${esc(sub)}</span>` : ''}</span>`;
  const holdLabel = a => a.hold && a.holdAmount != null ? (a.holdType === 'percent' ? `${a.holdAmount}%` : `${a.holdAmount} ${a.currency}`) : '';
  const toast = msg => { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2400); };

  /* ---------- filters + table ---------- */
  const state = { q: '', currency: '', status: '', page: 1, size: 20 };
  const cur = $('#f-currency');
  CURRENCIES.forEach(c => cur.add(new Option(c, c)));

  const matchesQC = a => {
    const q = state.q.trim().toLowerCase();
    return (!q || [a.name, a.code, a.ref, a.short].some(v => v.toLowerCase().includes(q))) && (!state.currency || a.currency === state.currency);
  };
  // latest first: newest API (highest id = created last) at the top (the reusable table has no column sorting)
  const filtered = () => apis.filter(a => matchesQC(a) && (!state.status || (state.status === 'active') === a.active)).sort((a, b) => b.id - a.id);

  // page buttons: all when <= 7, otherwise 1 … around-current … last (portal uses .pagination__ellipsis)
  function pageList(page, pages) {
    if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
    const set = new Set([1, pages, page - 1, page, page + 1].filter(n => n >= 1 && n <= pages));
    const out = []; let prev = 0;
    [...set].sort((a, b) => a - b).forEach(n => { if (n - prev > 1) out.push('…'); out.push(n); prev = n; });
    return out;
  }

  function render() {

    const list = filtered();
    const pages = Math.max(1, Math.ceil(list.length / state.size));
    state.page = Math.min(state.page, pages);
    const start = (state.page - 1) * state.size;
    const slice = list.slice(start, start + state.size);

    // # = position in the whole filtered result, not the page (row 21 on page 2 reads 21)
    $('#rows').innerHTML = slice.length ? slice.map((a, i) => `
      <tr>
        <td class="tbl-num">${start + i + 1}</td>
        <td class="tbl-strong">${esc(a.name)}${a.temporary ? ' ' + TEMP_TAG : ''}</td>
        <td class="text-center"><span class="tbl-code">${esc(a.code)}</span></td>
        <td class="text-center tbl-muted">${esc(a.ref) || '—'}</td>
        <td class="text-center">${esc(a.currency)}</td>
        <td class="text-center">${status(a.active)}</td>
        <td class="text-center">${a.short ? `<span class="tbl-code">${esc(a.short)}</span>` : '<span class="tbl-muted">—</span>'}</td>
        <td class="text-center">${flag(a.b2c)}</td>
        <td class="text-center">${flag(a.hold, holdLabel(a))}</td>
        <td class="tbl-action-col"><div class="tbl-actions">
          <button class="tbl-action" type="button" data-edit="${a.id}" data-tip="Edit" aria-label="Edit ${esc(a.name)}"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg></button>
          <button class="tbl-action" type="button" data-hist="${a.id}" data-tip="History" aria-label="History for ${esc(a.name)}"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 12a9 9 0 109-9 9 9 0 00-7 3.3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M3 3.5V8h4.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 7.5V12l3.2 2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        </div></td>
      </tr>`).join('')
      : EmptyState.row(10);

    // pagination always visible (0 results → "Showing 0 of 0", buttons disabled)
    $('#pg-range').textContent = list.length ? `${start + 1}–${start + slice.length}` : '0';
    $('#pg-total').textContent = list.length.toLocaleString('en-US');
    $('#pg-mobile').textContent = `Page ${state.page} of ${pages}`;
    $('#pg-prev').disabled = state.page === 1;
    $('#pg-next').disabled = state.page === pages;
    $('#pg-pages').innerHTML = pageList(state.page, pages).map(n => n === '…'
      ? '<span class="pagination__ellipsis">…</span>'
      : `<button type="button" class="pagination__page${n === state.page ? ' pagination__page--active' : ''}" data-pg="${n}"${n === state.page ? ' aria-current="page"' : ''} aria-label="Page ${n}${n === state.page ? ', current page' : ''}">${n}</button>`).join('');
  }

  // a query in the real portal → skeleton first (saves / edits re-render directly)
  const load = () => TableLoading.run($('.tbl-area'), render);
  let typing;
  $('#f-q').addEventListener('input', e => { clearTimeout(typing); typing = setTimeout(() => { state.q = e.target.value; state.page = 1; load(); }, 300); });
  cur.addEventListener('change', e => { state.currency = e.target.value; state.page = 1; load(); });
  $('#f-status').addEventListener('change', e => { state.status = e.target.value; state.page = 1; load(); });
  $('#f-clear').addEventListener('click', () => {
    Object.assign(state, { q: '', currency: '', status: '', page: 1 });
    $('#f-q').value = ''; cur.value = ''; $('#f-status').value = '';
    load();
  });
  $('#pg-pages').addEventListener('click', e => { const b = e.target.closest('[data-pg]'); if (b) { state.page = +b.dataset.pg; load(); } });
  $('#pg-prev').addEventListener('click', () => { state.page--; load(); });
  $('#pg-next').addEventListener('click', () => { state.page++; load(); });
  $('#pg-size').addEventListener('change', e => { state.size = +e.target.value; state.page = 1; load(); });

  /* ---------- drawers ---------- */
  let lastFocus = null;
  function openDrawer(el) { lastFocus = document.activeElement; el.classList.add('open'); setTimeout(() => el.querySelector('input,button')?.focus(), 50); }
  function closeDrawers() { document.querySelectorAll('.drawer.open').forEach(d => d.classList.remove('open')); lastFocus?.focus?.(); }
  document.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeDrawers(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawers(); });

  // create / edit: the shared hotel API drawer (js/api-drawer.js) — also used by the booking form
  function openEdit(api) {
    ApiDrawer.open({
      api,
      onSaved: (a, { created, changes }) => { toast(created ? `${a.name} created` : changes.length ? `${a.name} updated` : 'No changes to save'); render(); },
      onMakePermanent: askPermanent,
    });
  }

  /* ---------- history: Map-UI card design ----------
     Each entry: operation pill (Create / Edit / Status Change), a one-line summary, who (name + email) and when.
     Create = the values the API was created with, as a labelled field grid.
     Edit = one row per changed field: old value → new value.
     Status Change (only Status changed) = "Activated" / "Deactivated", old → new status pill, and what it means.
     Values are shown the same way as in the list (code chips, status dots, hold amount with its unit). Newest first. */
  const userEmail = RefData.userEmail;   // admin users: js/data.js
  const OP_CLASS = { Create: 'success', Edit: 'info', 'Status Change': 'neutral' };
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dateOnly = d => `${String(d.getDate()).padStart(2, '0')}-${MONTHS[d.getMonth()]}-${d.getFullYear()}`;
  const timeOnly = d => `${String(d.getHours() % 12 || 12).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() >= 12 ? 'PM' : 'AM'}`;
  const SNAPSHOT = ['name', 'code', 'ref', 'short', 'currency', 'active', 'b2c', 'hold', 'holdType', 'holdAmount', 'temporary'];

  // display fields, in order; hold / hold type / hold amount show as one "Hold booking" value
  const dot = (cls, text) => `<span class="hf-dot ${cls}">${text}</span>`;
  const holdText = v => v.hold
    ? `Enabled${v.holdAmount != null ? ` · ${v.holdType === 'percent' ? `${esc(v.holdAmount)}%` : `${esc(v.holdAmount)} ${esc(v.currency)}`}` : ''}`
    : 'Disabled';
  const SHOW = [
    ['name', 'Supplier name', v => esc(v.name), true],
    ['code', 'Supplier code', v => `<span class="hf-code">${esc(v.code)}</span>`],
    ['short', 'Short code', v => v.short ? `<span class="hf-code">${esc(v.short)}</span>` : '—'],
    ['ref', 'Reference code', v => esc(v.ref) || '—'],
    ['currency', 'Currency', v => esc(v.currency)],
    ['active', 'Status', v => v.active ? dot('on', 'Active') : dot('off', 'Inactive')],
    ['temporary', 'Type', v => v.temporary ? TEMP_TAG : 'Permanent'],
    ['b2c', 'Allow B2C', v => v.b2c ? 'Enabled' : 'Disabled'],
    ['hold', 'Hold booking', holdText],
  ];
  const TEMP_FIELDS = ['name', 'code', 'currency', 'temporary', 'hold'];   // the temporary supplier form's fields
  const showKey = f => (f === 'holdType' || f === 'holdAmount') ? 'hold' : f;

  function historyEntries(api) {
    // walk newest → oldest: "after" is the state right after an entry; undoing its changes gives "before"
    let after = {}; SNAPSHOT.forEach(k => after[k] = api[k]);
    return api.history.map(h => {
      // a temporary supplier's Create shows only what its form asked (the rest is filled when it is made permanent)
      if (h.created) return { ...h, op: 'Create', summary: '',
        fields: SHOW.filter(([k]) => !after.temporary || TEMP_FIELDS.includes(k)).map(([, l, f, wide]) => [l, f(after), wide]) };
      // oldest old-system row: it holds the settings after that save, but not what they were before
      if (h.first) return { op: 'Edit', summary: '', fields: SHOW.map(([, l, f, wide]) => [l, f(after), wide]), ...h };
      const before = { ...after };
      h.changes.forEach(([f, o]) => { before[f] = o; });
      const keys = [...new Set(h.changes.map(c => showKey(c[0])))];
      const rows = SHOW.filter(([k]) => keys.includes(k)).map(([, l, f]) => [l, f(before), f(after)]);
      const nowActive = after.active;
      after = before;
      // only Status changed → its own compact entry: what happened, old → new pill, and what it means
      if (keys.length === 1 && keys[0] === 'active') return {
        op: 'Status Change', summary: '', active: nowActive,
        note: nowActive ? 'Used for search and booking again.' : 'No longer used for search or booking.', ...h,
      };
      return { op: 'Edit', summary: '', rows, ...h };
    });
  }

  const ARROW = '<svg class="hc-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" role="img" aria-label="changed to"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function openHistory(api) {
    $('#hist-name').innerHTML = `— ${esc(api.name)}${api.temporary ? ' ' + TEMP_TAG : ''}`;
    const list = historyEntries(api);
    $('#hist-body').innerHTML = list.length ? `<div class="history-list">${list.map((h, i) => `
      <div class="history-entry">
        <div class="history-entry-label">${h.legacy ? 'Old system · ' : ''}Entry ${i + 1} of ${list.length}</div>
        <div class="history-card">
          <div class="history-who">
            <span class="history-user" data-tooltip="${esc(h.by)}">${esc(h.by)}</span><span class="history-date">${dateOnly(h.at)}</span>
            <span class="history-email" data-tooltip="${esc(h.email || userEmail(h.by))}">${esc(h.email || userEmail(h.by))}</span><span class="history-time">${timeOnly(h.at)}</span>
          </div>
          <div class="history-op-line"><span class="pill operation-pill ${OP_CLASS[h.op]}">${h.op}</span>
            ${h.summary ? `<div class="history-desc">${h.summary}</div>` : ''}</div>
          ${h.fields
            ? `<dl class="history-fields">${h.fields.map(([k, v, wide]) => `<div${wide ? ' class="wide"' : ''}><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`
            : h.op === 'Status Change'
            ? `<div class="history-status ${h.active ? 'on' : 'off'}">
                <span class="hs-pill old">${h.active ? 'Inactive' : 'Active'}</span>${ARROW}<span class="hs-pill new">${h.active ? 'Active' : 'Inactive'}</span>
                <span class="hs-note">${h.note}</span></div>`
            : `<dl class="history-changes">${h.rows.map(([k, o, n]) => `<div><dt>${k}</dt><dd><span class="hc-old">${o}</span>${ARROW}<span class="hc-new">${n}</span></dd></div>`).join('')}</dl>`}
        </div>
      </div>`).join('')}</div>` : '<p class="history-empty">No history yet</p>';
    openDrawer($('#hist-drawer'));
  }

  /* ---------- make a temporary supplier permanent (confirm first, shared modal: js/modal.js) ---------- */
  async function askPermanent(api, commit, v) {
    const ok = await Modal.open({
      tone: 'warning',
      title: `Make ${v.name} permanent?`,
      message: 'It will no longer be marked Temporary.',
      details: [['Supplier name', esc(v.name)], ['Supplier code', `<span class="hf-code">${esc(v.code)}</span>`],
        ['Reference code', esc(v.ref)], ['Short code', `<span class="hf-code">${esc(v.short)}</span>`]],
      note: 'This can’t be changed back here.',
      confirm: 'Make permanent',
    });
    if (!ok) return;
    // one history entry: the fields filled for it (Reference code, Short code…) + Type Temporary → Permanent
    const before = api.history.length;
    commit();   // the drawer's values (the fields a permanent API needs)
    api.temporary = false;
    if (api.history.length > before) api.history[0].changes.push(['temporary', true, false]);
    else api.history.unshift({ by: 'Super Admin', at: new Date(), changes: [['temporary', true, false]] });
    HotelApis.save();
    ApiDrawer.refreshNotice();
    toast(`${api.name} is now permanent`);
    render();
  }

  $('#btn-new').addEventListener('click', () => openEdit(null));
  $('#rows').addEventListener('click', e => {
    const ed = e.target.closest('[data-edit]'), hi = e.target.closest('[data-hist]');
    if (ed) openEdit(apis.find(a => a.id === +ed.dataset.edit));
    if (hi) openHistory(apis.find(a => a.id === +hi.dataset.hist));
  });

  HotelApis.onChange(render);   // created / changed in another tab (e.g. the booking form)
  load();
  SearchableSelect.init();
})();
