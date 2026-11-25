/* Hotel All Booking page prototype (hotel-bookings.html). Dummy data only.
   Lists the manual bookings saved by the booking form (js/data.js Bookings). In the live portal API bookings share this
   list (booking_type online / offline); the prototype can't make API bookings, so only manual ones show here.
   Columns = the live list's columns, in its order. */
(function () {
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toast = msg => { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2600); };

  /* ---------- cell formats ---------- */
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  // "2027-02-20" / "2027-02-16T11:59(:ss)" → 20-Feb-2027 (+ 11:59 AM)
  const parts = v => { const m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/); return m && { y: m[1], mo: MONTHS[+m[2] - 1], d: m[3], h: m[4], mi: m[5] }; };
  const dateText = v => { const p = parts(v); return p ? `${p.d}-${p.mo}-${p.y}` : ''; };
  const timeText = v => { const p = parts(v); if (!p || p.h == null) return ''; const h = +p.h; return `${String(h % 12 || 12).padStart(2, '0')}:${p.mi} ${h >= 12 ? 'PM' : 'AM'}`; };
  const dateCell = v => parts(v) ? `<span class="tbl-stack"><span>${dateText(v)}</span>${timeText(v) ? `<small>${timeText(v)}</small>` : ''}</span>` : '<span class="tbl-muted">—</span>';
  const money = (cur, v) => v === '' || v == null ? '<span class="tbl-muted">—</span>'
    : `${esc(cur)} ${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  // booking status as stored → as listed (live labels)
  const STATUS = { CONFIRMED: ['Confirmed', 'on'], 'RE CONFIRMED': ['Reconfirmed', 'on'], CANCELLED: ['Cancelled', 'off'] };
  // payment status icon after the amount (live: green paid, indigo refunded, red unpaid)
  const PAY = { 'Fully Paid': ['check-circle', 'paid'], Refunded: ['undo-alt', 'refunded'], Unpaid: ['times-circle', 'unpaid'] };

  const client = id => RefData.partners.find(p => p.id === id);
  const supplier = id => HotelApis.list.find(a => a.id === id);
  const leadGuest = s => {
    const g = s.rooms.flatMap(r => r.guests).find(x => x.is_lead);
    return g ? [g.title, g.first_name, g.last_name].filter(Boolean).join(' ') : s.lead_pax_name || '';
  };

  /* ---------- filters (shared filter bar, js/filters.js) ----------
     Booking ID is the main search box; supplier reference, hotel name and guest name are their own fields in the panel
     (the API takes each one as a separate parameter, as live does).
     Live's status switcher stays outside, next to Download (applies at once); live's Date Filters drawer → the panel's Dates:
     4 From / To pairs like live, each pair in one field's width; either end may be left empty. */
  // live status list; only the ones a manual booking can have occur in the prototype data
  const STATUSES = [['CONFIRMED', 'Confirmed'], ['RE CONFIRMED', 'Reconfirmed'], ['REQUESTED FOR CANCEL', 'Cancellation in progress'],
    ['CANCELLED', 'Cancelled'], ['BOOKING IN PROGRESS', 'Booking in progress'], ['FAILED', 'Failed']];
  const DATES = [   // [key, input, value of a booking, future dates allowed]
    ['booking', '#f-d-booking', b => b.state.booking_date, false],
    ['statusDate', '#f-d-status', b => b.updatedAt || b.createdAt, false],   // status date = last save (no separate status history in the prototype)
    ['checkin', '#f-d-checkin', b => b.state.check_in, true],
    ['deadline', '#f-d-deadline', b => b.state.cancellation_deadline_date, true],
  ];
  // panel text fields (each its own API parameter; contains, any case)
  const TEXTS = { ref: '#f-ref', hotel: '#f-hotel', guest: '#f-guest' };
  const SELECTS = { type: '#f-type', platform: '#f-platform', supplier: '#f-supplier', client: '#f-client', country: '#f-country', staff: '#f-staff', hcn: '#f-hcn', special: '#f-special' };
  const fill = (sel, items) => items.forEach(([v, t]) => $(sel).add(new Option(t, v)));
  fill('#f-view', STATUSES);
  let view = '';   // status view (header switcher): '' = all
  fill('#f-platform', RefData.portals.map(p => [p, p]));
  // every supplier: API and offline (manual bookings are made with both)
  fill('#f-supplier', HotelApis.list.map(a => [a.id, HotelApis.label(a)]));
  // Client lists the chosen platform's clients (B2B = Partners, disabled ones too: their old bookings stay findable);
  // no platform = locked. The prototype has a client list for B2B only.
  const CLIENTS = { B2B: RefData.partners.map(p => [p.id, p.name]) };
  function loadClients() {
    const sel = $('#f-client'), list = CLIENTS[$('#f-platform').value] || [], keep = list.some(([id]) => String(id) === sel.value);
    [...sel.options].slice(1).forEach(o => o.remove());
    fill('#f-client', list);
    sel.options[0].text = !$('#f-platform').value ? 'Select platform first' : list.length ? 'Client' : 'No clients for this platform';
    sel.disabled = !list.length;
    if (!keep) { sel.value = ''; draft.client = ''; }
    sel._searchableRefresh?.();
  }
  fill('#f-country', RefData.countries.filter(c => c.cities).map(c => [c.name, c.name]));   // hotel countries
  fill('#f-staff', RefData.users.map(u => [u.name, u.name]));

  // default: today's bookings (live: Booking date From = To = today); every other date pair empty
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const DATE_DEFAULT = k => (k === 'booking' ? [new Date(today), new Date(today)] : [null, null]);
  const blank = () => ({ txn: '', ref: '', hotel: '', guest: '', ...Object.fromEntries(Object.keys(SELECTS).map(k => [k, ''])), ...Object.fromEntries(DATES.map(d => [d[0], DATE_DEFAULT(d[0])])) });
  const draft = blank();          // what the fields show
  let applied = blank();          // what the list is filtered by (Search / Enter applies the draft)
  // each pair: From can't be after To, To can't be before From
  const pickers = Object.fromEntries(DATES.map(([k, sel, , future]) => {
    const pk = {}, [f0, t0] = draft[k];
    pk.from = DateField.init($(sel + '-from'), { date: f0, max: t0, optional: true, future, onChange(d) { draft[k][0] = d; pk.to.setMin(d); bar.update(); } });
    pk.to = DateField.init($(sel + '-to'), { date: t0, min: f0, optional: true, future, onChange(d) { draft[k][1] = d; pk.from.setMax(d); bar.update(); } });
    // put a pair to the given dates (default = its default)
    pk.set = ([f, t] = DATE_DEFAULT(k)) => { draft[k] = [f, t]; pk.from.set(f); pk.to.set(t); pk.from.setMax(t); pk.to.setMin(f); };
    return [k, pk];
  }));
  const sameDay = (a, b) => (a ? +a : 0) === (b ? +b : 0);
  const isDefault = k => { const [f, t] = draft[k], [df, dt] = DATE_DEFAULT(k); return sameDay(f, df) && sameDay(t, dt); };
  const day = v => { const p = parts(v); return p ? new Date(+p.y, MONTHS.indexOf(p.mo), +p.d) : null; };
  const inRange = (v, [f, t]) => { if (!f && !t) return true; const d = day(v); return !!d && (!f || d >= f) && (!t || d <= t); };
  const yesNo = (want, has) => !want || (want === 'yes') === has;
  function matches(b) {
    const s = b.state, f = applied, has = (v, q) => !q || String(v || '').toLowerCase().includes(q.toLowerCase());
    return has(b.txn, f.txn) && has(s.reference_no, f.ref) && has(s.hotel_name, f.hotel) && has(leadGuest(s), f.guest)
      && (!view || s.status === view)
      && (!f.type || f.type === 'offline')   // every booking here is a manual (offline) one
      && (!f.platform || s.platform === f.platform)
      && (!f.supplier || s.supplier_id === +f.supplier)
      && (!f.client || s.customer_id === +f.client)
      && (!f.country || s.country_name === f.country)
      && (!f.staff || b.createdBy === f.staff || b.updatedBy === f.staff)
      && yesNo(f.hcn, !!s.hcn) && yesNo(f.special, !!String(s.special_request || '').trim())
      && DATES.every(([k, , val]) => inRange(val(b), f[k]));
  }

  /* ---------- table ---------- */
  const state = { page: 1, size: 20 };
  let marked = null;   // the booking just created / saved: its row stays highlighted
  // newest first: booking date, then the order they were added
  const rows = () => Bookings.list.filter(matches).sort((a, b) => String(b.state.booking_date).localeCompare(String(a.state.booking_date)) || b.id - a.id);

  function pageList(page, pages) {
    if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
    const set = new Set([1, pages, page - 1, page, page + 1].filter(n => n >= 1 && n <= pages));
    const out = []; let prev = 0;
    [...set].sort((a, b) => a - b).forEach(n => { if (n - prev > 1) out.push('…'); out.push(n); prev = n; });
    return out;
  }

  function row(b) {
    const s = b.state, ps = s.ps, sup = supplier(s.supplier_id), cl = client(s.customer_id);
    const [stLabel, stCls] = STATUS[s.status] || [s.status || '—', 'off'];
    const [payIco, payCls] = PAY[b.payment] || PAY.Unpaid;
    // supplier code = the supplier's short code (offline suppliers have none → their supplier code)
    const code = sup ? sup.short || sup.code : '';
    return `<tr${b.id === marked ? ' class="is-last-opened"' : ''}>
      <td><span class="bk-id">${esc(b.txn)}</span><span class="tbl-tag neutral">Manual</span></td>
      <td>${esc(cl ? cl.name : '—')}</td>
      <td>${esc(leadGuest(s)) || '<span class="tbl-muted">—</span>'}</td>
      <td class="tbl-strong">${esc(s.hotel_name) || '<span class="tbl-muted">—</span>'}</td>
      <td>${dateCell(s.booking_date)}</td>
      <td>${dateCell(s.cancellation_deadline_date)}</td>
      <td>${dateCell(s.check_in)}</td>
      <td>${dateCell(s.check_out)}</td>
      <td class="text-center">${code ? `<span class="tbl-code" data-tooltip="${esc(sup.name)}" tabindex="0">${esc(code)}</span>` : '<span class="tbl-muted">—</span>'}</td>
      <td>${esc(s.reference_no) || '<span class="tbl-muted">—</span>'}</td>
      <td class="text-end tbl-fit">${money(ps.supplierCurrency, ps.supplierPrice)}</td>
      <td class="text-end tbl-fit"><span class="bk-pay">${money(ps.portalCurrency, ps.finalPrice)}<i class="fas fa-${payIco} bk-pay-ico ${payCls}" data-tooltip="${esc(b.payment || 'Unpaid')}" tabindex="0" aria-label="${esc(b.payment || 'Unpaid')}"></i></span></td>
      <td class="text-center">${esc(s.platform || '—')}</td>
      <td class="text-center"><span class="tbl-status ${stCls}">${esc(stLabel)}</span></td>
      <td class="tbl-action-col"><div class="tbl-actions">
        <a class="tbl-action" href="booking-form.html?id=${b.id}&amp;returnUrl=hotel-bookings.html" data-tip="Edit" aria-label="Edit booking ${esc(b.txn)}"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg></a>
      </div></td>
    </tr>`;
  }

  function render() {
    const list = rows();
    const pages = Math.max(1, Math.ceil(list.length / state.size));
    state.page = Math.min(state.page, pages);
    const start = (state.page - 1) * state.size;
    const slice = list.slice(start, start + state.size);
    $('#rows').innerHTML = slice.length ? slice.map(row).join('') : EmptyState.row(15);

    $('#pg-range').textContent = list.length ? `${start + 1}–${start + slice.length}` : '0';
    $('#pg-total').textContent = list.length.toLocaleString('en-US');
    $('#pg-mobile').textContent = `Page ${state.page} of ${pages}`;
    $('#pg-prev').disabled = state.page === 1;
    $('#pg-next').disabled = state.page === pages;
    $('#pg-pages').innerHTML = pageList(state.page, pages).map(n => n === '…'
      ? '<span class="pagination__ellipsis">…</span>'
      : `<button type="button" class="pagination__page${n === state.page ? ' pagination__page--active' : ''}" data-pg="${n}"${n === state.page ? ' aria-current="page"' : ''} aria-label="Page ${n}${n === state.page ? ', current page' : ''}">${n}</button>`).join('');
  }

  const load = () => TableLoading.run($('.tbl-area'), render);
  $('#pg-pages').addEventListener('click', e => { const b = e.target.closest('[data-pg]'); if (b) { state.page = +b.dataset.pg; load(); } });
  $('#pg-prev').addEventListener('click', () => { state.page--; load(); });
  $('#pg-next').addEventListener('click', () => { state.page++; load(); });
  $('#pg-size').addEventListener('change', e => { state.size = +e.target.value; state.page = 1; load(); });

  // the panel's fields: count + chips (Search applies; Reset puts every field back to its default — Booking date = today — and reloads)
  Object.entries(SELECTS).forEach(([k, sel]) => $(sel).addEventListener('change', e => { draft[k] = e.target.value; }));
  $('#f-platform').addEventListener('change', () => { loadClients(); bar.update(); });
  loadClients();
  $('#f-q').addEventListener('input', e => { draft.txn = e.target.value.trim(); });
  Object.entries(TEXTS).forEach(([k, sel]) => $(sel).addEventListener('input', e => { draft[k] = e.target.value.trim(); }));
  const optText = sel => { const s = $(sel); return s.options[s.selectedIndex]?.text || ''; };
  const LABELS = { ref: 'Supplier reference', hotel: 'Hotel name', guest: 'Guest name', type: 'Booking type', platform: 'Platform type', supplier: 'Supplier', client: 'Client', country: 'Hotel country', staff: 'Staff', hcn: 'Has HCN', special: 'Has special request' };
  const DATE_LABELS = { booking: 'Booking date', statusDate: 'Status date', checkin: 'Check-in date', deadline: 'Deadline date' };
  const fmt = d => `${String(d.getDate()).padStart(2, '0')}-${MONTHS[d.getMonth()]}-${d.getFullYear()}`;
  const setSelect = (sel, v) => { const s = $(sel); s.value = v; s.dispatchEvent(new Event('change', { bubbles: true })); };
  const bar = FilterBar.init($('#filter-bar'), {
    fields: [
      ...Object.entries(TEXTS).map(([k, sel]) => ({ label: LABELS[k], isSet: () => !!draft[k], text: () => draft[k], clear: () => { $(sel).value = ''; draft[k] = ''; } })),
      ...Object.entries(SELECTS).map(([k, sel]) => ({ label: LABELS[k], isSet: () => !!draft[k], text: () => optText(sel), clear: () => setSelect(sel, '') })),
      ...DATES.map(([k]) => ({
        // counts (and shows a chip) only when it differs from its default — today for Booking date, empty for the rest
        label: DATE_LABELS[k], isSet: () => !isDefault(k),
        text: () => { const [f, t] = draft[k]; return !f && !t ? 'Any date' : !t ? `from ${fmt(f)}` : !f ? `until ${fmt(t)}` : +f === +t ? fmt(f) : `${fmt(f)} – ${fmt(t)}`; },
        clear: () => pickers[k].set(),
      })),
    ],
    onSearch: () => { applied = structuredClone(draft); state.page = 1; marked = null; load(); },
    onReset: () => {
      $('#f-q').value = ''; draft.txn = '';
      Object.entries(TEXTS).forEach(([k, sel]) => { $(sel).value = ''; draft[k] = ''; });
      Object.values(SELECTS).forEach(sel => setSelect(sel, ''));
      DATES.forEach(([k]) => pickers[k].set());
      applied = blank(); state.page = 1; load();
    },
  });

  /* back from the booking form after Create booking / Save changes (?saved=id&how=new|edit): say so, mark the row */
  const qs = new URLSearchParams(location.search);
  const saved = Bookings.get(qs.get('saved'));
  if (saved) {
    marked = saved.id;
    // a booking made on an earlier day isn't in today's list: widen Booking date back to its day so the saved row shows;
    // one without a booking date (saved before it was required) matches no date range: clear the Booking date filter
    const bd = day(saved.state.booking_date);
    if (!bd) { pickers.booking.set([null, null]); applied = structuredClone(draft); bar.update(); }
    else if (bd < today) { pickers.booking.set([bd, new Date(today)]); applied = structuredClone(draft); bar.update(); }
    // its page, so the marked row is in view
    state.page = Math.floor(rows().findIndex(b => b.id === saved.id) / state.size) + 1;
    setTimeout(() => toast(qs.get('how') === 'edit' ? `Booking ${saved.txn} updated` : `Booking ${saved.txn} created`), 300);
    history.replaceState(null, '', location.pathname);
  }
  // status view: a switch of what the list shows, applied at once (Reset leaves it as it is, like live)
  $('#f-view').addEventListener('change', e => { view = e.target.value; state.page = 1; marked = null; load(); });

  /* Download: the list as it is filtered now (every page), one row per booking, the list's columns; CSV */
  $('#btn-download').addEventListener('click', () => {
    const csv = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const num = v => (v === '' || v == null ? '' : Number(v).toFixed(2));
    const head = ['Booking ID', 'Booking type', 'Client name', 'Guest name', 'Hotel name', 'Booking date', 'Deadline date', 'Check-in', 'Check-out',
      'Supplier code', 'Supplier ref.', 'Cost currency', 'Cost', 'Payment currency', 'Payment', 'Payment status', 'Platform type', 'Status'];
    const dt = v => [dateText(v), timeText(v)].filter(Boolean).join(' ');
    const lines = rows().map(b => {
      const s = b.state, ps = s.ps, sup = supplier(s.supplier_id), cl = client(s.customer_id);
      return [b.txn, 'Offline', cl ? cl.name : '', leadGuest(s), s.hotel_name, dt(s.booking_date), dt(s.cancellation_deadline_date), dateText(s.check_in), dateText(s.check_out),
        sup ? sup.short || sup.code : '', s.reference_no, ps.supplierCurrency, num(ps.supplierPrice), ps.portalCurrency, num(ps.finalPrice), b.payment || 'Unpaid',
        s.platform, (STATUS[s.status] || [s.status])[0]].map(csv).join(',');
    });
    // BOM first so Excel reads it as UTF-8
    const blob = new Blob(['﻿' + [head.map(csv).join(','), ...lines].join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `hotel-bookings-${fmt(new Date())}.csv`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast(lines.length ? `${lines.length} booking${lines.length > 1 ? 's' : ''} downloaded` : 'No bookings to download');
  });

  SearchableSelect.init();
  load();
  // another tab saved a booking
  window.addEventListener('storage', e => { if (e.key === 'admin-redesign:hotelBookings') location.reload(); });
})();
