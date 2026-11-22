/* Manual hotel booking form (Add / Edit) — prototype logic + dummy data. Ported from
   manual-booking-form/output/manual-booking-form.html; 2026-11-22 aligned with the live portal form
   (supplier currency from the supplier, Market, meal list, status list, required contact, B2B only). */
/* ---------- dummy data ---------- */
/* Supplier / API = the shared hotel API list (js/data.js, same list as Supplier List), active suppliers only
   ("Inactive suppliers are not used for search or booking"); the booking's own supplier stays listed even if inactive */
const SUPPLIERS = [];
function loadSuppliers() {
  SUPPLIERS.splice(0, SUPPLIERS.length, ...HotelApis.list.filter(x => x.active || x.id === state.supplier_id).map(x => ({
    id: x.id, label: HotelApis.label(x), name: x.name, type: x.temporary ? 'temp' : 'api', currency: x.currency,
  })));
}
/* Supplier Currency = the supplier's currency (every API has exactly one) */
const supCurrencyOf = it => (it && it.currency) || null;
/* shared lists (js/data.js RefData) */
const PLATFORMS = RefData.portals.filter(p => p === 'B2B').map(p => ({ id: p, label: p, cust: 'Client' }));   /* live portal offers B2B only */
/* B2B clients = Partners; disabled partners can't be picked */
const CUSTOMERS = { B2B: RefData.partners.filter(p => p.enabled).map(p => ({ id: p.id, label: p.name })) };
/* Market list: the markets in the chosen client currency, "Name (CUR)" (partners have no market list of their own) */
const MARKETS = RefData.markets.map(m => ({ id: m.id, currency: m.currency, label: RefData.marketLabel(m) }));
const MARKET_ITEMS = [];   /* refilled whenever the agent or agent currency changes */
const setMarkets = () => MARKET_ITEMS.splice(0, MARKET_ITEMS.length, ...(state.customer_id == null ? [] : MARKETS.filter(m => m.currency === state.customer_currency)));
/* meal list (name + code; search by name or code) */
const MEALS = RefData.meals.map(([label, code]) => ({ id: label, label, code }));
const CUSTOMER_ITEMS = [];   /* refilled from CUSTOMERS whenever the platform changes */
const setCustomers = () => CUSTOMER_ITEMS.splice(0, CUSTOMER_ITEMS.length, ...(CUSTOMERS[state.platform] || []));
const custLabel = () => (PLATFORMS.find(x => x.id === state.platform) || {}).cust || 'Client';
const CITIES = Object.fromEntries(RefData.countries.filter(c => c.cities).map(c => [c.name, c.cities]));   /* hotel countries */
const COUNTRIES = Object.keys(CITIES).map(c => ({ id: c, label: c }));
const CITY_ITEMS = [];   /* refilled from CITIES whenever the country changes */
const setCities = () => CITY_ITEMS.splice(0, CITY_ITEMS.length, ...(CITIES[state.country_name] || []).map(c => ({ id: c, label: c })));
const opt = v => ({ id: v, label: v });
const NATIONALITIES = RefData.countries.map(c => ({ id: c.name, label: c.name, code: c.code }));
const natCode = c => (NATIONALITIES.find(n => n.id === c) || {}).code || null;
const DIAL_CODES = RefData.countries.map(c => ({ id: c.dial, label: `${c.dial} ${c.name}` }));
const STATUSES = ['CONFIRMED', 'RE CONFIRMED', 'CANCELLED'].map(opt);
const MARKUP_TYPES = ['Percent', 'Fixed'].map(opt);   /* same names as the Markup page */
const TITLES = ['Mr', 'Ms', 'Mrs'].map(opt);
const GUEST_TYPES = ['Adult', 'Child'].map(opt);
const GENDERS = ['Male', 'Female'].map(opt);
const CURRENCIES = RefData.currencies.map(opt);
/* valid time formats only: Local, or UTC with a real offset (whole hours −12…+14 plus the half/quarter-hour zones in use) */
/* one time format for every cancellation policy: Local, or UTC ± hours[:minutes] */
const TZ_MINUTES = [{ id: '00', label: ':00' }, { id: '30', label: ':30' }, { id: '45', label: ':45' }];
function tzError() {
  const t = state.tz; if (t.mode !== 'UTC') return '';
  if (t.hours === '') return 'Enter the UTC offset hours.';
  const h = Number(t.hours), max = t.sign === '-' ? 12 : 14;
  const sg = t.sign === '-' ? '−' : '+';
  if (h > max) return `A UTC${sg} offset can be at most ${max} hours.`;
  if (h === max && t.mins !== '00') return `UTC${sg}${max} can't have minutes — choose :00.`;
  return '';
}
const tzString = () => state.tz.mode === 'UTC' ? (tzError() ? '' : `UTC${state.tz.sign}${Number(state.tz.hours)}${state.tz.mins !== '00' ? ':' + state.tz.mins : ''}`) : 'Local';

const RM_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/></svg>';

/* ---------- state ---------- */
let mode = 'add';
let state;
let submitted = false;

const emptyScope = () => ({ essentialInformation: '', agent: [], supplier: [] });
const allGuests = () => state.rooms.flatMap(r => r.guests);
let lastNationality = '';   /* most recently chosen nationality — default for new guests */
const plainGuest = () => ({ title: '', first_name: '', last_name: '', type: 'Adult', child_age: '', gender: '', nationality: '', is_lead: false });
/* guests added later start with the nationality already chosen on the booking */
const newGuest = () => ({ ...plainGuest(), nationality: lastNationality || (allGuests().find(g => g.nationality) || {}).nationality || '' });
/* rooms added after the first start with the first room's type and price (editable) */
const newRoom = () => ({ room_type: state.rooms[0]?.room_type || '', price: state.rooms[0]?.price ?? '', guests: [newGuest()], cancellation: emptyScope() });
const blankState = () => ({
  supplier_id: null, supplier_currency: null, platform: '', customer_id: null, customer_currency: null, market_id: null,
  hotel_name: '', address: '', country_name: '', city: '', hotel_phone_number: '', hcn: '',
  booking_date: '', cancellation_deadline_date: '', check_in: '', check_out: '', star_rating: '', status: '',
  lead_pax_name: '', guest_email: '', contact_dial: '', contact_mobile: '', meal: '',
  rooms: [{ room_type: '', price: '', cancellation: emptyScope(), guests: [{ ...plainGuest(), is_lead: true }] }],
  reference_no: '',
  ps: { supplier: '', supplierCurrency: '', supplierPrice: '', portalCurrency: '', conversionRate: '', reverseRate: '', convertedPrice: '', markupType: '', markupRule: '', markupAmount: '', noOfRooms: 1, finalPrice: '', issue: '' },
  contracting_comment: '', special_request: '',
  onePolicy: true, cancellation_all: emptyScope(),
  tz: { mode: 'Local', sign: '+', hours: '', mins: '00' },
  /* client policies calculated from the supplier ones: same steps, times moved earlier by clientHours, fee converted + marked up */
  clientAuto: true, clientHours: '36',   /* the system's set hours */
  clientNow: '',   /* "now" for an empty supplier From: live until the booking is saved, then kept */
});
/* a saved booking (js/data.js Bookings) opened for editing: its saved state on top of a blank one */
let record = null;
/* bookings saved before the calculate option keep their typed client policies (option off) */
const savedState = rec => ({ ...blankState(), clientAuto: false, ...JSON.parse(JSON.stringify(rec.state)), unique_trans_id: rec.txn });

