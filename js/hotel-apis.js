/* Hotel APIs page prototype. Dummy data only. */
(function () {
  const CURRENCIES = ['ALL', 'AED', 'BDT', 'EUR', 'GBP', 'MYR', 'SGD', 'THB', 'USD'];

  // name, code, ref, short, currency, active, (unused: was Default), b2c, (unused: was Auto issue), hold
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
    active: !!r[5], b2c: !!r[7], hold: !!r[9], holdType: null, holdAmount: null, history: [],
  }));
  // hold amount for the APIs that allow hold booking: [type, amount]
  const HOLD = { TBOHOL: ['percent', '20'], RATEHAWK: ['fixed', '50'], JUNIPER: ['percent', '10'], MANUAL: ['fixed', '100'] };
  apis.forEach(a => { if (HOLD[a.code]) [a.holdType, a.holdAmount] = HOLD[a.code]; });
  // temporary suppliers (can be made permanent; one-way)
  const TEMP = ['JUNIPER', 'TRAVCO', 'BONOTEL'];
  apis.forEach(a => { a.temporary = TEMP.includes(a.code); });

  // dummy history: a created entry + a couple of edits
  const FIELDS = { name: 'API name', code: 'API code', ref: 'Reference code', short: 'Short code', currency: 'Currency',
    active: 'Status', b2c: 'B2C', temporary: 'Type', hold: 'Hold booking',
    holdType: 'Hold amount type', holdAmount: 'Hold amount' };
  const fmtVal = (f, v) => v === null || v === '' ? '—'
    : f === 'temporary' ? (v ? 'Temporary' : 'Permanent')
    : typeof v === 'boolean' ? (f === 'active' ? (v ? 'Active' : 'Inactive') : (v ? 'On' : 'Off'))
    : f === 'holdType' ? (v === 'percent' ? 'Percent' : 'Fixed')
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
  // reusable-table cells: status pill + on/off flag
  const status = on => `<span class="tbl-status ${on ? 'on' : 'off'}">${on ? 'Active' : 'Inactive'}</span>`;
  const flag = (on, sub) => `<span class="tbl-flag ${on ? 'on' : 'off'}">${on ? 'Enabled' : 'Disabled'}${on && sub ? `<span class="tbl-flag-sub">${esc(sub)}</span>` : ''}</span>`;
  const holdLabel = a => a.hold && a.holdAmount != null ? (a.holdType === 'percent' ? `${a.holdAmount}%` : `${a.holdAmount} ${a.currency}`) : '';
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
    [...$('#f-status').options].forEach(o => {
      o.dataset.n = o.value ? base.filter(a => (o.value === 'active') === a.active).length : base.length;
    });

    const list = filtered();
    const pages = Math.max(1, Math.ceil(list.length / state.size));
    state.page = Math.min(state.page, pages);
    const start = (state.page - 1) * state.size;
    const slice = list.slice(start, start + state.size);

    $('#rows').innerHTML = slice.length ? slice.map(a => `
      <tr${a.temporary ? ' class="tbl-row-warn"' : ''}>
        <td class="tbl-strong">${esc(a.name)}${a.temporary ? ' <span class="visually-hidden">(temporary)</span>' : ''}</td>
        <td class="text-center"><span class="tbl-code">${esc(a.code)}</span></td>
        <td class="text-center tbl-muted">${esc(a.ref)}</td>
        <td class="text-center">${esc(a.currency)}</td>
        <td class="text-center">${status(a.active)}</td>
        <td class="text-center"><span class="tbl-code">${esc(a.short)}</span></td>
        <td class="text-center">${flag(a.b2c)}</td>
        <td class="text-center">${flag(a.hold, holdLabel(a))}</td>
        <td class="text-center"><div class="tbl-actions">
          <button class="tbl-action" type="button" data-edit="${a.id}" data-tip="Edit" aria-label="Edit ${esc(a.name)}"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg></button>
          <button class="tbl-action" type="button" data-hist="${a.id}" data-tip="History" aria-label="History for ${esc(a.name)}"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 12a9 9 0 109-9 9 9 0 00-7 3.3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M3 3.5V8h4.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 7.5V12l3.2 2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        </div></td>
      </tr>`).join('')
      : `<tr><td class="empty-cell" colspan="9"><section class="empty-state">
          <div class="empty-state__icon"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="5.5"></circle><path d="m15 15 4 4"></path><path d="M8.5 10.5h4"></path></svg></div>
          <h3>No hotel APIs found</h3><p>Try adjusting the filters or add a new API.</p></section></td></tr>`;

    // pagination always visible (0 results → "Showing 0 of 0", buttons disabled)
    $('#pg-range').textContent = list.length ? `${start + 1}–${start + slice.length}` : '0';
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
  $('#f-status').addEventListener('change', e => { state.status = e.target.value; state.page = 1; render(); });
  $('#f-clear').addEventListener('click', () => {
    Object.assign(state, { q: '', currency: '', status: '', page: 1 });
    $('#f-q').value = ''; cur.value = ''; $('#f-status').value = '';
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

  // Hold booking on → show Amount type + Hold amount; unit follows the type (% or the API's currency)
  const holdOpts = $('#hold-opts');
  const holdType = () => form.querySelector('[name=holdType]:checked')?.value || '';
  function syncHold() {
    holdOpts.hidden = !form.elements.hold.checked;
    $('#e-hamount-unit').textContent = holdType() === 'fixed' ? (form.elements.currency.value || '') : '%';
  }
  form.elements.hold.addEventListener('change', () => {
    if (form.elements.hold.checked && !holdType()) form.querySelector('[name=holdType][value=percent]').checked = true;
    syncHold();
  });
  form.addEventListener('change', e => { if (e.target.name === 'holdType' || e.target.name === 'currency') syncHold(); });
  function openEdit(api) {
    editing = api || null;
    form.reset();
    form.querySelectorAll('.field').forEach(f => f.classList.remove('invalid'));
    $('#edit-title').textContent = api ? 'Edit hotel API' : 'New hotel API';
    $('#edit-sub').textContent = api ? `${api.name} · ${api.code}` : 'Add a supplier connection.';
    $('#edit-submit').textContent = api ? 'Save changes' : 'Create API';
    const v = api || { name: '', code: '', ref: '', short: '', currency: '', active: true, b2c: false, hold: false };
    ['name', 'code', 'ref', 'short', 'currency'].forEach(k => form.elements[k].value = v[k]);
    ['active', 'b2c', 'hold'].forEach(k => form.elements[k].checked = v[k]);
    form.querySelectorAll('[name=holdType]').forEach(r => r.checked = r.value === v.holdType);
    form.elements.holdAmount.value = v.holdAmount ?? '';
    syncHold();
    $('#temp-note').hidden = !(api && api.temporary);
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
    // hold options are required only while Hold booking is on
    const hold = form.elements.hold.checked;
    const typeF = form.querySelector('[name=holdType]').closest('.field');
    const amtF = form.elements.holdAmount.closest('.field'), amtMsg = amtF.querySelector('[data-msg]');
    let typeBad = false, amtBad = false;
    if (hold) {
      typeBad = !holdType();
      const raw = val('holdAmount'), n = Number(raw);
      if (!raw) { amtBad = true; amtMsg.textContent = 'Enter a hold amount.'; }
      else if (!/^\d+(\.\d{1,2})?$/.test(raw)) { amtBad = true; amtMsg.textContent = 'Enter a number, up to 2 decimals.'; }
      else if (holdType() === 'percent' && n > 100) { amtBad = true; amtMsg.textContent = 'A percent can’t be more than 100.'; }
    }
    typeF.classList.toggle('invalid', typeBad);
    amtF.classList.toggle('invalid', amtBad);
    if (typeBad || amtBad) ok = false;
    if (!ok) { (form.querySelector('.invalid .input:not(.searchable-select-native)') || form.querySelector('.invalid input'))?.focus(); return; }

    const data = {};
    ['name', 'code', 'ref', 'short', 'currency'].forEach(k => data[k] = val(k));
    ['active', 'b2c', 'hold'].forEach(k => data[k] = form.elements[k].checked);
    data.holdType = data.hold ? holdType() : null;
    data.holdAmount = data.hold ? String(Number(val('holdAmount'))) : null;
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

  /* ---------- make a temporary supplier permanent (confirm first; can't be undone here) ---------- */
  const permDlg = $('#perm-dialog');
  let permApi = null;
  function askPermanent(api) {
    permApi = api;
    $('#perm-title').textContent = `Make ${api.name} permanent?`;
    permDlg.showModal();
  }
  $('#temp-note-btn').addEventListener('click', () => editing && askPermanent(editing));
  $('#perm-cancel').addEventListener('click', () => permDlg.close());
  permDlg.addEventListener('click', e => { if (e.target === permDlg) permDlg.close(); });
  permDlg.addEventListener('keydown', e => e.stopPropagation()); // Esc closes only the dialog, not the drawer
  $('#perm-ok').addEventListener('click', () => {
    permApi.temporary = false;
    permApi.history.unshift({ by: 'Super Admin', at: new Date(), changes: [['temporary', true, false]] });
    permDlg.close();
    if (editing === permApi) $('#temp-note').hidden = true;
    toast(`${permApi.name} is now permanent`);
    render();
  });

  $('#btn-new').addEventListener('click', () => openEdit(null));
  $('#rows').addEventListener('click', e => {
    const ed = e.target.closest('[data-edit]'), hi = e.target.closest('[data-hist]');
    if (ed) openEdit(apis.find(a => a.id === +ed.dataset.edit));
    if (hi) openHistory(apis.find(a => a.id === +hi.dataset.hist));
  });

  render();
  SearchableSelect.init();
})();
