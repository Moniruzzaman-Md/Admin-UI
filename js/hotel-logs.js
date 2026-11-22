/* Hotel Logs page prototype: the agents' hotel API calls (one row per call, Request + Response files).
   Dummy data only (made-up agents, transaction IDs, IPs from the documentation ranges, hotels and payloads). */
(function () {
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toast = msg => { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2400); };

  /* ---------- dummy data ---------- */
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const pick = a => a[Math.floor(rnd() * a.length)];
  const digits = n => Array.from({ length: n }, () => Math.floor(rnd() * 10)).join('');
  const hex = n => Array.from({ length: n }, () => '0123456789abcdef'[Math.floor(rnd() * 16)]).join('');
  const uuid = () => `${hex(8)}-${hex(4)}-4${hex(3)}-${'89ab'[Math.floor(rnd() * 4)]}${hex(3)}-${hex(12)}`;
  // shared lists: js/data.js RefData. Client = a Partner: a row keeps its id; name and SL No. are looked up when drawn
  const AGENTS = RefData.partners.map(p => p.id);
  const PARTNER = Object.fromEntries(RefData.partners.map(p => [p.id, p]));
  const agName = id => PARTNER[id].name, agSl = id => PARTNER[id].slNo;
  const IPS = ['203.0.113.24', '203.0.113.190', '198.51.100.17', '198.51.100.186', '192.0.2.74'];
  const HOTELS = RefData.hotels;
  // [city, country, country code] for the cities the dummy calls use
  const CITIES = ['Phuket', 'Kuala Lumpur', 'Bali', 'Bangkok'].map(city => { const c = RefData.countries.find(x => (x.cities || []).includes(city)); return [city, c.name, c.code]; });
  const PORTALS = ['B2B', ...RefData.portals];   // where the transaction came from (B2B weighted double)
  const ROOMS = RefData.roomTypes;
  // the operations as the live log names them; the system's own calls (booking_details) have no agent and come from 127.0.0.1
  const OPS = ['search', 'paginated_search', 'availability', 'reprice', 'cancellation_policy', 'prebook', 'booking', 'booking_details', 'v2_cancellation_charges', 'v2_cancel_booking'];

  const logs = [];
  let rowId = 98000;
  const today = new Date(); today.setHours(0, 0, 0, 0);

  // one transaction = an agent's booking journey; each call = one row (Request + Response files)
  function journey(txn, agent, ip, start, ctx) {
    let t = +start;
    const add = (type, gap, sys) => {
      t += gap * 1000 + Math.floor(rnd() * 1500);
      if (t > Date.now()) return false;
      logs.push({ id: rowId++, txn, type, agent: sys ? null : agent, ip: sys ? '127.0.0.1' : ip, date: new Date(t), logId: uuid(),
        hasRequest: rnd() > .03, ctx });
      return true;
    };
    if (!add('search', 0)) return;
    if (rnd() < .4) add('paginated_search', 6);
    if (rnd() < .3) return;
    add('availability', 15);
    if (rnd() < .35) return;
    add('reprice', 9); add('cancellation_policy', 1); add('prebook', 1);
    if (rnd() < .4) return;
    add('booking', 35);
    if (!add('booking_details', 45, true)) return;
    if (rnd() < .5) return;
    add('v2_cancellation_charges', 600); if (rnd() < .7) add('v2_cancel_booking', 12);
  }
  for (let d = 0; d < 12; d++) {
    const n = d === 0 ? 4 : 2 + Math.floor(rnd() * 4);
    for (let i = 0; i < n; i++) {
      const start = new Date(today); start.setDate(start.getDate() - d); start.setHours(8 + Math.floor(rnd() * 10), Math.floor(rnd() * 60), Math.floor(rnd() * 60));
      if (start > new Date()) start.setTime(Date.now() - (i + 1) * 1800e3);
      const a = rnd() < .12 ? null : pick(AGENTS);           // some agent calls come in without a resolved agent (as live)
      journey('NZH' + digits(15), a, pick(IPS), start, { portal: pick(PORTALS), hotel: pick(HOTELS), hotelId: String(800000 + Math.floor(rnd() * 99999)), city: pick(CITIES), room: pick(ROOMS),
        nights: 1 + Math.floor(rnd() * 4), price: +(30 + rnd() * 900).toFixed(2), guest: pick([['MRS', 'NADIA', 'RAHMAN', 'Female'], ['MR', 'AARON', 'TAN', 'Male'], ['MS', 'LINA', 'WONG', 'Female']]) });
    }
  }
  logs.sort((a, b) => b.date - a.date || b.id - a.id);   // newest first (as the live list)

  /* ---------- fake file content: the stored JSON (wrapper + data) ---------- */
  function content(l, kind) {
    const c = l.ctx, ci = new Date(today); ci.setMonth(ci.getMonth() + 3); const co = new Date(ci); co.setDate(co.getDate() + c.nights);
    const iso = d => d.toISOString().slice(0, 10);
    const key = () => btoa(String(l.id) + hex(40)).replace(/=+$/, '');
    const reqTs = new Date(+l.date - 2500).toISOString().replace('Z', '000Z');
    const rooms = [{ adults: 2, childAges: [] }];
    const room = (price) => ({ roomType: c.room, price, mealInfo: { mealCode: 'RO', fullMealDetails: RefData.mealName('RO') }, refundable: true, rateKey: key() });
    let data;
    if (kind === 'Request') {
      data = ({
        search: { cityId: 84766, checkIn: iso(ci), checkOut: iso(co), nationality: 'MY', currency: 'MYR', rooms },
        paginated_search: { searchId: l.txn, page: 2, pageSize: 20 },
        availability: { searchKeys: [key()] },
        reprice: { rateKeys: [key()] },
        cancellation_policy: { rateKey: key() },
        prebook: { rateKey: key(), totalPrice: c.price },
        booking: { uniqueTransId: l.txn, rateKey: key(), guests: [{ isLead: true, type: 'ADT', title: c.guest[0], firstName: c.guest[1], lastName: c.guest[2], gender: c.guest[3], nationality: 'MALAYSIAN' }], contact: { email: 'guest@example.com', phone: '60100000000' } },
        booking_details: { uniqueTransId: l.txn },
        v2_cancellation_charges: { uniqueTransId: l.txn },
        v2_cancel_booking: { uniqueTransId: l.txn, reason: 'Customer request' },
      })[l.type];
    } else {
      const hotel = (name, i) => ({ hotelId: String(+c.hotelId + i * 37), hotelName: name, starRating: 2 + (i % 4), address: { cityName: c.city[0], countryName: c.city[1], countryCode: c.city[2] }, minPrice: +(c.price * (0.7 + (i % 5) / 10)).toFixed(2), currency: 'MYR', searchKey: key() });
      const base = { hotelName: c.hotel, hotelId: c.hotelId, address: { fullAddress: '12 Harbour Road', cityName: c.city[0], countryName: c.city[1], countryCode: c.city[2] }, checkInDate: iso(ci), checkOutDate: iso(co) };
      data = ({
        search: { searchResponse: { searchId: l.txn, totalHotels: 186, page: 1, hotels: HOTELS.concat(HOTELS.map(h => h + ' Annex'), HOTELS.map(h => h + ' Central')).map(hotel) } },
        paginated_search: { searchResponse: { searchId: l.txn, totalHotels: 186, page: 2, hotels: HOTELS.map((h, i) => hotel(h + ' Plaza', i + 3)) } },
        availability: { availabilityResponse: { hotel: { ...base, rooms: [room(c.price), room(+(c.price * 1.18).toFixed(2))] } } },
        reprice: { repriceResponse: { priceChanged: false, totalPrice: c.price, currency: 'MYR' } },
        cancellation_policy: { cancellationPolicyResponse: { refundable: true, policies: [{ from: iso(today), charge: 0 }, { from: iso(new Date(+ci - 7 * 864e5)), charge: c.price }] } },
        prebook: { prebookResponse: { ...base, totalPrice: c.price, priceChanged: false, bookingKey: key() } },
        booking: { bookResponse: { ...base, uniqueTransId: l.txn, bookingId: null, bookingDate: iso(l.date), totalPrice: c.price, roomDetails: [{ roomNo: '1', ...room(c.price), status: 'Pending' }] } },
        booking_details: { bookingDetailsResponse: { ...base, uniqueTransId: l.txn, bookingId: 'BK' + l.txn.slice(-8), status: 'Confirmed', totalPrice: c.price } },
        v2_cancellation_charges: { cancellationChargesResponse: { uniqueTransId: l.txn, cancellationCharge: 0, refundAmount: c.price, currency: 'MYR' } },
        v2_cancel_booking: { cancelBookingResponse: { uniqueTransId: l.txn, status: 'Cancelled', refundAmount: c.price, currency: 'MYR' } },
      })[l.type];
    }
    return JSON.stringify({ unique_transaction_id: l.txn, log_id: l.logId, type: l.type, timestamp: kind === 'Request' ? reqTs : l.date.toISOString().replace('Z', '000Z'), data_type: kind.toLowerCase(), data });
  }

  /* ---------- formatting ---------- */
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const p2 = n => String(n).padStart(2, '0');
  const fDate = d => `${p2(d.getDate())}-${MON[d.getMonth()]}-${d.getFullYear()}`;
  const fTime = d => `${p2(d.getHours() % 12 || 12)}:${p2(d.getMinutes())}:${p2(d.getSeconds())} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
  const txnBadge = id => `<button type="button" class="tbl-code is-copy" data-copy="${id}" data-tooltip="Copy transaction ID" aria-label="Copy transaction ID ${id}">${id}</button>`;

  /* ---------- filters + table ---------- */
  // applied filters (what the list shows); the fields are applied only on Search / Enter
  const DEFAULTS = () => ({ txn: '', agent: '', op: '', portal: '', from: new Date(today), to: new Date(today) });
  const state = Object.assign(DEFAULTS(), { page: 1, size: 20 });
  const fOp = $('#f-op'), fAgent = $('#f-client'), fPortal = $('#f-portal');
  OPS.forEach(o => fOp.add(new Option(o, o)));
  RefData.portals.forEach(p => fPortal.add(new Option(p, p)));

  const filtered = () => {
    const from = +state.from, to = +state.to + 864e5 - 1, q = state.txn.trim().toUpperCase(), ag = state.agent.trim().toLowerCase();
    return logs.filter(l => l.date >= from && l.date <= to
      && (!q || l.txn.includes(q))
      && (!ag || (l.agent && (agName(l.agent).toLowerCase().includes(ag) || agSl(l.agent).includes(ag))))
      && (!state.op || l.type === state.op)
      && (!state.portal || l.ctx.portal === state.portal));
  };

  function pageList(page, pages) {
    if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
    const set = new Set([1, pages, page - 1, page, page + 1].filter(n => n >= 1 && n <= pages));
    const out = []; let prev = 0;
    [...set].sort((a, b) => a - b).forEach(n => { if (n - prev > 1) out.push('…'); out.push(n); prev = n; });
    return out;
  }

  let pageRows = [];
  function render() {
    const list = filtered();
    const pages = Math.max(1, Math.ceil(list.length / state.size));
    state.page = Math.min(state.page, pages);
    const start = (state.page - 1) * state.size;
    pageRows = list.slice(start, start + state.size);

    $('#rows').innerHTML = pageRows.length ? pageRows.map((l, i) => `
      <tr class="row-link${l.id === lastOpened ? ' is-last-opened' : ''}" data-row="${i}" tabindex="0" aria-label="Open ${esc(l.type)} log">
        <td class="tbl-num">${start + i + 1}</td>
        <td><span class="tbl-stack"><span>${fDate(l.date)}</span><small>${fTime(l.date)}</small></span></td>
        <td>${esc(l.ctx.portal)}</td>
        <td>${l.agent ? esc(agName(l.agent)) : '<span class="tbl-muted">—</span>'}</td>
        <td>${l.agent ? agSl(l.agent) : '<span class="tbl-muted">—</span>'}</td>
        <td>${txnBadge(l.txn)}</td>
        <td><span class="tbl-strong">${esc(l.type)}</span></td>
        <td>${l.ip}</td>
      </tr>`).join('')
      : EmptyState.row(8);

    $('#pg-range').textContent = list.length ? `${start + 1}–${start + pageRows.length}` : '0';
    $('#pg-total').textContent = list.length.toLocaleString('en-US');
    $('#pg-mobile').textContent = `Page ${state.page} of ${pages}`;
    $('#pg-prev').disabled = state.page === 1;
    $('#pg-next').disabled = state.page === pages;
    $('#pg-pages').innerHTML = pageList(state.page, pages).map(n => n === '…'
      ? '<span class="pagination__ellipsis">…</span>'
      : `<button type="button" class="pagination__page${n === state.page ? ' pagination__page--active' : ''}" data-pg="${n}"${n === state.page ? ' aria-current="page"' : ''} aria-label="Page ${n}${n === state.page ? ', current page' : ''}">${n}</button>`).join('');
  }

  // date fields: To can't be before From, From can't be after To
  const draft = { from: new Date(today), to: new Date(today) };
  const fromField = DateField.init($('#f-from'), { date: draft.from, max: draft.to, onChange(d) { draft.from = d; toField.setMin(d); bar.update(); } });
  const toField = DateField.init($('#f-to'), { date: draft.to, min: draft.from, onChange(d) { draft.to = d; fromField.setMax(d); bar.update(); } });

  // a query in the real portal → skeleton first
  const load = () => TableLoading.run($('.tbl-area'), render);
  function applyFilters() {
    Object.assign(state, { txn: $('#f-txn').value.trim(), agent: fAgent.value.trim(), op: fOp.value, portal: fPortal.value, from: new Date(draft.from), to: new Date(draft.to), page: 1 });
    load();
  }
  function setFields(v) {
    $('#f-txn').value = v.txn; fAgent.value = v.agent; fOp.value = v.op; fPortal.value = v.portal;
    draft.from = v.from; draft.to = v.to;
    fromField.setMax(v.to); toField.setMin(v.from); fromField.set(v.from); toField.set(v.to);
  }
  const fmtDay = d => `${p2(d.getDate())} ${MON[d.getMonth()]} ${d.getFullYear()}`;
  const bar = FilterBar.init($('#filter-bar'), {
    fields: [
      { label: 'From', isSet: () => +draft.from !== +today, text: () => fmtDay(draft.from), clear: () => { draft.from = new Date(today); fromField.set(draft.from); toField.setMin(draft.from); } },
      { label: 'To', isSet: () => +draft.to !== +today, text: () => fmtDay(draft.to), clear: () => { draft.to = new Date(today); toField.set(draft.to); fromField.setMax(draft.to); } },
      { label: 'Platform type', isSet: () => !!fPortal.value, text: () => fPortal.value, clear: () => { fPortal.value = ''; } },
      { label: 'Client', isSet: () => !!fAgent.value.trim(), text: () => fAgent.value.trim(), clear: () => { fAgent.value = ''; } },
      { label: 'Operation type', isSet: () => !!fOp.value, text: () => fOp.value, clear: () => { fOp.value = ''; } },
    ],
    onSearch: applyFilters,
    onReset: () => { setFields(DEFAULTS()); applyFilters(); },
  });
  // row click (or Enter / Space on a focused row) opens the call's files; the transaction badge copies
  $('#rows').addEventListener('click', e => {
    const cp = e.target.closest('[data-copy]');
    if (cp) return copy(cp.dataset.copy, cp);
    if (window.getSelection().toString()) return;   // selecting text in a row isn't a click
    const r = e.target.closest('tr[data-row]'); if (r) openLog(pageRows[r.dataset.row]);
  });
  $('#rows').addEventListener('keydown', e => {
    if ((e.key !== 'Enter' && e.key !== ' ') || !e.target.matches('tr[data-row]')) return;
    e.preventDefault(); openLog(pageRows[e.target.dataset.row]);
  });
  $('#pg-pages').addEventListener('click', e => { const b = e.target.closest('[data-pg]'); if (b) { state.page = +b.dataset.pg; load(); } });
  $('#pg-prev').addEventListener('click', () => { state.page--; load(); });
  $('#pg-next').addEventListener('click', () => { state.page++; load(); });
  $('#pg-size').addEventListener('change', e => { state.size = +e.target.value; state.page = 1; load(); });

  /* ---------- file fetch + download ---------- */
  const utf8 = new TextEncoder();
  function sizeLabel(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1023.5) return `${kb < 9.95 ? kb.toFixed(1) : Math.round(kb)} KB`;
    const mb = kb / 1024;
    return `${mb < 9.95 ? mb.toFixed(1) : Math.round(mb)} MB`;
  }
  const MIME = { json: 'application/json', xml: 'application/xml', html: 'text/html', txt: 'text/plain' };
  const fileKey = (l, kind) => `${l.id}|${kind}`;
  /* simulated hotel-log-json?id=…&type=request|response → the stored JSON, after a delay.
     Each file is fetched once and kept. A few fail on the first try, to show the error state; Try again succeeds. */
  const fileCache = new Map(), failedOnce = new Set();
  function fetchFile(l, kind) {
    const k = fileKey(l, kind);
    if (fileCache.has(k)) return Promise.resolve(fileCache.get(k));
    return new Promise((res, rej) => setTimeout(() => {
      if (l.id % 19 === 0 && !failedOnce.has(k)) { failedOnce.add(k); return rej(new Error('The server didn’t respond in time.')); }
      const raw = content(l, kind); fileCache.set(k, raw); res(raw);
    }, 400 + Math.random() * 900));
  }
  // same file name as the live Download: <operation>-<transaction ID>-<request|response>.<ext>
  function download(l, kind, ext) {
    const raw = fileCache.get(fileKey(l, kind)); if (raw == null) return;
    ext = ext || 'json';
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([raw], { type: MIME[ext] }));
    a.download = `${l.type}-${l.txn}-${kind.toLowerCase()}.${ext}`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  /* ---------- viewer ---------- */
  // one call = its Request and Response files. The switch picks which one shows (or both side by side);
  // the choice stays for the next call opened on this page. A call without a saved request opens on Response.
  let cur = null, lastOpened = null, lastFocus = null;
  const drawer = $('#log-drawer');
  const view = { want: 'Response', split: false };
  const wide = matchMedia('(min-width: 1100px)');      // narrower screens: no room for two panes (the option is hidden)

  function openLog(l) {
    if (!drawer.classList.contains('open')) lastFocus = document.activeElement;
    show(l);
    drawer.classList.add('open');
  }
  function show(l) {
    cur = l;
    lastOpened = l.id;
    document.querySelectorAll('.is-last-opened').forEach(x => x.classList.remove('is-last-opened'));
    const i = pageRows.indexOf(l); if (i >= 0) $(`#rows tr[data-row="${i}"]`)?.classList.add('is-last-opened');

    const split = view.want === 'Both' && l.hasRequest && wide.matches;
    const kind = !l.hasRequest ? 'Response' : view.want === 'Both' ? 'Response' : view.want;
    const wasOpen = drawer.classList.contains('open'), wasSplit = drawer.classList.contains('is-split');
    drawer.classList.toggle('can-resize', wasOpen);
    drawer.classList.toggle('is-split', split);
    if (wasOpen && split && !wasSplit) {
      const el = panes[1].el;
      el.classList.add('is-entering');
      el.addEventListener('animationend', () => el.classList.remove('is-entering'), { once: true });
    }

    $('#log-title').textContent = l.type;
    $('#lm-txn').innerHTML = txnBadge(l.txn);
    $('#lm-agent').innerHTML = l.agent ? `${esc(agName(l.agent))}<small>${agSl(l.agent)}</small>` : '<span class="tbl-muted">No client</span>';
    $('#lm-ip').textContent = l.ip;
    $('#sw-kind').hidden = false;
    $('#sw-kind').innerHTML = ['Request', 'Response', 'Both'].map(k => {
      const off = !l.hasRequest && k !== 'Response';
      const on = split ? k === 'Both' : kind === k;
      return `<button type="button" data-k="${k}"${k === 'Both' ? ' class="sw-both"' : ''} aria-pressed="${on}"${off ? ' disabled data-tooltip="No request saved for this call"' : ''}>${k === 'Both' ? 'Side by side' : k}</button>`;
    }).join('');

    if (split) { panes[0].load(l, 'Request', true); panes[1].load(l, 'Response', true); }
    else { panes[0].load(l, kind, false); panes[1].clear(); }
  }

  const ICON_FOLD = { collapse: 'M7 20l5-5 5 5M7 4l5 5 5-5', expand: 'M7 15l5 5 5-5M7 9l5-5 5 5' };
  const PANE = `
    <div class="code-view-bar">
      <span class="cv-kind" hidden></span>
      <select class="input cv-format" aria-label="Format">${CodeViewer.formats.map(f => `<option>${f}</option>`).join('')}</select>
      <span class="meta cv-size" tabindex="0"></span>
      <button class="btn btn-secondary cv-find" type="button">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7.5"/><path d="m20.5 20.5-4-4"/></svg>
        <span class="btn-label">Find</span>
      </button>
      <button class="btn btn-secondary cv-fold" type="button" aria-pressed="false">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path class="cv-fold-ic" d="${ICON_FOLD.collapse}"/></svg>
        <span class="btn-label">Collapse all</span>
      </button>
      <span class="spacer"></span>
      <label class="inline-switch"><span class="switch"><input type="checkbox" class="cv-wrap"><span></span></span>Wrap</label>
      <button class="btn btn-secondary cv-copy" type="button"><svg class="ph-only" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="8.5" y="8.5" width="12" height="12" rx="2"/><path d="M15.5 8.5V5.5a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3"/></svg><svg class="cv-ok" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg><span class="btn-label">Copy</span></button>
      <button class="btn btn-primary cv-download" type="button"><svg class="ph-only" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg><span class="btn-label">Download</span></button>
    </div>
    <div class="cv-editor" aria-label="File content"></div>`;
  function makePane() {
    const el = document.createElement('div'); el.className = 'code-view'; el.innerHTML = PANE;
    $('#cv-panes').appendChild(el);
    const q = s => el.querySelector(s);
    const viewer = CodeViewer.create(q('.cv-editor'));
    const p = { el, viewer, file: null, kind: null, seq: 0 };
    const setFold = folded => {
      const b = q('.cv-fold');
      b.setAttribute('aria-pressed', String(folded));
      b.querySelector('.btn-label').textContent = folded ? 'Expand all' : 'Collapse all';
      b.querySelector('.cv-fold-ic').setAttribute('d', folded ? ICON_FOLD.expand : ICON_FOLD.collapse);
      b.dataset.tooltip = folded ? 'Expand all' : 'Collapse all';
    };
    const foldable = () => { q('.cv-fold').disabled = viewer.format === 'Text'; setFold(false); };
    const busy = on => {
      ['.cv-format', '.cv-find', '.cv-fold', '.cv-copy', '.cv-download'].forEach(s => { q(s).disabled = on; });
      if (!on) foldable();
      if (on) { q('.cv-size').innerHTML = '<span class="skeleton-bar"></span>'; delete q('.cv-size').dataset.tooltip; }
    };
    // only the latest request counts (another call opened quickly)
    p.load = (l, kind, labelled) => {
      p.file = l; p.kind = kind; el.hidden = false;
      const k = q('.cv-kind'); k.hidden = !labelled;
      if (labelled) { k.textContent = kind; k.className = `cv-kind is-${kind.toLowerCase()}`; }
      const seq = ++p.seq;
      busy(true);
      if (!fileCache.has(fileKey(l, kind))) viewer.loading();
      fetchFile(l, kind).then(raw => {
        if (seq !== p.seq) return;
        q('.cv-format').value = viewer.show(raw).format;
        const bytes = utf8.encode(raw).length;
        q('.cv-size').textContent = sizeLabel(bytes);
        q('.cv-size').dataset.tooltip = `${bytes.toLocaleString('en-US')} bytes`;
        busy(false);
      }, e => {
        if (seq !== p.seq) return;
        viewer.error(e.message, () => p.load(l, kind, labelled));
        q('.cv-size').innerHTML = '';
      });
    };
    p.clear = () => { p.seq++; p.file = null; el.hidden = true; };
    p.setWrap = on => { q('.cv-wrap').checked = on; viewer.setWrap(on); };
    q('.cv-find').addEventListener('click', () => viewer.find());
    q('.cv-format').addEventListener('change', e => { viewer.setFormat(e.target.value); foldable(); });
    q('.cv-fold').addEventListener('click', e => {
      const folded = e.currentTarget.getAttribute('aria-pressed') === 'true';
      (folded ? viewer.expandAll() : viewer.collapseAll()).then(() => setFold(!folded));
    });
    q('.cv-wrap').addEventListener('change', e => viewer.setWrap(e.target.checked));
    // success shows on the button itself: a tick in place of the label, green, for 1.5 s (same width), no toast
    const cpBtn = q('.cv-copy'); let cpTimer;
    cpBtn.addEventListener('click', () => navigator.clipboard?.writeText(viewer.text).then(() => {
      cpBtn.setAttribute('aria-label', 'Copied'); flashCopied(cpBtn);
      clearTimeout(cpTimer); cpTimer = setTimeout(() => cpBtn.removeAttribute('aria-label'), 1500);
    }, () => toast('Couldn’t copy')));
    q('.cv-download').addEventListener('click', () => download(p.file, p.kind, viewer.ext));
    return p;
  }
  const panes = [makePane(), makePane()];
  panes[1].el.hidden = true;

  // Request | Response | Side by side
  wide.addEventListener('change', () => { if (cur && drawer.classList.contains('open')) show(cur); });
  $('#sw-kind').addEventListener('click', e => {
    const b = e.target.closest('[data-k]');
    if (!b || b.disabled || b.getAttribute('aria-pressed') === 'true') return;
    view.want = b.dataset.k;
    show(cur);
  });

  // phones: Wrap on (the switch still turns it off)
  const phone = matchMedia('(max-width: 640px)');
  const fitViewer = () => panes.forEach(p => { p.setWrap(phone.matches); });
  fitViewer(); phone.addEventListener('change', fitViewer);

  function flashCopied(el) {
    clearTimeout(el._copiedTimer);
    el.classList.add('is-copied');
    el._copiedTimer = setTimeout(() => el.classList.remove('is-copied'), 1500);
  }
  const copy = (s, el) => navigator.clipboard?.writeText(s).then(() => flashCopied(el), () => toast('Couldn’t copy'));
  $('#lm-txn').addEventListener('click', e => { const b = e.target.closest('[data-copy]'); if (b) copy(b.dataset.copy, b); });

  // Esc / ✕ / outside click close the viewer
  function closeDrawer() {
    if (!drawer.classList.contains('open')) return;
    drawer.classList.remove('open');
    lastFocus?.focus?.();
  }
  document.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeDrawer(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panes.some(p => p.viewer.findOpen()) && !document.querySelector('.cv-menu') && !document.querySelector('.searchable-select.open, .flatpickr-calendar.open')) closeDrawer(); });

  SearchableSelect.init();
  load();
})();
