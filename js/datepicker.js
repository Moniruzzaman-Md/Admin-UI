/* Shared date-range picker on flatpickr (this file loads it from cdnjs). Styles: css/datepicker.css.
   DateRange.init(input, { from, to, onChange(from, to) }) -> { set(from, to) }
   Field shows "01 Nov 2026 – 20 Nov 2026". Quick ranges: Today / Yesterday / Last 7 days / This month. No future dates.
   Picking one day and closing = that single day. The range can't be left empty.
   Options: optional: true → the range may be empty (from / to = null; a "Clear" chip in the quick-range row);
            future: true → future dates allowed (e.g. check-in); the past-only quick ranges are then left out. */
(function () {
  const CDN = 'https://cdnjs.cloudflare.com/ajax/libs/flatpickr/4.6.13/';
  let loading = null;
  function load() {
    if (window.flatpickr) return Promise.resolve();
    if (loading) return loading;
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = CDN + 'flatpickr.min.css';
    document.head.insertBefore(l, document.head.querySelector('link[rel=stylesheet]'));   // before our CSS, so ours wins
    return (loading = new Promise(res => { const s = document.createElement('script'); s.src = CDN + 'flatpickr.min.js'; s.onload = res; document.head.appendChild(s); }));
  }
  const day = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };

  function init(input, opts) {
    let fp = null;
    const api = { set(f, t) { opts.from = f; opts.to = t; if (fp) { if (f) fp.setDate([f, t], false); else fp.clear(false); } } };
    const key = d => (d ? +day(d) : 0);
    load().then(() => {
      fp = flatpickr(input, {
        mode: 'range', dateFormat: 'd-M-Y', maxDate: opts.future ? null : 'today', defaultDate: opts.from ? [opts.from, opts.to] : [], disableMobile: true,
        locale: { rangeSeparator: ' – ' }, monthSelectorType: 'static',
        onClose(sel) {
          if (sel.length === 1) fp.setDate([sel[0], sel[0]], false);
          if (!fp.selectedDates.length && !opts.optional) fp.setDate([opts.from, opts.to], false);
          const [f = null, t = null] = fp.selectedDates;
          const changed = key(f) !== key(opts.from) || key(t) !== key(opts.to);
          opts.from = f; opts.to = t;
          if (changed) opts.onChange(f, t);
        },
      });
      const today = day(new Date()), sub = n => { const d = new Date(today); d.setDate(d.getDate() - n); return d; };
      const presets = opts.future ? [] : [['Today', today, today], ['Yesterday', sub(1), sub(1)], ['Last 7 days', sub(6), today],
        ['This month', new Date(today.getFullYear(), today.getMonth(), 1), today]];
      if (opts.optional) presets.push(['Clear', null, null]);
      const box = document.createElement('div'); box.className = 'fp-presets';
      box.innerHTML = presets.map((p, i) => `<button type="button" data-i="${i}"${p[1] ? '' : ' class="fp-clear"'}>${p[0]}</button>`).join('');
      box.addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (!b) return; const p = presets[b.dataset.i]; if (p[1]) fp.setDate([p[1], p[2]], false); else fp.clear(false); fp.close(); });
      fp.calendarContainer.appendChild(box);
    });
    return api;
  }
  /* Single date: DateField.init(input, { date, min, max, onChange(date) }) -> { set(date), setMin(date), setMax(date) }
     Field shows "20-Nov-2026" (the project's date format). No future dates unless max says otherwise. Never left empty.
     Options: optional: true → may be empty (date = null): a × in the field clears it (as in the booking form), onChange(null);
              future: true → no "today" limit (a max set later still applies; setMax(null) removes it).
     Calendar = the booking form's (static month title, Sunday first; theme in css/datepicker.css). */
  function single(input, opts) {
    let fp = null;
    const maxOf = d => d || (opts.future ? null : 'today');
    const wrap = input.closest('.date-input');
    const mark = () => wrap && wrap.classList.toggle('has', !!opts.date);
    const api = {
      set(d) { opts.date = d; mark(); if (fp) { if (d) fp.setDate(d, false); else fp.clear(false); } },
      setMin(d) { opts.min = d; if (fp) fp.set('minDate', d || null); },
      setMax(d) { opts.max = d; if (fp) fp.set('maxDate', maxOf(d)); },
    };
    if (opts.optional && wrap) {
      const x = document.createElement('button');
      x.type = 'button'; x.className = 'date-clear'; x.textContent = '×'; x.setAttribute('aria-label', 'Clear date');
      x.addEventListener('click', e => { e.stopPropagation(); if (fp) { fp.clear(false); fp.close(); } opts.date = null; mark(); opts.onChange && opts.onChange(null); });
      wrap.appendChild(x);
    }
    mark();
    load().then(() => {
      fp = flatpickr(input, {
        dateFormat: 'd-M-Y', defaultDate: opts.date || null, minDate: opts.min || null, maxDate: maxOf(opts.max), disableMobile: true,
        monthSelectorType: 'static', position: 'auto left',   // opens under its field, left edges aligned
        onChange(sel) { if (sel[0]) { opts.date = sel[0]; mark(); opts.onChange && opts.onChange(sel[0]); } },
        onClose(sel) { if (!sel.length && !opts.optional) fp.setDate(opts.date, false); },
      });
    });
    return api;
  }
  window.DateRange = { init };
  window.DateField = { init: single };
})();
