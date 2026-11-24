/* Shared hotel API drawer — create / edit a hotel API. One drawer, used by:
   - Supplier List (New supplier, Edit)
   - Booking form › Supplier › "Other — add temporary supplier" (New temporary supplier)
   Saves into HotelApis.list (js/data.js), so an API created on one page is on the other.
   Needs css/components.css, js/data.js, js/select.js.

   ApiDrawer.open({ api, temporary, name, onSaved, onMakePermanent })
     api              the API to edit; omit to create
     temporary        create as a temporary supplier (title "New temporary supplier")
     name             prefill API name (create)
     onSaved(api, { created, changes })   after a save (the list is already saved)
     onMakePermanent(api, commit, values) edit of a temporary API: Make permanent (values = the form's name, code, ref, short)
                                          (the notice shows only when editing a temporary API). Called only once the
                                          form passes the permanent rules; commit() saves the form's values first.

   A temporary API is only created from the booking form and holds only what its form asks: TEMP_SKIP fields and the
   Active / Allow B2C switches are hidden there AND when editing a temporary API on Supplier List (it is Active and
   Allow B2C on, not asked). Make permanent first shows them; Reference code and Short code must then be filled. */
(function () {
  const TEMP_SKIP = ['ref', 'short'];
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  document.body.insertAdjacentHTML('beforeend', `<aside class="drawer" id="edit-drawer" role="dialog" aria-modal="true" aria-labelledby="edit-title">
  <div class="drawer-head">
    <div><h2 id="edit-title">New supplier</h2></div>
    <button class="icon-btn" type="button" data-close aria-label="Close"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
  </div>
  <form class="drawer-body" id="edit-form" novalidate>
    <div class="temp-note" id="temp-note" role="note" hidden>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/><path d="M12 7.5V12l3 2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
      <div><strong>Temporary supplier</strong><span>Make it permanent once it should stay.</span></div>
      <button class="btn btn-secondary" type="button" id="temp-note-btn">Make permanent</button>
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

  let editing = null, temporary = false, opts = {}, lastFocus = null;
  let permStep = false;   // editing a temporary API and Make permanent was clicked: the permanent-only fields are shown
  // API code and Short code: capital letters A–Z and digits 0–9 only — lower case turns upper case, anything else
  // (spaces, hyphens, symbols) is dropped as it is typed or pasted (caret kept)
  const codeOnly = v => v.toUpperCase().replace(/[^A-Z0-9]/g, '');
  ['code', 'short'].forEach(k => form.elements[k].addEventListener('input', e => {
    const el = e.target, clean = codeOnly(el.value);
    if (clean !== el.value) {
      const pos = codeOnly(el.value.slice(0, el.selectionStart)).length;   // caret after the same kept characters
      el.value = clean; el.setSelectionRange(pos, pos);
    }
  }));

  // the fields a temporary API doesn't have: hidden while the API is (or is being created as) temporary
  function syncTempFields() {
    const hide = editing ? editing.temporary && !permStep : temporary;
    TEMP_SKIP.forEach(k => { form.elements[k].closest('.field').hidden = hide; });
    ['active', 'b2c'].forEach(k => { form.elements[k].closest('.toggle-row').hidden = hide; });
  }
  function setTemporary(on) {
    temporary = on;
    $('#temp-note').hidden = !(editing && editing.temporary);
    syncTempFields();
    if (!editing) $('#edit-title').textContent = on ? 'New temporary supplier' : 'New supplier';
  }
  function open(o = {}) {
    opts = o; editing = o.api || null; permStep = false;
    form.reset();
    form.querySelectorAll('.field').forEach(f => f.classList.remove('invalid'));
    // no subtitle (same drawer header as every page): the API's name goes in the title
    $('#edit-title').textContent = editing ? `Edit supplier · ${editing.name}` : 'New supplier';
    $('#edit-submit').textContent = editing ? 'Save changes' : 'Create supplier';
    $('#temp-note-btn').hidden = false;
    const v = editing || { name: o.name || '', code: '', ref: '', short: '', currency: '', active: true, b2c: !!o.temporary, hold: false };
    ['name', 'code', 'ref', 'short', 'currency'].forEach(k => form.elements[k].value = v[k]);
    form.elements.currency._searchableRefresh?.();
    ['active', 'b2c', 'hold'].forEach(k => form.elements[k].checked = v[k]);
    setTemporary(!editing && !!o.temporary);
    lastFocus = document.activeElement;
    drawer.classList.add('open');
    setTimeout(() => (!editing && o.name ? form.elements.code : form.elements.name).focus(), 50);
  }
  function close() { if (!drawer.classList.contains('open')) return; drawer.classList.remove('open'); lastFocus?.focus?.(); }
  drawer.addEventListener('click', e => { if (e.target.closest('[data-close]')) close(); });
  drawer.nextElementSibling.addEventListener('click', close);   // backdrop
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  // Make permanent, step 1 (the notice's button): show the fields a permanent API needs, mark the empty ones; the
  // footer button becomes "Make permanent" and finishes it (step 2). Already complete → straight to step 2.
  function makePermanent() {
    if (!validate(true)) return;
    const values = Object.fromEntries(['name', 'code', 'ref', 'short'].map(k => [k, form.elements[k].value.trim()]));
    Promise.resolve(opts.onMakePermanent(editing, () => commit(true), values)).then(() => { if (editing && !editing.temporary) close(); });
  }
  $('#temp-note-btn').addEventListener('click', () => {
    if (!editing || !opts.onMakePermanent) return;
    permStep = true; syncTempFields();
    $('#temp-note-btn').hidden = true;
    $('#edit-submit').textContent = 'Make permanent';
    makePermanent();
  });
  // the page's Make permanent finished (edit): hide the notice; all fields now belong to the API
  const refreshNotice = () => {
    if (!editing) return;
    $('#temp-note').hidden = !editing.temporary; permStep = false; syncTempFields();
    $('#temp-note-btn').hidden = false; $('#edit-submit').textContent = 'Save changes';
  };

  /* strict = the permanent rules. Otherwise a temporary API may leave TEMP_SKIP fields empty. */
  function validate(strict) {
    const isTemp = editing ? editing.temporary : temporary;
    let ok = true;
    const val = k => form.elements[k].value.trim();
    ['name', 'code', 'ref', 'short', 'currency'].forEach(k => {
      const f = form.elements[k].closest('.field');
      const msg = f.querySelector('[data-msg]');
      let bad = !val(k) && (strict || !isTemp || !TEMP_SKIP.includes(k));
      if (msg) msg.textContent = '';   // empty → red border only
      // name, supplier code, reference code and short code are unique (two suppliers with one name can't be told apart in a dropdown)
      if (!bad && val(k) && k !== 'currency') {   // name and every code are unique
        const dup = HotelApis.list.find(a => a !== editing && a[k] && a[k].toLowerCase() === val(k).toLowerCase());
        if (dup) { bad = true; msg.textContent = k === 'name' ? 'Another supplier already has this name.' : `Already used by ${dup.name}.`; }
      }
      f.classList.toggle('invalid', bad);
      if (bad) ok = false;
    });
    if (!ok) (form.querySelector('.invalid .input:not(.searchable-select-native)') || form.querySelector('.invalid input'))?.focus();
    return ok;
  }

  // save the form's values into the list; returns [api, changes]
  // perm = making a temporary API permanent: the permanent-only fields are saved too. Otherwise a temporary API keeps
  // none of them (even if Make permanent showed them and Save was pressed instead).
  function commit(perm) {
    const val = k => form.elements[k].value.trim();
    const data = {};
    ['code', 'short'].forEach(k => { form.elements[k].value = codeOnly(val(k)); });
    ['name', 'code', 'ref', 'short', 'currency'].forEach(k => data[k] = val(k));
    ['active', 'b2c', 'hold'].forEach(k => data[k] = form.elements[k].checked);
    if (editing && editing.temporary && !perm) {
      TEMP_SKIP.forEach(k => { data[k] = editing[k]; });
      ['active', 'b2c'].forEach(k => { data[k] = editing[k]; });
    }
    let api, changes = [];
    if (editing) {
      changes = Object.keys(data).filter(k => data[k] !== editing[k]).map(k => [k, editing[k], data[k]]);
      if (changes.length) editing.history.unshift({ by: 'Super Admin', at: new Date(), changes });
      Object.assign(editing, data);
      api = editing;
    } else {
      api = { id: HotelApis.nextId(), ...data, temporary, history: [{ by: 'Super Admin', at: new Date(), created: true }] };
      HotelApis.list.push(api);
    }
    HotelApis.save();
    return [api, changes];
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    if (permStep) { makePermanent(); return; }   // making a temporary API permanent: the footer button finishes it
    if (!validate(false)) return;
    const created = !editing, [api, changes] = commit();
    drawer.classList.remove('open');
    opts.onSaved && opts.onSaved(api, { created, changes });
  });

  window.ApiDrawer = { open, close, refreshNotice, esc };
})();
