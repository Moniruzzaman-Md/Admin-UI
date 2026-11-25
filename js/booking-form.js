/* Manual hotel booking form (Add / Edit) — prototype logic + dummy data. Ported from
   manual-booking-form/output/manual-booking-form.html; 2026-11-22 aligned with the live portal form
   (supplier currency from the supplier, Market, meal list, status list, required contact, B2B only). */
/* ---------- dummy data ---------- */
/* Supplier / API = the shared supplier list (js/data.js: Supplier List + Offline Supplier List), active suppliers only
   ("Inactive suppliers are not used for search or booking"); the booking's own supplier stays listed even if inactive */
const SUPPLIERS = [];
function loadSuppliers() {
  SUPPLIERS.splice(0, SUPPLIERS.length, ...HotelApis.list.filter(x => x.active || x.id === state.supplier_id).map(x => ({
    id: x.id, label: HotelApis.label(x), name: x.name, type: x.offline ? 'offline' : 'api', currency: x.currency,
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

/* a new policy scope starts with the standard essential information (editable) */
const DEFAULT_ESSENTIAL_INFO = 'In Case Of Early Exit Or No Show 100% Of The Fee Shall Be Applicable.';
const emptyScope = () => ({ essentialInformation: DEFAULT_ESSENTIAL_INFO, agent: [], supplier: [] });
const allGuests = () => state.rooms.flatMap(r => r.guests);
let lastNationality = '';   /* unused (kept for load()); new guests take the lead guest's nationality */
const plainGuest = () => ({ title: '', first_name: '', last_name: '', type: 'Adult', child_age: '', gender: '', nationality: '', is_lead: false });
/* guests added later start with the lead guest's nationality (empty if the lead has none) */
const newGuest = () => ({ ...plainGuest(), nationality: (allGuests().find(g => g.is_lead) || {}).nationality || '' });
/* rooms added after the first start with the first room's type and price (editable) */
/* priceAuto: the price may still be set by Auto calculate markup (false once typed by hand) */
const newRoom = () => ({ room_type: state.rooms[0]?.room_type || '', typeAuto: true, price: state.rooms[0]?.price ?? '', priceAuto: true, guests: [newGuest()], cancellation: emptyScope() });
const blankState = () => ({
  supplier_id: null, supplier_currency: null, platform: '', customer_id: null, customer_currency: null, market_id: null,
  hotel_name: '', address: '', country_name: '', city: '', hotel_phone_number: '', hcn: '',
  booking_date: '', cancellation_deadline_date: '', check_in: '', check_out: '', star_rating: '', status: '',
  lead_pax_name: '', guest_email: '', contact_dial: '', contact_mobile: '', meal: '',
  rooms: [{ room_type: '', price: '', priceAuto: true, cancellation: emptyScope(), guests: [{ ...plainGuest(), is_lead: true }] }],
  reference_no: '',
  ps: { supplier: '', supplierCurrency: '', supplierPrice: '', portalCurrency: '', conversionRate: '', reverseRate: '', convertedPrice: '', markupType: '', markupRule: '', markupAmount: '', noOfRooms: 1, finalPrice: '', issue: '',
    /* Auto calculate markup: the quoted client total, the supplier total and the room count it is worked out from */
    auto: true, autoClient: '', autoSupplier: '', autoRooms: '', markupManual: '' },   /* on by default for a new booking; No. of rooms left blank (the user must fill it) */
  contracting_comment: '', special_request: '', remarks: '',
  onePolicy: true, cancellation_all: emptyScope(),
  tz: { mode: 'Local', sign: '+', hours: '', mins: '00' },
  /* client policies calculated from the supplier ones: same steps, times moved earlier by clientHours, fee converted + marked up */
  clientAuto: true, clientHours: '36',   /* the system's set hours */
  clientNow: '',   /* "now" for an empty supplier From: live until the booking is saved, then kept */
});
/* a saved booking (js/data.js Bookings) opened for editing: its saved state on top of a blank one */
let record = null;
/* bookings saved before the calculate option keep their typed client policies (option off) */
const savedState = rec => { const b = blankState(), s = JSON.parse(JSON.stringify(rec.state)); return { ...b, clientAuto: false, ...s, ps: { ...b.ps, auto: false, autoRooms: '', ...s.ps }, rooms: s.rooms.map(rm => ({ ...rm, priceAuto: rm.priceAuto ?? false })), unique_trans_id: rec.txn }; };   /* saved prices count as typed */

const get = p => p.split('.').reduce((o, k) => (o == null ? o : o[k]), state);
const set = (p, v) => { const k = p.split('.'); let o = state; k.slice(0, -1).forEach(x => o = o[x]); o[k.at(-1)] = v; };
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/* ---------- searchable select ---------- */
const selects = {};
/* opts.groups: [[type, title]] to group items ('*' = all items); opts.addOther + opts.onAdd(typed): "Other" footer that opens the page's create UI */
function initSelect(id, items, path, onPick, placeholder, opts = {}) {
  const root = document.getElementById(id);
  root.innerHTML = `<input class="ss-input" type="text" placeholder="${placeholder}" autocomplete="off">${opts.groups ? '<span class="ss-tag" hidden></span>' : ''}<button type="button" class="ss-clear" title="Clear">×</button><div class="ss-pop"><ul class="ss-list"></ul>${opts.addOther ? '<div class="ss-foot"></div>' : ''}</div>`;
  const input = root.querySelector('.ss-input'), list = root.querySelector('ul'), foot = root.querySelector('.ss-foot'), tag = root.querySelector('.ss-tag');
  input.readOnly = !!opts.noSearch;
  root.classList.toggle('no-clear', !!opts.noClear);
  const itemOf = v => items.find(i => i.id === v);
  const labelOf = v => { const it = itemOf(v); return it ? (opts.showId ? `${it.label} (ID: ${it.id})` : opts.showCode ? `${it.label} (${it.code})` : it.label) : ''; };
  const li = i => `<li data-id="${i.id}" class="${i.id === get(path) ? 'sel' : ''}"><span>${esc(i.label)}</span>${opts.showId ? `<span class="ss-id">ID: ${i.id}</span>` : ''}${opts.showCode ? `<span class="ss-id">${i.code}</span>` : ''}${i.type === 'offline' ? '<span class="pill-offline">Offline</span>' : ''}</li>`;
  const draw = q => {
    q = (q || '').trim().toLowerCase();
    const f = items.filter(i => i.label.toLowerCase().includes(q) || (opts.showId && String(i.id).includes(q.replace(/^id[:\s]*/, ''))) || (opts.showCode && (opts.codePrefix ? i.code.toLowerCase().startsWith(q) : i.code.toLowerCase() === q)));
    const html = opts.groups
      ? opts.groups.map(([k, title]) => { const g = k === '*' ? f : f.filter(i => i.type === k); return g.length ? `<li class="grp">${title}</li>${g.map(li).join('')}` : ''; }).join('')
      : f.map(li).join('');
    list.innerHTML = html || `<li class="none">${opts.emptyText || `No ${opts.noun || 'items'} found`}${q ? ` for “${esc(q)}”` : ''}</li>`;
    if (foot) drawFoot();
  };
  /* "Other — add offline …" footer: opens the page's create UI (opts.onAdd) with what was typed */
  const drawFoot = () => {
    foot.innerHTML = `<button type="button" class="ss-other" data-ss="open"><span class="plus">+</span><span><b>Other — add offline ${opts.noun || 'item'}</b><small>Not in the list? Add it here.</small></span></button>`;
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
    if (tag) { const it = itemOf(get(path)); tag.hidden = !(it && it.type === 'offline'); tag.textContent = 'Offline'; root.classList.toggle('has-tag', !tag.hidden); }
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
    <div class="guest-head"><span>Guest ${gi + 1}</span><span class="guest-dup" id="gdup-${id}" hidden></span><span class="spacer"></span>
      ${child ? '' : `<label class="lead-check"><input type="checkbox" data-lead="${ri}:${gi}" ${g.is_lead ? 'checked' : ''}> Lead guest</label>`}
      ${r.guests.length > 1 ? rmBtn('rm-guest', gi, `data-room="${ri}"`) : ''}</div>
    <div class="guest-grid${child ? ' has-age' : ''}">
      <div class="field" id="f-${id}-title"><label class="lbl req">Title</label><div class="ss" id="ss-${id}-title"></div><div class="fb">Required.</div></div>
      ${field('First / given name', `${base}.first_name`, g.first_name, 'placeholder="Enter first name" data-required', 'First name is required.')}
      ${field('Last name / surname', `${base}.last_name`, g.last_name, 'placeholder="Enter last name" data-required', 'Last name is required.')}
      <div class="field"><label class="lbl">Type</label><div class="ss" id="ss-${id}-type"></div></div>
      ${child ? stepper('Age', `${base}.child_age`, g.child_age, 0, 12, 'Age 0–12 is required.', true) : ''}
      <div class="field"><label class="lbl">Gender</label><div class="ss" id="ss-${id}-gender"></div></div>
      <div class="field" id="f-${id}-nat"><label class="lbl${g.is_lead ? ' req' : ''}">Nationality</label><div class="ss" id="ss-${id}-nat"></div></div>
    </div>
  </div>`;
}
/* rooms are an accordion. Closed by default; a room added with "+ Add room" opens and the rooms that were opened
   automatically close. A room the user opened stays open until they close it.
   Kept outside the room data (not saved): room → { open, user } */
const roomUi = new WeakMap();
const roomOpen = r => !!roomUi.get(r)?.open;
function setRoomOpen(r, open, user) {
  roomUi.set(r, { open, user: open && user });
  const ri = state.rooms.indexOf(r), box = document.querySelector(`.room[data-ri="${ri}"]`); if (!box) return;
  box.classList.toggle('closed', !open);
  box.querySelector('.room-arrow').setAttribute('aria-expanded', String(open));
  updateRoomHeads();
}
/* collapsed sections: a summary line in the header and "n fields required"
   (empty required fields before a save attempt, plus anything already in red; after a save attempt, what's in red).
   req() lists [missing?, field id] in page order — the pill goes to the first missing one. */
const CARD_SUMS = {
  sourceCard: {
    req: () => {
      const s = state, ps = s.ps;
      return [[s.supplier_id == null, 'f-supplier'], [!ps.supplierCurrency, 'f-supCur'], [!String(s.reference_no || '').trim(), '[data-bind="reference_no"]'],
        [!(Number(ps.conversionRate) > 0), 'f-rate'], [!s.platform, 'f-platform'], [s.customer_id == null, 'f-customer'], [!ps.portalCurrency, 'f-custCur'],
        [s.market_id == null, 'f-market'], [!!ps.auto && !ps.markupType, 'f-markupType'], [!ps.auto && !!ps.markupType && ps.markupRule === '', 'f-markupRule']];
    },
    parts: () => {
      const s = state, ps = s.ps, sc = ps.supplierCurrency, cc = ps.portalCurrency, cust = RefData.partners.find(p => p.id === s.customer_id);
      const mk = !ps.markupType || ps.markupRule === '' ? '' : ps.markupType === 'Percent' ? `${+Number(ps.markupRule).toFixed(2)}%` : `${money2(cc, ps.markupRule)} per room`;
      return [['Supplier', ps.supplier], ['Supplier ref', s.reference_no], ['Platform', s.platform], [custLabel(), cust ? `${cust.name} (ID: ${cust.id})` : ''],
        ['Rate', Number(ps.conversionRate) > 0 && sc && cc ? `1 ${sc} = ${cc} ${fmtRate(ps.conversionRate)}` : ''], ['Markup', mk, mk && ps.auto ? 'auto' : '']];
    },
  },
  /* half-width section: the summary goes on its own line under the title, and only what identifies the stay */
  hotelCard: {
    req: () => [[!String(state.hotel_name).trim(), '[data-bind="hotel_name"]'], [!String(state.address).trim(), '[data-bind="address"]'],
      [!state.country_name, 'f-country'], [!state.city, 'f-city'], [!state.booking_date, 'f-bookdate'], [!state.check_in, '[data-bind="check_in"]'], [!state.check_out, 'f-checkout']],
    parts: () => {
      const s = state, d = v => v ? new Date(`${v.slice(0, 10)}T00:00`) : null, ci = d(s.check_in), co = d(s.check_out);
      const f = (x, y) => x.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...(y && { year: 'numeric' }) });
      const nights = ci && co ? Math.round((co - ci) / 864e5) : 0;
      const stay = ci && co ? `${f(ci, ci.getFullYear() !== co.getFullYear())} → ${f(co, true)}${nights > 0 ? ` (${nights})` : ''}` : ci ? `${f(ci, true)} → ?` : '';
      /* "(reconfirmed) on 12 Oct 2026" right after the title / booking ID; the category is its own item after the hotel name:
         the number + the form's star icon ("4★"); hidden when there is none */
      const st = { CONFIRMED: 'confirmed', 'RE CONFIRMED': 'reconfirmed', CANCELLED: 'cancelled' }[s.status] || '';
      const bd = d(s.booking_date), when = [st && `(${st})`, bd && `on ${f(bd, true)}`].filter(Boolean).join(' ');
      const sr = Number(s.star_rating) || 0;
      return [['', when, '', 'No status'], ['', s.hotel_name, '', 'No hotel name'],
        ['', sr ? `${sr} star${sr === 1 ? '' : 's'}` : '', '', '', sr ? `<span class="sum-stars">${sr}${STAR_SVG}</span>` : ''],
        ['', [s.city, s.country_name].filter(Boolean).join(', '), '', 'No city'], ['', stay, '', 'No dates'], ['HCN', s.hcn]];
    },
  },
  /* half-width too: email · mobile (with its country code) on one line under the title */
  contactCard: {
    req: () => [[!String(state.guest_email).trim(), '[data-bind="guest_email"]'], [!state.contact_dial, 'f-dial'], [!state.contact_mobile, 'f-mobile']],
    parts: () => [['', state.guest_email, '', 'No email'],
      ['', state.contact_mobile ? `${state.contact_dial || ''} ${state.contact_mobile}`.trim() : '', '', 'No mobile number']],
  },
  /* what the policies add up to, not the policies: scope | coverage | free cancellation until (the booking's deadline) */
  polCard: {
    req: () => {
      if (policyNeed()) return [];   /* locked: the header already says what it waits for */
      const out = [[state.tz.mode === 'UTC' && state.tz.hours === '', 'f-tz'], [!!state.clientAuto && state.clientHours === '', 'f-clientHours']];
      const scopes = state.onePolicy ? ['cancellation_all'] : state.rooms.map((r, i) => `rooms.${i}.cancellation`);
      scopes.forEach(sp => ['agent', 'supplier'].forEach(k => {
        if (k === 'agent' && state.clientAuto) return;   /* calculated from the supplier policies */
        const list = get(sp)[k] || [];
        if (!list.length) out.push([true, `[data-action="add-policy"][data-scope="${sp}"][data-kind="${k}"]`]);
        list.forEach((p, i) => out.push([!p.full && (p.cancellationPrice === '' || p.cancellationPrice == null), `[data-bind="${sp}.${k}.${i}.cancellationPrice"]`]));
      }));
      return out;
    },
    parts: () => {
      const s = state, need = k => !s.clientAuto || k === 'supplier';
      const dl = String(s.cancellation_deadline_date || '').replace(' ', 'T'), d = dl ? new Date(dl.slice(0, 19)) : null;
      const until = d && !isNaN(d) ? `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}, ${dl.slice(11, 16)} (${tzString() || 'Local'})` : '';
      if (s.onePolicy) {
        const sc = s.cancellation_all;
        return [['', 'All rooms'], ['Supplier', String(sc.supplier.length)], ['Client', String(sc.agent.length), s.clientAuto ? 'auto' : ''], ['Free cancellation until', until]];
      }
      const set = s.rooms.filter(r => ['supplier', 'agent'].every(k => !need(k) || (r.cancellation[k] || []).length)).length;
      return [['', 'Per room'], ['Rooms set', `${set}/${s.rooms.length}`], ['Free cancellation until', until]];
    },
  },
  /* meal | rooms | guests; the required count is every room's (the pill opens the first room that has some) */
  roomsCard: {
    req: () => state.rooms.map((r, ri) => { const m = roomMissing(r, ri); return [m > 0, `[data-room-errs="${ri}"]`, m]; }),
    parts: () => {
      const gs = state.rooms.flatMap(r => r.guests), n = state.rooms.length;
      return [['Meal', state.meal], ['', `${n} room${n === 1 ? '' : 's'}`], ['', `${gs.length} guest${gs.length === 1 ? '' : 's'}`, guestMix(gs)]];
    },
  },
  /* read-only totals: nothing to fill, so no "fields required" */
  sumCard: {
    req: () => [],
    parts: () => {
      const ps = state.ps, sc = ps.supplierCurrency, cc = ps.portalCurrency, n = state.rooms.length;
      const has = v => v !== '' && v != null && !isNaN(Number(v));
      const mk = has(ps.finalPrice) && has(ps.convertedPrice) ? round2(Number(ps.finalPrice) - Number(ps.convertedPrice)) : '';
      const rule = ps.markupType === 'Percent' && ps.markupRule !== '' ? `${+Number(ps.markupRule).toFixed(2)}%` : ps.markupType === 'Fixed' ? 'fixed' : '';
      return [['', `${n} room${n === 1 ? '' : 's'}`], ['Supplier', has(ps.supplierPrice) ? money2(sc, ps.supplierPrice) : ''],
        ['Converted', has(ps.convertedPrice) ? money2(cc, ps.convertedPrice) : ''], ['Markup', mk === '' ? '' : money2(cc, mk), mk === '' ? '' : rule],
        ['Client total', has(ps.finalPrice) ? money2(cc, ps.finalPrice) : '']];
    },
  },
  /* the remark's first line; optional, so never "fields required" */
  remarksCard: {
    req: () => [],
    parts: () => [['', String(state.remarks || '').trim().split(/\r?\n/)[0], '', 'No remarks']],
  },
  autoMk: {
    /* nothing to fill while the section is locked (its header already says what it waits for) */
    req: () => { const ps = state.ps, open = !(autoCalc && autoCalc.need);
      return [[open && ps.autoClient === '', 'f-autoClient'], [open && ps.autoSupplier === '', 'f-autoSupplier'], [open && ps.autoRooms === '', 'f-autoRooms']]; },
    parts: () => { const ps = state.ps;
      return [['Total client price', ps.autoClient === '' ? '' : money2(ps.portalCurrency, ps.autoClient)],
        ['Total supplier price', ps.autoSupplier === '' ? '' : money2(ps.supplierCurrency, ps.autoSupplier)], ['No. of rooms', ps.autoRooms]]; },
  },
};
/* the star icon of the Category field, reused in the Hotel details summary */
const STAR_SVG = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 2.5 2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"/></svg>';
function updateCardHeads(errs) {
  Object.entries(CARD_SUMS).forEach(([id, c]) => {
    const card = document.getElementById(id), sum = card?.querySelector('.card-sum'); if (!sum) return;
    /* a part's optional 5th item is its value as HTML (e.g. the hotel's star icon); the tooltip keeps the plain text */
    sum.innerHTML = c.parts().map(([label, v, tag, none, html]) => `<span${v ? ` data-tooltip="${esc(label ? `${label}: ${v}` : v)}"` : ''}>${label ? `<i>${esc(label)}</i>` : ''}<b${v === '' || v == null ? ` class="none">${none || '—'}` : `>${html || esc(v)}`}</b>${tag ? `<i>${tag}</i>` : ''}</span>`).join('');
    const red = errs.filter(e => card.contains(e)).length, n = red + (submitted ? 0 : c.req().reduce((x, [bad, , w]) => x + (bad ? w || 1 : 0), 0));
    const pill = card.querySelector('[data-card-errs]');
    pill.hidden = !n;
    pill.textContent = `${n} field${n === 1 ? '' : 's'} required`;
  });
}
/* a room's empty required fields: room type, price (when it can be typed), each guest's title / first / last name,
   a child's age, the lead guest's nationality */
function roomMissing(r, ri) {
  const priceInp = document.querySelector(`[data-bind="rooms.${ri}.price"]`);
  return (r.room_type.trim() ? 0 : 1) + (r.price === '' && priceInp && !priceInp.disabled ? 1 : 0)
    + r.guests.reduce((x, g) => x + !g.title + !String(g.first_name).trim() + !String(g.last_name).trim()
      + (g.type === 'Child' && g.child_age === '') + (!!g.is_lead && !g.nationality), 0);
}
/* "3 guests" + "2 adults; 1 child [5]" */
const guestMix = gs => {
  const kids = gs.filter(g => g.type === 'Child'), ad = gs.length - kids.length;
  return [`${ad} adult${ad === 1 ? '' : 's'}`, kids.length ? `${kids.length} child${kids.length === 1 ? '' : 'ren'} [${kids.map(g => g.child_age === '' ? '?' : g.child_age).join(', ')}]` : ''].filter(Boolean).join('; ');
};
/* the room's header while it's closed: room type · guests · price, and how many problems it has */
function updateRoomHeads() {
  const errs = errTargets(), sc = state.ps.supplierCurrency, cc = state.ps.portalCurrency;
  updateCardHeads(errs);
  state.rooms.forEach((r, ri) => {
    const box = document.querySelector(`.room[data-ri="${ri}"]`); if (!box) return;
    /* Superior Twin Room | 3 guests  1 adult; 2 children [5, 12] | Supplier price MYR 19.60 | Client price BDT 24,000.04 */
    const gn = r.guests.length, mix = guestMix(r.guests);
    const val = v => v ? `<b>${esc(v)}</b>` : '<b class="none">—</b>';
    box.querySelector('.room-sum').innerHTML = [
      r.room_type.trim() ? `<b>${esc(r.room_type)}</b>` : '<b class="none">No room type</b>',
      `<b>${gn} guest${gn === 1 ? '' : 's'}</b><i>${mix}</i>`,
      `<i>Supplier price</i>${val(r.price === '' ? '' : money2(sc, r.price))}`,
      `<i>Client price</i>${val(r._cust === '' ? '' : money2(cc, r._cust))}`,
    ].map(x => `<span>${x}</span>`).join('');
    /* shown on a closed room at all times (not only after a save attempt): the room's empty required fields,
       plus any problem already shown in red inside it. After a save attempt the red ones cover everything. */
    const shown = errs.filter(e => box.contains(e)).length;
    const n = shown + (submitted ? 0 : roomMissing(r, ri));
    const pill = box.querySelector('.room-errs');
    pill.hidden = !n;
    pill.textContent = `${n} field${n === 1 ? '' : 's'} required`;
  });
  fitRoomSums();
}
/* a closed room's summary keeps Client price in view: the room type shrinks (…) first (CSS), then Supplier price
   then the guests, then (last resort) the room type are dropped, only while the line still doesn't fit (the "n fields required" pill takes room too) */
function fitRoomSums() {
  document.querySelectorAll('.room.closed .room-sum').forEach(s => {
    const k = [...s.children]; k.forEach(x => { x.style.display = ''; });
    for (const i of [2, 1, 0]) { if (!k[i] || s.scrollWidth <= s.clientWidth + 1) break; k[i].style.display = 'none'; }
  });
}
new ResizeObserver(() => fitRoomSums()).observe(document.querySelector('.adm-wrap'));
function renderRooms() {
  document.getElementById('rooms').innerHTML = state.rooms.map((r, ri) => `
    <div class="box room${roomOpen(r) ? '' : ' closed'}" data-ri="${ri}">
      <div class="box-head"><span class="box-title">Room: ${ri + 1}</span><span class="room-sum"></span><button type="button" class="room-errs" data-room-errs="${ri}" hidden></button><span class="spacer"></span>${state.rooms.length > 1 ? rmBtn('rm-room', ri) : ''}<button type="button" class="arrow room-arrow" data-room-toggle="${ri}" aria-expanded="${roomOpen(r)}" aria-label="Open or close room ${ri + 1}"><svg viewBox="0 0 448 512"><path fill="currentColor" d="M207.029 381.476L12.686 187.132c-9.373-9.373-9.373-24.569 0-33.941l22.667-22.667c9.357-9.357 24.522-9.375 33.901-.04L224 284.505l154.745-154.021c9.379-9.335 24.544-9.317 33.901.04l22.667 22.667c9.373 9.373 9.373 24.569 0 33.941L240.971 381.476c-9.373 9.372-24.569 9.372-33.942 0z"/></svg></button></div>
      <div class="box-body">
        <div class="room-top">
          ${field('Room type', `rooms.${ri}.room_type`, r.room_type, 'placeholder="e.g. Superior Double Room" data-required data-policy-title', 'Room type is required.')}
          <div class="field"><label class="lbl">Room no.</label><div class="ro" title="Assigned automatically">${ri + 1}</div></div>
          ${money('Price <span class="hint">(supplier)</span>', `rooms.${ri}.price`, r.price, 'ps.supplierCurrency', 'Room price is required.', true)}
          <div class="field"><label class="lbl lbl-calc"><span><span data-cust-label>Client</span> price</span><span class="calc-mini" id="rcc-${ri}"></span></label><div class="ro money cust" id="rcp-${ri}" title="Price × conversion rate + markup"></div><div class="fb" id="rcpErr-${ri}"></div></div>
        </div>
        <div class="guests-head"><div class="sec-title"><span class="dot"></span>Guests</div></div>
        ${r.guests.map((g, gi) => guestHTML(r, ri, g, gi)).join('')}
        <div class="room-err" id="rerr-${ri}" hidden>Each room needs at least one adult.</div>
        <button type="button" class="btn btn-add" data-action="add-guest" data-room="${ri}">+ Add guest: ${r.guests.length + 1} to room ${ri + 1}</button>
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
      /* only the lead guest's nationality is passed on, and only to guests with none yet;
         changing any other guest's nationality changes that guest only */
      if (!g.is_lead) return;
      allGuests().forEach(o => { if (o !== g && !o.nationality) o.nationality = it.id; });
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
        ${money('Cancellation fee', `${scopePath}.${kind}.${i}.cancellationPrice`, p.cancellationPrice, kind === 'agent' ? 'ps.portalCurrency' : 'ps.supplierCurrency', 'Fee is required and must be 0 or more.', true)
          /* Full price (as live): fee = the full price of the rooms the policy covers, read-only while ticked */
          .replace(/<label class="lbl req">Cancellation fee<\/label>/, `<div class="lbl-row"><label class="lbl req">Cancellation fee</label><label class="lead-check full-chk"><input type="checkbox" data-bind="${scopePath}.${kind}.${i}.full" ${p.full ? 'checked' : ''}> Full price</label></div>`)
          .replace('data-money', `data-money data-full="${scopePath}.${kind}.${i}.full"`)}
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
        <div class="field"><label class="lbl lbl-calc"><span>Cancellation fee</span><span class="calc-mini${p._calc ? ' is-link' : ''}"${p._calc ? ` data-pol-calc="${scopePath}|${i}" role="button" tabindex="0" aria-label="Show how policy ${i + 1}'s client fee is calculated"` : ''}>${esc(p._calc || '')}</span>${p.full ? '<span class="lead-check full-chk is-ro" title="Follows the supplier policy"><input type="checkbox" checked disabled> Full price</span>' : ''}</label>
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
/* ---------- Auto calculate markup ----------
   The agent quoted the client a total before booking; the supplier price may have changed since.
   From the quoted client total (C), the supplier total (S) and the room count (N) the markup is worked out so the
   client still pays exactly C:  cost = round2(S × rate), difference = C − cost (can't be below 0);
   Fixed → per room = round2(difference ÷ N); Percent → round2(difference ÷ cost × 100).
   Room prices = S split equally; the LAST ROOM TAKES THE BALANCE (S − the other rooms' prices), so a room price edited by hand
   is made up on the last room; likewise the last room's client price is C − the other rooms' client prices (its markup adjusts).
   The last room's supplier or client price below 1.00 is an error. */
let autoCalc = null;   /* worked out in derive(); never saved */
function autoNeed() {
  const ps = state.ps;
  if (state.supplier_id == null) return ['supplier_id', 'Select supplier first'];
  if (!ps.portalCurrency) return state.customer_id == null ? ['customer_id', 'Select client first'] : ['customer_currency', 'Select client currency first'];
  if (!(Number(ps.conversionRate) > 0)) return ['ps.conversionRate', 'Enter conversion rate first'];
  if (!ps.markupType) return ['ps.markupType', 'Select markup type first'];
  return null;
}
function autoState() {
  const ps = state.ps, a = { need: autoNeed(), split: null, ready: false, low: false, mis: null };
  if (a.need) return a;
  const S = Number(ps.autoSupplier), N = Number(ps.autoRooms), C = Number(ps.autoClient);
  a.hasS = ps.autoSupplier !== '' && S > 0; a.hasN = ps.autoRooms !== '' && N >= 1; a.hasC = ps.autoClient !== '';
  /* equal split of the supplier total, last room takes the rounding */
  if (a.hasS && a.hasN && state.rooms.length === N) {
    const per = round2(S / N);
    a.split = state.rooms.map((rm, i) => fmtMoney(i === N - 1 ? round2(S - per * (N - 1)) : per));
  }
  if (a.hasS) { a.cost = round2(S * Number(ps.conversionRate)); }
  if (a.hasS && a.hasC) { a.diff = round2(C - a.cost); a.low = a.diff < 0; }
  a.ready = a.hasS && a.hasN && a.hasC && !a.low;
  return a;
}
/* rooms follow the room count: missing rooms are added; extra rooms are removed only while untouched (added by this and nothing typed) */
const pristineRoom = rm => rm.autoAdded && rm.priceAuto !== false && rm.guests.length === 1 && !rm.guests[0].first_name && !rm.guests[0].last_name && !rm.guests[0].title && (!rm.room_type || rm.room_type === state.rooms[0].room_type);
function syncAutoRooms() {
  const n = Number(state.ps.autoRooms); if (!state.ps.auto || state.ps.autoRooms === '' || !(n >= 1)) return false;
  let changed = false;
  while (state.rooms.length < n) { state.rooms.push({ ...newRoom(), autoAdded: true }); changed = true; }
  while (state.rooms.length > n && pristineRoom(state.rooms.at(-1))) { state.rooms.pop(); changed = true; }
  return changed;
}

function derive() {
  const lead = allGuests().find(g => g.is_lead);
  state.lead_pax_name = lead ? `${lead.first_name} ${lead.last_name}`.trim() : '';
  const ps = state.ps, rooms = state.rooms, mt = ps.markupType;
  if (sameCurrency()) ps.conversionRate = ps.reverseRate = 1;
  const r = Number(ps.conversionRate), rateOk = ps.conversionRate !== '' && r > 0 && !!ps.supplierCurrency && !!ps.portalCurrency;
  ps.noOfRooms = rooms.length;
  autoCalc = ps.auto ? autoState() : null;
  const ac = autoCalc;
  if (ac) {
    if (ac.split) {
      rooms.forEach((rm, i) => { if (i < rooms.length - 1 && rm.priceAuto !== false) rm.price = ac.split[i]; });
      /* the last room takes the balance of the total supplier price (read-only while auto is on) */
      const others = rooms.slice(0, -1), last = rooms.at(-1);
      last.priceAuto = true;
      last.price = others.every(rm => rm.price !== '' && rm.price != null) ? fmtMoney(round2(Number(ps.autoSupplier) - others.reduce((x, rm) => x + Number(rm.price), 0))) : '';
      ac.balance = true;
      ac.lastSupLow = last.price !== '' && Number(last.price) < 1;
    }
    ps.markupRule = ac.ready ? (mt === 'Percent' ? (ac.cost ? round2(ac.diff / ac.cost * 100) : 0) : round2(ac.diff / Number(ps.autoRooms))) : '';
    /* rooms must match: same count, room prices adding up to the total supplier price */
    if (ac.hasN && rooms.length !== Number(ps.autoRooms)) ac.mis = { kind: 'rooms' };
    else if (ac.hasS && rooms.every(rm => rm.price !== '' && rm.price != null)) {
      const tot = round2(rooms.reduce((x, rm) => x + Number(rm.price), 0));
      if (tot !== round2(Number(ps.autoSupplier))) ac.mis = { kind: 'price', tot };
    }
  }
  const rule2 = Number(ps.markupRule) || 0;
  /* per room: converted = price × rate; markup = % of converted or flat per room; customer price = converted + markup */
  rooms.forEach(rm => {
    const has = rm.price !== '' && rm.price != null;
    rm._conv = has && rateOk ? round2(Number(rm.price) * r) : '';
    rm._mk = rm._conv === '' ? '' : mt === 'Percent' ? round2(rm._conv * rule2 / 100) : mt === 'Fixed' ? round2(rule2) : 0;
    rm._cust = rm._conv === '' ? '' : round2(rm._conv + rm._mk);
    rm._adj = 0;
  });
  /* auto: the last room's markup takes the rounding, so the client total is exactly the quoted price */
  if (ac && ac.ready && !ac.mis && rooms.every(rm => rm._cust !== '')) {
    const last = rooms.at(-1), others = round2(rooms.slice(0, -1).reduce((x, rm) => x + rm._cust, 0));
    const cust = round2(Number(ps.autoClient) - others), mk = round2(cust - last._conv);
    last._adj = round2(mk - last._mk); last._mk = mk; last._cust = cust;
    ac.lastCustLow = cust < 1;
  }
  const allPriced = rooms.length && rooms.every(rm => rm.price !== '' && rm.price != null);
  const sum = k => round2(rooms.reduce((a, rm) => a + Number(rm[k]), 0));
  ps.supplierPrice = allPriced ? sum('price') : '';
  const done = allPriced && rateOk;
  ps.convertedPrice = done ? sum('_conv') : '';
  ps.markupAmount = done ? sum('_mk') : '';
  ps.finalPrice = done ? sum('_cust') : '';

  /* Full price policies: supplier fee = the supplier price of the rooms covered (all rooms → Σ room prices, per room → that room's);
     client fee (typed client policies) = their client price. Empty until that price is known. */
  (state.onePolicy ? [[state.cancellation_all, ps.supplierPrice, ps.finalPrice]] : rooms.map(rm => [rm.cancellation, rm.price ?? '', rm._cust]))
    .forEach(([sc, supFull, custFull]) => {
      sc.supplier.forEach(p => { if (p.full) p.cancellationPrice = supFull === '' ? '' : fmtMoney(supFull); });
      if (!state.clientAuto) sc.agent.forEach(p => { if (p.full) p.cancellationPrice = custFull === '' ? '' : fmtMoney(custFull); });
    });

  /* client policies from supplier — same as Hotel_API (APICommonHelper.ConvertCancellationPolicy + HotelMapperManager.CalculateCancellationPrice):
     From = supplier From − hours − 1 s, To = supplier To − hours − 2 s;
     fee = supplier fee × rate + the markup of the rooms the policy covers (percent of their converted price, or fixed × rooms);
     a free (0) step gets no markup */
  if (state.clientAuto) {
    const secs = -(Number(state.clientHours) || 0) * 3600;
    const scopes = state.onePolicy ? [[state.cancellation_all, ps.convertedPrice, rooms.length, ps.markupAmount, ps.finalPrice]] : rooms.map(rm => [rm.cancellation, rm._conv, 1, rm._mk, rm._cust]);
    scopes.forEach(([sc, base, n, actual, custMax]) => {
      /* auto calculate markup: the rooms' actual markup (incl. the last room's rounding) */
      const mkAmt = ac ? actual : mt === 'Fixed' ? round2(rule2 * n) : mt === 'Percent' ? (base === '' ? '' : round2(base * rule2 / 100)) : 0;
      sc.agent = sc.supplier.map(p => {
        const has = p.cancellationPrice !== '' && p.cancellationPrice != null, f = Number(p.cancellationPrice);
        const conv = has && rateOk ? round2(f * r) : '';
        const mk = !f ? 0 : mkAmt;
        /* never more than the client price of the rooms covered (rounding of the markup could add a cent) */
        const calc = conv === '' || mk === '' ? '' : custMax === '' ? round2(conv + mk) : Math.min(round2(conv + mk), custMax);
        /* Full price on the supplier side → full price on the client side too: the client price of the rooms covered */
        const fee = p.full ? (custMax === '' || calc === '' ? '' : Number(custMax)) : calc;
        return {
          full: !!p.full,
          /* empty supplier From → now − hours (as Hotel_API) */
          fromDate: p.fromDate ? addSecs(p.fromDate, secs - 1) : addSecs(state.clientNow || nowStr(), secs), toDate: addSecs(p.toDate, secs - 2),
          cancellationPrice: fee,
          _need: !has ? 'Enter supplier fee' : conv === '' ? 'Needs conversion rate' : mk === '' ? (state.onePolicy ? 'Needs every room price' : 'Needs room price') : '',
          _calc: fee === '' || !f ? '' : `${fmtN(f)} × ${fmtRate(r)} = ${fmtN(conv)}${mk ? ` + ${fmtN(mk)} markup` : ''}`,
          /* the same figures, step by step, for the breakdown modal (explainPolicy) */
          _bd: fee === '' || !f ? null : { f, conv, mk, base, n, auto: !!ac, sum: round2(conv + mk), fee: Number(fee), custMax },
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

/* a room's client price, step by step, in the shared modal — opened from the small calculation line above the price.
   Auto calculate markup: the last room also absorbs the rounding difference so the rooms add up to the quoted total
   client price. Then a second table shows the totals, the difference and the last room's adjusted price. */
function explainRoom(ri) {
  const ps = state.ps, sc = ps.supplierCurrency, cc = ps.portalCurrency, mt = ps.markupType, rooms = state.rooms, n = rooms.length, r = rooms[ri];
  if (!r || r._cust === '') return;
  const rule = mt === 'Percent' ? `${+Number(ps.markupRule).toFixed(2)}%` : mt === 'Fixed' ? 'fixed per room' : '';
  const adj = ri === n - 1 && autoCalc && autoCalc.balance ? round2(Number(r._adj) || 0) : 0;
  const mk = round2(r._mk - adj), cust = round2(r._cust - adj);   // this room before the adjustment
  const details = [['Supplier price', money2(sc, r.price)],
    ['Rate', `${sc} 1 = ${cc} ${fmtRate(ps.conversionRate)}`],
    ['Converted', money2(cc, r._conv)],
    ['Markup', mk ? `+ ${money2(cc, mk)} <span class="muted">(${rule})</span>` : `${money2(cc, 0)} <span class="muted">(no markup)</span>`],
    ['Client price', `<b>${money2(cc, cust)}</b>`]];
  let note = '';
  if (adj) {
    const S = Number(ps.autoSupplier), C = Number(ps.autoClient), cost = round2(S * Number(ps.conversionRate));
    const sum = round2(rooms.slice(0, -1).reduce((x, rm) => x + Number(rm._cust), 0) + cust);
    const diff = round2(C - sum), sign = diff < 0 ? '−' : '+';
    details.push(null,
      ['Total supplier price', money2(sc, S)],
      ['Converted total price', money2(cc, cost)],
      ['Total markup', `+ ${money2(cc, round2(C - cost))} <span class="muted">(${rule})</span>`],
      ['Total client price', `<b>${money2(cc, C)}</b>`],
      ['All room client price sum', money2(cc, sum)],
      ['Rounding difference', `${sign} ${money2(cc, Math.abs(diff))}`],
      [`Room ${n} adjusted price`, `${fmtN(cust)} ${sign} ${fmtN(Math.abs(diff))} = <b>${money2(cc, r._cust)}</b>`]);
    note = `Each room's price is rounded to 2 decimals, so the rooms can add up to a little more or less than the total client price. The difference is added to the last room so the booking total matches the total client price exactly.`;
  }
  Modal.open({
    tone: 'info',
    title: `Room: ${ri + 1}`,
    message: 'Client Price Calculation Breakdown',
    details, note, noteIcon: 'info',
    width: adj ? 640 : undefined,   // the adjustment tables have longer labels and the sum on one line
    confirm: 'Got it', cancel: null,
  });
}

/* a calculated client policy's fee, step by step, in the shared modal — opened from the calculation line above the fee
   (as the room's client price). fee = supplier fee × rate + the markup of the rooms the policy covers;
   never more than those rooms' client price; Full price = that client price. */
function explainPolicy(key) {
  const [scopePath, i] = key.split('|'), p = get(scopePath)?.agent?.[+i], b = p && p._bd;
  if (!b) return;
  const ps = state.ps, sc = ps.supplierCurrency, cc = ps.portalCurrency, mt = ps.markupType;
  const how = mt === 'Percent' ? `${+Number(ps.markupRule).toFixed(2)}%` : mt === 'Fixed' ? (b.n > 1 ? `${fmtMoney(ps.markupRule)} × ${b.n}` : 'fixed') : '';
  const details = [['Supplier fee', money2(sc, b.f)],
    ['Rate', `${sc} 1 = ${cc} ${fmtRate(ps.conversionRate)}`],
    ['Converted', money2(cc, b.conv)],
    ['Markup', b.mk ? `+ ${money2(cc, b.mk)}${how ? ` <span class="muted">(${how})</span>` : ''}` : `${money2(cc, 0)} <span class="muted">(no markup)</span>`]];
  let note = '';
  if (p.full) {
    if (b.fee !== b.sum) details.push(['Converted + markup', money2(cc, b.sum)]);
    details.push(['Client fee (Full price)', `<b>${money2(cc, b.fee)}</b>`]);
    note = `Full price: the client price of the rooms covered.`;
  } else if (b.fee < b.sum) {
    details.push(['Converted + markup', money2(cc, b.sum)], ['Client fee', `<b>${money2(cc, b.fee)}</b>`]);
    note = `Capped at the client price of the rooms covered.`;
  } else details.push(['Client fee', `<b>${money2(cc, b.fee)}</b>`]);
  const head = `${scopePath.startsWith('rooms.') ? `Room: ${+scopePath.split('.')[1] + 1} · ` : ''}Client Cancellation Policy: ${+i + 1}`;
  Modal.open({ tone: 'info', title: head, message: 'Cancellation Fee Calculation Breakdown', details, note, noteIcon: 'info', confirm: 'Got it', cancel: null });
}

/* the booking's client total, step by step, in the shared modal — opened from the rate · markup line of the price summary.
   Same five rows as a room's breakdown; with Auto calculate markup, one note line says how the rule came from the total. */
function explainTotal() {
  const ps = state.ps, sc = ps.supplierCurrency, cc = ps.portalCurrency, mt = ps.markupType, n = state.rooms.length, ac = autoCalc;
  if (ps.finalPrice === '') return;
  const how = mt === 'Percent' ? `${+Number(ps.markupRule).toFixed(2)}%` : mt === 'Fixed' ? `${fmtMoney(ps.markupRule)} × ${n}` : '';
  const details = [[n === 1 ? 'Supplier price' : `Supplier price (${n} rooms)`, money2(sc, ps.supplierPrice)],
    ['Rate', sameCurrency() ? 'Same currency' : `${sc} 1 = ${cc} ${fmtRate(ps.conversionRate)}`],
    ['Converted', money2(cc, ps.convertedPrice)],
    ['Markup', Number(ps.markupAmount) ? `+ ${money2(cc, ps.markupAmount)}${how ? ` <span class="muted">(${how})</span>` : ''}` : `${money2(cc, 0)} <span class="muted">(no markup)</span>`],
    ['Client total price', `<b>${money2(cc, ps.finalPrice)}</b>`]];
  const note = ps.auto && ac && ac.ready
    ? (mt === 'Percent' ? `Auto calculated: ${fmtN(ac.diff)} ÷ ${fmtN(ac.cost)} = ${+Number(ps.markupRule).toFixed(2)}%.`
      : `Auto calculated: ${fmtN(ac.diff)} ÷ ${Number(ps.autoRooms)} rooms = ${fmtMoney(ps.markupRule)} per room.`)
    : '';
  Modal.open({ tone: 'info', title: 'Price Summary', message: 'Client Total Price Calculation Breakdown', details, note, noteIcon: 'info',
    confirm: 'Got it', cancel: null });
}

/* ---------- price summary (read-only) ---------- */
const fmtN = v => Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function renderSummary() {
  const ps = state.ps, sc = ps.supplierCurrency, cc = ps.portalCurrency, rooms = state.rooms, n = rooms.length, cl = custLabel();
  const na = '<span class="na">—</span>', amt = (cur, v) => (v === '' || v == null || !cur ? na : `<span class="ccy">${cur}</span>${fmtN(v)}`);
  const mt = ps.markupType, rule = ps.markupRule, ok = ps.finalPrice !== '';
  const mkLabel = (!mt || rule === '' ? 'No markup' : mt === 'Percent' ? `Markup ${+Number(rule).toFixed(2)}%` : `Markup ${fmtMoney(rule)} fixed per room`) + (ps.auto && rule !== '' ? ' (auto calculated)' : '');
  const missing = [!sc && 'supplier currency', !cc && `${cl.toLowerCase()} currency`, !(Number(ps.conversionRate) > 0) && 'conversion rate', !rooms.every(r => r.price !== '') && 'every room price'].filter(Boolean);
  const mPart = !ok || !Number(ps.markupAmount) ? '' : ` + ${money2(cc, ps.markupAmount)}${mt === 'Fixed' && n > 1 ? ` (${fmtMoney(rule)} × ${n} rooms)` : ''}`;
  document.getElementById('sumBody').innerHTML = `
    <div class="sum-sub">${ps.supplier ? esc(ps.supplier) : 'Supplier not selected'}<span class="pb-fine-inline${ok ? ' is-link' : ''}"${ok ? ' data-sum-calc role="button" tabindex="0" aria-label="Show how the client total price is calculated"' : ''}>${sc && cc && Number(ps.conversionRate) > 0 ? (sameCurrency() ? 'Same currency · rate 1' : `1 ${sc} = ${fmtRate(ps.conversionRate)} ${cc} · 1 ${cc} = ${fmtRate(ps.reverseRate)} ${sc}`) : 'Conversion rate not set'} · ${mkLabel}</span></div>
    <div class="pb-wrap"><table class="pb-table">
      <thead><tr><th>Room</th><th class="l">Room type</th><th>Guests</th><th>Supplier price</th><th>Converted</th><th>Markup</th><th>${esc(cl)} price</th></tr></thead>
      <tbody>${rooms.map((r, i) => `<tr><td>Room ${i + 1}</td><td class="l">${r.room_type ? esc(r.room_type) : na}</td><td data-l="Guests">${r.guests.length}</td><td data-l="Supplier price">${amt(sc, r.price)}</td><td data-l="Converted">${amt(cc, r._conv)}</td><td class="mk" data-l="Markup">${amt(cc, r._mk)}</td><td class="final" data-l="${esc(cl)} price">${amt(cc, r._cust)}</td></tr>`).join('')}</tbody>
      <tfoot><tr><td>Total</td><td class="l"></td><td data-l="Guests">${allGuests().length}</td><td data-l="Supplier price">${amt(sc, ps.supplierPrice)}</td><td data-l="Converted">${amt(cc, ps.convertedPrice)}</td><td class="mk" data-l="Markup">${amt(cc, ps.markupAmount)}</td><td class="final" data-l="${esc(cl)} price">${amt(cc, ps.finalPrice)}</td></tr></tfoot>
    </table></div>
    ${ok ? `<div class="pb-calc"><span class="pb-calc-line is-link" data-sum-calc role="button" tabindex="0" aria-label="Show how the client total price is calculated">(${money2(sc, ps.supplierPrice)} × ${fmtRate(ps.conversionRate)}) = ${money2(cc, ps.convertedPrice)}${mPart} = <b>${money2(cc, ps.finalPrice)}</b></span>${mt === 'Fixed' ? '<span class="pb-note">A fixed markup is added per room</span>' : ''}${(i => i < 0 ? '' : `<span class="pb-note">Room ${i + 1} markup includes ${fmtN(rooms[i]._adj)} balance so the total matches the total client price</span>`)(rooms.findIndex(r => Number(r._adj)))}</div>`
         : `<p class="pb-empty">To calculate, add the ${missing.join(', ')}.</p>`}
    <div class="total-line"><span class="l">${esc(cl)} total price</span><span class="v">${ok ? amt(cc, ps.finalPrice) : '—'}</span></div>`;
  /* same total in the sticky save bar */
  const bar = document.getElementById('barTotal');
  bar.querySelector('.l').textContent = `${cl} total price`;
  bar.querySelector('.v').innerHTML = ok ? amt(cc, ps.finalPrice) : na;
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
    const adj = Number(r._adj) ? `, incl. ${r._adj > 0 ? '+' : '−'}${fmtN(Math.abs(r._adj))} balance` : '';
    const mk = !Number(r._mk) ? '' : ` + ${fmtN(r._mk)}${mt === 'Percent' ? ` (${+Number(ps.markupRule).toFixed(2)}%${adj})` : ` (fixed${adj})`}`;
    const calc = r._cust === '' ? '' : `${fmtN(r.price)} × ${fmtRate(ps.conversionRate)} = ${fmtN(r._conv)}${mk}`;
    const cc2 = document.getElementById(`rcc-${ri}`); cc2.textContent = calc; cc2.removeAttribute('title');
    /* the full calculation (and, for the last room, why it's adjusted) in the tooltip of the calc line and the price */
    /* the calculation line opens the full calculation (modal) */
    cc2.classList.toggle('is-link', !!calc);
    if (calc) { cc2.tabIndex = 0; cc2.setAttribute('role', 'button'); cc2.setAttribute('aria-label', `Show how room ${ri + 1}'s client price is calculated`); }
    else { cc2.removeAttribute('tabindex'); cc2.removeAttribute('role'); cc2.removeAttribute('aria-label'); }
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

  /* Full price fees are read-only while ticked */
  document.querySelectorAll('input[data-full]').forEach(inp => {
    const ig = inp.parentElement, full = !!get(inp.dataset.full) && !ig.classList.contains('locked');
    if (full) { inp.disabled = true; inp.placeholder = 'Needs the room price'; }
    ig.classList.toggle('calc', full);
  });

  /* Auto calculate markup: the markup amount is calculated (read-only); the section waits for what it needs */
  const mkInp = document.querySelector('[data-bind="ps.markupRule"]'), mkIg = mkInp.parentElement, mkLocked = mkIg.classList.contains('locked');
  if (ps.auto && !mkLocked) { mkInp.disabled = true; mkInp.placeholder = 'Calculated'; }
  mkIg.classList.toggle('calc', ps.auto && !mkLocked);
  const ac = autoCalc;
  document.getElementById('autoMk').hidden = !ps.auto;
  const aLock = document.getElementById('autoLock'), aNeed = document.getElementById('autoNeed'), an = ac && ac.need;
  aLock.classList.toggle('locked', !!an); aLock.inert = !!an; aNeed.hidden = !an;
  if (an) { aNeed.dataset.needPath = an[0]; aNeed.querySelector('span').textContent = an[1]; }
  document.getElementById('autoClientMsg').textContent = ac && ac.low ? `Can't be lower than the cost: ${money2(cc, ac.cost)} (supplier price × rate).` : '';
  /* Rooms & guests: recalculate + warning when the rooms no longer match */
  const bar = document.getElementById('autoBar'), barMsg = document.getElementById('autoBarMsg');
  bar.hidden = !(ac && !ac.need && ac.hasS && ac.hasN);
  const mis = ac && !ac.need && ac.mis, n0 = Number(ps.autoRooms), nr = state.rooms.length;
  /* Rooms & guests header: "Rooms filled: x/n" (x = rooms entered, n = No. of rooms); amber while they differ, red after a save attempt */
  barMsg.textContent = `Rooms filled: ${nr}/${n0}`;
  barMsg.classList.toggle('ok', !mis); barMsg.classList.toggle('warn', !!mis);
  barMsg.dataset.tooltip = !mis ? 'Matches the no. of rooms in Auto calculate markup'
    : mis.kind === 'rooms' ? `Auto calculate is for ${n0} room${n0 > 1 ? 's' : ''}. ${nr < n0 ? 'Add' : 'Remove'} a room or change the no. of rooms.`
    : `Room prices add up to ${money2(sc, mis.tot)}, not ${money2(sc, ps.autoSupplier)}. Recalculate or fix the prices.`;
  /* fewer rooms than No. of rooms: "+ Add room" says which one is next ("Add room 3/3") and is the place to go */
  const under = !!(mis && mis.kind === 'rooms' && nr < n0), addBtn = document.querySelector('[data-action="add-room"]');
  /* while auto calculate has a room count, "+ Add room" always says which room is being added (x/n);
     once every room is there (or more) it's disabled */
  const counted = !!(ac && !ac.need && ac.hasN), full = counted && nr >= n0;
  /* the number of the room being added: "+ Add room: 5" (auto off) / "+ Add room: 3/4" (auto on, of No. of rooms) */
  addBtn.textContent = !counted ? `+ Add room: ${nr + 1}` : full ? `All ${n0} room${n0 > 1 ? 's' : ''} added` : `+ Add room: ${nr + 1}/${n0}`;
  addBtn.disabled = full;
  addBtn.classList.toggle('is-invalid', under);
  barMsg.classList.toggle('go', under);
  /* more rooms than No. of rooms: Recalculate can't fix that (it never removes a room with data) — the user removes one */
  bar.querySelector('[data-action="recalc"]').disabled = nr > n0 || (!mis && state.rooms.every(r => r.priceAuto !== false));
  state.rooms.forEach((r, ri) => {
    const inp = document.querySelector(`[data-bind="rooms.${ri}.price"]`), f = inp?.closest('.field'); if (!f) return;
    f.classList.toggle('auto-edited', !!(mis && mis.kind === 'price' && r.priceAuto === false));
    /* the last room takes the balance: read-only while auto calculate is on */
    const bal = !!(ac && ac.balance && ri === state.rooms.length - 1), ig = inp.parentElement;
    if (bal && !ig.classList.contains('locked')) { inp.disabled = true; inp.placeholder = 'Needs the other room prices'; }
    ig.classList.toggle('calc', bal);
    ig.title = bal ? 'Total supplier price − the other rooms' : ig.title;
    const hint = f.querySelector('label .hint'); if (hint) hint.textContent = bal ? '(supplier · balance)' : '(supplier)';
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
  /* check-out picker starts the day after check-in */
  const coMin = state.check_in ? (d => (d.setDate(d.getDate() + 1), dayKey(d)))(new Date(state.check_in + 'T00:00')) : '';
  /* a check-in moved onto / past the check-out: no limit (it would blank the check-out), flag it at once instead */
  const coBad = !!(state.check_out && coMin && state.check_out < coMin), coLim = coBad ? '' : coMin;
  if (coFp && coFp._min !== coLim) { coFp._min = coLim; coFp.set('minDate', coLim || null); }
  if (coFp && coBad && !coFp.selectedDates.length) coFp.setDate(state.check_out, false);
  if (coBad) { document.getElementById('checkoutMsg').textContent = 'Check-out must be after check-in.'; document.getElementById('f-checkout').classList.add('is-invalid'); document.getElementById('f-checkout').classList.remove('is-empty'); }
  else if (!submitted) document.getElementById('f-checkout').classList.remove('is-invalid');
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
  if (submitted) validate(); else { checkPolicyDates(); checkAuto(false); checkFees(); checkGuestNames(); }
  updateRoomHeads();
}

/* a typed cancellation fee can't be more than the price of the rooms it covers:
   supplier fee ≤ supplier price, client fee ≤ client price (all rooms → totals, per room → that room); unknown price → not checked */
function feeMax(sp, kind) {
  const m = sp.match(/^rooms\.(\d+)\./), rm = m ? state.rooms[+m[1]] : null, ps = state.ps;
  const v = kind === 'supplier' ? (rm ? rm.price : ps.supplierPrice) : (rm ? rm._cust : ps.finalPrice);
  return v === '' || v == null ? null : Number(v);
}
function checkFees() {
  const errs = [], sc = state.ps.supplierCurrency, cc = state.ps.portalCurrency;
  const scopes = state.onePolicy ? ['cancellation_all'] : state.rooms.map((r, i) => `rooms.${i}.cancellation`);
  scopes.forEach(sp => ['supplier', ...(state.clientAuto ? [] : ['agent'])].forEach(kind => (get(sp)[kind] || []).forEach((p, i) => {
    const bind = `${sp}.${kind}.${i}.cancellationPrice`, el = document.querySelector(`[data-bind="${bind}"]`); if (!el) return;
    const f = el.closest('.field'), fb = f.querySelector('.fb'), max = feeMax(sp, kind);
    if (!fb.dataset.def) fb.dataset.def = fb.textContent;
    const over = max != null && p.cancellationPrice !== '' && p.cancellationPrice != null && round2(Number(p.cancellationPrice)) > round2(max);
    const what = kind === 'supplier' ? 'supplier' : custLabel().toLowerCase(), all = sp === 'cancellation_all' && state.rooms.length > 1;
    fb.textContent = over ? `Can't be more than the ${all ? 'total ' : 'room '}${what} price: ${money2(kind === 'supplier' ? sc : cc, max)}.` : fb.dataset.def;
    if (over) { f.classList.add('is-invalid'); f.classList.remove('is-empty'); errs.push(bind); }
    else if (!submitted) f.classList.remove('is-invalid');
  })));
  return errs;
}

/* policy dates: a To can't be before its From (the To picker starts at the From; a From moved past the To is flagged at once) */
/* guest names: no two guests (in any room) with the same first + last name (case and extra spaces ignored).
   The later guest's first and last name both turn red (counted once, on the last name); the guest's header says
   who already has the name: "David Brown is already Guest 1 in this room." / "… in Room 1." Shown at once; blocks Save */
function checkGuestNames() {
  const errs = [], seen = new Map(), norm = v => String(v).trim().replace(/\s+/g, ' ');
  state.rooms.forEach((r, ri) => r.guests.forEach((g, gi) => {
    const el = document.querySelector(`[data-bind="rooms.${ri}.guests.${gi}.last_name"]`); if (!el) return;
    const f = el.closest('.field'), ff = document.querySelector(`[data-bind="rooms.${ri}.guests.${gi}.first_name"]`)?.closest('.field');
    const k = norm(g.first_name) && norm(g.last_name) ? `${norm(g.first_name)} ${norm(g.last_name)}`.toLowerCase() : '', first = k && seen.get(k);
    if (k && !first) seen.set(k, [ri, gi]);
    /* the message sits in the guest's header: "Guest 2: David Brown is already Guest 1 in this room." */
    const line = document.getElementById(`gdup-r${ri}-g${gi}`), o = first && state.rooms[first[0]].guests[first[1]];
    if (line) { line.hidden = !first; line.textContent = first ? `${norm(o.first_name)} ${norm(o.last_name)} is already Guest ${first[1] + 1} in ${first[0] === ri ? 'this room' : `Room ${first[0] + 1}`}.` : ''; }
    ff?.classList.toggle('dup-name', !!first);
    f.classList.toggle('dup-msg', !!first);   /* hides the field's own message; the line above says it */
    if (first) { f.classList.add('is-invalid'); f.classList.remove('is-empty'); errs.push(`rooms.${ri}.guests.${gi}.name`); }
    else if (!submitted) f.classList.remove('is-invalid');
  }));
  return errs;
}

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
  if (ps.auto) {
    const ac = autoCalc || {};
    if (!ps.markupType) return ['ps.markupType', 'Select markup type first'];
    if (!ac.hasC) return ['ps.autoClient', 'Enter total client price first'];
    if (!ac.hasS) return ['ps.autoSupplier', 'Enter total supplier price first'];
    if (!ac.hasN) return ['ps.autoRooms', 'Enter no. of rooms first'];
    if (ac.low) return ['ps.autoClient', 'Total client price is below the cost'];
  } else if (ps.markupType && ps.markupRule === '') return ['ps.markupRule', 'Enter markup amount first'];
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
    const wrap = el.closest('.field'); if (!wrap || el.type === 'checkbox' || el.closest('[hidden]')) return;
    const v = String(el.value ?? '').trim();
    if (el.disabled && el.dataset.money !== undefined && el.parentElement.classList.contains('locked')) { mark(wrap, false); if (v !== '') errors.push(el.dataset.bind); return; }
    let bad = false;
    if (el.hasAttribute('data-required') && v === '') bad = true;
    if (v !== '' && el.dataset.min !== undefined && Number(v) < Number(el.dataset.min)) bad = true;
    if (v !== '' && el.dataset.max !== undefined && Number(v) > Number(el.dataset.max)) bad = true;
    if (v !== '' && el.hasAttribute('data-email') && !/^\S+@\S+\.\S+$/.test(v)) bad = true;
    mark(wrap, bad, v === '');
    if (bad) errors.push(el.dataset.bind);
  });
  const nowKey = (d => `${dayKey(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`)(new Date());
  /* required, and can't be in the future */
  if (mark(document.getElementById('f-bookdate'), !state.booking_date || state.booking_date > nowKey, !state.booking_date)) errors.push('booking_date');
  /* check-out must be a later date than check-in (the same day isn't allowed) */
  const co = state.check_in && state.check_out && state.check_out <= state.check_in;
  if (co) { document.getElementById('checkoutMsg').textContent = 'Check-out must be after check-in.'; mark(document.getElementById('f-checkout'), true); errors.push('check_out'); }
  else document.getElementById('checkoutMsg').textContent = '';
  const need = (id, bad, key, empty = true) => { if (mark(document.getElementById(id), bad, empty)) errors.push(key); };
  need('f-country', !state.country_name, 'country_name');
  need('f-city', !state.city, 'city');
  need('f-supplier', state.supplier_id == null, 'supplier_id');
  need('f-supCur', !state.ps.supplierCurrency, 'supplier_currency');
  need('f-platform', !state.platform, 'platform');
  need('f-customer', state.customer_id == null, 'customer_id');
  need('f-custCur', !state.ps.portalCurrency, 'customer_currency');
  need('f-market', state.market_id == null, 'market_id');
  need('f-rate', !(Number(state.ps.conversionRate) > 0), 'conversion_rate', state.ps.conversionRate === '' || state.ps.conversionRate == null);
  if (!state.ps.auto) need('f-markupRule', !!state.ps.markupType && state.ps.markupRule === '', 'markup_rule');
  else need('f-markupType', !state.ps.markupType, 'markup_type');
  errors.push(...checkAuto(true));
  const mob = state.contact_mobile || '';
  need('f-mobile', mob.length < 6 || mob.length > 15, 'contact_mobile', !mob);
  need('f-dial', !state.contact_dial, 'contact_dial');
  state.rooms.forEach((r, ri) => {
    r.guests.forEach((g, gi) => need(`f-r${ri}-g${gi}-title`, !g.title, `rooms.${ri}.guests.${gi}.title`));
    /* the lead guest's nationality is required */
    r.guests.forEach((g, gi) => need(`f-r${ri}-g${gi}-nat`, !!g.is_lead && !g.nationality, `rooms.${ri}.guests.${gi}.nationality`));
    const noAdult = !r.guests.some(g => g.type === 'Adult');
    document.getElementById(`rerr-${ri}`).hidden = !noAdult;
    if (noAdult) errors.push(`rooms.${ri}.adult`);
  });
  if (allGuests().filter(g => g.is_lead).length !== 1) errors.push('lead_guest');
  if (mark(document.getElementById('f-tz'), !!tzError(), state.tz.hours === '')) errors.push('time_format');
  need('f-clientHours', state.clientAuto && state.clientHours === '', 'client_policy_hours');
  errors.push(...checkPolicyDates(), ...checkFees(), ...checkGuestNames());
  /* at least one cancellation policy: one for all rooms, or one per room when set per room
     (supplier always; client too while its policies are typed — auto calculate makes one per supplier policy) */
  (state.onePolicy ? ['cancellation_all'] : state.rooms.map((r, i) => `rooms.${i}.cancellation`)).forEach(sp => ['supplier', 'agent'].forEach(k => {
    const btn = document.querySelector(`[data-action="add-policy"][data-scope="${sp}"][data-kind="${k}"]`); if (!btn) return;
    const none = !(get(sp)[k] || []).length, what = k === 'agent' ? custLabel().toLowerCase() : 'supplier';
    if (btn.dataset.def === undefined) btn.dataset.def = btn.textContent;
    /* the Add button itself says what's missing (red) */
    btn.textContent = none ? `+ Add at least one ${what} policy${state.onePolicy ? '' : ' for this room'}` : btn.dataset.def;
    btn.classList.toggle('is-invalid', none);
    if (none) errors.push(`${sp}.${k}`);
  }));
  document.querySelectorAll('.lead-check:not(.full-chk)').forEach(l => l.classList.toggle('need', !allGuests().some(g => g.is_lead)));
  updateSaveBar();
  return errors;
}

/* Auto calculate markup: the three inputs (empty → red border on save; client price below cost → at once)
   and the rooms check (count and Σ room prices must match; warning while editing, blocks save) */
function checkAuto(sub) {
  const errs = [], ps = state.ps, ac = autoCalc, on = !!(ac && !ac.need);
  const mk = (id, bad, empty) => { const f = document.getElementById(id); f.classList.toggle('is-invalid', bad); f.classList.toggle('is-empty', bad && empty); if (bad) errs.push(id); };
  mk('f-autoClient', on && ((sub && !ac.hasC) || ac.low), on && !ac.hasC);
  mk('f-autoSupplier', on && sub && !ac.hasS, ps.autoSupplier === '');
  mk('f-autoRooms', on && sub && !ac.hasN, true);
  const bad = on && !!ac.mis, underFill = bad && ac.mis.kind === 'rooms' && state.rooms.length < Number(ps.autoRooms);
  /* under-filled: the red "+ Add room x/n" button is the error to go to; over-filled: the header pill */
  document.getElementById('autoBar').classList.toggle('is-invalid', sub && bad && !underFill);
  if (bad) errs.push('auto_rooms');
  /* the last room takes the balance: its supplier and client price must stay at least 1.00 */
  const n = state.rooms.length, last = state.rooms[n - 1];
  const flag = (f, fb, low, msg, key) => {
    if (!f || !fb) return;
    if (fb.dataset.def === undefined) fb.dataset.def = fb.textContent;
    fb.textContent = low ? msg : fb.dataset.def;
    if (low) { f.classList.add('is-invalid'); f.classList.remove('is-empty'); errs.push(key); }
    else if (!sub || !fb.dataset.def) f.classList.remove('is-invalid');
  };
  const sf = document.querySelector(`[data-bind="rooms.${n - 1}.price"]`)?.closest('.field');
  flag(sf, sf?.querySelector('.fb'), on && !!ac.lastSupLow,
    `Balance is ${money2(ps.supplierCurrency, last.price)}. Must be at least 1.00 — lower another room's price.`, 'last_room_supplier_price');
  const cf = document.getElementById(`rcp-${n - 1}`)?.closest('.field');
  flag(cf, document.getElementById(`rcpErr-${n - 1}`), on && !!ac.lastCustLow,
    `Balance is ${money2(ps.portalCurrency, last._cust)}. Must be at least 1.00 — lower another room's price or raise the total client price.`, 'last_room_client_price');
  return errs;
}

/* ---------- save bar: problems left after a save attempt ---------- */
let lastErr = null;
/* what is shown in red, in page order: fields, "needs an adult" room notes, and the lead-guest ticks (counted once) */
function errTargets() {
  const els = [...document.querySelectorAll('.adm-wrap .is-invalid, .adm-wrap .room-err:not([hidden]), .adm-wrap .lead-check.need')];
  const lead = els.find(e => e.classList.contains('lead-check'));
  return els.filter(e => (!e.classList.contains('lead-check') || e === lead) && !els.some(o => o !== e && o.contains(e)));
}
function updateSaveBar() {
  updateRoomHeads();   /* the "n to fix" pills on closed rooms */
  const btn = document.getElementById('errJump'), n = submitted ? errTargets().length : 0;
  btn.hidden = !n;
  if (n) btn.querySelector('span').innerHTML = `<span class="long">${n} ${n === 1 ? 'field needs' : 'fields need'} attention</span><span class="short">${n} to fix</span>`;   /* short one on phones */
}
/* opens the section and the room an element sits in (a room opened this way closes again on the next + Add room) */
function reveal(el) {
  el.closest('.card.closed')?.classList.remove('closed');
  const box = el.closest('.room.closed'); if (box) setRoomOpen(state.rooms[+box.dataset.ri], true, false);
}
/* next = the first problem after the last one visited (wraps to the top); otherwise the first */
function goToError(next) {
  const list = errTargets(); if (!list.length) return;
  const after = next && lastErr && lastErr.isConnected ? list.find(e => lastErr.compareDocumentPosition(e) & Node.DOCUMENT_POSITION_FOLLOWING) : null;
  const el = lastErr = after || list[0];
  reveal(el);
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  /* dropdowns open on focus (their list would cover the form), so they only get the highlight */
  const dd = el.querySelector('.ss-input');
  const ctl = el.matches('.room-err') || dd ? null : el.querySelector('input:not([disabled]):not([type=checkbox]):not([type=radio]), textarea') || el.querySelector('input:not([disabled])');
  const ring = dd || (ctl && !el.matches('.lead-check') ? (ctl.closest('.ig') || ctl) : el);
  if (ctl) ctl.focus({ preventScroll: true }); else if (el.matches('button')) el.focus({ preventScroll: true });   /* e.g. + Add room x/n */
  ring.classList.remove('flash-err'); void ring.offsetWidth; ring.classList.add('flash-err');
}

/* ---------- payload ---------- */
const num = v => (v === '' || v == null ? null : Number(v));
const pDate = v => { const m = String(v || '').match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(?::(\d{2}))?/); return m ? `${m[1]}T${m[2]}:${m[3] ?? '00'}` : null; };
const dt = v => (v ? v.replace('T', ' ') + (v.length === 16 ? ':00' : '') : null);
function scopeList(sc) {
  const rows = (l, isAPI) => l.map(p => ({ fromDate: pDate(p.fromDate), toDate: pDate(p.toDate), cancellationPrice: num(p.cancellationPrice), currency: isAPI ? state.ps.supplierCurrency : state.ps.portalCurrency, timeFormat: tzString() || null, isAPI, isFullPrice: !!p.full }));
  return [...rows(sc.agent, false), ...rows(sc.supplier, true)];
}
function buildPayload() {
  const s = state, ps = s.ps, edit = mode === 'edit';
  const entry = (sc, roomNo, roomType, one) => ({ roomNo, onePolicyForAllRoom: one, roomType, essentialInformation: sc.essentialInformation, hotelCancellationPolicies: scopeList(sc), warning: [] });
  const policies = (s.onePolicy ? [entry(s.cancellation_all, null, s.rooms[0]?.room_type ?? null, true)] : s.rooms.map((r, i) => entry(r.cancellation, String(i + 1), r.room_type, false)))
    .filter(e => e.hotelCancellationPolicies.length);
  return {
    ...(!edit && (sup => ({
      supplier_type: sup ? (sup.type === 'api' ? 'API' : 'OFFLINE') : null,
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
    rooms: s.rooms.map((r, i) => ({ room_no: String(i + 1), room_type: r.room_type, supplier_price: num(r.price), supplier_currency: ps.supplierCurrency, converted_price: num(r._conv), markup_amount: num(r._mk), rounding_adjustment: Number(r._adj) ? r._adj : null, price: num(r._cust), currency: ps.portalCurrency })),
    guests: s.rooms.flatMap((r, i) => r.guests.map(g => ({
      room_no: String(i + 1), title: g.title || null, first_name: g.first_name, last_name: g.last_name, full_name: `${g.first_name} ${g.last_name}`.trim(),
      type: g.type, child_age: g.type === 'Child' ? num(g.child_age) : null, gender: g.gender || null, nationality: g.nationality || null, nationality_code: natCode(g.nationality), is_lead: !!g.is_lead,
    }))),
    meal_info: { fullMealDetails: s.meal || null },
    supplier_name: ps.supplier, original_total_price: num(ps.supplierPrice), original_price_breakdown: { original_currency: ps.supplierCurrency },
    price_secret: { supplier: ps.supplier, supplierCurrency: ps.supplierCurrency, supplierPrice: num(ps.supplierPrice), conversionRate: num(ps.conversionRate), reverseConversionRate: num(ps.reverseRate), convertedPrice: num(ps.convertedPrice), markupType: ps.markupType || null, markupRule: num(ps.markupRule), markupAmount: num(ps.markupAmount), noOfRooms: s.rooms.length, portalCurrency: ps.portalCurrency, finalPrice: num(ps.finalPrice), sameCurrency: sameCurrency(),
      markupAuto: !!ps.auto, quotedClientPrice: ps.auto ? num(ps.autoClient) : null, quotedSupplierPrice: ps.auto ? num(ps.autoSupplier) : null, quotedNoOfRooms: ps.auto ? num(ps.autoRooms) : null },
    contracting_comment: s.contracting_comment ? JSON.stringify([s.contracting_comment]) : null,
    special_request: s.special_request,
    /* remarks are written once, when the booking is created; an edit doesn't send them */
    ...(!edit && { remarks: s.remarks || null }),
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
  /* a room price typed by hand is kept (no longer split by Auto calculate markup) */
  const rp = path.match(/^rooms\.(\d+)\.price$/); if (rp) state.rooms[+rp[1]].priceAuto = false;
  /* Room 1's type fills the other rooms whose type is empty (and keeps following while it's still that copy);
     a type typed in another room is that room's own */
  const rt = path.match(/^rooms\.(\d+)\.room_type$/);
  if (rt && +rt[1] === 0) state.rooms.slice(1).forEach(rm => { if (!rm.room_type || rm.typeAuto) { rm.room_type = el.value; rm.typeAuto = true; } });
  else if (rt) state.rooms[+rt[1]].typeAuto = !el.value;
  if (path === 'ps.auto') {
    const ps = state.ps;
    if (el.checked) {
      ps.markupManual = ps.markupRule;   /* given back if it is switched off before anything is calculated */
      /* start from what the form already has (No. of rooms is always typed by the user) */
      /* editing a booking: the supplier price is already known — Total supplier price is always taken from it (Σ room supplier prices) */
      const known = state.rooms.every(r => r.price !== '' && r.price != null);
      if (known && (mode === 'edit' || ps.autoSupplier === '')) ps.autoSupplier = fmtMoney(state.rooms.reduce((x, r) => x + Number(r.price), 0));
      /* editing: the client total is known too — Total client price starts as the booking's current client total (before this tick) */
      if (mode === 'edit' && ps.finalPrice !== '' && ps.finalPrice != null) ps.autoClient = fmtMoney(ps.finalPrice);
      /* …and so is the room count (a new booking still leaves No. of rooms blank for the user) */
      if (mode === 'edit') ps.autoRooms = String(state.rooms.length);
    } else if (ps.markupRule === '') ps.markupRule = ps.markupManual;
  }
  if ((path === 'ps.autoRooms' || path === 'ps.auto') && syncAutoRooms()) { renderRooms(); renderPolicies(); }
  if (path === 'ps.conversionRate' || path === 'ps.reverseRate') {
    const v = Number(el.value), other = path === 'ps.conversionRate' ? 'ps.reverseRate' : 'ps.conversionRate';
    set(other, el.value !== '' && v > 0 ? +(1 / v).toFixed(6) : '');   /* 6 dp, as shown — the maths and payload use this value */
  }
  /* switching the calculation off keeps the calculated client policies as an editable start */
  /* Full price is paired: the client and supplier policy in the same row are ticked / unticked together */
  const fp = path.match(/^(.*)\.(agent|supplier)\.(\d+)\.full$/);
  if (fp) { const other = get(`${fp[1]}.${fp[2] === 'agent' ? 'supplier' : 'agent'}`)[+fp[3]]; if (other) other.full = el.checked; }
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
document.addEventListener('keydown', e => {
  const calcLine = e.target.closest?.('.calc-mini.is-link[id^="rcc-"]');
  if (calcLine && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); explainRoom(+calcLine.id.slice(4)); }
  if (e.target.closest?.('.is-link[data-sum-calc]') && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); explainTotal(); }
  const polLine = e.target.closest?.('.calc-mini.is-link[data-pol-calc]');
  if (polLine && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); explainPolicy(polLine.dataset.polCalc); }
});
document.addEventListener('focusout', e => {
  const el = e.target;
  if (el.dataset && el.dataset.money !== undefined && el.value !== '') { el.value = fmtMoney(el.value); set(el.dataset.bind, el.value); refresh(); }
});
document.addEventListener('click', e => {
  /* only the round arrow button collapses / expands a section (not the whole header) */
  const arrow = e.target.closest('[data-toggle] .arrow'); if (arrow) { arrow.closest('.card').classList.toggle('closed'); return; }
  const cardPill = e.target.closest('[data-card-errs]');
  if (cardPill) {
    const card = cardPill.closest('.card'); card.classList.remove('closed');
    const first = errTargets().find(x => card.contains(x));
    if (first) { const list = errTargets(); lastErr = list[list.indexOf(first) - 1] || null; goToError(!!lastErr); return; }
    const key = CARD_SUMS[card.id].req().find(([bad]) => bad)?.[1] || '';   /* a field id, or a [data-bind] selector */
    const k0 = key.startsWith('[') ? document.querySelector(key) : document.getElementById(key);
    if (k0 && k0.matches('[data-room-errs]')) { k0.click(); return; }
    const f = k0 && (k0.closest('.field') || k0); if (!f) return;   /* a field, or e.g. "+ Add supplier policy" */
    if (f.matches('button')) { f.scrollIntoView({ block: 'center', behavior: 'smooth' }); f.focus({ preventScroll: true }); f.classList.remove('flash-err'); void f.offsetWidth; f.classList.add('flash-err'); return; }
    const ss = f.querySelector('.ss'), t = ss || f.querySelector('input:not([disabled]):not([type=hidden])') || f;
    t.scrollIntoView({ block: 'center', behavior: 'smooth' });
    if (!ss && t.focus) t.focus({ preventScroll: true });   /* dropdowns open on focus, so they only get the highlight */
    const ring = ss || t.closest('.ig') || t; ring.classList.remove('flash'); void ring.offsetWidth; ring.classList.add('flash');
    return;
  }
  const rt = e.target.closest('[data-room-toggle]');
  if (rt) { const r = state.rooms[+rt.dataset.roomToggle]; setRoomOpen(r, !roomOpen(r), true); return; }
  /* "2 to fix" on a closed room: open it and go to its first problem */
  const re = e.target.closest('[data-room-errs]');
  if (re) {
    const box = re.closest('.room'), first = errTargets().find(x => box.contains(x));
    setRoomOpen(state.rooms[+box.dataset.ri], true, true);
    if (first) { lastErr = null; const list = errTargets(); lastErr = list[list.indexOf(first) - 1] || null; goToError(!!lastErr); }
    else {
      /* before a save attempt: the room's first empty required field */
      const ri = +box.dataset.ri, r = state.rooms[ri], q = b => box.querySelector(`[data-bind="${b}"]`);
      const order = [[!r.room_type.trim(), q(`rooms.${ri}.room_type`)], [r.price === '', q(`rooms.${ri}.price`)],
        ...r.guests.flatMap((g, gi) => { const b = `rooms.${ri}.guests.${gi}`, id = `r${ri}-g${gi}`;
          return [[!g.title, selects[`ss-${id}-title`]?.input], [!String(g.first_name).trim(), q(`${b}.first_name`)], [!String(g.last_name).trim(), q(`${b}.last_name`)],
            [g.type === 'Child' && g.child_age === '', q(`${b}.child_age`)], [!!g.is_lead && !g.nationality, selects[`ss-${id}-nat`]?.input]]; })];
      const t = order.find(([bad, el]) => bad && el && !el.disabled)?.[1];
      if (t) {
        t.scrollIntoView({ block: 'center', behavior: 'smooth' });
        const ring = t.closest('.ss') || t.closest('.ig') || t;
        if (!t.closest('.ss')) t.focus({ preventScroll: true });   /* dropdowns open on focus, so they only get the highlight */
        ring.classList.remove('flash'); void ring.offsetWidth; ring.classList.add('flash');
      }
    }
    return;
  }
  const lk = e.target.closest('.ig.locked, .ss.locked, .sec-need');
  if (lk) {
    const p = lk.dataset.needPath, sel = { supplier_id: 'ss-supplier', customer_id: 'ss-customer', supplier_currency: 'ss-supCur', customer_currency: 'ss-custCur', 'ps.supplierCurrency': 'ss-supCur', 'ps.portalCurrency': 'ss-custCur', country_name: 'ss-country', platform: 'ss-platform', 'ps.markupType': 'ss-markup' }[p];
    const t = sel ? selects[sel].input : document.querySelector(`[data-bind="${p}"]`);
    if (t && !t.disabled) { reveal(t); t.scrollIntoView({ block: 'center', behavior: 'smooth' }); t.focus({ preventScroll: true }); t.classList.remove('flash'); void t.offsetWidth; t.classList.add('flash'); }
    return;
  }
  if (e.target.closest('#autoBarMsg.go')) {
    const t = document.querySelector('[data-action="add-room"]');
    t.scrollIntoView({ block: 'center', behavior: 'smooth' }); t.focus({ preventScroll: true });
    t.classList.remove('flash-err'); void t.offsetWidth; t.classList.add('flash-err');
    return;
  }
  const calcLine = e.target.closest('.calc-mini.is-link[id^="rcc-"]');
  if (calcLine) { e.preventDefault(); explainRoom(+calcLine.id.slice(4)); return; }
  if (e.target.closest('.is-link[data-sum-calc]')) { e.preventDefault(); explainTotal(); return; }
  const polLine = e.target.closest('.calc-mini.is-link[data-pol-calc]');
  if (polLine) { e.preventDefault(); explainPolicy(polLine.dataset.polCalc); return; }
  const sg = e.target.closest('[data-tz-sign]'); if (sg) { state.tz.sign = sg.dataset.tzSign; refresh(); return; }
  const b = e.target.closest('[data-action]'); if (!b) return;
  const a = b.dataset.action, i = +b.dataset.i, room = state.rooms[+b.dataset.room];
  if (a === 'next-error') { goToError(true); return; }
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
  if (a === 'recalc') {
    /* back to the system values: rooms follow the count, prices split equally again */
    if (syncAutoRooms()) { renderRooms(); renderPolicies(); }
    state.rooms.forEach(r => { r.priceAuto = true; });
    refresh(); toast('Room prices recalculated'); return;
  }
  if (a === 'add-room') {
    state.rooms.forEach(r => { const u = roomUi.get(r); if (u && u.open && !u.user) roomUi.set(r, { open: false, user: false }); });
    const r = newRoom(); state.rooms.push(r); roomUi.set(r, { open: true, user: false });
    renderRooms(); renderPolicies();
  }
  if (a === 'rm-room') { state.rooms.splice(i, 1); renderRooms(); renderPolicies(); }
  if (a === 'add-policy') {
    const list = get(b.dataset.scope)[b.dataset.kind], from = plusOneSec(list.at(-1)?.toDate);
    const pair = get(b.dataset.scope)[b.dataset.kind === 'agent' ? 'supplier' : 'agent'][list.length];   /* same row on the other side */
    list.push({ fromDate: from, fromAuto: !!from, toDate: '', cancellationPrice: '', full: !!(pair && pair.full) });
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
    document.getElementById('payloadJson').textContent = JSON.stringify(buildPayload(), null, 2);
    lastErr = null; goToError(false);
    return;
  }
  refresh();
});

/* section arrows say whether their section is open (screen readers), however it was opened or closed */
const syncCardArrow = card => card.querySelector(':scope > .card-header .arrow')?.setAttribute('aria-expanded', String(!card.classList.contains('closed')));
document.querySelectorAll('.adm-wrap .card').forEach(card => {
  syncCardArrow(card);
  new MutationObserver(() => syncCardArrow(card)).observe(card, { attributes: true, attributeFilter: ['class'] });
});

/* required markers on static fields */
document.querySelectorAll('[data-required]').forEach(el => { const l = el.closest('.field')?.querySelector('label.lbl'); if (l) l.classList.add('req'); });

/* remarks on an edit: read-only, as written */
let savedRemark = '';
function showRemarksRo() {
  const ro = document.getElementById('remarksRo'), v = String(state.remarks || '').trim();
  ro.textContent = v || 'No remarks'; ro.classList.toggle('is-empty', !v);
}
/* prototype: preview the edit with its remark or as if none was written (in memory only, never saved) */
document.getElementById('protoRemarks').addEventListener('click', e => {
  const b = e.target.closest('[data-proto-rm]'); if (!b) return;
  state.remarks = b.dataset.protoRm === 'with' ? savedRemark : '';
  document.querySelectorAll('[data-proto-rm]').forEach(x => x.classList.toggle('on', x === b));
  showRemarksRo(); refresh();
  /* take the user to what changed: Remarks, opened, with a short highlight */
  const card = document.getElementById('remarksCard'); card.classList.remove('closed');
  card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const ro = document.getElementById('remarksRo'); ro.classList.remove('flash'); void ro.offsetWidth; ro.classList.add('flash');
});

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
  document.getElementById('txnHint').textContent = m === 'edit' ? state.unique_trans_id : '';   /* the ": " comes from CSS, so only the ID is coloured */
  document.getElementById('saveBtn').textContent = m === 'edit' ? 'Save changes' : 'Create booking';
  document.querySelectorAll('.is-invalid').forEach(x => x.classList.remove('is-invalid', 'is-empty'));
  setCities(); setCustomers(); setMarkets(); loadSuppliers();
  if (m !== 'edit') roomUi.set(state.rooms[0], { open: true, user: false });
  /* remarks can only be written when the booking is created: an edit shows them read-only */
  const rmTa = document.querySelector('[data-bind="remarks"]');
  rmTa.hidden = m === 'edit'; document.getElementById('remarksRo').hidden = m !== 'edit';
  savedRemark = state.remarks || '';
  document.getElementById('protoRemarks').hidden = m !== 'edit' || !String(savedRemark).trim();
  document.querySelectorAll('[data-proto-rm]').forEach(b => b.classList.toggle('on', b.dataset.protoRm === 'with'));
  showRemarksRo();   /* a new booking: its empty room is open to fill in */
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
}, 'Search or select supplier', { groups: [['*', 'Suppliers']], addOther: true, noun: 'supplier', onAdd: name => openApiDrawer(name) });
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
/* ---------- "Other — add offline supplier" → the shared supplier drawer (js/api-drawer.js) ----------
   Same drawer as Offline Supplier List (minus Active: always Active here). The supplier is saved to the shared list
   (so it shows on Offline Supplier List) and selected here. */
const toast = msg => { const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2600); };
function openApiDrawer(name) {
  ApiDrawer.open({
    offline: true, quick: true, name,
    onSaved: api => {
      loadSuppliers();
      const it = SUPPLIERS.find(x => x.id === api.id);
      state.supplier_id = api.id; state.ps.supplier = api.name;
      state.supplier_currency = supCurrencyOf(it); syncFrom('supplier_currency');
      refresh();
      toast(`${api.name} added to Offline Supplier List`);
    },
  });
}
/* the list changed in another tab (e.g. Offline Supplier List) */
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
/* prototype: the two notes open in a new tab; their "Back to the form" returns to this booking */
document.querySelectorAll('[data-proto-note]').forEach(l => {
  l.href = `booking-form-notes.html?doc=${l.dataset.protoNote}&from=${encodeURIComponent(location.pathname.split('/').pop() + location.search)}`;
});
