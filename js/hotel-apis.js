/* Supplier List (hotel-apis.html: API suppliers) and Offline Supplier List (offline-suppliers.html: offline suppliers).
   One script, two lists of the shared supplier list (js/data.js): the page's data-page picks which. Dummy data only. */
(function () {
  const OFFLINE = document.body.dataset.page === 'offline-suppliers';
  const CURRENCIES = HotelApis.CURRENCIES;
  const apis = HotelApis.list;   // shared + saved (js/data.js): both kinds

  /* ---------- helpers ---------- */
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // reusable-table cells: status pill + on/off flag
  const status = on => `<span class="tbl-status ${on ? 'on' : 'off'}">${on ? 'Active' : 'Inactive'}</span>`;
  const flag = (on, sub) => `<span class="tbl-flag ${on ? 'on' : 'off'}">${on ? 'Enabled' : 'Disabled'}${on && sub ? `<span class="tbl-flag-sub">${esc(sub)}</span>` : ''}</span>`;
  // Contact cell: one button with the number of emails + phones; it opens the Contacts drawer. None → —
  const PHONE_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z"/></svg>';
  const MAIL_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>';
  // Contacts action: always active (the list doesn't know whether a supplier has contacts); the drawer loads them
  // address book (book with binder tabs + person): the usual "contacts" symbol
  const CONTACT_ICON = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h12a2 2 0 012 2v14a2 2 0 01-2 2H6z"/><path d="M4 7h4M4 12h4M4 17h4"/><circle cx="13.5" cy="10" r="2.5"/><path d="M9.5 17a4 4 0 018 0"/></svg>';
  const contactBtn = a => `<button class="tbl-action" type="button" data-contacts="${a.id}" data-tip="Contacts" aria-label="Contacts of ${esc(a.name)}">${CONTACT_ICON}</button>`;
  const toast = msg => { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2400); };

  /* ---------- filters + table ---------- */
  const state = { q: '', currency: '', status: '', page: 1, size: 20 };
  const cur = $('#f-currency');
  CURRENCIES.forEach(c => cur.add(new Option(c, c)));

  // search: name, codes and emails; phones by digits of code + number ("60 3123" finds +60 312345678)
  const matchesQC = a => {
    const q = state.q.trim().toLowerCase(), qd = q.replace(/\D/g, '');
    const text = OFFLINE ? [a.name, a.code, ...a.emails] : [a.name, a.code, a.ref, a.short, ...a.emails];
    return (!q || text.some(v => v.toLowerCase().includes(q)) || (qd.length > 2 && a.phones.some(p => (p.dial + p.number).replace(/\D/g, '').includes(qd))))
      && (!state.currency || a.currency === state.currency);
  };
  // latest first: newest supplier (highest id = created last) at the top (the reusable table has no column sorting)
  const filtered = () => apis.filter(a => !!a.offline === OFFLINE && matchesQC(a) && (!state.status || (state.status === 'active') === a.active)).sort((a, b) => b.id - a.id);

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
        <td class="tbl-strong">${esc(a.name)}</td>
        <td class="text-center"><span class="tbl-code">${esc(a.code)}</span></td>
        ${OFFLINE ? `
        <td class="text-center">${esc(a.currency)}</td>
        <td class="text-center">${status(a.active)}</td>
        <td class="text-center">${flag(a.hold)}</td>` : `
        <td class="text-center tbl-muted">${esc(a.ref) || '—'}</td>
        <td class="text-center">${esc(a.currency)}</td>
        <td class="text-center">${status(a.active)}</td>
        <td class="text-center">${a.short ? `<span class="tbl-code">${esc(a.short)}</span>` : '<span class="tbl-muted">—</span>'}</td>
        <td class="text-center">${flag(a.b2c)}</td>
        <td class="text-center">${flag(a.hold)}</td>`}
        <td class="tbl-action-col"><div class="tbl-actions">
          ${contactBtn(a)}
          <button class="tbl-action" type="button" data-edit="${a.id}" data-tip="Edit" aria-label="Edit ${esc(a.name)}"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg></button>
          <button class="tbl-action" type="button" data-hist="${a.id}" data-tip="History" aria-label="History for ${esc(a.name)}"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 12a9 9 0 109-9 9 9 0 00-7 3.3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M3 3.5V8h4.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 7.5V12l3.2 2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        </div></td>
      </tr>`).join('')
      : EmptyState.row(OFFLINE ? 7 : 10);

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
  // shared filter bar: nothing filters until Search / Enter; count + chips cover the panel's dropdowns; Reset clears and reloads
  const applyFilters = () => { Object.assign(state, { q: $('#f-q').value, currency: cur.value, status: $('#f-status').value, page: 1 }); load(); };
  const pick = (label, sel) => ({ label, isSet: () => !!sel.value, text: () => sel.options[sel.selectedIndex]?.text || '', clear: () => { sel.value = ''; } });
  FilterBar.init($('#filter-bar'), {
    fields: [pick('Currency', cur), pick('Status', $('#f-status'))],
    onSearch: applyFilters,
    onReset: () => { $('#f-q').value = ''; cur.value = ''; $('#f-status').value = ''; applyFilters(); },
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

  // create / edit: the shared supplier drawer (js/api-drawer.js) — also used by the booking form
  function openEdit(api) {
    ApiDrawer.open({
      api, offline: OFFLINE,
      onSaved: (a, { created, changes }) => { toast(created ? `${a.name} created` : changes.length ? `${a.name} updated` : 'No changes to save'); render(); },
      onMakeOnline: OFFLINE ? askOnline : null,
    });
  }

  /* ---------- history: Map-UI card design ----------
     Each entry: operation pill (Create / Edit / Status Change), a one-line summary, who (name + email) and when.
     Create = the values the API was created with, as a labelled field grid.
     Edit = one row per changed field: old value → new value.
     Status Change (only Status changed) = "Activated" / "Deactivated", old → new status pill, and what it means.
     Values are shown the same way as in the list (code chips, status dots). Newest first. */
  const userEmail = RefData.userEmail;   // admin users: js/data.js
  const OP_CLASS = { Create: 'success', Edit: 'info', 'Status Change': 'neutral' };
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dateOnly = d => `${String(d.getDate()).padStart(2, '0')}-${MONTHS[d.getMonth()]}-${d.getFullYear()}`;
  const timeOnly = d => `${String(d.getHours() % 12 || 12).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() >= 12 ? 'PM' : 'AM'}`;
  const SNAPSHOT = ['name', 'code', 'ref', 'short', 'currency', 'emails', 'phones', 'active', 'offline', 'b2c', 'hold'];

  // display fields, in order
  const dot = (cls, text) => `<span class="hf-dot ${cls}">${text}</span>`;
  const SHOW = [
    ['name', 'Supplier name', v => esc(v.name), true],
    ['code', 'Supplier code', v => `<span class="hf-code">${esc(v.code)}</span>`],
    ['short', 'Short code', v => v.short ? `<span class="hf-code">${esc(v.short)}</span>` : '—'],
    ['ref', 'Reference code', v => esc(v.ref) || '—'],
    ['currency', 'Currency', v => esc(v.currency)],
    ['emails', 'Emails', v => v.emails.length ? v.emails.map(esc).join('<br>') : '—', true],
    ['phones', 'Phones', v => v.phones.length ? v.phones.map(p => esc(HotelApis.phoneText(p))).join('<br>') : '—', true],
    ['active', 'Status', v => v.active ? dot('on', 'Active') : dot('off', 'Inactive')],
    ['offline', 'Type', v => v.offline ? 'Offline' : 'Online'],
    ['b2c', 'Allow B2C', v => v.b2c ? 'Enabled' : 'Disabled'],
    ['hold', 'Hold booking', v => v.hold ? 'Enabled' : 'Disabled'],
  ];
  // the fields a supplier of that kind has (Type only shows when it changes: Make online)
  const fieldsOf = v => SHOW.filter(([k]) => k !== 'offline' && !(v.offline && ['ref', 'short', 'b2c'].includes(k)));
  const LIST_KEYS = ['emails', 'phones'];

  function historyEntries(api) {
    // walk newest → oldest: "after" is the state right after an entry; undoing its changes gives "before"
    let after = {}; SNAPSHOT.forEach(k => after[k] = api[k]);
    return api.history.map(h => {
      if (h.created) return { ...h, op: 'Create', summary: '', fields: fieldsOf(after).map(([, l, f, wide]) => [l, f(after), wide]) };
      // oldest old-system row: it holds the settings after that save, but not what they were before
      if (h.first) return { op: 'Edit', summary: '', fields: fieldsOf(after).map(([, l, f, wide]) => [l, f(after), wide]), ...h };
      const before = { ...after };
      h.changes.forEach(([f, o]) => { before[f] = o; });
      const keys = [...new Set(h.changes.map(c => c[0]))];
      const rows = SHOW.filter(([k]) => keys.includes(k)).map(([k, l, f]) => [l, f(before), f(after), LIST_KEYS.includes(k)]);
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
    $('#hist-name').innerHTML = `— ${esc(api.name)}`;
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
            : `<dl class="history-changes">${h.rows.map(([k, o, n, list]) => `<div><dt>${k}</dt><dd${list ? ' class="wrap"' : ''}><span class="hc-old">${o}</span>${ARROW}<span class="hc-new">${n}</span></dd></div>`).join('')}</dl>`}
        </div>
      </div>`).join('')}</div>` : '<p class="history-empty">No history yet</p>';
    openDrawer($('#hist-drawer'));
  }

  /* ---------- make an offline supplier online (confirm first, shared modal: js/modal.js) ---------- */
  async function askOnline(api, commit, v) {
    const ok = await Modal.open({
      tone: 'info',
      title: `Make ${v.name} online?`,
      message: 'It moves to Supplier List and is no longer marked Offline.',
      details: [['Supplier name', esc(v.name)], ['Supplier code', `<span class="hf-code">${esc(v.code)}</span>`],
        ['Reference code', esc(v.ref)], ['Short code', `<span class="hf-code">${esc(v.short)}</span>`]],
      note: 'It can’t be made offline again.',
      confirm: 'Make online',
    });
    if (!ok) return;
    commit();   // the drawer's values + offline → online, one history entry
    toast(`${api.name} is now online (Supplier List)`);
    render();
  }

  /* ---------- contacts drawer: the supplier's emails and phones ----------
     Each value: Send email / Call + Copy. A group with 2+ values has Copy all. Footer: Edit contacts (the edit drawer). */
  document.body.insertAdjacentHTML('beforeend', `<aside class="drawer drawer-narrow" id="contact-drawer" role="dialog" aria-modal="true" aria-labelledby="contact-title">
  <div class="drawer-head">
    <h2 id="contact-title">Contacts <span class="hist-name" id="contact-name"></span></h2>
    <button class="icon-btn" type="button" data-close aria-label="Close"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
  </div>
  <div class="drawer-body" id="contact-body"></div>
  <div class="drawer-foot" id="contact-foot">
    <button class="btn btn-secondary" type="button" data-close>Close</button>
    <button class="btn btn-primary" type="button" id="contact-edit">Edit contacts</button>
  </div>
