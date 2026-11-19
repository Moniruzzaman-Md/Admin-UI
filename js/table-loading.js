/* Shared skeleton loader for the reusable table (Map-UI hotel-system style). Styles: css/table.css (.skeleton …).
   TableLoading.run(area, render)
     area   = the list's .tbl-area (holds the table + pagination)
     render = the page's normal render(); runs after the (simulated) query delay
   While loading: the header stays, the body shows shimmering placeholder rows (one bar per column, fading towards
   the bottom) and the pagination's contents are hidden (its height stays, so nothing moves when the rows land).
   Use it for anything that is a query in the real portal — first load, Search, Reset, filter change, page / rows-per-page.
   Don't use it for saves, deletes or status flips: those change rows already on screen.
   A newer load of the same list replaces an older one still waiting. */
(function () {
  const LOAD_MS = 450, ROWS = 8;
  let seq = 0;
  function rowsHtml(cols, numCol) {
    return Array.from({ length: ROWS }, (_, r) => `<tr>${Array.from({ length: cols }, (_, c) => {
      const isNum = numCol && c === 0;
      return `<td${isNum ? ' class="tbl-num"' : ''}><span class="skeleton-bar"${isNum ? '' : ` style="width:${45 + ((r * 7 + c * 23) % 45)}%"`}></span></td>`;
    }).join('')}</tr>`).join('');
  }
  function run(area, render) {
    const tbody = area.querySelector('tbody');
    const head = area.querySelectorAll('thead th');
    area.classList.add('skeleton');
    tbody.innerHTML = rowsHtml(head.length, head[0] && head[0].classList.contains('tbl-num'));
    area.setAttribute('aria-busy', 'true');
    const token = String(++seq);
    area.dataset.loadToken = token;
    setTimeout(() => {
      if (area.dataset.loadToken !== token) return;
      area.classList.remove('skeleton');
      area.removeAttribute('aria-busy');
      render();
    }, LOAD_MS);
  }
  window.TableLoading = { run };
})();