const get = p => p.split('.').reduce((o, k) => (o == null ? o : o[k]), state);
const set = (p, v) => { const k = p.split('.'); let o = state; k.slice(0, -1).forEach(x => o = o[x]); o[k.at(-1)] = v; };
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/* ---------- searchable select ---------- */
const selects = {};
/* opts.groups: [[type, title]] to group items ('*' = all items); opts.addTemp + opts.onAdd(typed): "Other" footer that opens the page's create UI */
function initSelect(id, items, path, onPick, placeholder, opts = {}) {
  const root = document.getElementById(id);
  root.innerHTML = `<input class="ss-input" type="text" placeholder="${placeholder}" autocomplete="off">${opts.groups ? '<span class="ss-tag" hidden></span>' : ''}<button type="button" class="ss-clear" title="Clear">×</button><div class="ss-pop"><ul class="ss-list"></ul>${opts.addTemp ? '<div class="ss-foot"></div>' : ''}</div>`;
  const input = root.querySelector('.ss-input'), list = root.querySelector('ul'), foot = root.querySelector('.ss-foot'), tag = root.querySelector('.ss-tag');
  input.readOnly = !!opts.noSearch;
  root.classList.toggle('no-clear', !!opts.noClear);
  const itemOf = v => items.find(i => i.id === v);
  const labelOf = v => { const it = itemOf(v); return it ? (opts.showId ? `${it.label} (ID: ${it.id})` : opts.showCode ? `${it.label} (${it.code})` : it.label) : ''; };
  const li = i => `<li data-id="${i.id}" class="${i.id === get(path) ? 'sel' : ''}"><span>${esc(i.label)}</span>${opts.showId ? `<span class="ss-id">ID: ${i.id}</span>` : ''}${opts.showCode ? `<span class="ss-id">${i.code}</span>` : ''}${i.type === 'temp' ? '<span class="pill-temp">Temp</span>' : ''}</li>`;
  const draw = q => {
    q = (q || '').trim().toLowerCase();
    const f = items.filter(i => i.label.toLowerCase().includes(q) || (opts.showId && String(i.id).includes(q.replace(/^id[:\s]*/, ''))) || (opts.showCode && (opts.codePrefix ? i.code.toLowerCase().startsWith(q) : i.code.toLowerCase() === q)));
    const html = opts.groups
      ? opts.groups.map(([k, title]) => { const g = k === '*' ? f : f.filter(i => i.type === k); return g.length ? `<li class="grp">${title}</li>${g.map(li).join('')}` : ''; }).join('')
      : f.map(li).join('');
    list.innerHTML = html || `<li class="none">${opts.emptyText || `No ${opts.noun || 'items'} found`}${q ? ` for “${esc(q)}”` : ''}</li>`;
    if (foot) drawFoot();
  };
  /* "Other — add temporary …" footer: opens the page's create UI (opts.onAdd) with what was typed */
  const drawFoot = () => {
    foot.innerHTML = `<button type="button" class="ss-other" data-ss="open"><span class="plus">+</span><span><b>Other — add temporary ${opts.noun || 'item'}</b><small>Not in the list? Add it here.</small></span></button>`;
  };
  const show = () => { if (root.classList.contains('fixed')) return; root.classList.add('open'); draw(''); if (!opts.noSearch) input.select(); };
  const hide = () => { root.classList.remove('open'); input.value = labelOf(get(path)); };
  input.addEventListener('focus', show);
  /* a second click on an already-open, non-searchable list closes it (checked on mousedown, before focus re-opens it) */
  input.addEventListener('mousedown', e => {
    if (opts.noSearch && root.classList.contains('open') && document.activeElement === input) { e.preventDefault(); hide(); input.blur(); }
  });
  input.addEventListener('click', () => { if (!root.classList.contains('open') && document.activeElement === input) show(); });
  input.addEventListener('input', () => { root.classList.add('open'); draw(input.value); });
  list.addEventListener('mousedown', e => {
    e.preventDefault();
    const li = e.target.closest('li[data-id]'); if (!li) return;
    const item = items.find(i => String(i.id) === li.dataset.id);
    const prev = get(path); set(path, item.id); onPick && onPick(item, prev); hide(); input.blur(); refresh();
  });
  if (foot) {
    foot.addEventListener('mousedown', e => e.preventDefault());
    foot.addEventListener('click', e => {
      if (!e.target.closest('[data-ss="open"]')) return;
      const typed = input.value !== labelOf(get(path)) ? input.value.trim() : '';
      hide(); input.blur(); opts.onAdd && opts.onAdd(typed);
    });
  }
  root.querySelector('.ss-clear').addEventListener('mousedown', e => { e.preventDefault(); const prev = get(path); set(path, null); onPick && onPick(null, prev); hide(); refresh(); });
  root.addEventListener('focusout', () => setTimeout(() => { if (!root.contains(document.activeElement)) hide(); }, 120));
  selects[id] = { root, input, sync: () => {
    if (document.activeElement !== input) input.value = labelOf(get(path));
    root.classList.toggle('has', get(path) != null && get(path) !== '');
    if (tag) { const it = itemOf(get(path)); tag.hidden = !(it && it.type === 'temp'); tag.textContent = 'Temp'; root.classList.toggle('has-tag', !tag.hidden); }
  } };
}

/* ---------- rendering of dynamic lists ---------- */
const field = (label, bind, val, attrs = '', fb = '', type = 'text', extra = '') =>
  `<div class="field"><label class="lbl${/data-required/.test(attrs) ? ' req' : ''}">${label}</label><input type="${type}" ${attrs} data-bind="${bind}" value="${esc(val)}" ${extra}>${fb ? `<div class="fb">${fb}</div>` : ''}</div>`;
