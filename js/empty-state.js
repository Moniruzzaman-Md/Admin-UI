/* Shared empty state for the reusable table (styles: css/table.css → .empty-state).
   EmptyState.row(colspan) -> '<tr>…</tr>' : the list illustration + "No Data Found". Same on every list, no buttons or extra text. */
(function () {
  const ART = `<svg class="empty-art" viewBox="0 0 220 150" aria-hidden="true">
    <ellipse class="ea-shadow" cx="110" cy="138" rx="62" ry="6"/>
    <g class="ea-sheet">
      <rect x="52" y="30" width="116" height="92" rx="10" class="ea-card"/>
      <rect x="52" y="30" width="116" height="18" rx="10" class="ea-head"/><rect x="52" y="40" width="116" height="8" class="ea-head"/>
      <rect x="64" y="58" width="22" height="7" rx="3.5" class="ea-bar"/><rect x="92" y="58" width="62" height="7" rx="3.5" class="ea-bar ea-bar--soft"/>
      <rect x="64" y="75" width="22" height="7" rx="3.5" class="ea-bar"/><rect x="92" y="75" width="48" height="7" rx="3.5" class="ea-bar ea-bar--soft"/>
      <rect x="64" y="92" width="22" height="7" rx="3.5" class="ea-bar"/><rect x="92" y="92" width="56" height="7" rx="3.5" class="ea-bar ea-bar--soft"/>
      <rect x="64" y="109" width="22" height="5" rx="2.5" class="ea-bar ea-bar--soft"/>
    </g>
    <g class="ea-glass">
      <circle cx="150" cy="70" r="24" class="ea-lens"/>
      <circle cx="150" cy="70" r="24" class="ea-ring"/>
      <path d="M140 70h20" class="ea-dash"/>
      <path d="M167.5 87.5 184 104" class="ea-handle"/>
    </g>
    <g class="ea-spark"><path d="M44 40v8M40 44h8"/><path d="M178 30v6M175 33h6"/><circle cx="186" cy="58" r="2.5"/><circle cx="38" cy="98" r="2"/></g>
  </svg>`;
  const row = colspan => `<tr><td class="empty-cell" colspan="${colspan}"><section class="empty-state" role="status">${ART}<h3>No Data Found</h3></section></td></tr>`;
  window.EmptyState = { row };
})();