</aside>
<div class="drawer-backdrop" data-close></div>`);
  const COPY_ICON = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2"/></svg>';
  const CHECK_ICON = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  const SEND_ICON = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 3 10 14"/><path d="M21 3l-7 18-4-7-7-4z"/></svg>';
  const CALL_ICON = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z"/><path d="M15 3h6v6M21 3l-6 6"/></svg>';
  let contactApi = null;
  function openContacts(api) {
    contactApi = api;
    $('#contact-name').textContent = `— ${api.name}`;
    // one group: icon + title (+ Copy all for 2+), then a row per value: the value, Send email / Call, Copy
    const group = (title, icon, items, act) => !items.length ? '' : `<section class="contact-group">
      <div class="contact-group-head"><span class="contact-ico">${icon}</span><h3>${title}</h3>
        ${items.length > 1 ? `<button class="btn-link contact-copy-all" type="button" data-copy="${esc(items.map(i => i.text).join(title === 'Emails' ? '; ' : ', '))}" data-copied="Copied ${items.length} ${title.toLowerCase()}">${COPY_ICON}Copy all</button>` : ''}</div>
      <ul>${items.map(i => `<li class="contact-row"><span class="contact-val">${i.html}</span>
        <a class="icon-btn" href="${i.href}"${title === 'Emails' ? ' target="_blank" rel="noopener"' : ''} data-tooltip="${act}" aria-label="${act} ${esc(i.text)}${title === 'Emails' ? ' (opens in a new tab)' : ''}">${title === 'Emails' ? SEND_ICON : CALL_ICON}</a>
        <button class="icon-btn contact-copy" type="button" data-copy="${esc(i.text)}" data-tooltip="Copy" aria-label="Copy ${esc(i.text)}">${COPY_ICON}</button></li>`).join('')}</ul></section>`;
    // the contacts are loaded when the drawer opens (a request in the real portal → short skeleton first)
    $('#contact-body').innerHTML = '<div class="contact-loading" aria-busy="true"><span></span><span></span><span></span></div>';
    $('#contact-foot').hidden = true;
    openDrawer($('#contact-drawer'));
    setTimeout(() => {
      const emails = api.emails.map(e => ({ text: e, html: esc(e), href: `mailto:${e}` }));
      // a phone shows its country code apart from the number (they are taken separately)
      const phones = api.phones.map(p => ({ text: HotelApis.phoneText(p), html: `${p.dial ? `<span class="contact-dial">${esc(p.dial)}</span>` : ''}${esc(p.number)}`, href: `tel:${p.dial}${p.number}` }));
      const html = group('Emails', MAIL_ICON, emails, 'Send email') + group('Phones', PHONE_ICON, phones, 'Call');
      $('#contact-body').innerHTML = html || `<div class="contact-empty"><span class="contact-empty-ico">${CONTACT_ICON}</span><p>No contacts added</p></div>`;
      $('#contact-edit').textContent = html ? 'Edit contacts' : 'Add contacts';
      $('#contact-foot').hidden = false;
    }, 350);
  }
  // Edit / Add contacts: this drawer closes, the supplier's edit drawer opens
  $('#contact-edit').addEventListener('click', () => { const api = contactApi; closeDrawers(); setTimeout(() => openEdit(api), 50); });
  // Copy: the value goes to the clipboard; the button turns into a tick for a moment
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) {
      const t = document.createElement('textarea'); t.value = text; t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.appendChild(t); t.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (e2) { /* blocked */ }
      t.remove(); return ok;
    }
  }
  $('#contact-body').addEventListener('click', async e => {
    // Send email: Firefox ignores target="_blank" on mailto: links (a webmail handler then replaces this page), so the
    // new tab is opened explicitly
    const mail = e.target.closest('a[href^="mailto:"]');
    if (mail) { e.preventDefault(); window.open(mail.href, '_blank', 'noopener'); return; }
    const b = e.target.closest('[data-copy]'); if (!b) return;
    const ok = await copyText(b.dataset.copy);
    toast(ok ? b.dataset.copied || `Copied ${b.dataset.copy}` : 'Couldn’t copy — select the text instead');
    if (!ok) return;
    const all = b.classList.contains('contact-copy-all'), idle = b.innerHTML;
    if (b._t) return;   // still showing "copied"
    b.classList.add('copied'); b.innerHTML = all ? `${CHECK_ICON}Copied` : CHECK_ICON; if (!all) b.dataset.tooltip = 'Copied';
    b._t = setTimeout(() => { b.classList.remove('copied'); b.innerHTML = idle; if (!all) b.dataset.tooltip = 'Copy'; b._t = null; }, 1500);
  });

  $('#btn-new').addEventListener('click', () => openEdit(null));
  $('#rows').addEventListener('click', e => {
    const ed = e.target.closest('[data-edit]'), hi = e.target.closest('[data-hist]'), co = e.target.closest('[data-contacts]');
    if (ed) openEdit(apis.find(a => a.id === +ed.dataset.edit));
    if (hi) openHistory(apis.find(a => a.id === +hi.dataset.hist));
    if (co) openContacts(apis.find(a => a.id === +co.dataset.contacts));
  });

  HotelApis.onChange(render);   // created / changed in another tab (e.g. the booking form)
  load();
  SearchableSelect.init();
})();