const rmBtn = (action, i, extra = '') => `<button type="button" class="btn btn-rm" data-action="${action}" data-i="${i}" ${extra}>${RM_ICON}Remove</button>`;
const fmtMoney = v => (v === '' || v == null || isNaN(Number(v)) ? '' : Number(v).toFixed(2));
const cleanMoney = v => v.replace(/[^\d.]/g, '').replace(/^(\d*\.?\d{0,2}).*$/, '$1');
const fmtRate = v => { if (v === '' || v == null || isNaN(Number(v))) return ''; const n = Number(v); return Math.abs(n - +n.toFixed(4)) < 1e-9 ? n.toFixed(4) : n.toFixed(6); };
const money2 = (cur, v) => `${cur || '—'} ${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fbHTML = fb => (fb ? `<div class="fb">${fb}</div>` : '');
const money = (label, bind, val, curPath, fb, req) =>
  `<div class="field"><label class="lbl${req ? ' req' : ''}">${label}</label><div class="ig"><span class="pre" data-adorn="${curPath}"></span><input type="text" inputmode="decimal" placeholder="0.00" data-money data-bind="${bind}" data-min="0" ${req ? 'data-required' : ''} value="${esc(fmtMoney(val))}"></div>${fbHTML(fb)}</div>`;
const stepper = (label, bind, val, min, max, fb, req) =>
  `<div class="field"><label class="lbl${req ? ' req' : ''}">${label}</label><div class="ig stepper"><button type="button" data-action="step" data-d="-1" aria-label="Decrease">−</button><input type="text" inputmode="numeric" placeholder="${min}" data-int data-bind="${bind}" data-min="${min}" data-max="${max}" ${req ? 'data-required' : ''} value="${esc(val)}"><button type="button" data-action="step" data-d="1" aria-label="Increase">+</button></div>${fbHTML(fb)}</div>`;
const CAL_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/></svg>';
const dateField = (label, bind, val, kind, placeholder, fb) =>
  `<div class="field"><label class="lbl">${label}</label><div class="dp">${CAL_ICON}<input type="text" data-date="${kind}" data-bind="${bind}" value="${esc(val)}" placeholder="${placeholder}"><button type="button" class="dp-clear" data-action="dp-clear" aria-label="Clear">×</button></div>${fbHTML(fb)}</div>`;

/* ---------- date picker ---------- */
const DP = {
  date:        { dateFormat: 'Y-m-d',          altFormat: 'd-M-Y' },
  datetime:    { dateFormat: 'Y-m-d\\TH:i',    altFormat: 'd-M-Y  ·  h:i K',   enableTime: true },
  datetimesec: { dateFormat: 'Y-m-d\\TH:i:S',  altFormat: 'd-M-Y  ·  h:i:S K', enableTime: true, enableSeconds: true },
};
/* policy dates: next From = previous To + 1 second */
const addSecs = (v, s) => {
  const m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/); if (!m) return '';
  const d = new Date(+m[1], m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0) + s), p2 = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;
};
const plusOneSec = v => addSecs(v, 1);
const nowStr = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 19); };   /* local time */
/* shown like the date pickers: 16-Feb-2027 · 11:59:58 AM */
const fmtDT = v => {
  const m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/); if (!m) return '';
  const h = +m[4], mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m[2] - 1];
  return `${m[3]}-${mon}-${m[1]}  ·  ${String(h % 12 || 12).padStart(2, '0')}:${m[5]}:${m[6]} ${h < 12 ? 'AM' : 'PM'}`;
};
/* a From the user picks stops following; a To change moves the next policy's From while that From is still auto-filled */
function chainPolicyDates(bind, str) {
  const m = bind.match(/^(.*)\.(agent|supplier)\.(\d+)\.(fromDate|toDate)$/); if (!m) return;
  const list = get(`${m[1]}.${m[2]}`), i = +m[3];
  if (m[4] === 'fromDate') { list[i].fromAuto = false; return; }
  const next = list[i + 1];
  if (next && (next.fromAuto || !next.fromDate)) { next.fromDate = plusOneSec(str); next.fromAuto = !!next.fromDate; }
}
const dayKey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function initDates(root) {
  root.querySelectorAll('input[data-date]:not(.flatpickr-input)').forEach(el => {
    const stay = el.dataset.bind === 'check_in' || el.dataset.bind === 'check_out';
    el._fp = flatpickr(el, {
      ...DP[el.dataset.date], ...(el.dataset.bind === 'booking_date' && { maxDate: new Date() }), altInput: true, altInputClass: 'dp-input', time_24hr: false, disableMobile: true, monthSelectorType: 'static',
      onChange: (d, str) => { set(el.dataset.bind, str); chainPolicyDates(el.dataset.bind, str); if (stay) stayPickers().forEach(fp => fp.redraw()); refresh(); },
      onDayCreate: stay ? (d, s, fp, day) => {
        if (!state) return;
        const k = dayKey(day.dateObj), ci = state.check_in, co = state.check_out;
        if (ci && co && k > ci && k < co) day.classList.add('stay');
        if ((k === ci || k === co) && !day.classList.contains('selected')) day.classList.add('stay-edge');
      } : undefined,
    });
  });
}
const stayPickers = () => ['check_in', 'check_out'].map(b => document.querySelector(`[data-bind="${b}"]`)._fp).filter(Boolean);
const destroyDates = root => root.querySelectorAll('input[data-date]').forEach(i => i._fp && i._fp.destroy());

/* ---------- rooms & guests ---------- */
function guestHTML(r, ri, g, gi) {
  const base = `rooms.${ri}.guests.${gi}`, id = `r${ri}-g${gi}`, child = g.type === 'Child';
  return `<div class="guest${g.is_lead ? ' is-lead' : ''}">
    <div class="guest-head"><span>Guest ${gi + 1}</span><span class="spacer"></span>
      ${child ? '' : `<label class="lead-check"><input type="checkbox" data-lead="${ri}:${gi}" ${g.is_lead ? 'checked' : ''}> Lead guest</label>`}
      ${r.guests.length > 1 ? rmBtn('rm-guest', gi, `data-room="${ri}"`) : ''}</div>
    <div class="guest-grid${child ? ' has-age' : ''}">
      <div class="field" id="f-${id}-title"><label class="lbl req">Title</label><div class="ss" id="ss-${id}-title"></div><div class="fb">Required.</div></div>
      ${field('First / given name', `${base}.first_name`, g.first_name, 'placeholder="Enter first name" data-required', 'First name is required.')}
      ${field('Last name / surname', `${base}.last_name`, g.last_name, 'placeholder="Enter last name" data-required', 'Last name is required.')}
      <div class="field"><label class="lbl">Type</label><div class="ss" id="ss-${id}-type"></div></div>
      ${child ? stepper('Age', `${base}.child_age`, g.child_age, 0, 12, 'Age 0–12 is required.', true) : ''}
      <div class="field"><label class="lbl">Gender</label><div class="ss" id="ss-${id}-gender"></div></div>
      <div class="field"><label class="lbl">Nationality</label><div class="ss" id="ss-${id}-nat"></div></div>
    </div>
  </div>`;
}
function renderRooms() {
  document.getElementById('rooms').innerHTML = state.rooms.map((r, ri) => `
    <div class="box room">
      <div class="box-head"><span class="box-title">Room ${ri + 1}</span>${state.rooms.length > 1 ? rmBtn('rm-room', ri) : ''}</div>
      <div class="box-body">
        <div class="room-top">
          ${field('Room type', `rooms.${ri}.room_type`, r.room_type, 'placeholder="e.g. Superior Double Room" data-required data-policy-title', 'Room type is required.')}
          <div class="field"><label class="lbl">Room no.</label><div class="ro" title="Assigned automatically">${ri + 1}</div></div>
          ${money('Price <span class="hint">(supplier)</span>', `rooms.${ri}.price`, r.price, 'ps.supplierCurrency', 'Room price is required.', true)}
          <div class="field"><label class="lbl lbl-calc"><span><span data-cust-label>Client</span> price</span><span class="calc-mini" id="rcc-${ri}"></span></label><div class="ro money cust" id="rcp-${ri}" title="Price × conversion rate + markup"></div></div>
        </div>
        <div class="guests-head"><div class="sec-title"><span class="dot"></span>Guests</div></div>
        ${r.guests.map((g, gi) => guestHTML(r, ri, g, gi)).join('')}
        <div class="room-err" id="rerr-${ri}" hidden>Each room needs at least one adult.</div>
        <button type="button" class="btn btn-add" data-action="add-guest" data-room="${ri}">+ Add guest to room ${ri + 1}</button>
      </div>
    </div>`).join('');
  Object.keys(selects).filter(k => k.startsWith('ss-r')).forEach(k => delete selects[k]);
  state.rooms.forEach((r, ri) => r.guests.forEach((g, gi) => {
    const id = `r${ri}-g${gi}`, base = `rooms.${ri}.guests.${gi}`;
    initSelect(`ss-${id}-title`, TITLES, `${base}.title`, it => {
      g.title = g.title || '';
      if (it) g.gender = it.id === 'Mr' ? 'Male' : 'Female';   /* gender follows the title; still editable */
    }, 'Title', { noSearch: true });
    initSelect(`ss-${id}-type`, GUEST_TYPES, `${base}.type`, it => {
      if (it.id === 'Child') g.is_lead = false; else g.child_age = '';
      renderRooms();
    }, 'Type', { noSearch: true, noClear: true });
    initSelect(`ss-${id}-gender`, GENDERS, `${base}.gender`, () => { g.gender = g.gender || ''; }, 'Gender', { noSearch: true });
    initSelect(`ss-${id}-nat`, NATIONALITIES, `${base}.nationality`, (it, prev) => {
      g.nationality = g.nationality || '';
      if (!it) return;
      /* guests still on the old value (or empty) follow the change; guests set to something else keep theirs */
      lastNationality = it.id;
      allGuests().forEach(o => { if (o !== g && (!o.nationality || o.nationality === (prev || ''))) o.nationality = it.id; });
    }, 'Search nationality', { noun: 'nationality', showCode: true });
  }));
}

function policyRows(scopePath, kind, rows) {
  return rows.map((p, i) => `
    <div class="pol">
      <div class="pol-head"><span>Policy ${i + 1}</span>${rmBtn('rm-policy', i, `data-scope="${scopePath}" data-kind="${kind}"`)}</div>
      <div class="row c2">
        ${dateField('From <span class="hint">· empty = until</span>', `${scopePath}.${kind}.${i}.fromDate`, p.fromDate, 'datetimesec', 'Until')}
        ${dateField('To <span class="hint">· empty = onwards</span>', `${scopePath}.${kind}.${i}.toDate`, p.toDate, 'datetimesec', 'Onwards', "To can't be before From.")}
      </div>
      <div class="row c2 mt">
        ${money('Cancellation fee', `${scopePath}.${kind}.${i}.cancellationPrice`, p.cancellationPrice, kind === 'agent' ? 'ps.portalCurrency' : 'ps.supplierCurrency', 'Fee is required and must be 0 or more.', true)}
      </div>
    </div>`).join('');
}
/* client policies while "Auto calculate client policy" is on: read-only, one per supplier policy */
function derivedRows(scopePath) {
  const sc = get(scopePath), cc = state.ps.portalCurrency;
  if (!sc.supplier.length) return '<div class="ro is-empty">Add a supplier policy</div>';
  const ro = (v, empty) => `<div class="ro${v ? '' : ' is-empty'}">${v || empty}</div>`;
  return sc.agent.map((p, i) => `
    <div class="pol">
      <div class="pol-head"><span>Policy ${i + 1}</span></div>
      <div class="row c2">
        <div class="field dt"><label class="lbl">From</label>${ro(fmtDT(p.fromDate), 'Until')}</div>
        <div class="field dt"><label class="lbl">To</label>${ro(fmtDT(p.toDate), 'Onwards')}</div>
      </div>
      <div class="row c2 mt">
        <div class="field"><label class="lbl lbl-calc"><span>Cancellation fee</span><span class="calc-mini">${esc(p._calc || '')}</span></label>
          <div class="ro money cust${p.cancellationPrice === '' ? ' is-empty' : ''}">${p.cancellationPrice === '' ? p._need :`<span class="ccy">${esc(cc)}</span>${fmtN(p.cancellationPrice)}`}</div></div>
      </div>
    </div>`).join('');
}
/* client and supplier columns share rows (side by side): title, one row per policy pair, add button — so pairs line up at the same height */
const scopeRows = sc => 1 + Math.max(state.clientAuto ? Math.max(sc.supplier.length, 1) : sc.agent.length + 1, sc.supplier.length + 1);
function scopeHTML(scopePath, title) {
  const sc = get(scopePath);
  const kinds = [['agent', `${custLabel()} cancellation policies`, ''], ['supplier', 'Supplier cancellation policies', 'sup']];
  return `<div class="box">
    <div class="box-head"><span class="box-title">${esc(title)}</span></div>
    <div class="box-body">
      <div class="field" style="margin-bottom:16px"><label class="lbl">Essential information</label><input type="text" placeholder="Enter essential information" data-bind="${scopePath}.essentialInformation" value="${esc(sc.essentialInformation)}"></div>
      <div class="scope-groups" style="--rows:${scopeRows(sc)}">${kinds.map(([k, label, cls]) => k === 'agent' && state.clientAuto
        ? `<div class="group derived"><div class="sec-title"><span class="dot ${cls}"></span>${label}</div><div data-derived="${scopePath}">${derivedRows(scopePath)}</div></div>`
        : `<div class="group"><div class="sec-title"><span class="dot ${cls}"></span>${label}</div>${policyRows(scopePath, k, sc[k])}<button type="button" class="btn btn-add" data-action="add-policy" data-scope="${scopePath}" data-kind="${k}">+ Add ${k === 'agent' ? custLabel().toLowerCase() : 'supplier'} policy</button></div>`).join('')}</div>
    </div>
  </div>`;
}
function renderPolicies() {
  const el = document.getElementById('policies');
  destroyDates(el);
  el.innerHTML = state.onePolicy ? scopeHTML('cancellation_all', 'For all rooms')
    : state.rooms.map((r, i) => scopeHTML(`rooms.${i}.cancellation`, `Room ${i + 1}: ${r.room_type || 'Room type'}`)).join('');
  initDates(el);
}

/* ---------- derived values (never typed twice) ---------- */
const round2 = n => Math.round((n + Number.EPSILON) * 100) / 100;
const sameCurrency = () => !!state.ps.supplierCurrency && state.ps.supplierCurrency === state.ps.portalCurrency;
function syncFrom(path) {
  if (path === 'supplier_currency') state.ps.supplierCurrency = state.supplier_currency || '';
  if (path === 'customer_currency') state.ps.portalCurrency = state.customer_currency || '';
  /* a currency changed: the typed rate no longer applies — 1 for the same currency, otherwise re-enter it */
  if (path === 'supplier_currency' || path === 'customer_currency') state.ps.conversionRate = state.ps.reverseRate = sameCurrency() ? 1 : '';
}
function derive() {
  const lead = allGuests().find(g => g.is_lead);
  state.lead_pax_name = lead ? `${lead.first_name} ${lead.last_name}`.trim() : '';
  const ps = state.ps, rooms = state.rooms, rule = Number(ps.markupRule) || 0, mt = ps.markupType;
  if (sameCurrency()) ps.conversionRate = ps.reverseRate = 1;
  const r = Number(ps.conversionRate), rateOk = ps.conversionRate !== '' && r > 0 && !!ps.supplierCurrency && !!ps.portalCurrency;
  ps.noOfRooms = rooms.length;
  /* per room: converted = price × rate; markup = % of converted or flat per room; customer price = converted + markup */
  rooms.forEach(rm => {
    const has = rm.price !== '' && rm.price != null;
    rm._conv = has && rateOk ? round2(Number(rm.price) * r) : '';
    rm._mk = rm._conv === '' ? '' : mt === 'Percent' ? round2(rm._conv * rule / 100) : mt === 'Fixed' ? round2(rule) : 0;
    rm._cust = rm._conv === '' ? '' : round2(rm._conv + rm._mk);
  });
  const allPriced = rooms.length && rooms.every(rm => rm.price !== '' && rm.price != null);
  const sum = k => round2(rooms.reduce((a, rm) => a + Number(rm[k]), 0));
  ps.supplierPrice = allPriced ? sum('price') : '';
  const done = allPriced && rateOk;
  ps.convertedPrice = done ? sum('_conv') : '';
  ps.markupAmount = done ? sum('_mk') : '';
  ps.finalPrice = done ? sum('_cust') : '';

  /* client policies from supplier — same as Hotel_API (APICommonHelper.ConvertCancellationPolicy + HotelMapperManager.CalculateCancellationPrice):
     From = supplier From − hours − 1 s, To = supplier To − hours − 2 s;
     fee = supplier fee × rate + the markup of the rooms the policy covers (percent of their converted price, or fixed × rooms);
     a free (0) step gets no markup */
  if (state.clientAuto) {
    const secs = -(Number(state.clientHours) || 0) * 3600;
    const scopes = state.onePolicy ? [[state.cancellation_all, ps.convertedPrice, rooms.length]] : rooms.map(rm => [rm.cancellation, rm._conv, 1]);
    scopes.forEach(([sc, base, n]) => {
      const mkAmt = mt === 'Fixed' ? round2(rule * n) : mt === 'Percent' ? (base === '' ? '' : round2(base * rule / 100)) : 0;
      sc.agent = sc.supplier.map(p => {
        const has = p.cancellationPrice !== '' && p.cancellationPrice != null, f = Number(p.cancellationPrice);
        const conv = has && rateOk ? round2(f * r) : '';
        const mk = !f ? 0 : mkAmt;
        const fee = conv === '' || mk === '' ? '' : round2(conv + mk);
        return {
          /* empty supplier From → now − hours (as Hotel_API) */
          fromDate: p.fromDate ? addSecs(p.fromDate, secs - 1) : addSecs(state.clientNow || nowStr(), secs), toDate: addSecs(p.toDate, secs - 2),
          cancellationPrice: fee,
          _need: !has ? 'Enter supplier fee' : conv === '' ? 'Needs conversion rate' : mk === '' ? (state.onePolicy ? 'Needs every room price' : 'Needs room price') : '',
          _calc: fee === '' || !f ? '' : `${fmtN(f)} × ${fmtRate(r)} = ${fmtN(conv)}${mk ? ` + ${fmtN(mk)} markup` : ''}`,
        };
      });
    });
  }

  /* deadline — as Hotel_API (BookCHelper.GetEarliestPaidCancellationDate): the earliest From of a client policy with a fee above 0,
     across all rooms; only free policies → now − hours. Waits while there's no client policy or a client fee isn't known yet. */
  const clientPols = (state.onePolicy ? [state.cancellation_all] : rooms.map(rm => rm.cancellation)).flatMap(sc => sc.agent);
  if (!clientPols.length || clientPols.some(p => p.cancellationPrice === '' || p.cancellationPrice == null)) state.cancellation_deadline_date = '';
  else {
    const froms = clientPols.filter(p => Number(p.cancellationPrice) > 0 && p.fromDate).map(p => addSecs(p.fromDate, 0)).filter(Boolean).sort();
    state.cancellation_deadline_date = froms[0] || addSecs(state.clientNow || nowStr(), -(Number(state.clientHours) || 0) * 3600);
  }
}

/* push state -> DOM inputs (skips the focused text field, so typing isn't overwritten; checkboxes always follow state —
   a switch keeps focus after a confirm dialog closes, and skipping it left it showing the old value) */
function syncInputs() {
  document.querySelectorAll('[data-bind]').forEach(el => {
    if (el === document.activeElement && el.type !== 'checkbox') return;
    const v = get(el.dataset.bind);
    if (el._fp) { if (el.value !== String(v ?? '')) v ? el._fp.setDate(v, false) : el._fp.clear(false); return; }
    const shown = el.dataset.money !== undefined ? fmtMoney(v) : el.dataset.rate !== undefined ? fmtRate(v) : String(v ?? '');
    if (el.type === 'checkbox') el.checked = !!v; else if (el.value !== shown) el.value = shown;
  });
  Object.values(selects).forEach(s => s.sync());
}

/* ---------- price summary (read-only) ---------- */
const fmtN = v => Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function renderSummary() {
  const ps = state.ps, sc = ps.supplierCurrency, cc = ps.portalCurrency, rooms = state.rooms, n = rooms.length, cl = custLabel();
  const na = '<span class="na">—</span>', amt = (cur, v) => (v === '' || v == null || !cur ? na : `<span class="ccy">${cur}</span>${fmtN(v)}`);
  const mt = ps.markupType, rule = ps.markupRule, ok = ps.finalPrice !== '';
  const mkLabel = !mt || rule === '' ? 'No markup' : mt === 'Percent' ? `Markup ${+Number(rule).toFixed(2)}%` : `Markup ${fmtMoney(rule)} fixed per room`;
  const missing = [!sc && 'supplier currency', !cc && `${cl.toLowerCase()} currency`, !(Number(ps.conversionRate) > 0) && 'conversion rate', !rooms.every(r => r.price !== '') && 'every room price'].filter(Boolean);
  const mPart = !ok || !Number(ps.markupAmount) ? '' : ` + ${money2(cc, ps.markupAmount)}${mt === 'Fixed' && n > 1 ? ` (${fmtMoney(rule)} × ${n} rooms)` : ''}`;
  document.getElementById('sumBody').innerHTML = `
    <div class="sum-sub">${ps.supplier ? esc(ps.supplier) : 'Supplier not selected'}<span class="pb-fine-inline">${sc && cc && Number(ps.conversionRate) > 0 ? (sameCurrency() ? 'Same currency · rate 1' : `1 ${sc} = ${fmtRate(ps.conversionRate)} ${cc} · 1 ${cc} = ${fmtRate(ps.reverseRate)} ${sc}`) : 'Conversion rate not set'} · ${mkLabel}</span></div>
    <div class="pb-wrap"><table class="pb-table">
      <thead><tr><th>Room</th><th class="l">Room type</th><th>Guests</th><th>Supplier price</th><th>Converted</th><th>Markup</th><th>${esc(cl)} price</th></tr></thead>
      <tbody>${rooms.map((r, i) => `<tr><td>Room ${i + 1}</td><td class="l">${r.room_type ? esc(r.room_type) : na}</td><td>${r.guests.length}</td><td>${amt(sc, r.price)}</td><td>${amt(cc, r._conv)}</td><td class="mk">${amt(cc, r._mk)}</td><td class="final">${amt(cc, r._cust)}</td></tr>`).join('')}</tbody>
      <tfoot><tr><td>Total</td><td class="l"></td><td>${allGuests().length}</td><td>${amt(sc, ps.supplierPrice)}</td><td>${amt(cc, ps.convertedPrice)}</td><td class="mk">${amt(cc, ps.markupAmount)}</td><td class="final">${amt(cc, ps.finalPrice)}</td></tr></tfoot>
    </table></div>
    ${ok ? `<div class="pb-calc"><span>(${money2(sc, ps.supplierPrice)} × ${fmtRate(ps.conversionRate)}) = ${money2(cc, ps.convertedPrice)}${mPart} = <b>${money2(cc, ps.finalPrice)}</b></span>${mt === 'Fixed' ? '<span class="pb-note">A fixed markup is added per room</span>' : ''}</div>`
         : `<p class="pb-empty">To calculate, add the ${missing.join(', ')}.</p>`}
    <div class="total-line"><span class="l">${esc(cl)} total price</span><span class="v">${ok ? amt(cc, ps.finalPrice) : '—'}</span></div>`;
}

function refresh() {
  derive();
  syncInputs();
  const cl = custLabel(), ps = state.ps;

  /* currency / unit adornments */
  document.querySelectorAll('[data-adorn]').forEach(s => { s.textContent = String(get(s.dataset.adorn) ?? '').trim().toUpperCase() || '—'; });
  const mt = ps.markupType;
  document.querySelectorAll('[data-adorn-markup]').forEach(s => { s.textContent = mt === 'Percent' ? '%' : mt === 'Fixed' ? (String(ps.portalCurrency || '').toUpperCase() || '—') : '—'; });

  /* platform-driven labels */
  document.querySelectorAll('[data-cust-label]').forEach(x => { x.textContent = cl; });
  const custSel = selects['ss-customer'], custLocked = !state.platform;
  custSel.input.disabled = custLocked;
  custSel.input.placeholder = custLocked ? 'Select platform first' : `Search ${cl.toLowerCase()} by name or ID`;
  custSel.root.classList.toggle('locked', custLocked);
  /* supplier currency comes from the supplier, never picked here */
  const supIt = SUPPLIERS.find(x => x.id === state.supplier_id), supCurSel = selects['ss-supCur'];
  supCurSel.input.disabled = true;
  supCurSel.input.placeholder = 'Comes from the supplier';
  supCurSel.root.classList.toggle('locked', !supIt);
  supCurSel.root.classList.add('derived');
  supCurSel.root.dataset.needPath = supIt ? '' : 'supplier_id';
  /* agent currency after the agent; market after the agent currency; booking status after the supplier */
  const lockSel = (id, locked, need, lockedPh, ph) => { const x = selects[id]; x.input.disabled = locked; x.input.placeholder = locked ? lockedPh : ph; x.root.classList.toggle('locked', locked); x.root.dataset.needPath = locked ? need : ''; };
  lockSel('ss-custCur', state.customer_id == null, 'customer_id', `Select ${cl.toLowerCase()} first`, 'Select currency');
  lockSel('ss-market', !state.customer_currency, 'customer_currency', `Select ${cl.toLowerCase()} currency first`, 'Select market');
  lockSel('ss-status', state.supplier_id == null, 'supplier_id', 'Select supplier first', 'Select status');

  /* edit mode: booking source identity is fixed */
  ['ss-supplier', 'ss-supCur', 'ss-platform', 'ss-customer', 'ss-custCur', 'ss-market'].forEach(id => {
    const sel = selects[id], fixed = mode === 'edit';
    sel.root.classList.toggle('fixed', fixed);
    if (fixed) { sel.root.classList.remove('locked'); sel.input.disabled = true; sel.root.title = 'Set when the booking was created'; } else sel.root.title = '';
  });

  /* conversion rate (typed; fixed at 1 for the same currency) */
  const sc = ps.supplierCurrency, cc = ps.portalCurrency, same = sameCurrency();
  const rateNeed = !sc ? 'supplier_currency' : !cc ? 'customer_currency' : '';
  document.querySelectorAll('.rate-ig').forEach(ig => {
    const inp = ig.querySelector('input');
    inp.disabled = !!rateNeed || same;
    ig.classList.toggle('locked', !!rateNeed); ig.dataset.needPath = rateNeed;
    ig.classList.toggle('calc', same);
    inp.placeholder = rateNeed ? 'Select both currencies' : 'Enter rate';
    ig.querySelector('[data-rate-pre]').textContent = `1 ${String(get(ig.querySelector('[data-rate-pre]').dataset.ratePre) || '—').toUpperCase()} =`;
  });
  state.rooms.forEach((r, ri) => {
    const el = document.getElementById(`rcp-${ri}`); if (!el) return;
    el.innerHTML = r._cust === '' ? (r.price === '' ? 'Enter price' : 'Needs conversion rate') : `<span class="ccy">${esc(cc)}</span>${fmtN(r._cust)}`;
    el.classList.toggle('is-empty', r._cust === '');
    /* small calculation line above the price: price × rate = converted + markup */
    const mk = !Number(r._mk) ? '' : ` + ${fmtN(r._mk)}${mt === 'Percent' ? ` (${+Number(ps.markupRule).toFixed(2)}%)` : ' (fixed)'}`;
    const calc = r._cust === '' ? '' : `${fmtN(r.price)} × ${fmtRate(ps.conversionRate)} = ${fmtN(r._conv)}${mk}`;
    const cc2 = document.getElementById(`rcc-${ri}`); cc2.textContent = calc; cc2.title = calc;
  });

  /* read-only mirrors */
  document.querySelectorAll('.linked').forEach(l => {
    const v = String(get(l.dataset.link) ?? '').trim();
    l.querySelector('.v').textContent = v || l.dataset.empty || 'Not selected';
    l.classList.toggle('is-empty', !v);
  });

  /* city needs a country first */
  const cityLocked = !state.country_name, citySel = selects['ss-city'];
  citySel.input.disabled = cityLocked;
  citySel.input.placeholder = cityLocked ? 'Select country first' : 'Search city';
  citySel.root.classList.toggle('locked', cityLocked);

  /* amounts need their currency first */
  const curName = p => /customer_currency|portalCurrency/.test(p) ? `${cl.toLowerCase()} currency` : 'supplier currency';
  document.querySelectorAll('input[data-money]').forEach(inp => {
    const ig = inp.parentElement, wrap = inp.closest('.field'), pre = ig.querySelector('[data-adorn]');
    let needPath = '', need = '';
    if (pre) { if (!String(get(pre.dataset.adorn) ?? '').trim()) { needPath = pre.dataset.adorn; need = curName(needPath); } }
    else if (!mt) { needPath = 'ps.markupType'; need = 'markup type'; }
    else if (mt === 'Fixed' && !String(ps.portalCurrency || '').trim()) { needPath = 'ps.portalCurrency'; need = `${cl.toLowerCase()} currency`; }
    inp.disabled = !!need; ig.classList.toggle('locked', !!need); ig.dataset.needPath = needPath;
    inp.placeholder = !need ? '0.00' : need === 'markup type' ? 'Select type first' : 'Select currency first';
    ig.title = need ? `Select ${need} first` : '';
    let msg = wrap.querySelector('.cur-msg');
    if (!msg) { msg = document.createElement('div'); msg.className = 'cur-msg'; ig.after(msg); }
    msg.textContent = need ? `Select ${need} first — this amount has no currency.` : '';
    wrap.classList.toggle('cur-err', !!need && inp.value !== '');
  });

  /* steppers */
  document.querySelectorAll('.stepper').forEach(s => {
    const i = s.querySelector('input'), v = Number(i.value), has = i.value !== '';
    s.querySelector('[data-d="-1"]').disabled = !has || v <= Number(i.dataset.min);
    s.querySelector('[data-d="1"]').disabled = has && i.dataset.max !== undefined && v >= Number(i.dataset.max);
  });

  /* star rating */
  const sr = Number(state.star_rating) || 0;
  document.querySelectorAll('.star').forEach(b => b.classList.toggle('on', Number(b.dataset.v) <= sr));
  document.getElementById('starClear').hidden = !sr;

  /* date pickers */
  document.querySelectorAll('.dp').forEach(w => w.classList.toggle('has', !!w.querySelector('input[data-date]').value));
  const coFp = document.querySelector('[data-bind="check_out"]')._fp;
  if (coFp && coFp._min !== state.check_in) { coFp._min = state.check_in; coFp.set('minDate', state.check_in || null); }
  const nights = state.check_in && state.check_out && state.check_out > state.check_in ? Math.round((Date.parse(state.check_out) - Date.parse(state.check_in)) / 864e5) : 0;
  document.getElementById('nightsHint').textContent = nights ? `· ${nights} night${nights > 1 ? 's' : ''}` : '';

  /* time format */
  const tz = state.tz;
  document.querySelectorAll('[data-tz="mode"]').forEach(r => { r.checked = r.value === tz.mode; });
  document.getElementById('tzUtc').hidden = tz.mode !== 'UTC';
  document.querySelectorAll('[data-tz-sign]').forEach(b => b.classList.toggle('on', b.dataset.tzSign === tz.sign));
  const tzH = document.querySelector('[data-tz="hours"]'); if (document.activeElement !== tzH) tzH.value = tz.hours;
  const tzErr = tzError(), tzLive = tzErr && (submitted || tz.hours !== '');
  document.getElementById('tzMsg').textContent = tz.hours === '' ? '' : tzErr;   /* empty hours → red border only */
  document.getElementById('f-tz').classList.toggle('is-invalid', !!tzLive);
  document.getElementById('f-tz').classList.toggle('is-empty', !!tzLive && tz.hours === '');
  document.getElementById('tzPrev').textContent = tzString() || `UTC${tz.sign}?`;

  /* deadline (from the client policies) */
  const dl = document.getElementById('deadlineRo');
  dl.textContent = state.cancellation_deadline_date ? fmtDT(state.cancellation_deadline_date) : (state.onePolicy ? [state.cancellation_all] : state.rooms.map(r => r.cancellation)).some(sc => sc.agent.length) ? 'Waiting for client policy fees' : 'Waiting for client policy';
  dl.classList.toggle('is-empty', !state.cancellation_deadline_date);

  /* policies (and auto calculate) wait for what the client policy is calculated from */
  const pn = policyNeed(), lock = document.getElementById('polLock'), needBtn = document.getElementById('polNeed');
  lock.classList.toggle('locked', !!pn); lock.inert = !!pn;
  needBtn.hidden = !pn;
  if (pn) { needBtn.dataset.needPath = pn[0]; needBtn.querySelector('span').textContent = pn[1]; }

  /* client policies calculated from supplier */
  document.getElementById('clientHoursWrap').hidden = !state.clientAuto;
  document.querySelectorAll('[data-derived]').forEach(el => { el.innerHTML = derivedRows(el.dataset.derived); });

  renderSummary();
  if (submitted) validate(); else checkPolicyDates();
}

/* policy dates: a To can't be before its From (the To picker starts at the From; a From moved past the To is flagged at once) */
function checkPolicyDates() {
  const errs = [], norm = v => addSecs(v, 0);
  const scopes = state.onePolicy ? ['cancellation_all'] : state.rooms.map((r, i) => `rooms.${i}.cancellation`);
  scopes.forEach(sp => ['supplier', ...(state.clientAuto ? [] : ['agent'])].forEach(kind => (get(sp)[kind] || []).forEach((p, i) => {
    const bind = `${sp}.${kind}.${i}.toDate`, el = document.querySelector(`[data-bind="${bind}"]`); if (!el) return;
    const from = norm(p.fromDate), bad = !!from && !!norm(p.toDate) && norm(p.toDate) < from;
    /* the picker's limit only while the To is valid: a limit past the current To would blank it, hiding what's wrong */
    const min = bad ? '' : from;
    if (el._fp && el._fp._min !== min) { el._fp._min = min; el._fp.set('minDate', min || null); }
    if (el._fp && bad && !el._fp.selectedDates.length) el._fp.setDate(p.toDate, false);
    el.closest('.field').classList.toggle('is-invalid', bad);
    if (bad) errs.push(bind);
  })));
  return errs;
}

/* the first thing the client policy still needs: [field to go to, what to say] — supplier, client currency, rate, markup amount, room prices (Percent markup) */
function policyNeed() {
  const ps = state.ps;
  if (state.supplier_id == null) return ['supplier_id', 'Select supplier first'];
  if (!state.platform) return ['platform', 'Select platform type first'];
  if (state.customer_id == null) return ['customer_id', 'Select client first'];
  if (!ps.portalCurrency) return ['customer_currency', 'Select client currency first'];
  if (!(Number(ps.conversionRate) > 0)) return ['ps.conversionRate', 'Enter conversion rate first'];
  if (ps.markupType && ps.markupRule === '') return ['ps.markupRule', 'Enter markup amount first'];
  if (ps.markupType === 'Percent') { const i = state.rooms.findIndex(r => r.price === '' || r.price == null); if (i >= 0) return [`rooms.${i}.price`, state.rooms.length > 1 ? `Enter room ${i + 1} price first` : 'Enter room price first']; }
  return null;
}

/* turning auto calculate off: explain why it should stay on; off only on "Turn off" */
async function confirmAutoOff() {
  const h = Number(state.clientHours) || 0, cl = custLabel().toLowerCase();
  const pending = Modal.open({
    tone: 'warning',
    title: 'Turn off auto calculate?',
    message: `Auto calculate is the preferred way. It builds ${cl} policies from the supplier's, like API bookings, so the ${cl} always cancels before the supplier.`,
    details: [
      ['Times', `${h} h before the supplier's`],
      ['Fees', 'Supplier fee × rate + markup'],
    ],
    note: `If off, you enter ${cl} policies yourself. They won't update when supplier policies, rate or markup change.`,
    noteTone: 'danger',
    confirm: 'Turn off',
    cancel: 'Keep on',
  });
  document.querySelector('dialog.modal .modal-cancel')?.focus();   /* the safe choice */
  if (!(await pending)) return;
  state.clientAuto = false;
  derive(); renderPolicies(); refresh();
}

