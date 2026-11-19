/* Shared date-range picker on flatpickr (this file loads it from cdnjs). Styles: css/datepicker.css.
   DateRange.init(input, { from, to, onChange(from, to) }) -> { set(from, to) }
   Field shows "01 Nov 2026 – 20 Nov 2026". Quick ranges: Today / Yesterday / Last 7 days / This month. No future dates.
   Picking one day and closing = that single day. The range can't be left empty. */
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
    const api = { set(f, t) { opts.from = f; opts.to = t; if (fp) fp.setDate([f, t], false); } };
    load().then(() => {
      fp = flatpickr(input, {
        mode: 'range', dateFormat: 'd M Y', maxDate: 'today', defaultDate: [opts.from, opts.to], disableMobile: true,
        locale: { rangeSeparator: ' – ', firstDayOfWeek: 1 },
        onClose(sel) {
          if (sel.length === 1) fp.setDate([sel[0], sel[0]], false);
          if (!fp.selectedDates.length) fp.setDate([opts.from, opts.to], false);
          const [f, t] = fp.selectedDates;
          const changed = +day(f) !== +day(opts.from) || +day(t) !== +day(opts.to);
          opts.from = f; opts.to = t;
          if (changed) opts.onChange(f, t);
        },
      });
      const today = day(new Date()), sub = n => { const d = new Date(today); d.setDate(d.getDate() - n); return d; };
      const presets = [['Today', today, today], ['Yesterday', sub(1), sub(1)], ['Last 7 days', sub(6), today],
        ['This month', new Date(today.getFullYear(), today.getMonth(), 1), today]];
      const box = document.createElement('div'); box.className = 'fp-presets';
      box.innerHTML = presets.map((p, i) => `<button type="button" data-i="${i}">${p[0]}</button>`).join('');
      box.addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (!b) return; const p = presets[b.dataset.i]; fp.setDate([p[1], p[2]], false); fp.close(); });
      fp.calendarContainer.appendChild(box);
    });
    return api;
  }
  /* Single date: DateField.init(input, { date, min, max, onChange(date) }) -> { set(date), setMin(date), setMax(date) }
     Field shows "20 Nov 2026". No future dates unless max says otherwise. Never left empty. */
  function single(input, opts) {
    let fp = null;
    const api = {
      set(d) { opts.date = d; if (fp) fp.setDate(d, false); },
      setMin(d) { opts.min = d; if (fp) fp.set('minDate', d); },
      setMax(d) { opts.max = d; if (fp) fp.set('maxDate', d); },
    };
    load().then(() => {
      fp = flatpickr(input, {
        dateFormat: 'd M Y', defaultDate: opts.date, minDate: opts.min || null, maxDate: opts.max || 'today', disableMobile: true,
        locale: { firstDayOfWeek: 1 },
        onChange(sel) { if (sel[0]) { opts.date = sel[0]; opts.onChange && opts.onChange(sel[0]); } },
        onClose(sel) { if (!sel.length) fp.setDate(opts.date, false); },
      });
    });
    return api;
  }
  window.DateRange = { init };
  window.DateField = { init: single };
})();
