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
  const ico = {
    check: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    dash: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 12h12"/></svg>',
    edit: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
    history: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/></svg>',
    star: '<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/></svg>',
  };
  const flag = v => v ? `<span class="flag on">${ico.check}On</span>` : `<span class="flag off">${ico.dash}Off</span>`;
  const fmtDate = d => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const toast = msg => { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2400); };

  /* ---------- filters + table ---------- */
  const state = { q: '', currency: '', status: '', sortDir: 1, page: 1, size: 20 };
  const cur = $('#f-currency'), ecur = $('#e-currency');
  CURRENCIES.forEach(c => { cur.add(new Option(c, c)); ecur.add(new Option(c, c)); });

  function filtered() {
    const q = state.q.trim().toLowerCase();
    return apis.filter(a =>
      (!q || [a.name, a.code, a.ref, a.short].some(v => v.toLowerCase().includes(q))) &&
      (!state.currency || a.currency === state.currency) &&
      (!state.status || (state.status === 'active') === a.active)
    ).sort((x, y) => x.name.localeCompare(y.name) * state.sortDir);
  }

  function render() {
    // status counts reflect the other filters
    const base = apis.filter(a => {
      const q = state.q.trim().toLowerCase();
      return (!q || [a.name, a.code, a.ref, a.short].some(v => v.toLowerCase().includes(q))) && (!state.currency || a.currency === state.currency);
    });
    document.querySelectorAll('[data-n]').forEach(n => {
      const k = n.dataset.n;
      n.textContent = k ? base.filter(a => (k === 'active') === a.active).length : base.length;
    });

    const list = filtered();
    const pages = Math.max(1, Math.ceil(list.length / state.size));
    state.page = Math.min(state.page, pages);
    const start = (state.page - 1) * state.size;
    const slice = list.slice(start, start + state.size);

    $('#rows').innerHTML = slice.map(a => `
      <tr>
        <td>
          <div class="api-name">${esc(a.name)}${a.isDefault ? `<span class="tag">${ico.star}Default</span>` : ''}</div>
          <span class="code">${esc(a.code)}</span>
        </td>
        <td><span class="code">${esc(a.ref)}</span></td>
        <td><span class="code">${esc(a.short)}</span></td>
        <td><span class="currency">${esc(a.currency)}</span></td>
        <td>${a.active ? '<span class="pill green">Active</span>' : '<span class="pill gray">Inactive</span>'}</td>
        <td>${flag(a.b2c)}</td>
        <td>${flag(a.autoIssue)}</td>
        <td>${flag(a.hold)}</td>
        <td class="actions r">
          <button class="icon-btn" type="button" data-edit="${a.id}" title="Edit" aria-label="Edit ${esc(a.name)}">${ico.edit}</button>
          <button class="icon-btn" type="button" data-hist="${a.id}" title="Change history" aria-label="Change history for ${esc(a.name)}">${ico.history}</button>
        </td>
      </tr>`).join('');

    $('#empty').hidden = list.length > 0;
    $('#pg-info').textContent = list.length ? `Showing ${start + 1}–${start + slice.length} of ${list.length}` : 'No results';
    let pg = `<button class="pg" type="button" data-pg="${state.page - 1}" ${state.page === 1 ? 'disabled' : ''} aria-label="Previous page">‹</button>`;
    for (let i = 1; i <= pages; i++) pg += `<button class="pg" type="button" data-pg="${i}" ${i === state.page ? 'aria-current="page"' : ''}>${i}</button>`;
    pg += `<button class="pg" type="button" data-pg="${state.page + 1}" ${state.page === pages ? 'disabled' : ''} aria-label="Next page">›</button>`;
    $('#pg-pages').innerHTML = pg;
    $('#f-clear').hidden = !(state.q || state.currency || state.status);
    $('#sort-ind').textContent = state.sortDir === 1 ? '↑' : '↓';
  }

  $('#f-q').addEventListener('input', e => { state.q = e.target.value; state.page = 1; render(); });
  cur.addEventListener('change', e => { state.currency = e.target.value; state.page = 1; render(); });
  $('#f-status').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    state.status = b.dataset.v; state.page = 1;
    $('#f-status').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
    render();
  });
  const clear = () => {
    Object.assign(state, { q: '', currency: '', status: '', page: 1 });
    $('#f-q').value = ''; cur.value = '';
    $('#f-status').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x.dataset.v === ''));
    render();
  };
  $('#f-clear').addEventListener('click', clear);
  $('#empty-clear').addEventListener('click', clear);
  $('#sort-name').addEventListener('click', () => { state.sortDir *= -1; render(); });
  $('#pg-pages').addEventListener('click', e => { const b = e.target.closest('[data-pg]'); if (b && !b.disabled) { state.page = +b.dataset.pg; render(); } });
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