/* ---------- validation ---------- */
function validate() {
  const errors = [];
  // empty = the field has no value: red border only, no message (.is-empty)
  const mark = (fieldEl, bad, empty = false) => { if (fieldEl) { fieldEl.classList.toggle('is-invalid', bad); fieldEl.classList.toggle('is-empty', bad && empty); } return bad; };
  document.querySelectorAll('[data-bind]').forEach(el => {
    const wrap = el.closest('.field'); if (!wrap || el.type === 'checkbox') return;
    const v = String(el.value ?? '').trim();
    if (el.disabled && el.dataset.money !== undefined) { mark(wrap, false); if (v !== '') errors.push(el.dataset.bind); return; }
    let bad = false;
    if (el.hasAttribute('data-required') && v === '') bad = true;
    if (v !== '' && el.dataset.min !== undefined && Number(v) < Number(el.dataset.min)) bad = true;
    if (v !== '' && el.dataset.max !== undefined && Number(v) > Number(el.dataset.max)) bad = true;
    if (v !== '' && el.hasAttribute('data-email') && !/^\S+@\S+\.\S+$/.test(v)) bad = true;
    mark(wrap, bad, v === '');
    if (bad) errors.push(el.dataset.bind);
  });
  const nowKey = (d => `${dayKey(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`)(new Date());
  if (mark(document.getElementById('f-bookdate'), !!state.booking_date && state.booking_date > nowKey)) errors.push('booking_date');
  const co = state.check_in && state.check_out && state.check_out < state.check_in;
  if (co) { document.getElementById('checkoutMsg').textContent = 'Check-out must be on or after check-in.'; mark(document.getElementById('f-checkout'), true); errors.push('check_out'); }
  else document.getElementById('checkoutMsg').textContent = '';
  const need = (id, bad, key, empty = true) => { if (mark(document.getElementById(id), bad, empty)) errors.push(key); };
  need('f-supplier', state.supplier_id == null, 'supplier_id');
  need('f-supCur', !state.ps.supplierCurrency, 'supplier_currency');
  need('f-platform', !state.platform, 'platform');
  need('f-customer', state.customer_id == null, 'customer_id');
  need('f-custCur', !state.ps.portalCurrency, 'customer_currency');
  need('f-market', state.market_id == null, 'market_id');
  need('f-rate', !(Number(state.ps.conversionRate) > 0), 'conversion_rate', state.ps.conversionRate === '' || state.ps.conversionRate == null);
  need('f-markupRule', !!state.ps.markupType && state.ps.markupRule === '', 'markup_rule');
  const mob = state.contact_mobile || '';
  need('f-mobile', mob.length < 6 || mob.length > 15, 'contact_mobile', !mob);
  need('f-dial', !state.contact_dial, 'contact_dial');
  state.rooms.forEach((r, ri) => {
    r.guests.forEach((g, gi) => need(`f-r${ri}-g${gi}-title`, !g.title, `rooms.${ri}.guests.${gi}.title`));
    const noAdult = !r.guests.some(g => g.type === 'Adult');
    document.getElementById(`rerr-${ri}`).hidden = !noAdult;
    if (noAdult) errors.push(`rooms.${ri}.adult`);
  });
  if (allGuests().filter(g => g.is_lead).length !== 1) errors.push('lead_guest');
  if (mark(document.getElementById('f-tz'), !!tzError(), state.tz.hours === '')) errors.push('time_format');
  need('f-clientHours', state.clientAuto && state.clientHours === '', 'client_policy_hours');
  errors.push(...checkPolicyDates());
  document.querySelectorAll('.lead-check').forEach(l => l.classList.toggle('need', !allGuests().some(g => g.is_lead)));
  return errors;
}

