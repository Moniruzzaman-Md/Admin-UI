# Admin Portal Redesign

A single project that mirrors the admin portal screen by screen.
Each page shows the **real redesigned sections**, and everything not yet redesigned
stays as a **labelled skeleton** in its true position, so the page fills in turn by turn.

## Structure

Published with GitHub Pages as a clickable prototype (same model as Map-UI):
the repo root is the site root, and every screen is one HTML file sharing the same CSS/JS.

```
admin-portal/
  index.html          screen list + progress (site home)
  <screen>.html       one page per admin screen: redesigned sections + skeletons
  css/
    tokens.css        colours, type, spacing (captured from the live portal)
    shell.css         header + sidebar, 1:1 copy of the live portal (incl. collapse, hover, dropdowns)
    components.css    shared redesign components (buttons, drawer, switch...)
    table.css         the REUSABLE TABLE + pagination + empty state: portal shape, redesigned look — every list uses it as-is
    datepicker.css    date-range picker (flatpickr theme + quick ranges) — needs js/datepicker.js
    select.css        searchable dropdown (every <select>, incl. <select multiple> with chips), Map-UI style — needs js/select.js
    history.css       Edit History cards (Map-UI design) — every History drawer uses it
    skeleton.css      placeholder blocks for un-redesigned sections
  js/
    shell.js          injects the portal header + sidebar; sidebar lists only redesigned screens (MENU)
    datepicker.js     DateRange.init(input, {from, to, onChange}) — the one date-range picker (loads flatpickr from cdnjs)
    select.js         turns every <select> into the searchable dropdown (css/select.css)
    tooltip.js        shared instant tooltip for any data-tooltip="…" (styles in css/components.css)
    history-legacy.js turns old-system history rows (full record per save) into normal history entries: HistoryLegacy.toEntries(rows, keys)
    code-viewer.js    shared read-only file viewer on Monaco (lazy-loaded from cdnjs): CodeViewer.create(host).show(raw) — detects JSON/XML/HTML/text, pretty-prints, folding, find
    table-loading.js  shared skeleton loader: TableLoading.run(tblArea, render) — placeholder rows while a list query runs
    empty-state.js    shared empty table state: EmptyState.row(colspan) — illustration + "No Data Found"
    filters.js        shared filter bar: FilterBar.init(root, {fields, onSearch, onReset}) — count, chips, panel toggle, Search/Reset
    modal.js          shared confirm / info modal: Modal.open({tone, title, message, details, note, confirm}) → Promise<boolean> (css/modal.css)
    <screen>.js       page prototype logic + dummy data
  notes/<screen>.md   dev notes (behaviour only) + changelog
  notes/<screen>-backend.md   optional backend guide for a screen (schema, queries, API) — e.g. markup-commission-backend.md
  <screen>-backend.html       shows that guide as a page; the screen links to it with a small dashed "Backend guide" button (prototype only). It reads the .md when served, and carries a copy of it (GUIDE:START…END) so it also opens from disk — refresh that copy after editing the .md
  source/             captures of the live portal - git-ignored, never published
```

## Rules

- Only the sections asked for get redesigned; everything else stays skeleton.
- One section = one self-contained block, so a change is one skeleton swapped for one section.
- Dev notes describe values/rules/conditions, never styling.
- Lists use the reusable table (`css/table.css`) unchanged — only columns and cell content vary per page. Its shape (markup, bordered grid, navy header, badges, Action column, footer parts) and the Poppins font stay the portal's; its look follows the Map-UI style (city-system.html).
- List pages use the shared list layout at the end of `css/table.css`: the list card always fills the screen height, pagination sits at its bottom, rows scroll inside; with few or no rows the space stays inside the table (empty state centred) — never blank page below the card.
- Every list query (first load, Search/Reset, filter change, page / rows-per-page) shows the skeleton loader (`TableLoading.run`, js/table-loading.js + `.skeleton` in table.css): header stays, shimmering rows, pagination hidden until the rows land. Saves, deletes and status flips re-render directly.
- Empty lists use `EmptyState.row(colspan)` (js/empty-state.js): the list illustration + "No Data Found" — nothing else, same on every list.
- A cell listing several values uses the shared list cell (`.tbl-list`): "Name PILL | Name PILL" with dividers, always every value — never hidden behind "+N" or "Show more". Values sit left-aligned, as many per line as fit (not justified). Columns that only need their content's width (badges, amounts, status) get `tbl-fit`, so the free width goes to the list columns.
- Confirms and info messages use the shared modal (`Modal.open`, `js/modal.js` + `css/modal.css`), never a page-made `<dialog>`. Tone: `danger` (delete), `warning` (can't-undo changes), `info`, `success`. Put what it's about in `details`, the consequence in `note`.
- Tooltips: use `data-tooltip="…"` (`js/tooltip.js`), never `title=""` — the native one is slow and unstyled. Make non-focusable elements `tabindex="0"` so keyboard users get it. Table action buttons keep their `data-tip` CSS tooltip.
- The Action column is always the last column and right-aligned (header and buttons): `<th class="tbl-action-col">` / `<td class="tbl-action-col">`.
- **Same element, same look, on every page** (standing rule). Build UI from the shared components; never restyle one for a single page.
- List filters use the shared **filter bar** (Map-UI hotel-system style): `.filter-bar` in `css/components.css` + `js/filters.js` (`FilterBar.init`). Row: main search box · Search · Filters (count) · Reset (· page actions with `.push-right`); the rest in a collapsible labelled `.filters-panel`; chips of set filters while it's closed. Fields apply only on Search / Enter; Reset restores defaults and reloads. Used by Hotel Api Logs and Markup (Hotel Api List still has the simple instant `.toolbar`).
- Every dropdown is the searchable dropdown (`css/select.css` + `js/select.js`, call `SearchableSelect.init()` after filling options). Write a normal `<select>`; don't opt out of search. `<select multiple>` gives the multi-select version, which stays open while picking (closes on outside click, Esc or Tab); single selects close on a pick.
- Header and sidebar copy the live portal exactly; the sidebar shows only screens that have been redesigned.
- Tag each handoff: `git tag <screen>-handoff-<n>`.

## Caching

CSS/JS links carry `?v=N`. Bump N in every page when shared files change, so viewers don't get stale copies.

## Viewing

Local: `http://localhost:5500/admin-portal/` (the `designs` server in `.claude/launch.json`).
Published: GitHub Pages from the `main` branch root.

Use dummy data only in published pages - no real customer names, booking refs, emails or internal URLs.

## Screens

| Screen | Sections redesigned | Status | Last change |
|---|---|---|---|
| [Hotel APIs](hotel-apis.html) | Whole page (list, filters, create/edit, history) | Draft | 2026-11-17 |
| [Default Markup (Hotel)](markup-commission.html) | Whole page (list, filters, create/edit, delete, history) | Draft | 2026-11-18 |
| [Hotel Api Logs](hotel-api-logs.html) | Whole page (filters, list, log viewer) | Draft | 2026-11-20 |
