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
    datepicker.css    THE date picker theme (the booking form's calendar: static month title, Sunday first) + date field (.date-input, × clear); booking form loads it too
    select.css        searchable dropdown (every <select>, incl. <select multiple> with chips), Map-UI style — needs js/select.js
    history.css       Edit History cards (Map-UI design) — every History drawer uses it
    skeleton.css      placeholder blocks for un-redesigned sections
  js/
    shell.js          injects the portal header + sidebar; sidebar lists only redesigned screens (MENU)
    datepicker.js     DateRange.init(input, {from, to, onChange, optional, future}); DateField.init(input, {date, min, max, onChange, optional, future}); A filter panel's From / To pairs = .filter-pairs › .filter-pair (components.css) — the one date-range picker (loads flatpickr from cdnjs)
    select.js         turns every <select> into the searchable dropdown (css/select.css); <option data-short> = shorter text once chosen, <select data-panel-width> = wider list
    tooltip.js        shared instant tooltip for any data-tooltip="…"; add data-tooltip-if-icon to show it only while the element's text label is hidden (filter buttons that turn icon-only on a narrow card) (styles in css/components.css)
    history-legacy.js turns old-system history rows (full record per save) into normal history entries: HistoryLegacy.toEntries(rows, keys)
    code-viewer.js    shared read-only file viewer on Monaco (lazy-loaded from cdnjs): CodeViewer.create(host).show(raw) — detects JSON/XML/HTML/text, pretty-prints, folding, find
    table-loading.js  shared skeleton loader: TableLoading.run(tblArea, render) — placeholder rows while a list query runs
    empty-state.js    shared empty table state: EmptyState.row(colspan) — illustration + "No Data Found"
    filters.js        shared filter bar: FilterBar.init(root, {fields, onSearch, onReset}) — count, chips, panel toggle, Search/Reset
    modal.js          shared confirm / info modal: Modal.open({tone, title, message, details, note, confirm}) → Promise<boolean> (css/modal.css)
    data.js           THE single data source. RefData = read-only master lists (currencies, portals, admin users, partners,
                      markets, countries + cities + dial codes, meals, hotels, room types); HotelApis = the saved API list.
                      A page never keeps its own copy of data another page also shows — read it from here. Only data that
                      belongs to one page alone (its own records, enums like booking statuses) lives in the page script.
                      SHARED, SAVED prototype data (localStorage, prefix admin-redesign:) — HotelApis.list etc.; every page reads/writes the same records (Map-UI model). Reset: "Reset Demo Data" at the bottom of the sidebar (js/shell.js → AdminData.reset()).
                      Every supplier dropdown lists HotelApis.list, labelled HotelApis.label(api) = "Name - SHORT" (Supplier List, booking form, Hotel API Logs, Default Markup). api.offline = offline supplier (Offline Supplier List; booking form + All Booking filter too; not in Hotel API Logs / Markup; Make online = offline → false). Every supplier has emails[] + phones[] ({dial, number}; HotelApis.phoneText(p) = "+60 312345678"). Markets: RefData.marketLabel = "Name (CUR)".
                      Saved keys: hotelApis, hotelBookings (manual bookings: All Booking list + booking form), markupRules, markup-overlap-v2 — all through AdminData, so Reset clears everything.
    api-drawer.js     shared supplier create / edit drawer: ApiDrawer.open({api, offline, quick, name, onSaved, onMakeOnline}) — Supplier List, Offline Supplier List + booking form
    <screen>.js       page prototype logic (+ page-only dummy data)
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
- List pages use the shared list layout at the end of `css/table.css`: the list card always fills the screen height, pagination sits at its bottom, rows scroll inside; with few or no rows the space stays inside the table (empty state centred) — never blank page below the card. The table area never goes below 240px: a tall open Filters panel makes the page scroll rather than being cut off.
- Every list query (first load, Search/Reset, filter change, page / rows-per-page) shows the skeleton loader (`TableLoading.run`, js/table-loading.js + `.skeleton` in table.css): header stays, shimmering rows, pagination hidden until the rows land. Saves, deletes and status flips re-render directly.
- Empty lists use `EmptyState.row(colspan)` (js/empty-state.js): the list illustration + "No Data Found" — nothing else, same on every list.
- A cell listing several values uses the shared list cell (`.tbl-list`): "Name PILL | Name PILL" with dividers, always every value — never hidden behind "+N" or "Show more". Values sit left-aligned, as many per line as fit (not justified). Columns that only need their content's width (badges, amounts, status) get `tbl-fit`, so the free width goes to the list columns.
- Confirms and info messages use the shared modal (`Modal.open`, `js/modal.js` + `css/modal.css`), never a page-made `<dialog>`. Tone: `danger` (delete), `warning` (can't-undo changes), `info`, `success`. Put what it's about in `details`, the consequence in `note`.
- Page head: the same height on every page (min 38px, content centred); actions that don't fit go icon-only first (`.btn-new`, `.btn-shrink`). The title block takes the free space (min 180px) so actions stay beside it while they fit. Page actions sit in `<div class="page-actions">` next to the title (never in the filter bar, so every filter bar is identical: same search size at every screen size). The page's "New …" button = `.btn btn-primary btn-new` with its label in `<span class="btn-label">` + `aria-label` + `data-tooltip="…" data-tooltip-if-icon`: just the + once the head is 640px or narrower (other actions marked `.btn-shrink` go icon-only too) (All Booking: 720px, its head holds more actions).
- Tooltips: use `data-tooltip="…"` (`js/tooltip.js`), never `title=""` — the native one is slow and unstyled. Make non-focusable elements `tabindex="0"` so keyboard users get it. Table action buttons keep their `data-tip` CSS tooltip.
- The Action column is always the last column and right-aligned (header and buttons): `<th class="tbl-action-col">` / `<td class="tbl-action-col">`.
- **Same element, same look, on every page** (standing rule). Build UI from the shared components; never restyle one for a single page. Colours come from `css/tokens.css` (no hard-coded hex for brand / red / green / muted).
- **Same words on every page**: sentence case for labels, buttons, headers and messages (page titles in Title Case; sidebar labels and browser-tab titles copy the live portal, see the shell rules); Supplier (the Supplier List page itself says API), Client, Platform type, Percent / Fixed; Create ‹thing› / Save changes; Cancel closes or goes back. Dates: 22-Nov-2026, times 02:15 PM.
- Log pages share `css/logs.css` (viewer drawer + phone cards).
- List filters use the shared **filter bar** (Map-UI hotel-system style): `.filter-bar` in `css/components.css` + `js/filters.js` (`FilterBar.init`). Row: main search box · Search · Filters (count) · Reset (· page actions with `.push-right`); on a card 800px or narrower (where the full row stops fitting) one line of search + Search, Filters (count badge), Reset and any page action (`.push-right`) as 38px icon buttons; the rest in a collapsible labelled `.filters-panel` (columns of at least 190px, as many as fit, stretched to the full width so fields resize with the page; fields that all fit on one row stretch to fill it, no empty slot at the end; a section's fields under a heading go in `.filter-fields` so they do the same; date From / To pairs go in `.filter-pairs` › `.filter-pair`, a full row of their own with 4, 2 or 1 pairs per row by panel width so rows split evenly; To goes under From when one column fits; related fields go in `.filter-groups` › `.filter-group` (a `.filters-section-label` heading + a `.filter-pair`), one group per row, 2 per row once each field gets 160px+, a divider between stacked groups); chips of set filters while it's closed. Fields apply only on Search / Enter; Reset restores defaults and reloads. Used by every list page: Supplier List, Hotel Logs, Hotel API Logs, Default Markup and All Booking.
- Every dropdown is the searchable dropdown (`css/select.css` + `js/select.js`, call `SearchableSelect.init()` after filling options). Write a normal `<select>`; don't opt out of search. `<select multiple>` gives the multi-select version, which stays open while picking (closes on outside click, Esc or Tab); single selects close on a pick.
- Data that more than one page uses lives in `js/data.js` and is saved in the browser (localStorage), so a change on one page shows on the others and survives a reload (same as Map-UI). Save after every change (`HotelApis.save()`, `AdminData.save(key, value)`). Sidebar › Reset Demo Data clears it (every screen except Home, which has no sidebar). Seed data stays dummy.
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
| [Supplier List](hotel-apis.html) | Whole page (list, filters, create/edit, history) | Draft | 2026-11-17 |
| [Offline Supplier List](offline-suppliers.html) | Whole page (list, filters, create/edit, history) | Draft | 2026-11-25 |
| [Default Markup (Hotel)](markup-commission.html) | Whole page (list, filters, create/edit, delete, history) | Draft | 2026-11-18 |
| [Hotel Logs](hotel-logs.html) | Whole page (filters, list, log viewer) | Draft | 2026-11-20 |
| [Hotel Api Logs](hotel-api-logs.html) | Whole page (filters, list, log viewer) | Draft | 2026-11-20 |
| [Hotel All Booking](hotel-bookings.html) | Booking list (manual bookings) + filters; + Add New opens the booking form | Draft | 2026-11-22 |
| [Hotel Booking Form](booking-form.html) | Whole page (manual Add / Edit booking) — own CSS/JS (`css/booking-form.css`, `js/booking-form.js`), not yet on the shared components | Draft | 2026-11-22 |
