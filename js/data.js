/* Shared prototype data for every redesigned page, kept in the browser (localStorage) so changes made on one
   page show on the others and survive a reload — same model as the Map-UI project (js/data.js + js/app.js there).
   Dummy data only. Needs js/history-legacy.js (the seed's old-system history) loaded before this file.

   RefData              read-only master lists: currencies, portals, users, partners, markets, countries, meals, hotels, roomTypes
   HotelApis.list       the hotel API list (Supplier List page; booking form › Supplier)
   HotelApis.label(api)  a supplier as dropdowns list it ("Name - SHORT")
   HotelApis.CURRENCIES currencies an API can have
   HotelApis.save()     write the list after any change (create, edit, make permanent)
   HotelApis.nextId()   id for a new API
   Bookings.list        manual hotel bookings (All Booking list; the booking form creates + edits them). API bookings
                        come from the suppliers, so the prototype can't show them: only manual bookings are listed.
   Bookings.get(id) / Bookings.upsert(rec)   read one / add or replace one (saves)
   AdminData.reset()    clear everything saved and go back to the seed data */
(function () {
  const PREFIX = 'admin-redesign:';
  const load = key => {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      // history timestamps are stored as strings: revive them into Dates
      return raw ? JSON.parse(raw, (k, v) => (k === 'at' && typeof v === 'string' ? new Date(v) : v)) : null;
    } catch (e) { console.warn('Could not load saved data:', e); return null; }
  };
  const save = (key, value) => {
    try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch (e) { console.warn('Could not save data:', e); }
  };
  const reset = () => {
    try { Object.keys(localStorage).filter(k => k.startsWith(PREFIX)).forEach(k => localStorage.removeItem(k)); } catch (e) { /* storage blocked */ }
  };

  /* ---------- reference data (read-only master lists every page uses; never copy them into a page) ---------- */
  const RefData = {
    // the system's currencies (an API and a market each have one of these)
    currencies: ['AED', 'BDT', 'EUR', 'GBP', 'IDR', 'INR', 'MVR', 'MYR', 'NPR', 'SGD', 'THB', 'USD'],
    portals: ['B2B', 'B2C', 'B2C APP', 'API'],
    // admin users (history "by" + email)
    users: [
      { name: 'Super Admin', email: 'superadmin@mynztrip.com' },
      { name: 'Ops Team', email: 'ops@mynztrip.com' },
      { name: 'Rahim Uddin', email: 'rahim@mynztrip.com' },
    ],
    // B2B agents = the portal's Partners (Partner Management > Partner List): code = partner code, slNo = "Agent SL No." in the logs
    partners: [
      { id: 1021, code: 'BDP118', slNo: '26040001', name: 'Skyline Travels', enabled: true },
      { id: 1034, code: 'MYP117', slNo: '26100506', name: 'Bluewave Holidays', enabled: true },
      { id: 1047, code: 'BDP116', slNo: '25100137', name: 'Northstar Tours', enabled: true },
      { id: 1052, code: 'INP115', slNo: '26020044', name: 'Green Leaf Travel', enabled: true },
      { id: 1068, code: 'SGP114', slNo: '26070199', name: 'Coral Bay Trips', enabled: true },
      { id: 1075, code: 'BDP113', slNo: '25090321', name: 'Sunrise Journeys', enabled: false },
    ],
    // customer (source) markets, each with its currency; listed as "NAME (CUR)"
    markets: [
      { id: 11, name: 'Malaysia', currency: 'MYR' }, { id: 12, name: 'Malaysia Corporate', currency: 'MYR' },
      { id: 21, name: 'Bangladesh', currency: 'BDT' }, { id: 31, name: 'Indonesia', currency: 'IDR' },
      { id: 41, name: 'India', currency: 'INR' }, { id: 51, name: 'Global', currency: 'USD' },
      { id: 61, name: 'Maldives', currency: 'MVR' }, { id: 71, name: 'Europe', currency: 'EUR' },
      { id: 81, name: 'Nepal', currency: 'NPR' }, { id: 91, name: 'Portugal', currency: 'EUR' },
      { id: 101, name: 'Singapore', currency: 'SGD' }, { id: 111, name: 'Thailand', currency: 'THB' },
      { id: 121, name: 'United Arab Emirates', currency: 'AED' }, { id: 131, name: 'United States', currency: 'USD' },
    ],
    // countries: ISO code, dial code, and the cities we have for the ones hotels are in
    countries: [
      { name: 'Australia', code: 'AU', dial: '+61' },
      { name: 'Bangladesh', code: 'BD', dial: '+880', cities: ['Chattogram', "Cox's Bazar", 'Dhaka', 'Sylhet'] },
      { name: 'China', code: 'CN', dial: '+86' },
      { name: 'India', code: 'IN', dial: '+91' },
      { name: 'Indonesia', code: 'ID', dial: '+62', cities: ['Bali', 'Bandung', 'Jakarta', 'Yogyakarta'] },
      { name: 'Japan', code: 'JP', dial: '+81' },
      { name: 'Malaysia', code: 'MY', dial: '+60', cities: ['George Town', 'Johor Bahru', 'Kota Kinabalu', 'Kuala Lumpur', 'Langkawi', 'Melaka'] },
      { name: 'Pakistan', code: 'PK', dial: '+92' },
      { name: 'Philippines', code: 'PH', dial: '+63' },
      { name: 'Saudi Arabia', code: 'SA', dial: '+966', cities: ['Jeddah', 'Madinah', 'Makkah', 'Riyadh'] },
      { name: 'Singapore', code: 'SG', dial: '+65', cities: ['Singapore'] },
      { name: 'Sri Lanka', code: 'LK', dial: '+94' },
      { name: 'Thailand', code: 'TH', dial: '+66', cities: ['Bangkok', 'Chiang Mai', 'Pattaya', 'Phuket'] },
      { name: 'United Arab Emirates', code: 'AE', dial: '+971', cities: ['Abu Dhabi', 'Dubai', 'Sharjah'] },
      { name: 'United Kingdom', code: 'GB', dial: '+44', cities: ['Edinburgh', 'London', 'Manchester'] },
      { name: 'United States', code: 'US', dial: '+1' },
    ],
    // meals: [name, code]
    meals: [['Breakfast', 'BB'], ['Room Only', 'RO'], ['Half Board', 'HB'], ['Full Board', 'FB'], ['All Inclusive', 'AI'], ['Breakfast Lunch', 'BL'],
      ['Breakfast Dinner', 'BD'], ['Lunch Only', 'LO'], ['Dinner Only', 'DO'], ['Lunch Dinner', 'LD'], ['Lunch Or Dinner', 'LOD'], ['All Inclusive Soft', 'AI'],
      ['Ultra All Inclusive', 'AI'], ['Premium All Inclusive', 'AI'], ['Super All Inclusive', 'AI'], ['Half Board Plus', 'HB'], ['Full Board Plus', 'FB'],
      ['Self Catering', 'SC'], ['Iftar', 'IR'], ['Suhur', 'SR'], ['Iftar And Suhur', 'IS'], ['Iftar Or Suhur', 'IOS']],
    hotels: ['Harbour View Hostel', 'Lagoon Bay Resort', 'Old Town Boutique Hotel', 'Riverside Suites', 'Palm Grove Inn', 'Skyline City Hotel', 'Garden Court Hotel', 'Seabreeze Residence'],
    roomTypes: ['Dormitory - Female Only', 'Deluxe Double Room', 'Superior Twin Room', 'Family Suite'],
  };
  RefData.userEmail = name => (RefData.users.find(u => u.name === name) || {}).email || '';
  RefData.mealName = code => (RefData.meals.find(m => m[1] === code) || [code])[0];
  // a market as every dropdown lists it: "Malaysia (MYR)"
  RefData.marketLabel = m => `${m.name} (${m.currency})`;
  window.RefData = RefData;

  /* ---------- hotel APIs: seed ---------- */
  function seedHotelApis() {
    // one currency per API (a supplier can't have "ALL")
    const CURRENCIES = RefData.currencies;

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
      ['Manual Contracts', 'MANUAL', '11', 'MAN', 'MYR', 1, 0, 0, 0, 1],
      ['Bonotel', 'BONOTEL', '12', 'BNT', 'USD', 0, 0, 1, 0, 0],
    ];
    let seq = 1;
    const apis = SEED.map(r => ({
      id: seq++, name: r[0], code: r[1], ref: r[2], short: r[3], currency: r[4],
      active: !!r[5], b2c: !!r[7], hold: !!r[9], holdType: null, holdAmount: null, history: [],
    }));
    // hold amount for the APIs that allow hold booking: [type, amount]
    const HOLD = { TBOHOL: ['percent', '20'], RATEHAWK: ['fixed', '50'], JUNIPER: ['percent', '10'], MANUAL: ['fixed', '100'] };
    apis.forEach(a => { if (HOLD[a.code]) [a.holdType, a.holdAmount] = HOLD[a.code]; });
    // temporary suppliers (can be made permanent; one-way)
    const TEMP = ['JUNIPER', 'TRAVCO', 'BONOTEL'];
    // a temporary API has only the fields asked when adding one (js/api-drawer.js TEMP_SKIP stay empty)
    apis.forEach(a => { a.temporary = TEMP.includes(a.code); if (a.temporary) Object.assign(a, { ref: '', short: '', active: true, b2c: true }); });

    // dummy history: a created entry + a couple of edits (changes: [field, old, new])
    const U = RefData.users.map(u => u.name), editors = [U[0], U[1], U[0]];
    apis.forEach((a, i) => {
      const d = new Date(2026, 9, 2 + i, 10, 15);
      // APIs created before the new history have old-system rows instead of a Create entry (added below)
      // (temporary suppliers are newer: created from the booking form, so a Create entry and no old-system rows)
      a.legacy = !a.temporary && i % 4 !== 3;
      if (!a.legacy) a.history.push({ by: 'Super Admin', at: d, created: true });
      // a temporary supplier only has its form's fields, so its edits never touch Active / Allow B2C
      if (i % 3 !== 2) a.history.unshift({ by: editors[i % 3], at: new Date(2026, 10, 3 + i, 14, 4), changes: [['currency', a.currency === 'USD' ? 'EUR' : 'USD', a.currency]].concat(a.temporary ? [] : [['b2c', !a.b2c, a.b2c]]) });
      if (i % 2 === 0 && !a.temporary) a.history.unshift({ by: 'Super Admin', at: new Date(2026, 10, 12, 14, 38), changes: [['active', !a.active, a.active]] });
    });

    /* dummy legacy history (old system): one row per save = the full record AFTER that save, newest first, no create row.
       It ends at the state before the API's first current entry; HistoryLegacy.toEntries (js/history-legacy.js) turns it
       into normal Edit / Status Change entries that continue the timeline. "def" stands for the removed Default field:
       a save that only changed it shows nothing. */
    const LEGACY_KEYS = ['name', 'code', 'ref', 'short', 'currency', 'active', 'b2c', 'hold', 'holdType', 'holdAmount', 'temporary'];
    const LEGACY_BY = U;
    apis.forEach(a => {
      if (!a.legacy) return;
      const v = { def: false }; LEGACY_KEYS.forEach(k => v[k] = a[k]);
      a.history.forEach(h => (h.changes || []).forEach(([f, o]) => { v[f] = o; })); // state before the current entries
      const steps = [ // each step = what the save before changed (walking back in time)
        s => { s.active = !s.active; },
        s => { s.def = !s.def; },                                       // only the removed Default field → no entry
        s => { s.currency = s.currency === 'USD' ? 'MYR' : 'USD'; },
        s => { s.code = s.code + 'TEST'; s.b2c = !s.b2c; },        // codes are capitals and digits only
        s => { s.active = !s.active; },
      ];
      const n = 3 + (a.id % 3), rows = [];
      let s = { ...v };
      for (let k = 0; k < n; k++) {
        const values = { ...s };
        if (k === n - 1) delete values.temporary; // older old-system rows don't have it
        rows.push({ by: LEGACY_BY[(a.id + k) % 3], at: new Date(2026, 8 - k, 26 - (a.id + k * 3) % 20, 9 + k, 10 + a.id * 3, 52 - k * 7), values });
        s = { ...s }; steps[(a.id + k) % steps.length](s);
      }
      a.history.push(...HistoryLegacy.toEntries(rows, LEGACY_KEYS));
    });
    return { CURRENCIES, apis };
  }
  const seeded = seedHotelApis();
  const apis = load('hotelApis') || seeded.apis;
  window.HotelApis = {
    CURRENCIES: seeded.CURRENCIES,
    list: apis,
    // a supplier as every dropdown lists it: "Name - SHORT" (name only while it has no short code)
    label: a => a.short ? `${a.name} - ${a.short}` : a.name,
    save: () => save('hotelApis', apis),
    nextId: () => apis.reduce((m, x) => Math.max(m, x.id), 0) + 1,
    // another tab changed the list: replace ours in place (same array, so pages keep their reference)
    onChange(fn) {
      window.addEventListener('storage', e => {
        if (e.key !== PREFIX + 'hotelApis') return;
        const fresh = load('hotelApis') || seedHotelApis().apis;
        apis.splice(0, apis.length, ...fresh); fn();
      });
    },
  };
  /* ---------- manual hotel bookings ----------
     A record = { id, txn, createdAt, createdBy, updatedAt, updatedBy, payment, state }: state is the booking form's state as
     saved (incl. its calculated prices), so the form reopens it as-is and the list reads its columns from it. */
  function seedBookings() {
    const pol = (agentTo, agentFee, supTo, supFee) => ({
      essentialInformation: 'In Case Of Early Exit Or No Show 100% Of The Fee Shall Be Applicable',
      agent: [{ fromDate: '2026-10-12T11:59:59', toDate: agentTo, cancellationPrice: 0 }, { fromDate: agentTo.replace(/58$/, '59'), toDate: '', cancellationPrice: agentFee }],
      supplier: [{ fromDate: '2026-10-12T00:00:00', toDate: supTo, cancellationPrice: 0 }, { fromDate: supTo, toDate: '', cancellationPrice: supFee }],
    });
    const guest = (title, first, last, nat, extra) => ({ title, first_name: first, last_name: last, type: 'Adult', child_age: '', gender: title === 'Mr' ? 'Male' : 'Female', nationality: nat, is_lead: false, ...extra });
    const room = (type, price, conv, mk, guests) => ({ room_type: type, price, _conv: conv, _mk: mk, _cust: Math.round((conv + mk) * 100) / 100, guests, cancellation: { essentialInformation: '', agent: [], supplier: [] } });
    const base = { onePolicy: true, tz: { mode: 'Local', sign: '+', hours: '', mins: '00' }, special_request: '', contracting_comment: '', hotel_phone_number: '', hcn: '' };
    return [
      { id: 1, txn: 'NZH100000000012345', createdAt: '2026-10-12T11:30:00', createdBy: 'Ops Team', payment: 'Fully Paid', state: { ...base,
        supplier_id: 1, supplier_currency: 'USD', platform: 'B2B', customer_id: 1034, customer_currency: 'MYR', market_id: 11,
        hotel_name: 'Palm Grove Inn', address: '12 Jalan Example, Bukit Bintang', country_name: 'Malaysia', city: 'Kuala Lumpur',
        hotel_phone_number: '+60 3 1234 5678', hcn: 'HCN-88213',
        booking_date: '2026-10-12T11:30', cancellation_deadline_date: '2027-02-16T11:59', check_in: '2027-02-20', check_out: '2027-02-23',
        star_rating: 4, status: 'CONFIRMED', lead_pax_name: 'Jane Sample',
        guest_email: 'jane.sample@example.com', contact_dial: '+44', contact_mobile: '7700900123', meal: 'Room Only',
        rooms: [room('Superior Twin Room', 138, 556.8, 55.68, [
          guest('Ms', 'Jane', 'Sample', 'United Kingdom', { is_lead: true }),
          guest('Mr', 'Tom', 'Sample', 'United Kingdom', { type: 'Child', child_age: 8 }),
        ])],
        reference_no: 'TBO-5521907',
        ps: { supplier: 'TBO Holidays', supplierCurrency: 'USD', supplierPrice: 138, portalCurrency: 'MYR', conversionRate: 4.034783, reverseRate: 0.247844, convertedPrice: 556.8, markupType: 'Percent', markupRule: 10, markupAmount: 55.68, noOfRooms: 1, finalPrice: 612.48, issue: '' },
        contracting_comment: '<p><strong>Breakfast not included.</strong></p><ul><li>Early check-in subject to availability.</li><li>Late check-out on request.</li></ul>', special_request: 'High floor, quiet room.',
        cancellation_all: pol('2027-02-16T11:59:58', 612.48, '2027-02-18T00:00:00', 138),
      } },
      { id: 2, txn: 'NZH100000000012388', createdAt: '2026-11-18T15:05:00', createdBy: 'Rahim Uddin', payment: 'Unpaid', state: { ...base,
        supplier_id: 2, supplier_currency: 'MYR', platform: 'B2B', customer_id: 1021, customer_currency: 'BDT', market_id: 21,
        hotel_name: 'Lagoon Bay Resort', address: 'Pantai Cenang', country_name: 'Malaysia', city: 'Langkawi',
        booking_date: '2026-11-18T15:00', cancellation_deadline_date: '2026-12-20T23:59', check_in: '2026-12-24', check_out: '2026-12-28',
        star_rating: 5, status: 'CONFIRMED', lead_pax_name: 'Karim Ahmed',
        guest_email: 'karim.ahmed@example.com', contact_dial: '+880', contact_mobile: '1711000222', meal: 'Breakfast',
        rooms: [room('Deluxe Double Room', 420, 11130, 500, [
          guest('Mr', 'Karim', 'Ahmed', 'Bangladesh', { is_lead: true }), guest('Mrs', 'Nusrat', 'Ahmed', 'Bangladesh'),
        ])],
        reference_no: 'DIDA-77810',
        ps: { supplier: 'Dida', supplierCurrency: 'MYR', supplierPrice: 420, portalCurrency: 'BDT', conversionRate: 26.5, reverseRate: 0.037736, convertedPrice: 11130, markupType: 'Fixed', markupRule: 500, markupAmount: 500, noOfRooms: 1, finalPrice: 11630, issue: '' },
        cancellation_all: pol('2026-12-20T23:59:58', 11630, '2026-12-21T00:00:00', 420),
      } },
      { id: 3, txn: 'NZH100000000012402', createdAt: '2026-11-20T10:42:00', createdBy: 'Super Admin', updatedAt: '2026-11-21T09:15:00', updatedBy: 'Ops Team', payment: 'Refunded', state: { ...base,
        supplier_id: 9, supplier_currency: 'EUR', platform: 'B2B', customer_id: 1052, customer_currency: 'INR', market_id: 41,
        hotel_name: 'Old Town Boutique Hotel', address: '5 Royal Mile', country_name: 'United Kingdom', city: 'Edinburgh',
        booking_date: '2026-11-20T10:40', cancellation_deadline_date: '2027-01-05T23:59', check_in: '2027-01-10', check_out: '2027-01-13',
        star_rating: 3, status: 'CANCELLED', lead_pax_name: 'Arjun Mehta',
        guest_email: 'arjun.mehta@example.com', contact_dial: '+91', contact_mobile: '9820012345', meal: 'Half Board',
        rooms: [
          room('Superior Twin Room', 150, 14580, 1166.4, [guest('Mr', 'Arjun', 'Mehta', 'India', { is_lead: true }), guest('Mr', 'Rohan', 'Mehta', 'India')]),
          room('Superior Twin Room', 150, 14580, 1166.4, [guest('Ms', 'Priya', 'Mehta', 'India'), guest('Ms', 'Anika', 'Mehta', 'India', { type: 'Child', child_age: 10 })]),
        ],
        reference_no: 'JNP-30071',
        ps: { supplier: 'Juniper', supplierCurrency: 'EUR', supplierPrice: 300, portalCurrency: 'INR', conversionRate: 97.2, reverseRate: 0.010288, convertedPrice: 29160, markupType: 'Percent', markupRule: 8, markupAmount: 2332.8, noOfRooms: 2, finalPrice: 31492.8, issue: '' },
        cancellation_all: pol('2027-01-05T23:59:58', 31492.8, '2027-01-06T00:00:00', 300),
      } },
      // made today (dates relative to the day the demo data is first loaded), so All Booking's default "today" list has a row
      (() => {
        const d = n => { const x = new Date(); x.setDate(x.getDate() + n); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
        return { id: 4, txn: 'NZH100000000012419', createdAt: `${d(0)}T09:20:00`, createdBy: 'Ops Team', payment: 'Fully Paid', state: { ...base,
          supplier_id: 5, supplier_currency: 'EUR', platform: 'B2B', customer_id: 1068, customer_currency: 'SGD', market_id: 101,
          hotel_name: 'Seabreeze Residence', address: '88 Sentosa Gateway', country_name: 'Singapore', city: 'Singapore',
          booking_date: `${d(0)}T09:15`, cancellation_deadline_date: `${d(25)}T23:59`, check_in: d(30), check_out: d(33),
          star_rating: 4, status: 'CONFIRMED', lead_pax_name: 'Wei Ling Tan',
          guest_email: 'weiling.tan@example.com', contact_dial: '+65', contact_mobile: '81234567', meal: 'Breakfast', hcn: 'HCN-55120',
          rooms: [room('Family Suite', 260, 377, 37.7, [
            guest('Ms', 'Wei Ling', 'Tan', 'Singapore', { is_lead: true }), guest('Mr', 'Jun', 'Tan', 'Singapore'),
          ])],
          reference_no: 'HB-118204',
          ps: { supplier: 'Hotelbeds', supplierCurrency: 'EUR', supplierPrice: 260, portalCurrency: 'SGD', conversionRate: 1.45, reverseRate: 0.689655, convertedPrice: 377, markupType: 'Percent', markupRule: 10, markupAmount: 37.7, noOfRooms: 1, finalPrice: 414.7, issue: '' },
          cancellation_all: pol(`${d(25)}T23:59:58`, 414.7, `${d(26)}T00:00:00`, 260),
        } };
      })(),
    ];
  }
  const bookings = load('hotelBookings') || seedBookings();
  window.Bookings = {
    list: bookings,
    get: id => bookings.find(b => b.id === Number(id)) || null,
    // add a new booking (gets an id + transaction id, goes to the top) or replace the one with the same id; saves
    upsert(rec) {
      const i = bookings.findIndex(b => b.id === rec.id);
      if (i >= 0) bookings[i] = rec;
      else {
        rec.id = bookings.reduce((m, b) => Math.max(m, b.id), 0) + 1;
        const last = bookings.reduce((m, b) => Math.max(m, Number(b.txn.slice(3))), 0);
        rec.txn = 'NZH' + (last + 1 + Math.floor(Math.random() * 40));
        bookings.unshift(rec);
      }
      save('hotelBookings', bookings);
      return rec;
    },
  };
  window.AdminData = { reset, load, save };
})();