/* ---------- payload ---------- */
const num = v => (v === '' || v == null ? null : Number(v));
const pDate = v => { const m = String(v || '').match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(?::(\d{2}))?/); return m ? `${m[1]}T${m[2]}:${m[3] ?? '00'}` : null; };
const dt = v => (v ? v.replace('T', ' ') + (v.length === 16 ? ':00' : '') : null);
function scopeList(sc) {
  const rows = (l, isAPI) => l.map(p => ({ fromDate: pDate(p.fromDate), toDate: pDate(p.toDate), cancellationPrice: num(p.cancellationPrice), currency: isAPI ? state.ps.supplierCurrency : state.ps.portalCurrency, timeFormat: tzString() || null, isAPI }));
  return [...rows(sc.agent, false), ...rows(sc.supplier, true)];
}
function buildPayload() {
  const s = state, ps = s.ps, edit = mode === 'edit';
  const entry = (sc, roomNo, roomType, one) => ({ roomNo, onePolicyForAllRoom: one, roomType, essentialInformation: sc.essentialInformation, hotelCancellationPolicies: scopeList(sc), warning: [] });
  const policies = (s.onePolicy ? [entry(s.cancellation_all, null, s.rooms[0]?.room_type ?? null, true)] : s.rooms.map((r, i) => entry(r.cancellation, String(i + 1), r.room_type, false)))
    .filter(e => e.hotelCancellationPolicies.length);
  return {
    ...(!edit && (sup => ({
      supplier_type: sup ? (sup.type === 'api' ? 'API' : 'TEMPORARY') : null,
      supplier_id: sup ? sup.id : null,
    }))(SUPPLIERS.find(x => x.id === s.supplier_id))),
    ...(!edit && { platform_type: s.platform || null, customer_id: s.customer_id, supplier_currency: ps.supplierCurrency, customer_currency: ps.portalCurrency, market_id: s.market_id }),
    ...(edit && { unique_trans_id: s.unique_trans_id }),
    total_price: num(ps.finalPrice),
    hotel_name: s.hotel_name, address: s.address, country_name: s.country_name, city: s.city, hotel_phone_number: s.hotel_phone_number, hcn: s.hcn,
    reference_no: s.reference_no, booking_date: dt(s.booking_date), check_in: s.check_in, check_out: s.check_out,
    cancellation_deadline_date: dt(s.cancellation_deadline_date), star_rating: num(s.star_rating), status: s.status,
    lead_pax_name: s.lead_pax_name, guest_email: s.guest_email,
    contact_country_code: s.contact_dial || null, contact_mobile: s.contact_mobile || null,
    contact_no: s.contact_mobile ? `${s.contact_dial || ''}${s.contact_mobile}` : null,
    rooms: s.rooms.map((r, i) => ({ room_no: String(i + 1), room_type: r.room_type, supplier_price: num(r.price), supplier_currency: ps.supplierCurrency, converted_price: num(r._conv), markup_amount: num(r._mk), price: num(r._cust), currency: ps.portalCurrency })),
    guests: s.rooms.flatMap((r, i) => r.guests.map(g => ({
      room_no: String(i + 1), title: g.title || null, first_name: g.first_name, last_name: g.last_name, full_name: `${g.first_name} ${g.last_name}`.trim(),
      type: g.type, child_age: g.type === 'Child' ? num(g.child_age) : null, gender: g.gender || null, nationality: g.nationality || null, nationality_code: natCode(g.nationality), is_lead: !!g.is_lead,
    }))),
    meal_info: { fullMealDetails: s.meal || null },
    supplier_name: ps.supplier, original_total_price: num(ps.supplierPrice), original_price_breakdown: { original_currency: ps.supplierCurrency },
    price_secret: { supplier: ps.supplier, supplierCurrency: ps.supplierCurrency, supplierPrice: num(ps.supplierPrice), conversionRate: num(ps.conversionRate), reverseConversionRate: num(ps.reverseRate), convertedPrice: num(ps.convertedPrice), markupType: ps.markupType || null, markupRule: num(ps.markupRule), markupAmount: num(ps.markupAmount), noOfRooms: s.rooms.length, portalCurrency: ps.portalCurrency, finalPrice: num(ps.finalPrice), sameCurrency: sameCurrency() },
    contracting_comment: s.contracting_comment ? JSON.stringify([s.contracting_comment]) : null,
    special_request: s.special_request,
    cancellation_time_format: tzString() || null,
    client_policy_from_supplier: !!s.clientAuto, client_policy_hours_before: s.clientAuto ? num(s.clientHours) : null,
    cancellationPolicyResponse: policies,
  };
}

