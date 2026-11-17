/* Hotel APIs page prototype. Dummy data only. */
(function () {
  const CURRENCIES = ['ALL', 'AED', 'BDT', 'EUR', 'GBP', 'MYR', 'SGD', 'THB', 'USD'];

  // name, code, ref, short, currency, active, isDefault, b2c, autoIssue, hold
  const SEED = [
    ['TBO Holidays', 'TBOHOL', '4', 'TBO', 'USD', 1, 0, 0, 0, 1],
    ['Dida', 'DIDA', '3', 'DID', 'MYR', 1, 1, 1, 0, 0],
    ['RateHawk', 'RATEHAWK', '2', 'RH', 'MYR', 1, 1, 1, 1, 1],
    ['WhitinEarth', 'WIE', '1', 'WIE', 'USD', 0, 1, 0, 0, 0],
    ['Hotelbeds', 'HBEDS', '5', 'HB', 'EUR', 1, 0, 1, 1, 0],
    ['WebBeds', 'WEBBEDS', '6', 'WB', 'USD', 1, 0, 1, 0, 0],
    ['Expedia Rapid', 'EXPRAPID', '7', 'EXR', 'USD', 0, 0, 1, 0, 0],
    ['Agoda', 'AGODA', '8', 'AGD', 'THB', 0, 0, 0, 0, 0],
    ['Juniper', 'JUNIPER', '9', 'JNP', 'EUR', 0, 0, 0, 0, 1],
    ['Travco', 'TRAVCO', '10', 'TRV', 'GBP', 1, 0, 0, 0, 0],
    ['Manual Contracts', 'MANUAL', '11', 'MAN', 'ALL', 1, 0, 0, 0, 1],
    ['Bonotel', 'BONOTEL', '12', 'BNT', 'USD', 0, 0, 1, 0, 0],
  ];
  let nextId = 1;
  const apis = SEED.map(r => ({
    id: nextId++, name: r[0], code: r[1], ref: r[2], short: r[3], currency: r[4],
    active: !!r[5], isDefault: !!r[6], b2c: !!r[7], autoIssue: !!r[8], hold: !!r[9], history: [],
  }));

  // dummy history: a created entry + a couple of edits
  const FIELDS = { name: 'API name', code: 'API code', ref: 'Reference code', short: 'Short code', currency: 'Currency',
    active: 'Status', isDefault: 'Default', b2c: 'B2C', autoIssue: 'Auto issue', hold: 'Hold booking' };
  const fmtVal = (f, v) => typeof v === 'boolean'
    ? (f === 'active' ? (v ? 'Active' : 'Inactive') : f === 'isDefault' ? (v ? 'Default' : 'Not default') : (v ? 'On' : 'Off'))
    : v;
  const editors = ['Super Admin', 'Ops Team', 'Super Admin'];
  apis.forEach((a, i) => {
    const d = new Date(2026, 9, 2 + i, 10, 15);
    a.history.push({ by: 'Super Admin', at: d, created: true });
    if (i % 3 !== 2) a.history.unshift({ by: editors[i % 3], at: new Date(2026, 10, 3 + i, 14, 4), changes: [['currency', 'USD', a.currency === 'USD' ? 'EUR' : a.currency]].filter(c => c[1] !== c[2]).concat([['b2c', !a.b2c, a.b2c]]) });
    if (i % 2 === 0) a.history.unshift({ by: 'Super Admin', at: new Date(2026, 10, 12, 14, 38), changes: [['active', !a.active, a.active]] });
  });

  /* ---------- helpers ---------- */
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // portal reusable-table cell badges
  const badge = (cls, text) => `<span class="tbl-badge ${cls}">${text}</span>`;
  const onOff = v => v ? badge('bg-success', 'Enabled') : badge('bg-danger', 'Disabled');
  const fmtDate = d => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const toast = msg => { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2400); };

  /* ---------- filters + table ---------- */
  const state = { q: '', currency: '', status: '', page: 1, size: 20 };
  const cur = $('#f-currency'), ecur = $('#e-currency');
  CURRENCIES.forEach(c => { cur.add(new Option(c, c)); ecur.add(new Option(c, c)); });

  const matchesQC = a => {
    const q = state.q.trim().toLowerCase();
    return (!q || [a.name, a.code, a.ref, a.short].some(v => v.toLowerCase().includes(q))) && (!state.currency || a.currency === state.currency);
  };
  // list order is the API's order (the reusable table has no column sorting)
  const filtered = () => apis.filter(a => matchesQC(a) && (!state.status || (state.status === 'active') === a.active));

  // page buttons: all when <= 7, otherwise 1 … around-current … last (portal uses .pagination__ellipsis)
  function pageList(page, pages) {
    if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
    const set = new Set([1, pages, page - 1, page, page + 1].filter(n => n >= 1 && n <= pages));
    const out = []; let prev = 0;
    [...set].sort((a, b) => a - b).forEach(n => { if (n - prev > 1) out.push('…'); out.push(n); prev = n; });
    return out;
  }

  function render() {
    // status counts reflect the search + currency filters
    const base = apis.filter(matchesQC);
    document.querySelectorAll('[data-n]').forEach(n => {
      const k = n.dataset.n;
      n.textContent = k ? base.filter(a => (k === 'active') === a.active).length : base.length;
    });

    const list = filtered();
    const pages = Math.max(1, Math.ceil(list.length / state.size));
    state.page = Math.min(state.page, pages);
    const start = (state.page - 1) * state.size;
    const slice = list.slice(start, start + state.size);

    $('#rows').innerHTML = slice.length ? slice.map(a => `
      <tr>
        <td>${esc(a.name)}</td>
        <td class="text-center">${esc(a.code)}</td>
        <td class="text-center">${esc(a.ref)}</td>
        <td class="text-center">${esc(a.currency)}</td>
        <td class="text-center">${a.isDefault ? badge('bg-info', 'Default') : badge('bg-warning', 'Not Default')}</td>
        <td class="text-center">${a.active ? badge('bg-success', 'Active') : badge('bg-danger', 'Inactive')}</td>
        <td class="text-center">${esc(a.short)}</td>
        <td class="text-center">${onOff(a.b2c)}</td>
        <td class="text-center">${onOff(a.autoIssue)}</td>
        <td class="text-center">${onOff(a.hold)}</td>
        <td class="text-center text-success">
          <button class="tbl-action" type="button" data-edit="${a.id}" title="Edit" aria-label="Edit ${esc(a.name)}"><i class="fas fa-edit"></i></button> &nbsp;
          <button class="tbl-action" type="button" data-hist="${a.id}" title="History" aria-label="History for ${esc(a.name)}"><i class="fas fa-clock"></i></button>
        </td>
      </tr>`).join('')
      : `<tr><td class="empty-cell" colspan="11"><section class="empty-state">
          <div class="empty-state__icon"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="5.5"></circle><path d="m15 15 4 4"></path><path d="M8.5 10.5h4"></path></svg></div>
          <h3>No hotel APIs found</h3><p>Try adjusting the filters or add a new API.</p></section></td></tr>`;

    // pagination (hidden when there are no rows, like the portal)
    $('#pager').hidden = !list.length;
    $('#pg-range').textContent = `${start + 1}–${start + slice.length}`;
    $('#pg-total').textContent = list.length;
    $('#pg-mobile').textContent = `Page ${state.page} of ${pages}`;
    $('#pg-prev').disabled = state.page === 1;
    $('#pg-next').disabled = state.page === pages;
    $('#pg-pages').innerHTML = pageList(state.page, pages).map(n => n === '…'
      ? '<span class="pagination__ellipsis">…</span>'
      : `<button type="button" class="pagination__page${n === state.page ? ' pagination__page--active' : ''}" data-pg="${n}"${n === state.page ? ' aria-current="page"' : ''} aria-label="Page ${n}${n === state.page ? ', current page' : ''}">${n}</button>`).join('');
    $('#f-clear').hidden = !(state.q || state.currency || state.status);
  }

  $('#f-q').addEventListener('input', e => { state.q = e.target.value; state.page = 1; render(); });
  cur.addEventListener('change', e => { state.currency = e.target.value; state.page = 1; render(); });
  $('#f-status').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    state.status = b.dataset.v; state.page = 1;
    $('#f-status').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
    render();
  });
  $('#f-clear').addEventListener('click', () => {
    Object.assign(state, { q: '', currency: '', status: '', page: 1 });
    $('#f-q').value = ''; cur.value = '';
    $('#f-status').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x.dataset.v === ''));
    render();
  });
  $('#pg-pages').addEventListener('click', e => { const b = e.target.closest('[data-pg]'); if (b) { state.page = +b.dataset.pg; render(); } });
  $('#pg-prev').addEventListener('click', () => { state.page--; render(); });
  $('#pg-next').addEventListener('click', () => { state.page++; render(); });
  $('#pg-size').addEventListener('change', e => { state.size = +e.target.value; state.page = 1; render(); });

  /* ---------- drawers ---------- */
  let lastFocus = null;
  function openDrawer(el) { lastFocus = document.activeElement; el.classList.add('open'); setTimeout(() => el.querySelector('input,button')?.focus(), 50); }
  function closeDrawers() { document.querySelectorAll('.drawer.open').forEach(d => d.classList.remove('open')); lastFocus?.focus?.(); }
  document.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeDrawers(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawers(); });

  const form = $('#edit-form');
  let editing = null;
  function openEdit(api) {
    editing = api || null;
    form.reset();
    form.querySelectorAll('.field').forEach(f => f.classList.remove('invalid'));
    $('#edit-title').textContent = api ? 'Edit hotel API' : 'New hotel API';
    $('#edit-sub').textContent = api ? `${api.name} · ${api.code}` : 'Add a supplier connection.';
    $('#edit-submit').textContent = api ? 'Save changes' : 'Create API';
    const v = api || { name: '', code: '', ref: '', short: '', currency: '', active: true, isDefault: false, b2c: false, autoIssue: false, hold: false };
    ['name', 'code', 'ref', 'short', 'currency'].forEach(k => form.elements[k].value = v[k]);
    ['active', 'isDefault', 'b2c', 'autoIssue', 'hold'].forEach(k => form.elements[k].checked = v[k]);
    openDrawer($('#edit-drawer'));
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    let ok = true;
    const val = k => form.elements[k].value.trim();
    ['name', 'code', 'ref', 'short', 'currency'].forEach(k => {
      const f = form.elements[k].closest('.field');
      const msg = f.querySelector('[data-msg]');
      let bad = !val(k);
      if (msg) msg.textContent = `Enter ${k === 'code' ? 'an API code' : 'a short code'}.`;
      if (!bad && (k === 'code' || k === 'short')) {
        const dup = apis.find(a => a !== editing && a[k].toLowerCase() === val(k).toLowerCase());
        if (dup) { bad = true; msg.textContent = `Already used by ${dup.name}.`; }
      }
      f.classList.toggle('invalid', bad);
      if (bad) ok = false;
    });
    if (!ok) { form.querySelector('.invalid .input')?.focus(); return; }

    const data = {};
    ['name', 'code', 'ref', 'short', 'currency'].forEach(k => data[k] = val(k));
    ['active', 'isDefault', 'b2c', 'autoIssue', 'hold'].forEach(k => data[k] = form.elements[k].checked);
    if (editing) {
      const changes = Object.keys(data).filter(k => data[k] !== editing[k]).map(k => [k, editing[k], data[k]]);
      if (changes.length) editing.history.unshift({ by: 'Super Admin', at: new Date(), changes });
      Object.assign(editing, data);
      toast(changes.length ? `${data.name} updated` : 'No changes to save');
    } else {
      apis.push({ id: nextId++, ...data, history: [{ by: 'Super Admin', at: new Date(), created: true }] });
      toast(`${data.name} created`);
    }
    closeDrawers();
    render();
  });

  function openHistory(api) {
    $('#hist-sub').textContent = `${api.name} · ${api.code}`;
    $('#hist-body').innerHTML = `
      <div class="hist-summary">${api.active ? '<span class="pill green">Active</span>' : '<span class="pill gray">Inactive</span>'}
        <span class="tl-meta">${api.history.length} event${api.history.length === 1 ? '' : 's'} · last change ${fmtDate(api.history[0].at)}</span></div>
      <ol class="timeline">${api.history.map(h => `
        <li class="${h.created ? 'created' : ''}">
          <div class="tl-meta"><strong>${h.created ? 'Created' : `${h.changes.length} field${h.changes.length === 1 ? '' : 's'} changed`}</strong> · ${esc(h.by)} · ${fmtDate(h.at)}</div>
          ${h.changes ? `<div class="changes">${h.changes.map(([f, o, n]) => `
            <div class="change"><span class="f">${FIELDS[f]}</span>
              <span class="v"><span class="old">${esc(fmtVal(f, o))}</span>→<span class="new">${esc(fmtVal(f, n))}</span></span></div>`).join('')}</div>` : ''}
        </li>`).join('')}</ol>`;
    openDrawer($('#hist-drawer'));
  }

  $('#btn-new').addEventListener('click', () => openEdit(null));
  $('#rows').addEventListener('click', e => {
    const ed = e.target.closest('[data-edit]'), hi = e.target.closest('[data-hist]');
    if (ed) openEdit(apis.find(a => a.id === +ed.dataset.edit));
    if (hi) openHistory(apis.find(a => a.id === +hi.dataset.hist));
  });

  render();
})();
