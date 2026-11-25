/* Shared supplier drawer — create / edit a supplier. One drawer, used by:
   - Supplier List (New supplier, Edit) — API suppliers
   - Offline Supplier List (New offline supplier, Edit) — offline suppliers
   - Booking form › Supplier › "Other — add offline supplier" (New offline supplier)
   Saves into HotelApis.list (js/data.js), so a supplier created on one page is on the others.
   Needs css/components.css, js/data.js, js/select.js.

   ApiDrawer.open({ api, offline, quick, name, onSaved, onMakeOnline })
     api              the supplier to edit; omit to create
     offline          create as an offline supplier (title "New offline supplier"); an edit follows api.offline
     quick            booking form: no Active switch (a supplier added there is always Active, so it can be picked)
     name             prefill Supplier name (create)
     onSaved(api, { created, changes })   after a save (the list is already saved)
     onMakeOnline(api, commit, values)    edit of an offline supplier: the "Offline supplier" notice + Make online.
                                          Called once the form passes the online rules (values = name, code, ref, short);
                                          commit() saves the form's values and makes it online (one history entry).

   Every supplier has Emails and Phones (any number of each): an offline supplier needs at least one email or phone,
   for an online supplier both are optional. A phone is { dial: '+60', number: '312345678' }:
   Country code (dropdown, RefData.countries) and Number (digits) are taken separately. An offline supplier has no API, so it has no
   Reference code, Short code or Allow B2C (hidden, saved empty / on) until it is made online. One-way: online can't
   be made offline. */