/* ---------- events ---------- */
document.addEventListener('input', e => {
  if (e.target.dataset && e.target.dataset.tz === 'hours') { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 2); state.tz.hours = e.target.value; refresh(); return; }
  const el = e.target, path = el.dataset && el.dataset.bind; if (!path || el._fp) return;
  /* auto calculate is the preferred way: switching it off asks first */
  if (path === 'clientAuto' && !el.checked) { el.checked = true; confirmAutoOff(); return; }
  if (el.dataset.money !== undefined) el.value = cleanMoney(el.value);
  if (el.dataset.int !== undefined) {
    el.value = el.value.replace(/\D/g, '');
    if (el.dataset.max !== undefined && el.value !== '' && Number(el.value) > Number(el.dataset.max)) el.value = el.dataset.max;
  }
  if (el.dataset.rate !== undefined) el.value = el.value.replace(/[^\d.]/g, '').replace(/^(\d*\.?\d{0,6}).*$/, '$1');
  set(path, el.type === 'checkbox' ? el.checked : el.value);
  if (path === 'ps.conversionRate' || path === 'ps.reverseRate') {
    const v = Number(el.value), other = path === 'ps.conversionRate' ? 'ps.reverseRate' : 'ps.conversionRate';
    set(other, el.value !== '' && v > 0 ? 1 / v : '');
  }
  /* switching the calculation off keeps the calculated client policies as an editable start */
  if (path === 'onePolicy' || path === 'clientAuto') { derive(); renderPolicies(); }
  if (el.hasAttribute('data-policy-title') && !state.onePolicy) renderPolicies();
  refresh();
});
document.addEventListener('change', e => {
  if (e.target.dataset && e.target.dataset.tz === 'mode') { state.tz.mode = e.target.value; refresh(); return; }
  const ld = e.target.dataset && e.target.dataset.lead; if (!ld) return;
  const [ri, gi] = ld.split(':').map(Number);
  allGuests().forEach(g => { g.is_lead = false; });
  if (e.target.checked) state.rooms[ri].guests[gi].is_lead = true;
  renderRooms(); refresh();
});
document.addEventListener('focusout', e => {
  const el = e.target;
  if (el.dataset && el.dataset.money !== undefined && el.value !== '') { el.value = fmtMoney(el.value); set(el.dataset.bind, el.value); refresh(); }
});
document.addEventListener('click', e => {
  const head = e.target.closest('[data-toggle]'); if (head) { head.parentElement.classList.toggle('closed'); return; }
  const lk = e.target.closest('.ig.locked, .ss.locked, .sec-need');
  if (lk) {
    const p = lk.dataset.needPath, sel = { supplier_id: 'ss-supplier', customer_id: 'ss-customer', supplier_currency: 'ss-supCur', customer_currency: 'ss-custCur', 'ps.supplierCurrency': 'ss-supCur', 'ps.portalCurrency': 'ss-custCur', country_name: 'ss-country', platform: 'ss-platform', 'ps.markupType': 'ss-markup' }[p];
    const t = sel ? selects[sel].input : document.querySelector(`[data-bind="${p}"]`);
    if (t && !t.disabled) { t.closest('.card')?.classList.remove('closed'); t.scrollIntoView({ block: 'center', behavior: 'smooth' }); t.focus({ preventScroll: true }); t.classList.remove('flash'); void t.offsetWidth; t.classList.add('flash'); }
    return;
  }
  const sg = e.target.closest('[data-tz-sign]'); if (sg) { state.tz.sign = sg.dataset.tzSign; refresh(); return; }
  const b = e.target.closest('[data-action]'); if (!b) return;
  const a = b.dataset.action, i = +b.dataset.i, room = state.rooms[+b.dataset.room];
  if (a === 'step') {
    const inp = b.parentElement.querySelector('input'), min = Number(inp.dataset.min), max = inp.dataset.max !== undefined ? Number(inp.dataset.max) : Infinity;
    const cur = inp.value === '' ? NaN : Number(inp.value);
    inp.value = isNaN(cur) ? min : Math.min(max, Math.max(min, cur + Number(b.dataset.d)));
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    return;
  }
  if (a === 'star') { state.star_rating = b.dataset.v === '' || Number(b.dataset.v) === Number(state.star_rating) ? '' : Number(b.dataset.v); refresh(); return; }
  if (a === 'dp-clear') { b.parentElement.querySelector('input[data-date]')._fp.clear(); return; }
  if (a === 'add-guest') { room.guests.push(newGuest()); renderRooms(); }
  if (a === 'rm-guest') { room.guests.splice(i, 1); renderRooms(); }
  if (a === 'add-room') { state.rooms.push(newRoom()); renderRooms(); renderPolicies(); }
  if (a === 'rm-room') { state.rooms.splice(i, 1); renderRooms(); renderPolicies(); }
  if (a === 'add-policy') {
    const list = get(b.dataset.scope)[b.dataset.kind], from = plusOneSec(list.at(-1)?.toDate);
    list.push({ fromDate: from, fromAuto: !!from, toDate: '', cancellationPrice: '' });
    renderPolicies();
  }
  if (a === 'rm-policy') { get(b.dataset.scope)[b.dataset.kind].splice(i, 1); renderPolicies(); }
  if (a === 'back') { location.href = backTo; return; }
  if (a === 'save') {
    submitted = true;
    const errs = validate(), box = document.getElementById('payload');
    /* valid: saved to the shared booking list (All Booking shows it), then back to the list */
    if (!errs.length) {
      if (!state.clientNow) { state.clientNow = nowStr(); derive(); }
      const { unique_trans_id, ...saved } = JSON.parse(JSON.stringify(state));
      const d = new Date(), now = new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 19), by = 'Super Admin';   /* local time */
      const rec = Bookings.upsert(record ? { ...record, updatedAt: now, updatedBy: by, state: saved } : { createdAt: now, createdBy: by, payment: 'Unpaid', state: saved });
      location.href = `${backTo}?saved=${rec.id}&how=${record ? 'edit' : 'new'}`;
      return;
    }
    box.style.display = 'block';
    document.getElementById('payloadErrs').textContent = errs.length ? `Not saved – ${errs.length} field(s) need attention (shown in red). The payload below is a preview only.` : '';
    document.getElementById('payloadJson').textContent = JSON.stringify(buildPayload(), null, 2);
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  refresh();
});

