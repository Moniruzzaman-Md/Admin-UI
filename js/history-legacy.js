/* Legacy history → the same history entries as today (shared by every History drawer).
   The old system logged one row per save, holding the FULL record as it was AFTER that save (no create row, no diff).
   Comparing each row with the one before it gives the same {changes: [[field, old, new]]} entries the current
   history uses, so old saves show as normal Edit / Status Change cards, in one timeline after the current entries.

   HistoryLegacy.toEntries(rows, keys)
     rows: old-system rows, newest first: [{ by, email, at: Date, values: { field: value } }] (values already in the page's field names)
     keys: the fields the page shows; anything else in the old rows (removed fields) is ignored
   Returns history entries, newest first:
     - { by, email, at, changes, legacy: true }     one per save that changed a shown field
     - { by, email, at, first: true, legacy: true } the oldest row: what it changed isn't known, so it shows its values
   A save that changed no shown field is left out (same rule as today: no change → no entry).
   A field missing from either row (added to the old log later) is not compared. */
(function () {
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  function toEntries(rows, keys) {
    const out = [];
    rows.forEach((r, i) => {
      const prev = rows[i + 1];
      const base = { by: r.by, email: r.email, at: r.at, legacy: true };
      if (!prev) { out.push({ ...base, first: true }); return; }
      const changes = keys
        .filter(k => k in r.values && k in prev.values && !same(r.values[k], prev.values[k]))
        .map(k => [k, prev.values[k], r.values[k]]);
      if (changes.length) out.push({ ...base, changes });
    });
    return out;
  }
  window.HistoryLegacy = { toEntries };
})();
