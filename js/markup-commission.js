/* Default Markup (Hotel) page prototype. Dummy data only. */
(function () {
  // markets: shared list (js/data.js RefData), listed as "NAME (CUR)". Rules store market ids.
  const MARKETS = RefData.markets.map(m => ({ id: m.id, name: m.name, cur: m.currency }));
  // the seed below names markets by short keys for readability: their ids
  const SEED_MK = { bd: 21, in: 41, id: 31, my: 11, mv: 61, np: 81, pt: 91, sg: 101, th: 111, ae: 121, us: 131 };
  const mk = keys => keys.map(k => SEED_MK[k]);
  const MK = Object.fromEntries(MARKETS.map(m => [m.id, m]));
  // suppliers = the shared hotel API list (js/data.js, same as Supplier List), permanent APIs only — temporary suppliers are
  // only offered in the booking form. A rule stores API ids; names are looked up for display, so a rename on Supplier List shows here.
  const APIS = HotelApis.list.filter(a => !a.temporary).sort((a, b) => a.name.localeCompare(b.name));
  const API_NAME = Object.fromEntries(HotelApis.list.map(a => [a.id, a.name]));
  const apiNm = id => API_NAME[id] || `Supplier #${id}`;
  // the seed below is written with the seed API names for readability: turned into their ids (js/data.js seed) here,
  // so a later rename on Supplier List doesn't break it
  const SEED_API_ID = { 'TBO Holidays': 1, Dida: 2, RateHawk: 3, WhitinEarth: 4, Hotelbeds: 5, WebBeds: 6 };
  const apiId = name => SEED_API_ID[name];
  // B2B agents = the portal's Partners: shared list (js/data.js RefData). Disabled partners can't be picked for a new rule.
  const AGENTS = RefData.partners;
  const SEED_AG = { a1: 1021, a2: 1034, a3: 1047, a4: 1052, a5: 1068, a6: 1075 };   // seed keys → partner ids
  const AG = Object.fromEntries(AGENTS.map(a => [a.id, a]));
  const ALL = '*'; // api = ['*'] -> All suppliers (client-specific rules only). Otherwise api = the picked API ids.
  // Portals that can have their own markup. Only B2B for now; its clients are the B2B partners.
  // A rule with portal = null applies to all portals (today's default markup) and has no client.
  const PORTALS = [{ id: 'b2b', name: 'B2B', clients: 'B2B clients' }];
  const PT = Object.fromEntries(PORTALS.map(p => [p.id, p]));

  // markets, api, type, amount, active
  const SEED = [
    [['bd'], 'WhitinEarth', 'fixed', '1000', 1],
    [['bd', 'my'], 'TBO Holidays', 'fixed', '1000', 0],
    [['us'], ['Hotelbeds', 'WebBeds'], 'percent', '1', 1],
    [['us', 'my'], 'Hotelbeds', 'percent', '2', 1], // both roles: partly blocked by the rule above (US), overrides the older Hotelbeds · Malaysia rule below
    [['ae'], 'WebBeds', 'fixed', '5', 0],
    [['np'], 'Dida', 'percent', '5', 0],
    [['us'], 'RateHawk', 'percent', '12', 0],
    [['us'], 'RateHawk', 'fixed', '1', 0],
    [['pt', 'ae'], 'WhitinEarth', 'percent', '6.5', 1],
    [['my'], 'Dida', 'fixed', '1000', 1],
    [['mv', 'my', 'us', 'in', 'id', 'np', 'pt'], 'RateHawk', 'fixed', '10', 1],
    [['th', 'sg'], 'RateHawk', 'fixed', '1000', 1],
    [['bd'], 'Dida', 'percent', '5', 1],
    [['in'], 'Dida', 'percent', '4', 1],
    [['bd', 'in'], 'Dida', 'percent', '3', 1], // two newer rules (Dida · Bangladesh, Dida · India) together cover all of it → "Blocked · 2 rules"
    [['th'], 'RateHawk', 'percent', '2', 1], // covered by the newer RateHawk · Thailand + Singapore rule → "Blocked #ID"
    [['sg'], 'RateHawk', 'percent', '1.5', 1], // also covered by it → that rule "Overrides · 2 rules"
    [['bd'], 'RateHawk', 'percent', '5', 0],
    [['us'], 'WhitinEarth', 'percent', '4', 0],
    [['my'], 'Hotelbeds', 'fixed', '300', 1], // covered by the newer Hotelbeds · US + Malaysia rule → "Blocked #ID"
  ];
  let nextId = 1;
  // portal rules: portal, client (null = all clients of that portal), markets, api, type, amount, active
  const PORTAL_SEED = [
    ['b2b', 'a1', ['bd', 'in', 'id', 'my', 'mv', 'np', 'pt', 'sg', 'th', 'ae', 'us'], ['Dida', 'Hotelbeds', 'RateHawk', 'TBO Holidays', 'WebBeds', 'WhitinEarth'], 'percent', '0', 1],
    ['b2b', 'a1', [], ALL, 'percent', '3', 1],
    ['b2b', 'a2', ['bd'], ['RateHawk', 'Dida', 'Hotelbeds', 'WebBeds'], 'percent', '2', 1],
    ['b2b', 'a3', [], 'Dida', 'fixed', '500', 1],
    ['b2b', 'a1', ['my', 'sg'], 'Hotelbeds', 'percent', '1.5', 0],
    ['b2b', 'a6', [], 'WebBeds', 'percent', '2.5', 1],
    ['b2b', null, ['bd'], 'Dida', 'percent', '4', 1],
  ];
  const arr = a => Array.isArray(a) ? a : [a];
  const toApiIds = a => arr(a).map(n => n === ALL ? ALL : apiId(n));
  const seedRules = PORTAL_SEED.map(r => ({ id: nextId++, portal: r[0], agent: r[1] ? SEED_AG[r[1]] : null, markets: mk(r[2]), api: toApiIds(r[3]), type: r[4], amount: r[5], active: !!r[6], history: [] }))
    .concat(SEED.map(r => ({ id: nextId++, portal: null, agent: null, markets: mk(r[0]), api: toApiIds(r[1]), type: r[2], amount: r[3], active: !!r[4], history: [] })));
  // dummy IDs like the API's: newest rule (listed first) has the highest ID, not 1..N, so ID and # differ
  seedRules.forEach((r, i) => { r.id = 1180 - i * 7; });

  // dummy history: created + a couple of edits (changes: [field, old, new])
  seedRules.forEach((r, i) => {
    // all-portal rules created before the new history have old-system rows instead of a Create entry (added below)
    r.legacy = !r.portal && r.api.length === 1 && i % 5 !== 2;
    if (!r.legacy) r.history.push({ by: 'Super Admin', at: new Date(2026, 7, 10 + i, 11, 20), created: true });
    if (i % 3 === 0) r.history.unshift({ by: 'Ops Team', at: new Date(2026, 9, 3 + i, 15, 6), changes: [['amount', String(+r.amount + 2), r.amount]] });
    if (i % 4 === 1) r.history.unshift({ by: 'Super Admin', at: new Date(2026, 10, 2 + i, 10, 41), changes: [['active', !r.active, r.active]] });
    if (i === 9) r.history.unshift({ by: 'Ops Team', at: new Date(2026, 10, 14, 9, 12), changes: [['markets', mk(['mv', 'my', 'us', 'in']), r.markets], ['type', r.type === 'percent' ? 'fixed' : 'percent', r.type]] });
  });

  /* dummy legacy history (old system): one row per save = the full rule AFTER that save, newest first, no create row.
     Old rules are all-portal rules with one supplier. It ends at the state before the rule's first current entry;
     HistoryLegacy.toEntries (js/history-legacy.js) turns it into normal Edit / Status Change entries. "commission" stands for
     the dropped commission fields: a save that only changed them shows nothing. */
  const LEGACY_KEYS = ['markets', 'api', 'type', 'amount', 'active'];
  const LEGACY_BY = RefData.users.map(u => u.name);
  seedRules.forEach(r => {
    if (!r.legacy) return;
    const v = { commission: null }; LEGACY_KEYS.forEach(k => v[k] = r[k]);
    r.history.forEach(h => (h.changes || []).forEach(([f, o]) => { v[f] = o; })); // state before the current entries
    const steps = [
      s => { s.amount = String(+s.amount + (s.type === 'percent' ? 2 : 100)); },
      s => { s.type = s.type === 'percent' ? 'fixed' : 'percent'; s.amount = s.type === 'percent' ? '5' : '500'; },
      s => { s.active = !s.active; },
      s => { s.commission = '0.00'; },                                  // only commission → no entry
      s => { s.markets = s.markets.length > 1 ? s.markets.slice(1) : s.markets.concat(s.markets[0] === SEED_MK.in ? SEED_MK.np : SEED_MK.in); },
    ];
    const n = 3 + (r.id % 3), rows = [];
    let s = { ...v };
    for (let k = 0; k < n; k++) {
      rows.push({ by: LEGACY_BY[(r.id + k) % 3], at: new Date(2026, 6 - k, 24 - (r.id + k * 5) % 20, 10 + k, (r.id * 7) % 60, 38 - k * 6), values: { ...s } });
      s = { ...s }; steps[(r.id + k) % steps.length](s);
    }
    r.history.push(...HistoryLegacy.toEntries(rows, LEGACY_KEYS));
  });

  // the rules are saved in js/data.js storage (prefix admin-redesign:, cleared by Reset Demo Data): create / edit / delete survive a reload
  const RULES_KEY = 'markupRules';
  const rules = AdminData.load(RULES_KEY) || seedRules;
  const storeRules = () => AdminData.save(RULES_KEY, rules);
  nextId = rules.reduce((m, r) => Math.max(m, r.id), 0) + 1;   // a new rule always gets a new ID

  /* ---------- helpers ---------- */
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const status = on => `<span class="tbl-status ${on ? 'on' : 'off'}">${on ? 'Active' : 'Inactive'}</span>`;
  // existing rules that overlap another active rule (saved before the check, or imported): flagged in the list
  const INFO = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.4"/><path d="M12 11v5.5M12 7.5v.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';
  const WARN = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3l10 18H2L12 3z" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><path d="M12 10v5M12 18v.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';
  // list: a rule newer ones beat → red "Blocked" (nothing of it applies) / amber "Partial" (some still applies);
  // a rule that beats older ones → blue "Overrides". One rule → "#ID", several → "· N rules". Hover lists them.
  // pills come from the rule's stored overlap (written by "Check overlaps"). It is saved as data — rule IDs, API ids,
  // market ids — and the text is built when drawn, so a rename on Supplier List shows here too
  const tagHtml = d => {
    if (!d || typeof d !== 'object') return '';
    const out = [];
    if (d.by.length) out.push(`<span class="tbl-warn${d.blocked ? ' danger' : ''}" tabindex="0" data-tooltip="${esc(byMsg(d.blocked, d.left, d.by))}">${WARN}${pillText(d.blocked ? 'Blocked' : 'Partial', d.by)}</span>`);
    // a rule can be blocked in part and still override older ones: both pills show
    if (d.over.length) out.push(`<span class="tbl-note" tabindex="0" data-tooltip="${esc(overMsg(d.over))}">${pillText('Overrides', d.over)}</span>`);
    return out.join('');
  };
  const overlapTag = r => tagHtml(saved[r.id]);
  const num = v => Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const markupText = r => r.type === 'percent' ? `${num(r.amount)}%` : num(r.amount);
  const markupWords = r => r.type === 'percent' ? markupText(r) : `${markupText(r)} fixed`;
  // markup cell, two lines: amount, then its type
  const markupCell = r => `<span class="tbl-amount"><span class="tbl-amount-value">${markupText(r)}</span><span class="tbl-amount-type">${r.type === 'percent' ? 'Percent' : 'Fixed'}</span></span>`;
  const mName = id => MK[id]?.name || id;
  const marketsText = ids => ids.length ? ids.map(mName).join(', ') : 'All markets';
  // short form for titles: up to 3 names, then "+N more"
  const marketsShort = ids => ids.length > 3 ? `${ids.slice(0, 3).map(mName).join(', ')} +${ids.length - 3} more` : marketsText(ids);
  // "covers everything" chip: outlined, with an icon, so it reads as a scope, not as one more market / API
  const allChip = (text, icon) => `<span class="tbl-chip all"><i class="fas fa-${icon}" aria-hidden="true"></i>${esc(text)}</span>`;
  // a market carries its currency: [name, code] shows as "Name CUR"
  const marketChips = ids => ids.map(id => MK[id] ? [MK[id].name, MK[id].cur] : id);
  // list cell: every value, separated by dividers — "Name CUR | Name CUR"; none set = the "all" chip
  const itemHtml = n => Array.isArray(n)
    ? `<span class="tbl-item">${esc(n[0])}<span class="tbl-pill">${esc(n[1])}</span></span>`
    : `<span class="tbl-item">${esc(n)}</span>`;
  const chipsCell = (names, none, icon) => names.length
    ? `<div class="tbl-list"><div class="tbl-list-clip"><div class="tbl-list-row">${names.map(itemHtml).join('')}</div></div></div>`
    : none ? allChip(none, icon) : '';
  const marketsCell = ids => chipsCell(marketChips(ids), 'All markets', 'globe');
  const isAllApis = a => a.includes(ALL);
  const apiName = a => isAllApis(a) ? 'All suppliers' : a.map(apiNm).join(', ');
  // short form for titles: up to 3 names, then "+N more"
  const apiShort = a => isAllApis(a) ? 'All suppliers' : a.length > 3 ? `${a.slice(0, 3).map(apiNm).join(', ')} +${a.length - 3} more` : apiName(a);
  const agentText = id => id ? AG[id].name : 'All clients';
  const portalText = id => id ? PT[id].name : 'All';
  const portalCell = id => id ? `<span class="tbl-code">${esc(PT[id].name)}</span>` : '<span class="tbl-muted">All</span>';
  const OFF_TAG = '<span class="tbl-tag neutral" tabindex="0" data-tooltip="This partner is disabled in Partner Management">Disabled</span>';
  // client cell: the partner, "All clients" for a portal rule without one, a dash when there's no portal (no client applies)
  const agentCell = r => r.agent ? `<span class="tbl-code">${esc(AG[r.agent].code)}</span> <span class="tbl-strong">${esc(AG[r.agent].name)}</span>${AG[r.agent].enabled ? '' : OFF_TAG}`
    : r.portal ? '<span class="tbl-muted">All clients</span>' : '<span class="tbl-muted" aria-label="Not applicable">—</span>';
  // portal + client in one cell: "B2B ›" then the partner code, the client name under the code (left edges aligned)
  const whoCell = r => {
    // a rule with no portal reads the same way: "ALL ›" All clients (every portal, every client)
    const a = r.portal && r.agent && AG[r.agent];
    const label = `<span class="tbl-eyebrow">${esc(portalText(r.portal))}<span class="sep" aria-hidden="true">›</span></span>`;
    return a
      ? `<div class="tbl-group">${label}<span class="tbl-code">${esc(a.code)}</span><span class="tbl-group-name"><span class="tbl-strong">${esc(a.name)}</span>${a.enabled ? '' : OFF_TAG}</span></div>`
      : `<div class="tbl-group">${label}<span class="tbl-muted">All clients</span></div>`;
  };
  const agentOpt = a => `${a.code} · ${a.name}${a.enabled ? '' : ' (Disabled)'}`;
  const apiCell = a => isAllApis(a) ? allChip('All suppliers', 'layer-group') : chipsCell(a.map(apiNm), '');
  // "B2B · Skyline Travels · RateHawk · Bangladesh" / "All · Dida · All markets" for titles and dialogs
  const whoText = r => r.portal ? `${PT[r.portal].name} · ${agentText(r.agent)}` : 'All';
  const ruleLabel = r => `${whoText(r)} · ${apiShort(r.api)} · ${marketsShort(r.markets)}`;
  const toast = msg => { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2400); };

  /* ---------- filters + table ---------- */
  const state = { id: '', portal: '', agent: '', market: '', api: '', status: '', page: 1, size: 20 };
  const fPortal = $('#f-portal'), ePortal = $('#e-portal');
  PORTALS.forEach(p => { fPortal.add(new Option(p.name, p.id)); ePortal.add(new Option(p.name, p.id)); });
  const fAgent = $('#f-agent'), fMarket = $('#f-market'), fApi = $('#f-api'), eApi = $('#e-api'), eMarkets = $('#e-markets'), eAgent = $('#e-agent');
  AGENTS.forEach(a => { fAgent.add(new Option(agentOpt(a), a.id)); eAgent.add(new Option(agentOpt(a), a.id)); });
  RefData.markets.forEach(m => { fMarket.add(new Option(RefData.marketLabel(m), m.id)); eMarkets.add(new Option(RefData.marketLabel(m), m.id)); });
  APIS.forEach(a => { fApi.add(new Option(HotelApis.label(a), a.id)); eApi.add(new Option(HotelApis.label(a), a.id)); });

  // ID: rules whose ID starts with what's typed ("#" ignored).
  // Portal filter: "All (default)" = rules without a portal; a portal = that portal's rules.
  // Client filter shows only once a portal is picked: "All clients (none set)" = portal rules without a client.
  // Market / Supplier: the rules that cover it — they name it, or apply to All markets / All suppliers.
  const matchesMA = r => (!state.id || String(r.id).startsWith(state.id))
    && (!state.portal || (state.portal === '*' ? !r.portal : r.portal === state.portal))
    && (!state.agent || (state.agent === '*' ? !r.agent : r.agent === +state.agent))
    && (!state.market || !r.markets.length || r.markets.includes(+state.market))
    && (!state.api || isAllApis(r.api) || r.api.includes(+state.api));
  // latest first
  const filtered = () => rules
    .filter(r => matchesMA(r) && (!state.status || (state.status === 'active') === r.active))
    .sort((a, b) => b.id - a.id);

  /* ---------- Check overlaps: works out every rule's overlap and saves it on the rule (the `overlap` column).
     It stays until the next check; saving a rule doesn't recalculate it. (Prototype: kept in this browser.) ---------- */
  const SAVE_KEY = 'markup-overlap-v2';   // { ruleId: { by, over, blocked, left } }
  let saved = {};
  saved = AdminData.load(SAVE_KEY) || {};   // js/data.js storage (prefix admin-redesign:, cleared by Reset Demo Data)
  const storeSaved = () => AdminData.save(SAVE_KEY, saved);
  // one rule's overlap, saved with that rule (used by Save with "Check for overlaps" ticked)
  function saveOverlap(r) {
    const d = overlapData(r);
    if (d) saved[r.id] = d; else delete saved[r.id];
    storeSaved();
  }
  // calculates, then reloads only the list that was showing: same filters, same page (overlaps don't change paging)
  function runCheck() {
    const btn = $('#btn-check'), area = $('.tbl-area');
    if (btn.disabled) return;
    btn.disabled = true; btn.lastChild.textContent = ' Checking…';
    area.classList.add('is-loading'); area.setAttribute('aria-busy', 'true');
    setTimeout(() => {   // the server call (POST /api/markups/overlaps/check) in the real portal
      saved = {};
      rules.forEach(r => { const d = overlapData(r); if (d) saved[r.id] = d; });
      storeSaved();
      render();
      btn.disabled = false; btn.lastChild.textContent = ' Check overlaps';
      area.classList.remove('is-loading'); area.removeAttribute('aria-busy');
    }, 600);
  }

  function pageList(page, pages) {
    if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
    const set = new Set([1, pages, page - 1, page, page + 1].filter(n => n >= 1 && n <= pages));
    const out = []; let prev = 0;
    [...set].sort((a, b) => a - b).forEach(n => { if (n - prev > 1) out.push('…'); out.push(n); prev = n; });
    return out;
  }

  const ICON = {
    edit: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
    hist: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 12a9 9 0 109-9 9 9 0 00-7 3.3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M3 3.5V8h4.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 7.5V12l3.2 2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    del: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };

  function render() {

    const list = filtered();
    const pages = Math.max(1, Math.ceil(list.length / state.size));
    state.page = Math.min(state.page, pages);
    const start = (state.page - 1) * state.size;
    const slice = list.slice(start, start + state.size);

    $('#rows').innerHTML = slice.length ? slice.map((r, i) => `
      <tr>
        <td class="tbl-num">${start + i + 1}</td>
        <td class="text-start tbl-fit"><span class="tbl-code">${r.id}</span></td>
        <td class="text-start">${marketsCell(r.markets)}</td>
        <td class="text-start">${apiCell(r.api)}</td>
        <td class="text-start tbl-fit">${whoCell(r)}</td>
        <td class="text-end tbl-fit">${markupCell(r)}</td>
        <td class="text-center tbl-fit"><div class="tbl-status-cell">${status(r.active)}${overlapTag(r)}</div></td>
        <td class="tbl-action-col"><div class="tbl-actions">
          <button class="tbl-action" type="button" data-edit="${r.id}" data-tip="Edit" aria-label="Edit markup: ${esc(ruleLabel(r))}">${ICON.edit}</button>
          <button class="tbl-action" type="button" data-hist="${r.id}" data-tip="History" aria-label="History: ${esc(ruleLabel(r))}">${ICON.hist}</button>
          <button class="tbl-action danger" type="button" data-del="${r.id}" data-tip="Delete" aria-label="Delete markup: ${esc(ruleLabel(r))}">${ICON.del}</button>
        </div></td>
      </tr>`).join('')
      : EmptyState.row(8);

    $('#pg-range').textContent = list.length ? `${start + 1}–${start + slice.length}` : '0';
    $('#pg-total').textContent = list.length.toLocaleString('en-US');
    $('#pg-mobile').textContent = `Page ${state.page} of ${pages}`;
    $('#pg-prev').disabled = state.page === 1;
    $('#pg-next').disabled = state.page === pages;
    $('#pg-pages').innerHTML = pageList(state.page, pages).map(n => n === '…'
      ? '<span class="pagination__ellipsis">…</span>'
      : `<button type="button" class="pagination__page${n === state.page ? ' pagination__page--active' : ''}" data-pg="${n}"${n === state.page ? ' aria-current="page"' : ''} aria-label="Page ${n}${n === state.page ? ', current page' : ''}">${n}</button>`).join('');
  }

  // no portal picked (or "All") in the Portal field → the client filter stays visible but disabled (and cleared)
  function syncClientFilter() {
    const on = !!fPortal.value && fPortal.value !== '*';
    fAgent.disabled = !on;
    // a disabled button gets no hover events, so the tooltip sits on the dropdown's wrapper
    const wrap = fAgent.closest('.searchable-select') || fAgent;
    if (on) delete wrap.dataset.tooltip; else wrap.dataset.tooltip = 'Pick a platform type first';
    if (!on && fAgent.value) { fAgent.value = ''; fAgent._searchableRefresh?.(); }
  }
  // fields apply only on Search (or Enter in ID); Reset clears every field and reloads
  $('#f-id').addEventListener('input', e => {
    const v = e.target.value.replace(/[^\d]/g, '');
    if (v !== e.target.value.replace(/^#/, '')) e.target.value = v;
  });
  fPortal.addEventListener('change', syncClientFilter);
  // a query in the real portal → skeleton first (saves / edits / deletes re-render directly)
  const load = () => TableLoading.run($('.tbl-area'), render);
  function applyFilters() {
    Object.assign(state, { id: $('#f-id').value, portal: fPortal.value, agent: fAgent.value, market: fMarket.value, api: fApi.value,
      status: $('#f-status').value, page: 1 });
    load();
  }
  // shared filter bar: count + chips cover the panel's fields
  const optText = sel => sel.options[sel.selectedIndex]?.text || '';
  const pick = (label, sel, after) => ({ label, isSet: () => !!sel.value, text: () => optText(sel), clear: () => { sel.value = ''; if (after) after(); } });
  FilterBar.init($('#filter-bar'), {
    fields: [pick('Platform type', fPortal, syncClientFilter), pick('Client', fAgent), pick('Market', fMarket), pick('Supplier', fApi), pick('Status', $('#f-status'))],
    onSearch: applyFilters,
    onReset: () => {
      $('#f-id').value = ''; fPortal.value = ''; syncClientFilter(); fAgent.value = ''; fMarket.value = ''; fApi.value = ''; $('#f-status').value = '';
      applyFilters();
    },
  });
  $('#pg-pages').addEventListener('click', e => { const b = e.target.closest('[data-pg]'); if (b) { state.page = +b.dataset.pg; load(); } });
  $('#pg-prev').addEventListener('click', () => { state.page--; load(); });
  $('#pg-next').addEventListener('click', () => { state.page++; load(); });
  $('#pg-size').addEventListener('change', e => { state.size = +e.target.value; state.page = 1; load(); });
  $('#btn-check').addEventListener('click', runCheck);

  /* ---------- drawers ---------- */
  let lastFocus = null;
  function openDrawer(el) { lastFocus = document.activeElement; el.classList.add('open'); setTimeout(() => el.querySelector('input,button')?.focus(), 50); }
  function closeDrawers() { document.querySelectorAll('.drawer.open').forEach(d => d.classList.remove('open')); lastFocus?.focus?.(); }
  document.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeDrawers(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !document.querySelector('dialog[open]')) closeDrawers(); });

  const form = $('#edit-form');
  let editing = null;
  const type = () => form.querySelector('[name=type]:checked')?.value || 'percent';
  // Markets in the form: nothing picked by default; "All markets" is an explicit option, only for client rules (like All suppliers)
  // option values are strings: rules keep numeric market ids (and ALL)
  const selMarketOpts = () => [...eMarkets.selectedOptions].map(o => o.value === ALL ? ALL : +o.value);
  const selMarkets = () => selMarketOpts().filter(v => v !== ALL);
  const setMarkets = list => { const v = list.map(String); [...eMarkets.options].forEach(o => o.selected = v.includes(o.value)); eMarkets._searchableRefresh?.(); };
  // "All" options don't mix with named ones: picking All clears the named ones, picking a named one clears All
  function exclusiveAll(select, get, set) {
    let prev = get();
    select.addEventListener('change', () => {
      const now = get();
      if (now.includes(ALL) && now.length > 1) set(prev.includes(ALL) ? now.filter(v => v !== ALL) : [ALL]);
      prev = get();
    });
    return () => { prev = get(); }; // call after page code sets the selection
  }
  const resetMarketsPrev = exclusiveAll(eMarkets, selMarketOpts, setMarkets);

  const allOpt = eApi.querySelector(`option[value="${ALL}"]`);
  const allMkOpt = eMarkets.querySelector(`option[value="${ALL}"]`);
  const mkF = eMarkets.closest('.field'), mkMsg = mkF.querySelector('[data-msg]');
  // option values are strings: the rule keeps numeric API ids (and ALL)
  const selApis = () => [...eApi.selectedOptions].map(o => o.value === ALL ? ALL : +o.value);
  const setApis = list => { const v = list.map(String); [...eApi.options].forEach(o => o.selected = v.includes(o.value)); eApi._searchableRefresh?.(); };
  const resetApisPrev = exclusiveAll(eApi, selApis, setApis);
  const apiF = eApi.closest('.field'), apiMsg = apiF.querySelector('[data-msg]');

  // Portal empty = all portals (today's default markup) and no Client field.
  // Portal picked → Client appears (optional: empty = all that portal's clients). A client unlocks "All suppliers" and "All markets".
  function syncScope() {
    const portal = ePortal.value;
    if (!portal) eAgent.value = '';
    $('#e-agent-field').hidden = !portal;
    const client = !!(portal && eAgent.value);
    allOpt.disabled = !client; // the dropdown hides disabled options
    allMkOpt.disabled = !client;
    $('#e-api-hint').textContent = client ? 'Pick All suppliers to cover every supplier.' : '';
    // disabled partners: only the rule's current client stays pickable (so an existing rule can still be edited)
    [...eAgent.options].forEach(o => { if (o.value) o.disabled = !AG[o.value].enabled && o.value !== String(editing?.agent || ''); });
    if (!client && selApis().includes(ALL)) {
      setApis([]); resetApisPrev();
      apiMsg.textContent = 'All suppliers needs a platform type and a client. Select a supplier.';
      apiF.classList.add('invalid');
    }
    if (!client && selMarketOpts().includes(ALL)) {
      setMarkets([]); resetMarketsPrev();
      mkMsg.textContent = 'All markets needs a platform type and a client. Select a market.';
      mkF.classList.add('invalid');
    }
    eMarkets._searchableRefresh?.(); eApi._searchableRefresh?.();
  }

  // amount is numeric only: digits and one decimal point, up to 2 decimals (0 is allowed)
  form.elements.amount.addEventListener('input', e => {
    const el = e.target, v = el.value;
    let clean = v.replace(/[^\d.]/g, '');
    const dot = clean.indexOf('.');
    if (dot !== -1) clean = clean.slice(0, dot + 1) + clean.slice(dot + 1).replace(/\./g, '').slice(0, 2);
    if (clean !== v) el.value = clean;
  });
  // unit next to the amount (% for Percent)
  function syncPreview() {
    $('#e-amount-unit').textContent = type() === 'percent' ? '%' : '';
  }
  form.addEventListener('input', syncPreview);
  form.addEventListener('change', e => {
    if (e.target === ePortal || e.target === eAgent) syncScope();
    if (e.target === eApi && selApis().length) apiF.classList.remove('invalid');
    if (e.target === eMarkets && selMarketOpts().length) eMarkets.closest('.field').classList.remove('invalid');
    syncPreview();
  });

  function openEdit(rule) {
    editing = rule || null;
    form.reset();
    form.querySelectorAll('.field').forEach(f => f.classList.remove('invalid'));
    $('#edit-title').textContent = rule ? `Edit markup · #${rule.id}` : 'New markup';
    $('#edit-submit').textContent = rule ? 'Save changes' : 'Create markup';
    const v = rule || { portal: null, agent: null, markets: [], api: [], type: 'percent', amount: '', active: true };
    ePortal.value = v.portal || '';
    eAgent.value = v.agent || '';
    syncScope();
    setApis(v.api); resetApisPrev();
    // new rule: nothing picked. Existing rule: its markets, or "All markets" when it has none
    setMarkets(rule ? (v.markets.length ? v.markets : [ALL]) : []); resetMarketsPrev();
    form.querySelectorAll('[name=type]').forEach(r => r.checked = r.value === v.type);
    form.elements.amount.value = v.amount;
    form.elements.active.checked = v.active;
    syncPreview();
    openDrawer($('#edit-drawer'));
  }

  // two Active rules overlap: same portal + client, a shared supplier (All suppliers counts as its own value)
  // and a shared market (or both on All markets). Returns what they share and whether that is all of `a`, or null.
  function overlap(a, b) {
    if (!a.active || !b.active || (a.portal || null) !== (b.portal || null) || (a.agent || null) !== (b.agent || null)) return null;
    const apis = a.api.filter(x => b.api.includes(x));
    if (!apis.length) return null;
    // where: the shared market ids, or null when both apply to All markets
    if (!a.markets.length && !b.markets.length) return { apis, where: null };
    const shared = a.markets.filter(m => b.markets.includes(m));
    return shared.length ? { apis, where: shared } : null;
  }
  // priority: the latest rule wins where rules overlap. Latest = highest ID (a rule not saved yet is the latest).
  const rank = d => d.id ?? Infinity;
  function overlapsOf(data, self) {
    const out = [];
    for (const r of rules) { if (r !== self) { const o = overlap(data, r); if (o) out.push({ rule: r, ...o }); } }
    return {
      by: out.filter(o => rank(o.rule) > rank(data)),    // newer rules that win over this one
      over: out.filter(o => rank(o.rule) < rank(data)),  // older rules this one wins over
    };
  }
  const ids = list => list.map(o => `#${o.rule.id}`).join(', ');
  // Blocked vs Partial looks at all newer rules together: a rule is split into supplier × market cells
  // (All markets is one cell of its own), and it's Blocked when every cell is taken by some newer rule.
  const cellsOf = d => d.api.flatMap(a => (d.markets.length ? d.markets : [null]).map(m => [a, m]));
  const covers = (b, [a, m]) => b.api.includes(a) && (m === null ? !b.markets.length : b.markets.includes(m));
  // left = the [api, market] cells no newer rule takes
  function coverage(d, by) {
    const left = cellsOf(d).filter(c => !by.some(o => covers(o.rule, c)));
    return { blocked: !left.length, left };
  }
  // what still applies, grouped by supplier: "Dida in India; Hotelbeds in Malaysia"
  const leftText = cells => {
    const bySup = new Map();
    cells.forEach(([a, m]) => { if (!bySup.has(a)) bySup.set(a, []); bySup.get(a).push(m); });
    return [...bySup].map(([a, ms]) => `${a === ALL ? 'All suppliers' : apiNm(a)} in ${ms[0] === null ? 'all markets' : ms.map(mName).join(', ')}`).join('; ');
  };
  // one overlap as saved data: the other rule's ID, the shared API ids and market ids (null = all markets)
  const entry = o => ({ id: o.rule.id, apis: o.apis, where: o.where });
  function overlapData(r) {
    const o = overlapsOf(r, r);
    if (!o.by.length && !o.over.length) return null;
    const c = coverage(r, o.by);
    return { by: o.by.map(entry), over: o.over.map(entry), blocked: !!o.by.length && c.blocked, left: c.left };
  }
  const whereText = w => w ? w.map(mName).join(', ') : 'all markets';
  const lines = list => list.map(e => `#${e.id}: ${apiName(e.apis)} in ${whereText(e.where)}`).join('\n');
  const byMsg = (blocked, left, by) => {
    const many = by.length > 1;
    return blocked
      ? `Not applied: newer markup${many ? 's take' : ' takes'} priority everywhere it applies.
${lines(by)}`
      : `Partly applied: newer markup${many ? 's take' : ' takes'} priority for
${lines(by)}
Still applies: ${leftText(left)}.`;
  };
  const overMsg = over => `Takes priority over older markup${over.length > 1 ? 's' : ''}:
${lines(over)}`;
  // pill text: one rule → its ID; several → a count (the tooltip lists them)
  const pillText = (word, list) => list.length === 1 ? `${word} #${list[0].id}` : `${word} · ${list.length} rules`;

  // optional overlap screen on Save ("Check for overlaps" ticked): information, not an error — saving is allowed
  const draftOverlaps = data => data.active ? overlapsOf({ id: editing?.id, ...data }, editing) : { by: [], over: [] };   // inactive rules never overlap
  // → true to go on saving, false to go back to the form
  function confirmOverlaps(data, o) {
    const scope = { id: editing?.id, ...data };
    // one box per message, coloured by what it means: red = blocked, amber = partly applied, blue = overrides others
    const msgs = [];
    if (o.by.length) { const c = coverage(scope, o.by); msgs.push([c.blocked ? 'danger' : 'warn', byMsg(c.blocked, c.left, o.by.map(entry))]); }
    if (o.over.length) msgs.push(['info', overMsg(o.over.map(entry))]);
    const n = new Set([...o.by, ...o.over].map(x => x.rule)).size;
    return Modal.open({
      tone: 'warning',
      title: `This markup overlaps ${n === 1 ? '1 rule' : `${n} rules`}`,
      html: true,
      message: 'Where markups overlap, the latest one is applied.'
        + `<span class="ovl-msgs">${msgs.map(([tone, m]) => `<span class="ovl-msg ${tone === 'warn' ? '' : tone}">${tone === 'info' ? INFO : WARN}<span>${esc(m).replace(/\n/g, '<br>')}</span></span>`).join('')}</span>`,
      confirm: editing ? 'Save anyway' : 'Create anyway',
      cancel: 'Back to edit',
    });
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const amtF = form.elements.amount.closest('.field'), mkF = eMarkets.closest('.field');
    const amtMsg = amtF.querySelector('[data-msg]'), mkMsg = mkF.querySelector('[data-msg]');
    const raw = form.elements.amount.value.trim(), n = Number(raw);
    let amtBad = true;
    if (!raw) amtMsg.textContent = '';   // empty → red border only
    else if (!/^\d+(\.\d{1,2})?$/.test(raw)) amtMsg.textContent = 'Enter a number, up to 2 decimals.';
    else amtBad = false;
    const portal = ePortal.value || null, agent = portal ? (+eAgent.value || null) : null;
    // All suppliers needs a portal + client (the backend must enforce this too)
    const apis = selApis();
    const apiBad = !apis.length || (apis.includes(ALL) && !agent);
    if (apiBad) apiMsg.textContent = apis.includes(ALL) ? 'All suppliers needs a platform type and a client. Select a supplier.' : '';
    apiF.classList.toggle('invalid', apiBad);
    amtF.classList.toggle('invalid', amtBad);

    const mkBad = !selMarketOpts().length || (selMarketOpts().includes(ALL) && !agent);
    const data = { portal, agent, markets: selMarkets(), api: apis, type: type(), amount: amtBad ? '' : String(n), active: form.elements.active.checked };
    if (mkBad) mkMsg.textContent = selMarketOpts().includes(ALL) ? 'All markets needs a platform type and a client. Select a market.' : '';
    mkF.classList.toggle('invalid', mkBad);
    if (apiBad || mkBad || amtBad) {
      (apiBad ? $('#e-api-btn') : mkBad ? $('#e-markets-btn') : form.elements.amount)?.focus();
      return;
    }
    // optional: overlaps are only looked for when "Check for overlaps" is ticked
    let tail = '';
    if ($('#e-check-ovl').checked) {
      const o = draftOverlaps(data);
      if (o.by.length || o.over.length) { if (!(await confirmOverlaps(data, o))) return; }
      else tail = ' · No overlaps found';
    }
    // rules this one overlapped before the edit: their saved overlap may change too (e.g. no longer overridden)
    const partners = r => { const o = overlapsOf(r, r); return [...o.by, ...o.over].map(x => x.rule); };
    const before = $('#e-check-ovl').checked && editing ? partners(editing) : [];

    if (editing) {
      const same = (a, b) => Array.isArray(a) ? a.length === b.length && a.every(x => b.includes(x)) : a === b;
      const changes = Object.keys(data).filter(k => !same(data[k], editing[k])).map(k => [k, editing[k], data[k]]);
      if (changes.length) editing.history.unshift({ by: 'Super Admin', at: new Date(), changes });
      Object.assign(editing, data);
      toast(changes.length ? 'Markup updated' + tail : 'No changes to save');
    } else {
      rules.unshift({ id: nextId++, ...data, history: [{ by: 'Super Admin', at: new Date(), created: true }] });
      state.page = 1;
      toast('Markup created' + tail);
    }
    // checked on save → save the result with this rule and with every rule it overlaps now or overlapped before
    // (none found = cleared). Rules not touched by this save keep their last check.
    if ($('#e-check-ovl').checked) {
      const rule = editing || rules[0];
      new Set([rule, ...before, ...partners(rule)]).forEach(saveOverlap);
    }
    storeRules();
    closeDrawers();
    render();
  });

  /* ---------- delete (confirm first, shared modal: js/modal.js) ---------- */
  async function askDelete(rule) {
    const over = overlapsOf(rule, rule).over;
    const fallback = rule.portal ? `${rule.agent ? 'This client' : `${PT[rule.portal].name} bookings`} fall${rule.agent ? 's' : ''} back to the next matching markup.` : '';
    const ok = await Modal.open({
      tone: 'danger',
      title: `Delete markup #${rule.id}?`,
      message: `It stops being added to hotel prices right away.${fallback ? ' ' + fallback : ''}${over.length ? ` ${ids(over)} ${over.length === 1 ? 'applies' : 'apply'} again where this one overrode ${over.length === 1 ? 'it' : 'them'}.` : ''}`,
      details: [
        ['Platform type / Client', esc(whoText(rule))],
        ['Markets', rule.markets.length ? marketItems(rule.markets) : 'All markets'],
        ['Suppliers', esc(apiName(rule.api))],
        ['Markup', `${esc(markupText(rule))} · ${rule.type === 'percent' ? 'Percent' : 'Fixed'}`],
        ['Status', rule.active ? dot('on', 'Active') : dot('off', 'Inactive')],
      ],
      note: 'It’s kept in the records (soft delete) but can’t be brought back from this page.',
      confirm: 'Delete markup',
    });
    if (!ok) return;
    // rules whose saved overlap names this one: worked out again, so no pill points at a deleted rule
    const named = rules.filter(r => { const d = saved[r.id]; return d && [...d.by, ...d.over].some(x => x.id === rule.id); });
    delete saved[rule.id];
    rules.splice(rules.indexOf(rule), 1);
    named.forEach(saveOverlap);
    storeSaved(); storeRules();
    toast(`Markup #${rule.id} deleted`);
    render();
  }

  /* ---------- history: same card design and rules as Supplier List ----------
     Create = the values the rule was created with. Edit = one row per changed field, old value → new value;
     Markets and Suppliers show only what was removed / added. Status Change = old → new status and what it means. Newest first. */
  const userEmail = RefData.userEmail;   // admin users: js/data.js
  const OP_CLASS = { Create: 'success', Edit: 'info', 'Status Change': 'neutral' };
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dateOnly = d => `${String(d.getDate()).padStart(2, '0')}-${MONTHS[d.getMonth()]}-${d.getFullYear()}`;
  const timeOnly = d => `${String(d.getHours() % 12 || 12).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() >= 12 ? 'PM' : 'AM'}`;
  const SNAPSHOT = ['portal', 'agent', 'markets', 'api', 'type', 'amount', 'active'];
  const dot = (cls, text) => `<span class="hf-dot ${cls}">${text}</span>`;
  // type + amount show as one "Markup" value
  const marketItem = id => MK[id] ? `<span class="hist-item">${esc(MK[id].name)} <span class="tbl-pill">${esc(MK[id].cur)}</span></span>` : esc(id);
  const marketItems = ids => ids.map(marketItem).join('<span class="hist-sep">,</span> ');
  const SHOW = [
    ['portal', 'Platform type', v => esc(portalText(v.portal))],
    ['agent', 'Client', v => v.agent ? `<span class="hf-code">${esc(AG[v.agent].code)}</span> ${esc(AG[v.agent].name)}` : 'All clients'],
    // each market with its currency, as in the list: "Bangladesh BDT, India INR"
    ['markets', 'Markets', v => v.markets.length ? marketItems(v.markets) : 'All markets', true],
    ['api', 'Suppliers', v => esc(apiName(v.api)), true],
    ['amount', 'Markup', v => `${esc(markupText(v))} · ${v.type === 'percent' ? 'Percent' : 'Fixed'}`],
    ['active', 'Status', v => v.active ? dot('on', 'Active') : dot('off', 'Inactive')],
  ];
  const showKey = f => f === 'type' ? 'amount' : f;
  // Markets / Suppliers edit row: only what changed — "Removed …" and "Added …". Switching to or from
  // All markets / All suppliers has nothing to add or remove, so that shows as old → new.
  function listChange(o, n, items) {
    if (!o.length || !n.length || o.includes(ALL) || n.includes(ALL)) return null;
    const rm = o.filter(x => !n.includes(x)), add = n.filter(x => !o.includes(x));
    return `<div class="hc-list">${rm.length ? `<div class="hc-line"><span class="hc-tag rm">Removed</span><span class="hc-items rm">${items(rm)}</span></div>` : ''}${add.length ? `<div class="hc-line"><span class="hc-tag add">Added</span><span class="hc-items add">${items(add)}</span></div>` : ''}</div>`;
  }
  const supplierItems = list => list.map(a => `<span class="hist-item">${esc(apiNm(a))}</span>`).join('<span class="hist-sep">,</span> ');

  function historyEntries(rule) {
    let after = {}; SNAPSHOT.forEach(k => after[k] = rule[k]);
    return rule.history.map(h => {
      if (h.created) return { op: 'Create', summary: '', fields: SHOW.map(([, l, f, wide]) => [l, f(after), wide]), ...h };
      // oldest old-system row: it holds the settings after that save, but not what they were before
      if (h.first) return { op: 'Edit', summary: '', fields: SHOW.map(([, l, f, wide]) => [l, f(after), wide]), ...h };
      const before = { ...after };
      h.changes.forEach(([f, o]) => { before[f] = o; });
      const keys = [...new Set(h.changes.map(c => showKey(c[0])))];
      const rows = SHOW.filter(([k]) => keys.includes(k)).map(([k, l, f, wide]) => {
        const only = k === 'markets' ? listChange(before.markets, after.markets, marketItems)
          : k === 'api' ? listChange(before.api, after.api, supplierItems) : null;
        return only ? [l, null, only, true] : [l, f(before), f(after), wide];
      });
      const nowActive = after.active;
      after = before;
      if (keys.length === 1 && keys[0] === 'active') return {
        op: 'Status Change', summary: '', active: nowActive,
        note: nowActive ? 'Added to hotel prices again.' : 'No longer added to hotel prices.', ...h,
      };
      return { op: 'Edit', summary: '', rows, ...h };
    });
  }

  const ARROW = '<svg class="hc-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" role="img" aria-label="changed to"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function openHistory(rule) {
    $('#hist-name').textContent = `— #${rule.id}`;
    const list = historyEntries(rule);
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
            ? `<dl class="history-fields">${h.fields.map(([k, v, wide]) => `<div${wide ? ' class="wide"' : ''}><dt>${k}</dt><dd${wide ? ' class="wrap"' : ''}>${v}</dd></div>`).join('')}</dl>`
            : h.op === 'Status Change'
            ? `<div class="history-status ${h.active ? 'on' : 'off'}">
                <span class="hs-pill old">${h.active ? 'Inactive' : 'Active'}</span>${ARROW}<span class="hs-pill new">${h.active ? 'Active' : 'Inactive'}</span>
                <span class="hs-note">${h.note}</span></div>`
            : `<dl class="history-changes">${h.rows.map(([k, o, n, wide]) => `<div><dt>${k}</dt><dd${wide ? ' class="wrap"' : ''}>${o == null ? n : `<span class="hc-old">${o}</span>${ARROW}<span class="hc-new">${n}</span>`}</dd></div>`).join('')}</dl>`}
        </div>
      </div>`).join('')}</div>` : '<p class="history-empty">No history yet</p>';
    openDrawer($('#hist-drawer'));
  }

  $('#btn-new').addEventListener('click', () => openEdit(null));
  $('#rows').addEventListener('click', e => {
    const byId = id => rules.find(r => r.id === +id);
    const ed = e.target.closest('[data-edit]'), hi = e.target.closest('[data-hist]'), de = e.target.closest('[data-del]');
    if (ed) openEdit(byId(ed.dataset.edit));
    if (hi) openHistory(byId(hi.dataset.hist));
    if (de) askDelete(byId(de.dataset.del));
  });

  load();
  SearchableSelect.init();
  syncClientFilter(); // after init: the tooltip goes on the dropdown wrapper
})();