/* required markers on static fields */
document.querySelectorAll('[data-required]').forEach(el => { const l = el.closest('.field')?.querySelector('label.lbl'); if (l) l.classList.add('req'); });

/* ---------- boot ---------- */
function load(m) {
  mode = m;
  lastNationality = '';
  state = m === 'edit' ? savedState(record) : blankState();
  /* the supplier's name comes from the shared list (a rename on Supplier List shows here) */
  if (state.supplier_id != null) {
    const api = HotelApis.list.find(a => a.id === state.supplier_id) || {};
    state.ps.supplier = api.name || ''; state.supplier_currency = state.ps.supplierCurrency = api.currency || null;
  }
  document.getElementById('pageTitle').textContent = m === 'edit' ? 'Edit Booking' : 'Add New Booking';
  document.getElementById('txnHint').textContent = m === 'edit' ? ': ' + state.unique_trans_id : '';
  document.getElementById('saveBtn').textContent = m === 'edit' ? 'Save changes' : 'Create booking';
  document.querySelectorAll('.is-invalid').forEach(x => x.classList.remove('is-invalid', 'is-empty'));
  setCities(); setCustomers(); setMarkets(); loadSuppliers();
  renderRooms(); renderPolicies(); refresh();
  /* load the saved comment without placing the cursor (that would focus the editor and scroll the page) */
  if (typeof ccEditor !== 'undefined') ccEditor.setContents(state.contracting_comment ? ccEditor.clipboard.convert(state.contracting_comment) : [], 'silent');
}
initDates(document.querySelector('.adm-wrap'));
initSelect('ss-supplier', SUPPLIERS, 'supplier_id', it => {
  state.ps.supplier = it ? it.name : '';
  /* supplier currency follows the supplier */
  state.supplier_currency = supCurrencyOf(it); syncFrom('supplier_currency');
  if (!it) state.status = '';
}, 'Search or select supplier', { groups: [['*', 'Suppliers']], addTemp: true, noun: 'supplier', onAdd: name => openApiDrawer(name) });
initSelect('ss-country', COUNTRIES, 'country_name', () => {
  state.country_name = state.country_name || '';
  if (!(CITIES[state.country_name] || []).includes(state.city)) state.city = '';
  setCities();
}, 'Search country', { noun: 'country' });
initSelect('ss-city', CITY_ITEMS, 'city', () => { state.city = state.city || ''; }, 'Search city', { noun: 'city' });
initSelect('ss-markup', MARKUP_TYPES, 'ps.markupType', () => { state.ps.markupType = state.ps.markupType || ''; }, 'Select markup type', { noSearch: true });
initSelect('ss-status', STATUSES, 'status', () => { state.status = state.status || ''; }, 'Select status', { noun: 'status' });
initSelect('ss-platform', PLATFORMS, 'platform', () => {
  state.platform = state.platform || '';
  if (!(CUSTOMERS[state.platform] || []).some(c => c.id === state.customer_id)) state.customer_id = null;
  setCustomers(); renderPolicies();
}, 'Select platform', { noSearch: true, noun: 'platform' });
initSelect('ss-customer', CUSTOMER_ITEMS, 'customer_id', (it, prev) => {
  /* a different agent: currency and market are chosen again */
  if (!it || it.id !== prev) { state.customer_currency = null; state.market_id = null; syncFrom('customer_currency'); setMarkets(); }
}, 'Search by name or ID', { showId: true, noun: 'client' });
initSelect('ss-supCur', CURRENCIES, 'supplier_currency', () => { syncFrom('supplier_currency'); }, 'Select supplier currency');
initSelect('ss-custCur', CURRENCIES, 'customer_currency', () => {
  syncFrom('customer_currency'); setMarkets();
  if (!MARKET_ITEMS.some(m => m.id === state.market_id)) state.market_id = null;
}, 'Select currency');
initSelect('ss-market', MARKET_ITEMS, 'market_id', null, 'Select market', { noun: 'markets' });
initSelect('ss-meal', MEALS, 'meal', () => { state.meal = state.meal || ''; }, 'Select meal', { noun: 'meals', showCode: true, codePrefix: true, emptyText: 'No meals found' });
initSelect('ss-tzm', TZ_MINUTES, 'tz.mins', () => { state.tz.mins = state.tz.mins || '00'; }, ':00', { noSearch: true, noClear: true });
initSelect('ss-dial', DIAL_CODES, 'contact_dial', () => { state.contact_dial = state.contact_dial || ''; }, 'Code', { noun: 'country code' });
/* ---------- "Other — add temporary supplier" → the shared hotel API drawer (js/api-drawer.js) ----------
   Same drawer as Supplier List. The supplier is saved to the shared list (so it shows on Supplier List) and selected here. */
