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
    const partsOf = sups.map(() => ctx.bigSearch ? 40 : 3 + Math.floor(rnd() * 6));   // bigSearch: one long Search, to show paging
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


  let pageRows = [];
  function render() {
    const list = filtered();
    const pages = Math.max(1, Math.ceil(list.length / state.size));
    state.page = Math.min(state.page, pages);
    const start = (state.page - 1) * state.size;
    pageRows = list.slice(start, start + state.size);

    $('#rows').innerHTML = pageRows.length ? pageRows.map((l, i) => `
      <tr class="row-link${fileKey(l) === lastOpened ? ' is-last-opened' : ''}" data-row="${i}" tabindex="0" aria-label="Open ${esc(l.operationName)} ${l.kind.toLowerCase()}">
        <td class="tbl-num">${start + i + 1}</td>
        <td><span class="tbl-stack"><span>${fDate(l.createdOn)}</span><small>${fTime(l.createdOn)}</small></span></td>
        <td><span class="tbl-stack">
          <span class="txn-line"><button type="button" class="tbl-code is-copy" data-copy="${l.id}" data-tooltip="Copy transaction ID" aria-label="Copy transaction ID ${l.id}">${l.id}</button></span>
          <small>${esc(l.ctx.portal)}</small>
        </span></td>
        <td class="text-center">${esc(API_NAME[l.supplierId] || `Supplier ${l.supplierId}`)}</td>
        <td><span class="tbl-stack fill"><span class="tbl-strong">${esc(l.operationName)}</span><span class="file-line"><small class="tbl-mid is-copy" role="button" tabindex="0" data-copy="${esc(l.fileName)}" data-copy-msg="File name copied" data-tooltip="${esc(l.fileName)}" aria-label="Copy file name ${esc(l.fileName)}">${fileLabel(l)}</small></span></span></td>
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
  // row click (or Enter / Space on a focused row) opens the file; clicking the transaction badge or the file name copies it
  const copyEl = el => copy(el.dataset.copy, el.dataset.copyMsg || 'Transaction ID copied');
  $('#rows').addEventListener('click', e => {
    const cp = e.target.closest('[data-copy]');
    if (cp) return copyEl(cp);
    if (window.getSelection().toString()) return;   // selecting text in a row isn't a click
    const r = e.target.closest('tr[data-row]'); if (r) openLog(pageRows[r.dataset.row]);
  });
  // keyboard: Tab to a row, Enter / Space opens its file; on the file name, Enter / Space copies it
  $('#rows').addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    if (e.target.matches('small[data-copy]')) { e.preventDefault(); return copyEl(e.target); }
    if (!e.target.matches('tr[data-row]')) return;
    e.preventDefault(); openLog(pageRows[e.target.dataset.row]);
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
  function download(l, ext) {
    const raw = fileCache.get(fileKey(l)); if (raw == null) return;
    ext = ext || CodeViewer.detect(raw).ext;            // the pane's (possibly corrected) format
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

  let lastOpened = null;                               // key (supplier + file name) of the last opened file → its row stays marked
  function openLog(l) {
    if (!drawer.classList.contains('open')) lastFocus = document.activeElement;
    show(l);
    drawer.classList.add('open');
  }
  function markOpened(l) {
    lastOpened = fileKey(l);
    document.querySelectorAll('.is-last-opened').forEach(x => x.classList.remove('is-last-opened'));
    const i = pageRows.indexOf(l); if (i >= 0) $(`#rows tr[data-row="${i}"]`)?.classList.add('is-last-opened');
  }
  function show(l) {
    cur = l;
    markOpened(l);

    const pair = pairOf(l);
    split.on = split.want && !!pair && wide.matches;     // side by side needs the pair and a wide screen
    // animate the width change only while the viewer is already open (opening straight into side by side just slides in)
    const wasOpen = drawer.classList.contains('open'), wasSplit = drawer.classList.contains('is-split');
    drawer.classList.toggle('can-resize', wasOpen);
    drawer.classList.toggle('is-split', split.on);
    if (wasOpen && split.on && !wasSplit) {
      const el = panes[1].el;
      el.classList.add('is-entering');
      el.addEventListener('animationend', () => el.classList.remove('is-entering'), { once: true });
    }

    $('#lm-txn').innerHTML = `<button type="button" class="tbl-code is-copy" data-copy="${l.id}" data-tooltip="Copy transaction ID" aria-label="Copy transaction ID ${l.id}">${l.id}</button>`;
    $('#lm-api').textContent = API_NAME[l.supplierId];
    $('#lm-file').innerHTML = fileLabel(l);              // one line, cut in the middle to fit (like the list); full name on hover
    $('#lm-file').dataset.tooltip = l.fileName;
    $('#lm-file').setAttribute('aria-label', `Copy file name ${l.fileName}`);
    $('.log-meta .lm-file').hidden = split.on;           // side by side, each pane names its own file

    // with a Request | Response switch the title is just the operation; without one it says the type too
    $('#log-title').textContent = pair ? l.operationName : `${l.operationName} · ${l.kind}`;
    $('#sw-kind').hidden = !pair;
    $('#sw-kind').innerHTML = pair ? ['Request', 'Response', 'Both'].map(k =>
      `<button type="button" data-k="${k}"${k === 'Both' ? ' class="sw-both"' : ''} aria-pressed="${split.on ? k === 'Both' : l.kind === k}">${k === 'Both' ? 'Side by side' : k}</button>`).join('') : '';

    if (split.on) {
      const [req, res] = l.kind === 'Request' ? [l, pair] : [pair, l];
      panes[0].load(req, 'Request'); panes[1].load(res, 'Response');
    } else {
      panes[0].load(l); panes[1].clear();
    }
  }

  /* one content pane: its own bar (Format · size · Find · Wrap · Copy · Download) and Monaco viewer (js/code-viewer.js).
     The viewer shows one pane; side by side shows two: Request left, Response right. */
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
      <button class="btn btn-secondary cv-copy" type="button"><svg class="ph-only" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="8.5" y="8.5" width="12" height="12" rx="2"/><path d="M15.5 8.5V5.5a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3"/></svg><span class="btn-label">Copy</span></button>
      <button class="btn btn-primary cv-download" type="button"><svg class="ph-only" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg><span class="btn-label">Download</span></button>
    </div>
    <div class="cv-editor" aria-label="File content"></div>`;
  function makePane() {
    const el = document.createElement('div'); el.className = 'code-view'; el.innerHTML = PANE;
    $('#cv-panes').appendChild(el);
    const q = s => el.querySelector(s);
    const viewer = CodeViewer.create(q('.cv-editor'));
    const p = { el, viewer, file: null, seq: 0 };
    // while a file loads (or failed): Format, Find, Copy, Download are off; the size shows a shimmer
    // Collapse all ⇄ Expand all: back to "Collapse all" whenever the content changes; off for plain text (nothing to fold)
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
    // the header is known from the list row; the content comes from the download API → skeleton until it's in.
    // Only the latest request counts (prev / next pressed quickly).
    p.load = (l, kind) => {
      p.file = l; el.hidden = false;
      const k = q('.cv-kind'); k.hidden = !kind;
      if (kind) { k.textContent = kind; k.className = `cv-kind is-${kind.toLowerCase()}`; k.dataset.tooltip = l.fileName; k.tabIndex = 0; }
      const seq = ++p.seq;
      busy(true);
      if (!fileCache.has(fileKey(l))) viewer.loading();
      fetchFile(l).then(raw => {
        if (seq !== p.seq) return;
        q('.cv-format').value = viewer.show(raw).format;   // starts on the guess; the user can switch it
        const bytes = utf8.encode(raw).length;
        q('.cv-size').textContent = sizeLabel(bytes);
        q('.cv-size').dataset.tooltip = `${bytes.toLocaleString('en-US')} bytes`;
        busy(false);
      }, e => {
        if (seq !== p.seq) return;
        viewer.error(e.message, () => p.load(l, kind));
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
    q('.cv-copy').addEventListener('click', () => copy(viewer.text, 'Copied'));
    q('.cv-download').addEventListener('click', () => download(p.file, viewer.ext));
    return p;
  }
  const panes = [makePane(), makePane()];
  panes[1].el.hidden = true;

  // Request | Response | Side by side — side by side stays on (for every file with a pair) until Request or Response is picked
  const split = { want: false, on: false, other: null };
  const wide = matchMedia('(min-width: 1100px)');      // narrower screens: no room for two panes (the option is hidden)
  wide.addEventListener('change', () => { if (cur && drawer.classList.contains('open')) show(cur); });
  $('#sw-kind').addEventListener('click', e => {
    const b = e.target.closest('[data-k]');
    if (!b || b.getAttribute('aria-pressed') === 'true') return;
    const k = b.dataset.k;
    split.want = k === 'Both';
    if (split.want || cur.kind === k) return show(cur);
    show(pairOf(cur));
  });

  // phones: every column counts — no minimap, Wrap on (the switch still turns it off)
  const phone = matchMedia('(max-width: 640px)');
  const fitViewer = () => panes.forEach(p => { p.viewer.setMinimap(!phone.matches); p.setWrap(phone.matches); });
  fitViewer(); phone.addEventListener('change', fitViewer);
  const copy = (s, msg) => navigator.clipboard?.writeText(s).then(() => toast(msg), () => toast('Couldn’t copy'));
  $('#lm-file').addEventListener('click', () => copy(cur.fileName, 'File name copied'));
  $('#lm-file').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); copy(cur.fileName, 'File name copied'); } });
  $('#lm-txn').addEventListener('click', e => { const b = e.target.closest('[data-copy]'); if (b) copy(b.dataset.copy, 'Transaction ID copied'); });

  let lastFocus = null;
  // Esc / ✕ / outside click close the viewer
  function closeDrawer(d) {
    d = d || drawer;
    if (!d.classList.contains('open')) return;
    d.classList.remove('open');
    if (!document.querySelector('.drawer.open')) lastFocus?.focus?.();
  }
  document.addEventListener('click', e => {
    const c = e.target.closest('[data-close]'); if (!c) return;
    closeDrawer(c.closest('.drawer') || c.previousElementSibling);
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panes.some(p => p.viewer.findOpen()) && !document.querySelector('.searchable-select.open, .flatpickr-calendar.open')) closeDrawer(); });

  SearchableSelect.init();
  load();
})();
