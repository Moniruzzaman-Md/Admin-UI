/* Hotel API Logs page prototype. Dummy data only (made-up transaction IDs, hotels and payloads). */
(function () {
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toast = msg => { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2400); };

  /* ---------- dummy data ---------- */
  // supplierId 0 = "Common" (our own normalised layer); the rest are suppliers
  const APIS = [[0, 'Common'], [1, 'WhitinEarth'], [2, 'Rate Hawk'], [3, 'Dida'], [4, 'TBO Holidays'], [5, 'Hotelbeds']];
  const API_NAME = Object.fromEntries(APIS);
  const SEARCH_OPS = ['Search'];                           // only listed with "Include search logs" (SearchStream trace is always listed, as live)

  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const pick = a => a[Math.floor(rnd() * a.length)];
  const digits = n => Array.from({ length: n }, () => Math.floor(rnd() * 10)).join('');
  const PORTALS = ['B2B', 'B2B', 'B2C', 'B2C APP', 'API'];   // where the transaction came from (weighted)
  const HOTELS = ['Harbour View Hostel', 'Lagoon Bay Resort', 'Old Town Boutique Hotel', 'Riverside Suites', 'Palm Grove Inn', 'Skyline City Hotel'];
  const ROOMS = [['Shared Dormitory', 'RO', 'Room Only'], ['Deluxe Double', 'BB', 'Bed & Breakfast'], ['Superior Twin', 'RO', 'Room Only'], ['Family Suite', 'HB', 'Half Board']];

  const logs = [];
  let order = 0;
  const today = new Date(); today.setHours(0, 0, 0, 0);

  // one transaction = a booking journey; each call = the files below (Common wraps the supplier's Original call, same call ID).
  // Operation names, steps and which side logs what are copied from the live logs (Aug–Nov 2026 sample).
  const C = 'Common', O = 'Original', RQ = 'Request', RS = 'Response';
  const FLOW = {
    Availability:          [[C, RQ], [O, RQ], [O, RS], [C, RS]],
    ReCheck:               [[C, RQ], [C, RS]],
    CancellationPolicy:    [[C, RQ], [C, RS]],
    PreBook:               [[C, RQ], [O, RQ], [O, RS], [C, RS]],
    Book:                  [[C, RQ], [O, RQ], [O, RS], [C, RS, 'Intermediate'], [C, RS]],
    BackgroundBooking:     [[C, RQ], [C, RS]],
    BookingDetails:        [[C, RQ], [O, RQ], [O, RS], [C, RS]],
    CancellationCharge:    [[C, RQ], [O, RQ], [O, RS], [C, RS]],
    CancellationChargeV2:  [[C, RS]],
    BookingCancellationV2: [[C, RQ]],
    BookingCancellation:   [[O, RQ, 'Charge'], [O, RS, 'Charge'], [O, RQ], [O, RS], [C, RS]],
  };
  function journey(txn, sup, start, ctx) {
    let t = +start;
    const add = (op, callId, layer, kind, step = '', part = null, supId = sup) => {
      t += 40 + Math.floor(rnd() * (kind === RS ? 2600 : 60));
      const fileName = [layer, op, step, txn, callId, kind, part].filter(v => v !== '' && v != null).join('-');
      logs.push({ id: txn, fileName, operationName: op, supplierId: layer === C ? 0 : supId, createdOn: new Date(t),
        layer, step, callId, kind, part, ctx, seq: order++ });
    };
    const newCall = () => '6393' + digits(14);
    const call = op => { const id = newCall(); FLOW[op].forEach(([layer, kind, step]) => add(op, id, layer, kind, step)); return id; };

    // Search, shaped like the live logs (checked 2026-11-20):
    //  - Common logs a Request first and the merged Response last;
    //  - ONE call (same call ID) goes to one or more suppliers; each supplier logs Request, Request-1…n, then Response, Response-1…n
    //    with the SAME file names as the other supplier — a file is identified by supplier + file name;
    //  - all requests go out first, responses come back later in any order.
    const sid = newCall();
    const others = [2, 3, 4].filter(x => x !== sup);
    const sups = ctx.bigSearch ? [sup] : rnd() < .6 ? [sup, pick(others)] : [sup];
    add('Search', sid, C, RQ);
    const partsOf = sups.map(() => ctx.bigSearch ? 150 : 3 + Math.floor(rnd() * 6));   // bigSearch: shows paging in the timeline
    sups.forEach((sp, i) => { add('Search', sid, O, RQ, '', null, sp); for (let p = 1; p <= partsOf[i]; p++) add('Search', sid, O, RQ, '', p, sp); });
    const resp = [];
    sups.forEach((sp, i) => { resp.push([sp, null]); for (let p = 1; p <= partsOf[i]; p++) resp.push([sp, p]); });
    for (let k = resp.length - 1; k > 0; k--) { const r = Math.floor(rnd() * (k + 1)); [resp[k], resp[r]] = [resp[r], resp[k]]; }
    resp.forEach(([sp, p]) => add('Search', sid, O, RS, '', p, sp));
    add('Search', sid, C, RS);
    add('SearchStream', sid, C, 'Trace');
    if (rnd() < .25) return;                                   // search only
    ['Availability', 'ReCheck', 'CancellationPolicy'].forEach(call);
    if (rnd() < .3) return;
    call('PreBook');
    if (rnd() < .35) return;
    call('Book');
    if (rnd() < .4) call('BackgroundBooking');
    if (t + 3600e3 > Date.now()) return;
    t += 3600e3; call('BookingDetails');
    if (rnd() < .5) return;
    // cancellation: charge check, then the cancel (V2 request wraps the supplier cancel, V2 response last)
    call('CancellationCharge'); call('CancellationChargeV2');
    const cid = call('BookingCancellationV2');
    FLOW.BookingCancellation.forEach(([layer, kind, step]) => add('BookingCancellation', cid, layer, kind, step));
    add('BookingCancellationV2', cid, C, RS);
  }
  for (let d = 0; d < 12; d++) {
    const n = d === 0 ? 5 : 2 + Math.floor(rnd() * 4);
    for (let i = 0; i < n; i++) {
      const start = new Date(today); start.setDate(start.getDate() - d); start.setHours(8 + Math.floor(rnd() * 10), Math.floor(rnd() * 60), Math.floor(rnd() * 60));
      if (start > new Date()) start.setTime(Date.now() - (i + 1) * 900e3);
      const room = pick(ROOMS);
      journey('NZH' + digits(15), pick([2, 3, 3, 4]), start, { hotel: pick(HOTELS), room, nights: 1 + Math.floor(rnd() * 4), price: +(30 + rnd() * 250).toFixed(2), rate: 19.6, portal: pick(PORTALS), bigSearch: d === 0 && i === 1 });
    }
  }
  logs.sort((a, b) => b.createdOn - a.createdOn || b.seq - a.seq);   // newest first (as the live list)

  /* ---------- fake file content: the raw file as stored (one line for JSON, like the live files) ---------- */
  // Formats in the dummy data: JSON (Common + most suppliers), XML (TBO Holidays' own requests/responses),
  // HTML (an error page Rate Hawk returned on PreBook), plain text (SearchStream traces).
  function content(l) {
    const c = l.ctx, ci = new Date(today); ci.setMonth(ci.getMonth() + 3); const co = new Date(ci); co.setDate(co.getDate() + c.nights);
    const iso = d => d.toISOString().slice(0, 10);
    const local = +(c.price * c.rate).toFixed(2);
    if (l.kind === 'Trace') {
      const t0 = l.createdOn, ts = ms => new Date(+t0 - 15000 + ms).toISOString().replace('T', ' ').slice(0, 23);
      return [`${ts(0)} INFO  SearchStream started  txn=${l.id}`,
        `${ts(12)} INFO  Dispatch  suppliers=[Dida, Rate Hawk, TBO Holidays]`,
        `${ts(1840)} INFO  Dida            completed  hotels=42  elapsed=1840ms`,
        `${ts(2510)} INFO  TBO Holidays    completed  hotels=17  elapsed=2510ms`,
        `${ts(15000)} WARN  Rate Hawk       timeout    elapsed=15000ms`,
        `${ts(15004)} INFO  SearchStream finished  total=59`].join('\n');
    }
    if (l.layer === 'Original' && l.supplierId === 4) {     // TBO Holidays: XML
      if (l.kind === 'Request') return `<?xml version="1.0" encoding="utf-8"?><HotelRequest xmlns="http://example.com/hotel"><Header><ClientId>demo-client</ClientId><RequestId>${l.callId}</RequestId></Header><Operation>${l.operationName}</Operation><CheckIn>${iso(ci)}</CheckIn><CheckOut>${iso(co)}</CheckOut><Currency>USD</Currency><Rooms><Room Adults="2" Children="0"/></Rooms><HotelCodes><Code>H10458</Code></HotelCodes></HotelRequest>`;
      return `<?xml version="1.0" encoding="utf-8"?><HotelResponse xmlns="http://example.com/hotel"><Status Code="200">Success</Status><RequestId>${l.callId}</RequestId><Hotels><Hotel Code="H10458"><Name>${c.hotel}</Name><Rooms><Room><Name>${c.room[0]}</Name><Board Code="${c.room[1]}">${c.room[2]}</Board><Price Currency="USD">${(c.price / 4.4).toFixed(2)}</Price><Refundable>true</Refundable></Room></Rooms></Hotel></Hotels></HotelResponse>`;
    }
    if (l.layer === 'Original' && l.supplierId === 2 && l.operationName === 'PreBook' && l.kind === 'Response')   // Rate Hawk: HTML error page
      return `<!DOCTYPE html>\n<html>\n<head>\n  <title>502 Bad Gateway</title>\n</head>\n<body>\n  <center><h1>502 Bad Gateway</h1></center>\n  <hr>\n  <center>nginx</center>\n  <p>Request ID: ${l.callId}</p>\n</body>\n</html>`;
    let obj;
    if (l.layer === 'Original') {
      obj = l.kind === 'Request'
        ? { header: { client_id: 'demo-client', request_id: l.callId }, check_in: iso(ci), check_out: iso(co), currency: 'MYR', rooms: [{ adults: 2, children: [] }], hotel_ids: l.operationName === 'Search' ? ['H10021', 'H10458', 'H11873'] : ['H10458'] }
        : { success: true, request_id: l.callId, part: l.part || undefined, hotels: [{ hotel_id: 'H10458', name: c.hotel, rates: [{ rate_key: 'rk_' + l.callId.slice(-8), room_name: c.room[0], board: c.room[1], net: c.price, currency: 'MYR', refundable: true }] }] };
    } else if (l.kind === 'Request') {
      obj = { TransactionId: l.id, CheckInDate: iso(ci), CheckOutDate: iso(co), Currency: 'NPR', Nationality: 'NP', Rooms: [{ Adults: 2, ChildAges: [] }], Operation: l.operationName };
    } else {
      obj = {
        HotelName: c.hotel, PriceChanged: false, CheckInDate: iso(ci), CheckOutDate: iso(co), TotalPrice: local, RoomNightPrice: +(local / c.nights).toFixed(2),
        RoomDetails: [{ RoomNo: '1', RoomType: c.room[0], MealInfo: { FullMealDetails: c.room[2], MealCode: c.room[1], HasChildMeal: null }, Price: local, Currency: 'NPR' }],
        ConvertedPriceComponent: { Price: local, Markup: 0, Currency: 'NPR', ApiRefType: 3 },
        OriginalPriceComponent: { Price: c.price, Currency: 'MYR', ApiRefType: 3 },
        ConversionInfo: { ConversionRate: +(1 / c.rate).toFixed(4), BaseCurrencyCode: 'MYR', ConversionCurrencyCode: 'NPR' },
        Currency: 'NPR', Errors: null,
      };
    }
    return JSON.stringify(obj);
  }

  /* ---------- formatting ---------- */
  const fileKey = l => `${l.supplierId}|${l.fileName}`;   // a file = supplier + file name (names repeat across suppliers)
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const p2 = n => String(n).padStart(2, '0');
  const fDate = d => `${p2(d.getDate())}-${MON[d.getMonth()]}-${d.getFullYear()}`;
  const fTime = d => `${p2(d.getHours() % 12 || 12)}:${p2(d.getMinutes())}:${p2(d.getSeconds())} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
  // file name fills the Operation column's free width: the start is cut with "…" only when it doesn't fit,
  // the last 12 characters always show, with the Request / Response / Trace ending coloured
  const TAIL = 12;
  const KIND_TONE = { Request: 'info', Response: 'ok', Trace: 'orange' };
  function fileLabel(l) {
    const f = l.fileName, cut = Math.max(0, f.length - TAIL), head = f.slice(0, cut), tail = f.slice(cut), tone = KIND_TONE[l.kind];
    const n = Math.min(tail.length, (l.kind + (l.part ? '-' + l.part : '')).length);
    const tailHtml = tone ? `${esc(tail.slice(0, -n))}<span class="tbl-text-${tone}">${esc(tail.slice(-n))}</span>` : esc(tail);
    return `<span class="tbl-mid-head">${esc(head)}</span><span class="tbl-mid-tail">${tailHtml}</span>`;
  }

  /* ---------- filters + table ---------- */
  // applied filters (what the list shows); the fields are applied only on Search / Enter
  const DEFAULTS = () => ({ txn: '', api: '', op: '', portal: '', search: false, from: new Date(today), to: new Date(today) });
  const state = Object.assign(DEFAULTS(), { page: 1, size: 20 });
  const fApi = $('#f-api'), fOp = $('#f-op'), fPortal = $('#f-portal'), fSearch = $('#f-search');
  APIS.forEach(([id, name]) => fApi.add(new Option(name, id)));
  const OPS = ['Search', 'SearchStream', 'Availability', 'ReCheck', 'CancellationPolicy', 'PreBook', 'Book', 'BackgroundBooking', 'BookingDetails',
    'CancellationCharge', 'CancellationChargeV2', 'BookingCancellation', 'BookingCancellationV2'];
  // "Search" is offered only while Include search logs is on
  function fillOps() {
    const keep = fOp.value;
    fOp.length = 1;
    OPS.filter(o => fSearch.checked || !SEARCH_OPS.includes(o)).forEach(o => fOp.add(new Option(o, o)));
    fOp.value = [...fOp.options].some(o => o.value === keep) ? keep : '';
    if (fOp._searchableRefresh) fOp._searchableRefresh();
  }
  fillOps();
  ['B2B', 'B2C', 'B2C APP', 'API'].forEach(p => fPortal.add(new Option(p, p)));

  const filtered = () => {
    const from = +state.from, to = +state.to + 864e5 - 1, q = state.txn.trim().toUpperCase();
    return logs.filter(l => l.createdOn >= from && l.createdOn <= to
      && (!q || l.id.includes(q))
      && (state.api === '' || l.supplierId === +state.api)
      && (!state.op || l.operationName === state.op)
      && (!state.portal || l.ctx.portal === state.portal)
      && (state.search || !SEARCH_OPS.includes(l.operationName)));
  };

  function pageList(page, pages) {
    if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
    const set = new Set([1, pages, page - 1, page, page + 1].filter(n => n >= 1 && n <= pages));
    const out = []; let prev = 0;
    [...set].sort((a, b) => a - b).forEach(n => { if (n - prev > 1) out.push('…'); out.push(n); prev = n; });
    return out;
  }

  const ICON_COPY = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="8.5" y="8.5" width="12" height="12" rx="2"/><path d="M15.5 8.5V5.5a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3"/></svg>';
  const copyBtn = (text, label) => `<button type="button" class="tbl-copy" data-copy="${esc(text)}" data-tooltip="${label}" aria-label="${label}">${ICON_COPY}</button>`;
  const ICON_TL = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="5" cy="6" r="2"/><circle cx="5" cy="18" r="2"/><path d="M5 8v8M10 6h10M10 12h7M10 18h10"/></svg>';

  let pageRows = [];
  function render() {
    const list = filtered();
    const pages = Math.max(1, Math.ceil(list.length / state.size));
    state.page = Math.min(state.page, pages);
    const start = (state.page - 1) * state.size;
    pageRows = list.slice(start, start + state.size);

    $('#rows').innerHTML = pageRows.length ? pageRows.map((l, i) => `
      <tr class="row-link${fileKey(l) === lastOpened ? ' is-last-opened' : ''}" data-row="${i}">
        <td class="tbl-num">${start + i + 1}</td>
        <td><span class="tbl-stack"><span>${fDate(l.createdOn)}</span><small>${fTime(l.createdOn)}</small></span></td>
        <td><span class="tbl-stack">
          <span class="txn-line"><button type="button" class="tbl-code" data-txn="${l.id}" data-tooltip="Transaction timeline">${l.id}</button>${copyBtn(l.id, 'Copy transaction ID')}</span>
          <span class="txn-line"><small>${esc(l.ctx.portal)}</small><button type="button" class="txn-tl-btn" data-txn="${l.id}" data-tooltip="Transaction timeline" aria-label="Transaction timeline for ${l.id}">${ICON_TL}</button></span>
        </span></td>
        <td><span class="tbl-stack fill"><button type="button" class="tbl-strong tbl-open" aria-label="Open ${esc(l.operationName)} ${l.kind.toLowerCase()}">${esc(l.operationName)}</button><span class="file-line"><small class="tbl-mid" tabindex="0" data-tooltip="${esc(l.fileName)}">${fileLabel(l)}</small>${copyBtn(l.fileName, 'Copy file name')}</span></span></td>
        <td class="text-center">${esc(API_NAME[l.supplierId] || `Supplier ${l.supplierId}`)}</td>
      </tr>`).join('')
      : EmptyState.row(5);

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
  fSearch.addEventListener('change', fillOps);

  // a query in the real portal → skeleton first (saves / edits / deletes re-render directly)
  const load = () => TableLoading.run($('.tbl-area'), render);
  function applyFilters() {
    Object.assign(state, { txn: $('#f-txn').value.trim(), api: fApi.value, op: fOp.value, portal: fPortal.value, search: fSearch.checked,
      from: new Date(draft.from), to: new Date(draft.to), page: 1 });
    load();
  }
  function setFields(v) {
    $('#f-txn').value = v.txn; fApi.value = v.api; fSearch.checked = v.search; fillOps(); fOp.value = v.op; fPortal.value = v.portal;
    draft.from = v.from; draft.to = v.to;
    fromField.setMax(v.to); toField.setMin(v.from); fromField.set(v.from); toField.set(v.to);
  }
  // shared filter bar: count + chips cover the panel's fields (a field counts when it differs from its default)
  const optText = sel => sel.options[sel.selectedIndex]?.text || '';
  const fmtDay = d => `${p2(d.getDate())} ${MON[d.getMonth()]} ${d.getFullYear()}`;
  const bar = FilterBar.init($('#filter-bar'), {
    fields: [
      { label: 'From', isSet: () => +draft.from !== +today, text: () => fmtDay(draft.from), clear: () => { draft.from = new Date(today); fromField.set(draft.from); toField.setMin(draft.from); } },
      { label: 'To', isSet: () => +draft.to !== +today, text: () => fmtDay(draft.to), clear: () => { draft.to = new Date(today); toField.set(draft.to); fromField.setMax(draft.to); } },
      { label: 'Supplier', isSet: () => fApi.value !== '', text: () => optText(fApi), clear: () => { fApi.value = ''; } },
      { label: 'Operation type', isSet: () => !!fOp.value, text: () => fOp.value, clear: () => { fOp.value = ''; } },
      { label: 'Portal', isSet: () => !!fPortal.value, text: () => fPortal.value, clear: () => { fPortal.value = ''; } },
      { label: 'Search logs', isSet: () => fSearch.checked, text: () => 'Included', clear: () => { fSearch.checked = false; fillOps(); } },
    ],
    onSearch: applyFilters,
    onReset: () => { setFields(DEFAULTS()); applyFilters(); },
  });
  // row click (or the operation name, the keyboard way in) opens the file; the transaction badge opens the transaction timeline
  $('#rows').addEventListener('click', e => {
    const cp = e.target.closest('[data-copy]');
    if (cp) return copy(cp.dataset.copy, cp.dataset.tooltip === 'Copy file name' ? 'File name copied' : 'Transaction ID copied');
    const tx = e.target.closest('[data-txn]');
    if (tx) return openTxn(tx.dataset.txn);
    if (window.getSelection().toString()) return;   // selecting text in a row isn't a click
    const r = e.target.closest('tr[data-row]'); if (r) openLog(pageRows[r.dataset.row], pageRows);
  });
  $('#pg-pages').addEventListener('click', e => { const b = e.target.closest('[data-pg]'); if (b) { state.page = +b.dataset.pg; load(); } });
  $('#pg-prev').addEventListener('click', () => { state.page--; load(); });
  $('#pg-next').addEventListener('click', () => { state.page++; load(); });
  $('#pg-size').addEventListener('change', e => { state.size = +e.target.value; state.page = 1; load(); });

  /* ---------- download ---------- */
  // file size of the raw file (UTF-8 bytes of the string the download API returns): B under 1 KB, then KB, then MB (1 KB = 1024 B)
  const utf8 = new TextEncoder();
  function sizeLabel(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1023.5) return `${kb < 9.95 ? kb.toFixed(1) : Math.round(kb)} KB`;   // 1023.5+ would round to "1024 KB" → show MB
    const mb = kb / 1024;
    return `${mb < 9.95 ? mb.toFixed(1) : Math.round(mb)} MB`;
  }
  const MIME = { json: 'application/json', xml: 'application/xml', html: 'text/html', txt: 'text/plain' };
  /* simulated download API: POST download { fileName, apiRef, operationName } → the file as a string, after a delay.
     Files never change, so each one is fetched once and kept (going back with prev / next or the Request | Response switch is instant).
     A few files fail on the first try, to show the error state; Try again succeeds. */
  const fileCache = new Map(), failedOnce = new Set();
  const hash = s => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  function fetchFile(l) {
    const k = fileKey(l);
    if (fileCache.has(k)) return Promise.resolve(fileCache.get(k));
    return new Promise((res, rej) => setTimeout(() => {
      if (hash(k) % 17 === 0 && !failedOnce.has(k)) { failedOnce.add(k); return rej(new Error('The server didn’t respond in time.')); }
      const raw = content(l); fileCache.set(k, raw); res(raw);
    }, 500 + Math.random() * 1000));
  }
  function download(l) {
    const raw = fileCache.get(fileKey(l)); if (raw == null) return;
    const ext = l === cur ? viewer.ext : CodeViewer.detect(raw).ext;   // the viewer's (possibly corrected) format
    const blob = new Blob([raw], { type: MIME[ext] });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${l.fileName}.${ext}`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  /* ---------- viewer ---------- */
  // Request ⇄ Response: the other file has the same name with only the last part swapped
  // (…-Request ⇄ …-Response, a part number like -3 kept). Shown only when that file exists; Trace files have none.
  let cur = null;
  const drawer = $('#log-drawer');
  const pairName = f => /-(Request|Response)(-\d+)?$/.test(f) ? f.replace(/-(Request|Response)(-\d+)?$/, (m, k, n) => `-${k === 'Request' ? 'Response' : 'Request'}${n || ''}`) : null;
  // the other file of the pair: same supplier, name with the last part swapped (several suppliers can log identical file names)
  const pairOf = l => { const n = pairName(l.fileName); return n ? logs.find(x => x.fileName === n && x.supplierId === l.supplierId) : null; };

  // prev / next: steps through the list the file was opened from (the current page of the table, or the timeline)
  let nav = { list: [], i: -1 };
  let lastOpened = null;                               // key (supplier + file name) of the last opened file → its row stays marked
  function openLog(l, list) {
    if (!drawer.classList.contains('open')) lastFocus = document.activeElement;
    nav = { list: list || [l], i: (list || [l]).indexOf(l) };
    show(l);
    drawer.classList.add('open');
  }
  function step(d) {
    const j = nav.i + d;
    if (j < 0 || j >= nav.list.length) return;
    nav.i = j; show(nav.list[j]);
  }
  function markOpened(l) {
    lastOpened = fileKey(l);
    document.querySelectorAll('.is-last-opened').forEach(x => x.classList.remove('is-last-opened'));
    document.querySelectorAll(`[data-file="${CSS.escape(fileKey(l))}"]`).forEach(x => x.classList.add('is-last-opened'));
    const i = pageRows.indexOf(l); if (i >= 0) $(`#rows tr[data-row="${i}"]`)?.classList.add('is-last-opened');
  }
  function show(l) {
    cur = l;
    markOpened(l);
    const j = nav.list.indexOf(l); if (j >= 0) nav.i = j;   // the Request | Response switch may land on a file that's also in the list
    $('#log-nav').hidden = nav.list.length < 2;
    $('#nav-pos').textContent = nav.i >= 0 ? `${nav.i + 1} of ${nav.list.length}` : '';
    $('#nav-prev').disabled = nav.i <= 0;
    $('#nav-next').disabled = nav.i < 0 || nav.i >= nav.list.length - 1;
    $('#lm-txn').innerHTML = `<span class="txn-line"><button type="button" class="tbl-code" data-txn="${l.id}" data-tooltip="Transaction timeline">${l.id}</button><button type="button" class="txn-tl-btn" data-txn="${l.id}" data-tooltip="Transaction timeline" aria-label="Transaction timeline">${ICON_TL}</button></span>`;
    $('#lm-api').textContent = API_NAME[l.supplierId];
    $('#lm-file').textContent = l.fileName;

    const pair = pairOf(l);
    // with a Request | Response switch the title is just the operation; without one it says the type too
    $('#log-title').textContent = pair ? l.operationName : `${l.operationName} · ${l.kind}`;
    $('#sw-kind').hidden = !pair;
    $('#sw-kind').innerHTML = pair ? ['Request', 'Response'].map(k => `<button type="button" data-k="${k}" aria-pressed="${l.kind === k}">${k}</button>`).join('') : '';

    // the header above is known from the list row; the content comes from the download API → skeleton until it's in.
    // Only the latest request counts (prev / next pressed quickly).
    const seq = ++loadSeq;
    setBusy(true);
    if (!fileCache.has(fileKey(l))) viewer.loading();
    fetchFile(l).then(raw => {
      if (seq !== loadSeq) return;
      const shown = viewer.show(raw);
      $('#cv-format').value = shown.format;   // starts on the guess; the user can switch it
      const bytes = utf8.encode(raw).length;
      $('#cv-size').textContent = sizeLabel(bytes);
      $('#cv-size').dataset.tooltip = `${bytes.toLocaleString('en-US')} bytes`;
      setBusy(false);
    }, e => {
      if (seq !== loadSeq) return;
      viewer.error(e.message, () => show(l));
      $('#cv-size').innerHTML = '';
    });
  }
  let loadSeq = 0;
  // while a file loads (or failed): Format, Find, Copy, Download are off; the size shows a shimmer
  function setBusy(on) {
    ['#cv-format', '#cv-find', '#cv-copy', '#cv-download'].forEach(s => { $(s).disabled = on; });
    if (on) { $('#cv-size').innerHTML = '<span class="skeleton-bar"></span>'; delete $('#cv-size').dataset.tooltip; }
  }
  $('#sw-kind').addEventListener('click', e => {
    const b = e.target.closest('[data-k]');
    if (!b || b.getAttribute('aria-pressed') === 'true') return;
    const pair = pairOf(cur); if (pair) show(pair);
  });

  // file content: shared Monaco viewer (js/code-viewer.js) — format detected from the content
  const viewer = CodeViewer.create($('#cv-editor'));
  $('#cv-find').addEventListener('click', () => viewer.find());
  $('#cv-format').addEventListener('change', e => viewer.setFormat(e.target.value));
  $('#cv-wrap').addEventListener('change', e => viewer.setWrap(e.target.checked));
  const copy = (s, msg) => navigator.clipboard?.writeText(s).then(() => toast(msg), () => toast('Couldn’t copy'));
  $('#cv-copy').addEventListener('click', () => copy(viewer.text, 'Copied'));
  $('#lm-copy-file').addEventListener('click', () => copy(cur.fileName, 'File name copied'));
  $('#cv-download').addEventListener('click', () => download(cur));
  // from the viewer: open (or bring forward) the timeline of this file's transaction; the viewer closes so the timeline is on top
  $('#lm-txn').addEventListener('click', e => {
    const b = e.target.closest('[data-txn]'); if (!b) return;
    closeDrawer(drawer);
    if (!(tDrawer.classList.contains('open') && txnId === b.dataset.txn)) openTxn(b.dataset.txn);
  });
  $('#nav-prev').addEventListener('click', () => step(-1));
  $('#nav-next').addEventListener('click', () => step(1));

  /* ---------- simulated get-log (the real endpoint, as it is today + the new operationName / portal params) ----------
     POST api/admin/hotel/api-log/get-log { id, includeSearch, operationName, from_date, to_date, page, per_page ≤ 100 }
     → { data: [{ id, fileName, operationName, supplierId, createdOn }], totalRecord }   newest first. */
  const PER_PAGE_MAX = 100;
  function getLog(q) {
    const per = Math.min(q.per_page || 20, PER_PAGE_MAX), page = q.page || 1;
    const rows = logs.filter(l => (!q.id || l.id === q.id) && (q.includeSearch || !SEARCH_OPS.includes(l.operationName)) && (!q.operationName || l.operationName === q.operationName));
    return new Promise(res => setTimeout(() => res({ data: rows.slice((page - 1) * per, page * per), totalRecord: rows.length, pageNo: page, pageSize: per }), 220 + Math.random() * 180));
  }
  /* ---------- transaction timeline ----------
     Built only from get-log rows (max 100 per page, newest first), in two separate parts so Search never shares a page with the other calls:
       base   id = the transaction, includeSearch: false                          → every call except Search
       search id = the transaction, includeSearch: true, operationName: 'Search'  → the Search files
     Both start together and load their first page (100). Each part has its own "Load more" for its next page.
     The timeline is newest first (same order as the API): latest call on top, latest file on top inside each call,
     so Load more adds older files at the bottom — below the oldest Search call loaded (Search), or under the timeline (other calls).
     Calls = files grouped by call ID + operation (both in the file name). Duration = last file time − first file time
     (shown once that part is fully loaded). */
  const tDrawer = $('#txn-drawer');
  let txnFiles = [], txnId = null, tl = null;
  const durLabel = ms => ms < 60000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.floor(ms / 60000)} m ${Math.round(ms % 60000 / 1000)} s`;
  const byTime = (a, b) => a.createdOn - b.createdOn || a.seq - b.seq;
  function groupCalls(files, part) {
    const calls = [];
    files.slice().sort(byTime).forEach(f => {
      const key = f.callId + '|' + f.operationName;
      let c = calls.find(x => x.key === key);
      if (!c) calls.push(c = { key, op: f.operationName, part, files: [] });
      c.files.push(f);
    });
    return calls;
  }
  const newPart = query => ({ query, files: [], total: null, page: 0, loading: false });
  const complete = part => part.total !== null && part.files.length >= part.total;
  // next page of a part (page 1 on open)
  function loadPart(part) {
    if (part.loading || complete(part)) return;
    const id = tl.id;
    part.loading = true; if (part.page) renderTxn();
    getLog({ ...part.query, id, page: part.page + 1, per_page: PER_PAGE_MAX }).then(r => {
      if (!tl || tl.id !== id || txnId !== id) return;
      part.files = part.files.concat(r.data); part.total = r.totalRecord; part.page++; part.loading = false;
      renderTxn();
    });
  }
  function openTxn(id) {
    txnId = id;
    lastFocus = document.activeElement;
    $('#txn-id').innerHTML = `<span class="tbl-code">${esc(id)}</span>`;
    $('#txn-body').innerHTML = `<div class="tl-skel" aria-busy="true">${[40, 70, 55, 80, 45, 65].map(w => `<span class="skeleton-bar" style="width:${w}%"></span>`).join('')}</div>`;
    tDrawer.classList.add('open');
    tl = { id, base: newPart({ includeSearch: false }), search: newPart({ includeSearch: true, operationName: 'Search' }) };
    loadPart(tl.base); loadPart(tl.search);
  }
  function fileRow(f) {
    const sup = f.supplierId ? `<span class="tl-fsup">${esc(API_NAME[f.supplierId])}</span>` : '';
    return `<li><button type="button" class="tl-file${fileKey(f) === lastOpened ? ' is-last-opened' : ''}" data-file="${esc(fileKey(f))}" data-tooltip="${esc(f.fileName)}">
      <span class="tbl-mid">${fileLabel(f)}</span>${sup}<span class="tl-ftime">${fTime(f.createdOn)}</span></button></li>`;
  }
  const moreBtn = (part, key) => {
    const left = part.total - part.files.length;
    if (part.loading) return `<div class="tl-load"><span class="skeleton-bar"></span></div>`;
    return left > 0 ? `<div class="tl-load"><button type="button" class="btn btn-secondary" data-more="${key}">Load more <span>· ${left.toLocaleString('en-US')} earlier ${key === 'search' ? 'Search ' : ''}file${left === 1 ? '' : 's'}</span></button></div>` : '';
  };
  function renderTxn() {
    if (!tl || tl.base.total === null) return;           // the timeline appears once the first page of the other calls is in
    const { base, search } = tl;
    const calls = groupCalls(base.files, 'base');
    if (search.total === null) {
      // Search's first page not in yet: a placeholder before the SearchStream trace (same call ID), if this transaction searched
      const k = calls.findIndex(c => c.op === 'SearchStream');
      if (k >= 0) calls.splice(k, 0, { key: 'search-wait', op: 'Search', part: 'search', files: [], waiting: true });
    } else {
      groupCalls(search.files, 'search').forEach(sc => {   // Search calls sit by time, like any other call
        const k = calls.findIndex(c => c.files.length && c.files[0].createdOn > sc.files[0].createdOn);
        calls.splice(k < 0 ? calls.length : k, 0, sc);
      });
    }
    // newest first, like the API: latest call on top, and inside each call its latest file on top — Load more adds older files at the bottom
    calls.reverse();
    const filesDesc = c => c.files.slice().reverse();
    txnFiles = calls.flatMap(filesDesc);                 // prev / next order in the viewer = timeline order (loaded files)
    const all = txnFiles.slice().sort(byTime), first = all[0], last = all[all.length - 1];
    const lastSearch = calls.filter(c => c.part === 'search' && c.files.length).pop();   // the oldest Search call loaded so far
    const supOf = c => { const ids = [...new Set(c.files.map(f => f.supplierId).filter(Boolean))]; return ids.length ? ids.map(i => API_NAME[i]).join(', ') : 'Common'; };
    const scroll = $('#txn-body').scrollTop;
    $('#txn-body').innerHTML = `
      ${first ? `<div class="tl-meta"><span>Portal <b>${esc(first.ctx.portal)}</b></span><span>${fDate(first.createdOn)}</span><span>${+first.createdOn === +last.createdOn ? fTime(first.createdOn) : `${fTime(first.createdOn)} – ${fTime(last.createdOn)}`}</span></div>` : ''}
      <ol class="tl">${calls.map(c => {
        if (c.waiting) return `<li class="tl-call"><div class="tl-head"><span class="tl-time"></span><b>Search</b></div>
          <ul class="tl-files" aria-busy="true">${[62, 48, 70].map(w => `<li class="tl-more"><span class="skeleton-bar" style="width:${w}%"></span></li>`).join('')}</ul></li>`;
        const n = c.files.length, a = c.files[0].createdOn, b = c.files[n - 1].createdOn;
        const done = complete(c.part === 'search' ? search : base);
        return `<li class="tl-call">
          <div class="tl-head"><span class="tl-time">${fTime(a)}</span><b>${esc(c.op)}</b><span class="tl-sup">${esc(supOf(c))}</span>${n > 1 && done ? `<span class="tl-dur" data-tooltip="First to last file of this call">${durLabel(b - a)}</span>` : ''}</div>
          <ul class="tl-files">${filesDesc(c).map(fileRow).join('')}</ul>
          ${c === lastSearch ? moreBtn(search, 'search') : ''}
        </li>`; }).join('')}</ol>
      ${moreBtn(base, 'base')}`;
    $('#txn-body').scrollTop = scroll;
  }
  $('#txn-body').addEventListener('click', e => {
    const m = e.target.closest('[data-more]'); if (m) return loadPart(tl[m.dataset.more]);
    const b = e.target.closest('.tl-file'); if (!b) return;
    openLog(txnFiles.find(f => fileKey(f) === b.dataset.file), txnFiles);
  });
  // "Show in list": the list filtered to this transaction (what clicking the badge used to do)
  // "Show in list": the list filtered to this transaction, showing everything the timeline covers —
  // search logs on, dates = the transaction's first–last file date, Supplier / Operation type / Portal cleared;
  // rows per page stay as the user has them (20 by default) — 100 is only for the timeline's own get-log requests
  $('#txn-filter').addEventListener('click', () => {
    const id = txnId, all = txnFiles.slice().sort(byTime);
    const day = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
    closeDrawer(tDrawer);
    setFields({ txn: id, api: '', op: '', portal: '', search: true,
      from: all.length ? day(all[0].createdOn) : new Date(today), to: all.length ? day(all[all.length - 1].createdOn) : new Date(today) });
    bar.update();
    applyFilters();
  });

  let lastFocus = null;
  // the viewer sits on top of the timeline: Esc / ✕ / outside click close the top one only
  function closeDrawer(d) {
    d = d || (drawer.classList.contains('open') ? drawer : tDrawer.classList.contains('open') ? tDrawer : null);
    if (!d || !d.classList.contains('open')) return;
    d.classList.remove('open');
    if (d === tDrawer) txnId = null;
    if (!document.querySelector('.drawer.open')) lastFocus?.focus?.();
  }
  document.addEventListener('click', e => {
    const c = e.target.closest('[data-close]'); if (!c) return;
    closeDrawer(c.closest('.drawer') || c.previousElementSibling);
  });
  // ↑ / ↓ step through files while the viewer is open (Alt+↑ / Alt+↓ also work inside the editor and fields)
  document.addEventListener('keydown', e => {
    if (!drawer.classList.contains('open') || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
    const t = e.target instanceof Element ? e.target : document.activeElement;
    const inField = t && t.closest && t.closest('input, select, textarea, .monaco-editor, .searchable-select');
    if (inField && !e.altKey) return;
    e.preventDefault(); e.stopPropagation(); step(e.key === 'ArrowUp' ? -1 : 1);
  }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !viewer.findOpen() && !document.querySelector('.searchable-select.open, .flatpickr-calendar.open')) closeDrawer(); });

  SearchableSelect.init();
  load();
})();