const toast = msg => { const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2600); };
function openApiDrawer(name) {
  ApiDrawer.open({
    temporary: true, name,
    onSaved: api => {
      loadSuppliers();
      const it = SUPPLIERS.find(x => x.id === api.id);
      state.supplier_id = api.id; state.ps.supplier = api.name;
      state.supplier_currency = supCurrencyOf(it); syncFrom('supplier_currency');
      refresh();
      toast(`${api.name} added to Supplier List`);
    },
  });
}
/* the list changed in another tab (e.g. Supplier List) */
HotelApis.onChange(() => { loadSuppliers(); refresh(); });

/* Contracting Comment: rich text; stored as HTML ('' when empty) */
const ccEditor = new Quill('#ccEditor', {
  theme: 'snow', placeholder: 'Enter contracting comment',
  modules: { toolbar: [['bold', 'italic', 'underline'], [{ list: 'ordered' }, { list: 'bullet' }]], clipboard: { matchVisual: false } },
});
ccEditor.on('text-change', () => { state.contracting_comment = ccEditor.getText().trim() ? ccEditor.root.innerHTML : ''; });
/* prototype: Add New (from All Booking) or the edit sample (?mode=edit); back returns to the list */
const qs = new URLSearchParams(location.search);
const backTo = /^[\w-]+\.html$/.test(qs.get('returnUrl') || '') ? qs.get('returnUrl') : 'hotel-bookings.html';
document.querySelector('.bf-head .back').addEventListener('click', () => { location.href = backTo; });
/* ?id=N edits that saved booking (All Booking › Edit); ?mode=edit opens the newest one; otherwise Add */
record = Bookings.get(qs.get('id')) || (qs.get('mode') === 'edit' ? Bookings.list[0] || null : null);
const startMode = record ? 'edit' : 'add';
const proto = document.getElementById('protoMode');
proto.hidden = !Bookings.list.length && startMode === 'add';
proto.textContent = startMode === 'edit' ? 'Open Add form' : 'Open edit sample';
proto.href = startMode === 'edit' ? 'booking-form.html' : 'booking-form.html?mode=edit';
load(startMode);