(function () {
  const OFFLINE_SKIP = ['ref', 'short'];
  const LISTS = { emails: { noun: 'email', type: 'email', ph: 'reservations@supplier.com' }, phones: { noun: 'phone', type: 'tel', ph: '312345678' } };
  const DIALS = RefData.countries.map(c => [c.dial, `${c.dial} ${c.name}`]);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const X_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
  document.body.insertAdjacentHTML('beforeend', `<aside class="drawer" id="edit-drawer" role="dialog" aria-modal="true" aria-labelledby="edit-title">
  <div class="drawer-head">
    <div><h2 id="edit-title">New supplier</h2></div>
    <button class="icon-btn" type="button" data-close aria-label="Close"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
  </div>
  <form class="drawer-body" id="edit-form" novalidate>
    <div class="type-note" id="type-note" role="note" hidden>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M2 8.8a15 15 0 0120 0M5 12.5a10 10 0 0114 0M8.5 16a5 5 0 017 0M12 19.5h.01"/><path d="M3 3l18 18"/></svg>
      <div><strong>Offline supplier</strong><span>Make it online once it is connected by API.</span></div>
      <button class="btn btn-secondary" type="button" id="type-note-btn">Make online</button>
    </div>
    <div class="form-section">
      <h3>Details</h3>
      <div class="field" style="margin-bottom:14px">
        <label for="e-name">Supplier name<span class="req">*</span></label>
        <input class="input" id="e-name" name="name" required placeholder="e.g. Hotelbeds">
        <span class="err" data-msg></span>
      </div>
      <div class="grid-2">
        <div class="field">
          <label for="e-code">Supplier code<span class="req">*</span></label>
          <input class="input mono" id="e-code" name="code" required placeholder="HBEDS">
          <span class="err" data-msg></span>
        </div>
        <div class="field">
          <label for="e-ref">Reference code<span class="req">*</span></label>
          <input class="input mono" id="e-ref" name="ref" required placeholder="5">
          <span class="err" data-msg></span>
        </div>
        <div class="field">
          <label for="e-short">Short code<span class="req">*</span></label>
          <input class="input mono" id="e-short" name="short" required placeholder="HB">
          <span class="err" data-msg></span>
        </div>
        <div class="field">
          <label for="e-currency">Currency<span class="req">*</span></label>
          <select class="input" id="e-currency" name="currency" required><option value="">Select currency</option></select>
          <span class="err"></span>
        </div>
      </div>
    </div>

    <div class="form-section" id="e-contacts">
      <h3>Contacts</h3>
      <p class="section-hint" id="e-contacts-hint" hidden>Add at least one email or phone.</p>
      ${Object.entries(LISTS).map(([k, l]) => `
      <div class="field multi-field" data-list="${k}">
        <label id="e-${k}-lbl">${k === 'emails' ? 'Emails' : 'Phones'}</label>
        <div class="multi-rows" role="group" aria-labelledby="e-${k}-lbl"></div>
        <button class="btn-add-row" type="button" data-add="${k}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>Add ${l.noun}</button>
      </div>`).join('')}
    </div>

    <div class="form-section">
      <h3>Status &amp; booking options</h3>
      <div class="toggle-list">
        <label class="toggle-row"><div><div class="t">Active</div><div class="d">Inactive suppliers are not used for search or booking.</div></div>
          <span class="switch"><input type="checkbox" name="active"><span></span></span></label>
        <label class="toggle-row"><div><div class="t">Allow B2C</div><div class="d">Make this supplier available to B2C customers.</div></div>
          <span class="switch"><input type="checkbox" name="b2c"><span></span></span></label>
        <label class="toggle-row"><div><div class="t">Hold booking</div><div class="d">Allow bookings to be placed on hold, free of charge.</div></div>
          <span class="switch"><input type="checkbox" name="hold"><span></span></span></label>
      </div>
    </div>
  </form>
  <div class="drawer-foot">
    <button class="btn btn-secondary" type="button" data-close>Cancel</button>
    <button class="btn btn-primary" type="submit" form="edit-form" id="edit-submit">Create supplier</button>
  </div>
</aside>
<div class="drawer-backdrop" data-close></div>`);
  const drawer = document.getElementById('edit-drawer'), form = document.getElementById('edit-form');
  const $ = s => drawer.querySelector(s);
  HotelApis.CURRENCIES.forEach(c => form.elements.currency.add(new Option(c, c)));
  if (window.SearchableSelect) SearchableSelect.enhance(form.elements.currency);

  let editing = null, offline = false, opts = {}, lastFocus = null;
  let onlineStep = false;   // editing an offline supplier and Make online was clicked: the online-only fields are shown
  // Supplier code and Short code: capital letters A–Z and digits 0–9 only — lower case turns upper case, anything else
  // (spaces, hyphens, symbols) is dropped as it is typed or pasted (caret kept)
  const codeOnly = v => v.toUpperCase().replace(/[^A-Z0-9]/g, '');
  ['code', 'short'].forEach(k => form.elements[k].addEventListener('input', e => {
    const el = e.target, clean = codeOnly(el.value);
    if (clean !== el.value) {
      const pos = codeOnly(el.value.slice(0, el.selectionStart)).length;   // caret after the same kept characters
      el.value = clean; el.setSelectionRange(pos, pos);
    }
  }));
  // Phone number: digits only (anything else is dropped as typed or pasted)
  const phoneOnly = v => v.replace(/\D/g, '');

  /* ---------- Emails / Phones: one input per value; Add adds a row, × removes one (the last row can't be removed) ---------- */
  const listBox = k => $(`[data-list="${k}"] .multi-rows`);
  const rowsOf = k => [...listBox(k).querySelectorAll('.multi-val')];   // each row's text input (email / phone number)
  const dialOf = inp => inp.closest('.multi-row').querySelector('select.phone-dial');
  // a phone row = Country code dropdown + Number; a new phone row starts with the row above's country code
  function addRow(k, value = '', focus = false) {
    const l = LISTS[k], n = listBox(k).children.length + 1, phone = k === 'phones';
    const prevDial = phone ? (rowsOf(k).at(-1) && dialOf(rowsOf(k).at(-1)).value) || '' : '';
    const v = phone ? (value || { dial: prevDial, number: '' }) : value;
    listBox(k).insertAdjacentHTML('beforeend', `<div class="multi-row"><div class="multi-input">
      ${phone ? `<select class="input phone-dial" aria-label="Country code ${n}" data-panel-width="260"><option value="" data-placeholder>Code</option>${DIALS.map(([d, t]) => `<option value="${d}" data-short="${d}"${d === v.dial ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select>` : ''}
      <input class="input multi-val" type="${l.type}" inputmode="${phone ? 'numeric' : 'email'}" value="${esc(phone ? v.number : v)}" placeholder="${phone ? 'Number' : l.ph}" aria-label="${phone ? 'Phone number' : 'Email'} ${n}" autocomplete="off">
      <button class="icon-btn multi-rm" type="button" data-rm aria-label="Remove ${l.noun} ${n}" data-tooltip="Remove">${X_ICON}</button></div>
      <span class="err" data-msg></span></div>`);
    if (phone) {
      const sel = listBox(k).lastElementChild.querySelector('select');
      if (window.SearchableSelect && !sel._searchableRefresh) SearchableSelect.enhance(sel);
      // the field shows only the code ("+60"), the list shows code + country (data-short / data-panel-width, js/select.js)
      sel.addEventListener('change', () => { if (listBox(k).closest('.invalid')) validateList(k); });
    }
    syncRows(k);
    if (focus) rowsOf(k).at(-1).focus();
  }
  const syncRows = k => { const rows = listBox(k).querySelectorAll('.multi-row'); rows.forEach(r => { r.querySelector('[data-rm]').hidden = rows.length === 1; }); };
  const setList = (k, values) => { listBox(k).innerHTML = ''; (values.length ? values : ['']).forEach(v => addRow(k, v)); };
  // filled values only (an empty extra row is ignored; a phone row counts once its number is filled)
  const listValues = k => k === 'phones'
    ? rowsOf(k).map(i => ({ dial: dialOf(i).value, number: i.value.trim() })).filter(p => p.number)
    : rowsOf(k).map(i => i.value.trim()).filter(Boolean);
  drawer.addEventListener('click', e => {
    const add = e.target.closest('[data-add]');
    if (add) addRow(add.dataset.add, '', true);
    const rm = e.target.closest('[data-rm]');
    if (rm) {
      const field = rm.closest('[data-list]'), k = field.dataset.list, row = rm.closest('.multi-row');
      const next = row.nextElementSibling || row.previousElementSibling;
      row.remove(); syncRows(k);
      rowsOf(k).forEach((inp, i) => { inp.setAttribute('aria-label', `${k === 'emails' ? 'Email' : 'Phone number'} ${i + 1}`); });
      next?.querySelector('input')?.focus();
      if (field.classList.contains('invalid')) validateList(k);
    }
  });
  listBox('phones').addEventListener('input', e => {
    const el = e.target; if (!el.classList.contains('multi-val')) return;
    const clean = phoneOnly(el.value);
    if (clean !== el.value) { const pos = phoneOnly(el.value.slice(0, el.selectionStart)).length; el.value = clean; el.setSelectionRange(pos, pos); }
  });

  // fields only an online supplier has (Reference / Short code, Allow B2C): hidden while offline, until Make online
  function syncKind() {
    const hide = offline && !onlineStep;
    OFFLINE_SKIP.forEach(k => { form.elements[k].closest('.field').hidden = hide; });
    form.elements.b2c.closest('.toggle-row').hidden = hide;
    form.elements.active.closest('.toggle-row').hidden = !!opts.quick;
    $('#type-note').hidden = !(editing && editing.offline && opts.onMakeOnline);
    $('#e-contacts-hint').hidden = !offline;
  }
  function open(o = {}) {
    opts = o; editing = o.api || null; onlineStep = false;
    offline = editing ? !!editing.offline : !!o.offline;
    $('#type-note-btn').hidden = false;
    form.reset();
    form.querySelectorAll('.field').forEach(f => f.classList.remove('invalid'));
    form.querySelectorAll('[data-msg]').forEach(m => { m.textContent = ''; });
    // no subtitle (same drawer header as every page): the supplier's name goes in the title
    const noun = offline ? 'offline supplier' : 'supplier';
    $('#edit-title').textContent = editing ? `Edit ${noun} · ${editing.name}` : `New ${noun}`;
    $('#edit-submit').textContent = editing ? 'Save changes' : 'Create supplier';
    const v = editing || { name: o.name || '', code: '', ref: '', short: '', currency: '', active: true, b2c: offline, hold: false, emails: [], phones: [] };
    ['name', 'code', 'ref', 'short', 'currency'].forEach(k => form.elements[k].value = v[k]);
    form.elements.currency._searchableRefresh?.();
    ['active', 'b2c', 'hold'].forEach(k => form.elements[k].checked = v[k]);
    Object.keys(LISTS).forEach(k => setList(k, v[k] || []));
    syncKind();
    lastFocus = document.activeElement;
    drawer.classList.add('open');
    setTimeout(() => (!editing && o.name ? form.elements.code : form.elements.name).focus(), 50);
  }
  function close() { if (!drawer.classList.contains('open')) return; drawer.classList.remove('open'); lastFocus?.focus?.(); }
  drawer.addEventListener('click', e => { if (e.target.closest('[data-close]')) close(); });
  drawer.nextElementSibling.addEventListener('click', close);   // backdrop
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

  // Make online, step 1 (the notice's button): show Reference code, Short code and Allow B2C, mark the empty codes; the
  // footer button becomes "Make online" and finishes it (step 2: the online rules pass → the page's confirm)
  function makeOnline() {
    if (!validate(true)) return;
    const values = Object.fromEntries(['name', 'code', 'ref', 'short'].map(k => [k, form.elements[k].value.trim()]));
    Promise.resolve(opts.onMakeOnline(editing, () => commit(true), values)).then(() => { if (editing && !editing.offline) close(); });
  }
  $('#type-note-btn').addEventListener('click', () => {
    if (!editing || !opts.onMakeOnline) return;
    onlineStep = true; syncKind();
    $('#type-note-btn').hidden = true;
    $('#edit-submit').textContent = 'Make online';
    makeOnline();
  });

  /* Emails / Phones: optional (none is fine); each filled value must be valid and listed once. Messages only for a
     wrong value. A phone with a number but no country code → red border on the code (no message). */
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  function validateList(k) {
    const inputs = rowsOf(k), seen = new Set(); let ok = true;
    inputs.forEach(inp => {
      const v = inp.value.trim(), row = inp.closest('.multi-row'), msg = row.querySelector('[data-msg]');
      let bad = false, badDial = false; msg.textContent = '';
      if (v) {
        const dial = k === 'phones' ? dialOf(inp).value : '';
        const key = k === 'emails' ? v.toLowerCase() : dial + v;
        if (k === 'emails' && !EMAIL.test(v)) { bad = true; msg.textContent = 'Enter a valid email address, e.g. name@supplier.com.'; }
        else if (k === 'phones' && (v.length < 6 || v.length > 15)) { bad = true; msg.textContent = 'Enter 6–15 digits.'; }
        else if (seen.has(key)) { bad = true; msg.textContent = 'Already added above.'; }
        if (k === 'phones' && !dial) badDial = true;
        seen.add(key);
      }
      row.classList.toggle('invalid', bad);
      row.classList.toggle('dial-invalid', badDial);
      if (bad || badDial) ok = false;
    });
    inputs[0].closest('[data-list]').classList.toggle('invalid', !ok || !!listBox(k).querySelector('.none-invalid'));
    return ok;
  }
  /* offline supplier: at least one email or phone (online: none is fine). None → red border on the first email and the
     first phone number; the section's hint already says the rule, so no message. */
  const contactsMissing = () => !listValues('emails').length && !listValues('phones').length;
  function markNoContacts(on) {
    Object.keys(LISTS).forEach(k => {
      const row = listBox(k).querySelector('.multi-row');
      row.classList.toggle('none-invalid', on);
      row.closest('[data-list]').classList.toggle('invalid', on || !!listBox(k).querySelector('.multi-row.invalid, .multi-row.dial-invalid'));
    });
  }
  // re-check a list as it is fixed (once it has been marked); a value in either list clears "none"
  drawer.addEventListener('input', e => {
    if (!e.target.closest('[data-list]')) return;
    if (drawer.querySelector('.none-invalid') && !contactsMissing()) markNoContacts(false);
    const f = e.target.closest('[data-list].invalid');
    if (f && f.querySelector('.multi-row.invalid, .multi-row.dial-invalid')) validateList(f.dataset.list);
  });

  // strict = the online rules (Make online): Reference code and Short code required too
  function validate(strict) {
    let ok = true;
    const val = k => form.elements[k].value.trim();
    ['name', 'code', 'ref', 'short', 'currency'].forEach(k => {
      const f = form.elements[k].closest('.field');
      const msg = f.querySelector('[data-msg]');
      let bad = !val(k) && !(offline && !strict && OFFLINE_SKIP.includes(k));
      if (msg) msg.textContent = '';   // empty → red border only
      // name and every code are unique across all suppliers, API and offline (two with one name can't be told apart in a dropdown)
      if (!bad && val(k) && k !== 'currency') {
        const dup = HotelApis.list.find(a => a !== editing && a[k] && a[k].toLowerCase() === val(k).toLowerCase());
        if (dup) { bad = true; msg.textContent = k === 'name' ? 'Another supplier already has this name.' : `Already used by ${dup.name}.`; }
      }
      f.classList.toggle('invalid', bad);
      if (bad) ok = false;
    });
    Object.keys(LISTS).forEach(k => { if (!validateList(k)) ok = false; });
    const none = offline && !strict && contactsMissing();   // Make online (strict) = online rules: contacts optional
    markNoContacts(none);
    if (none) ok = false;
    // focus the first wrong field (in a list: the wrong row, not the list's first row)
    if (!ok) (form.querySelector('.field.invalid:not(.multi-field) .input:not(.searchable-select-native), .multi-row.invalid .multi-val, .multi-row.dial-invalid .searchable-select-trigger, .multi-row.none-invalid .multi-val') || form.querySelector('.invalid input'))?.focus();
    return ok;
  }

  // save the form's values into the list; returns [api, changes]
  // online = Make online: the online-only fields are saved too and the supplier stops being offline. Otherwise an offline
  // supplier keeps none of them (even if Make online showed them and Save was pressed instead).
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  function commit(online) {
    const val = k => form.elements[k].value.trim();
    const data = {};
    ['code', 'short'].forEach(k => { form.elements[k].value = codeOnly(val(k)); });
    ['name', 'code', 'ref', 'short', 'currency'].forEach(k => data[k] = val(k));
    ['active', 'b2c', 'hold'].forEach(k => data[k] = form.elements[k].checked);
    Object.keys(LISTS).forEach(k => data[k] = listValues(k));
    if (offline && !online) { OFFLINE_SKIP.forEach(k => { data[k] = ''; }); data.b2c = editing ? editing.b2c : true; }
    if (online) data.offline = false;
    if (opts.quick && !editing) data.active = true;
    let api, changes = [];
    if (editing) {
      changes = Object.keys(data).filter(k => !same(data[k], editing[k])).map(k => [k, editing[k], data[k]]);
      if (changes.length) editing.history.unshift({ by: 'Super Admin', at: new Date(), changes });
      Object.assign(editing, data);
      api = editing;
    } else {
      api = { id: HotelApis.nextId(), ...data, offline, history: [{ by: 'Super Admin', at: new Date(), created: true }] };
      HotelApis.list.push(api);
    }
    HotelApis.save();
    return [api, changes];
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    if (onlineStep) { makeOnline(); return; }   // making an offline supplier online: the footer button finishes it
    if (!validate(false)) return;
    const created = !editing, [api, changes] = commit();
    drawer.classList.remove('open');
    opts.onSaved && opts.onSaved(api, { created, changes });
  });

  window.ApiDrawer = { open, close, esc };
})();
