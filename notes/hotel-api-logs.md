# Hotel API Logs — dev notes

Page: `hotel-api-logs.html` · Live portal: Logs › Hotel Api (`/admin/logs/hotel-api`)
Scope: whole page redesigned (filters, list, log viewer). Header and sidebar are the existing shell, unchanged.
Data source is unchanged: `POST api/admin/hotel/api-log/get-log` (list) and `POST api/admin/hotel/api-log/download` (file content).

## Filters

Shared filter bar (`js/filters.js`, same as Map-UI hotel-system): a row with the main search box · **Search** · **Filters** (count of set filters + chevron) · **Reset**; the other fields sit in a collapsible **Filters** panel (closed by default) with a label over each field.
- While the panel is closed, each set panel filter shows as a chip ("Portal: B2C ×"); × clears that field (takes effect on the next Search). The count on Filters follows the fields as you change them.
- **Search** (or Enter in the search box) applies every field, closes the panel and goes to page 1. Changing a field alone doesn't reload the list.
- **Reset** puts every field back to its default and reloads right away.
- Row: **Transaction ID**. Panel: From date · To date · Supplier · Operation type · Portal · Include search logs. A date counts as set when it isn't today; the switch counts when on (chip "Search logs: Included").
- **Transaction ID** (text) -> `id`. *(Assumption: backend matches a partial ID; otherwise exact match.)*
- **From date** / **To date** (shared date picker, one date each) -> `from_date` (start of day) / `to_date` (end of day), local time zone as today.
  - Default: today / today. No future dates. Never empty.
  - To can't be before From, From can't be after To (the calendars grey out those days).
- **Supplier** (searchable dropdown) -> `supplierId`. Empty (shows "Supplier") = all; then "Common" (0) and every supplier.
- **Operation type** (searchable dropdown) -> **new param** (e.g. `operationName`). Empty (shows "Operation type") = all; then the 13 operations from the live logs. "Search" is offered only while Include search logs is on (picking it with the switch off would always be empty); turning the switch off clears it.
- **Portal** (searchable dropdown) -> **new param** (e.g. `portal`). Empty (shows "Portal") = all; B2B, B2C, B2C APP, API.
- **Include search logs** (switch) -> `includeSearch`. Off by default. Off = rows of the Search operation are left out (the SearchStream trace still shows, as the live API does).
- Reset defaults: dates = today, switch off, dropdowns empty, Transaction ID empty.
- Clicking a transaction ID in the list puts it in Transaction ID and searches right away (other fields as they are).

## List

Reusable table. Columns: **#** | DATE & TIME | TRANSACTION ID | OPERATION | SUPPLIER. No Action column. Newest first (API order).

- **#** = position in the whole filtered result (row 21 on page 2).
- **Date & Time**: `createdOn` in local time — date line `20-Nov-2026`, time line `06:15:11 PM` (seconds kept: calls of one transaction are seconds apart).
- **Transaction ID** cell: line 1 = ID badge + **copy** button (toast "Transaction ID copied"); line 2 = portal + **timeline button**. The badge and the timeline button open the **transaction timeline** (below).
- Under the operation name: the file name + a **copy** button (copies the full name; toast "File name copied").
- The copy buttons don't open the row.
- **Portal** (new, shown under the transaction ID in small text): where the transaction came from — B2B, B2C, B2C APP, API (and any other channel the system has). Same value on every row of a transaction. **Needs a new field on each log row** (e.g. `portal`, taken from the search/booking request that started the transaction); the list response doesn't have it today.
- **Operation**: `operationName` as is, with `fileName` under it in small text, fitted to the column: the column takes the table's free width; the file name shows whole when it fits, otherwise its start is cut with `…` and the last 12 characters always show. Full name on hover. The Request / Response / Trace ending is coloured (Request blue, Response green, Trace orange; the visible part of `Request[-n]` / `Response[-n]` / `Trace`).
- **Supplier**: name for `supplierId` (0 = "Common").
- **File name column is removed** — the full file name shows under the operation name instead.
- **Opening a file**: the operation name is a button (opens the file; keyboard: Tab to it, Enter; read out as "Open Book response"). Download is in the viewer.
- **Clicking anywhere on a row** opens the file in the viewer (same as the operation name), except the transaction badge, the timeline button and the copy buttons. Selecting text in a row doesn't open it.
- The **last opened file's row stays marked** (soft blue + left bar) after the viewer closes, so you keep your place; it moves as you step through files, and stays marked when the list is reloaded if that file is still on the page.
- Empty: "No hotel API logs found".
- Pagination as today (`per_page` 20 / 50 / 100, `page`), total from `totalRecord`.

### A file = supplier + file name

File names are **not unique**: one Search call (one call ID) goes to several suppliers, and each logs the same names (`Original-Search-…-Request`, `…-Request-1…n`, `…-Response`, `…-Response-1…n`). Everything that identifies a file — the viewer's pair lookup, the last-opened mark, the timeline, `download` (which already takes `apiRef`) — uses **`supplierId` + `fileName`**.

Search in the live logs (checked 2026-11-20): `Common-Search-…-Request` first, then every supplier's requests, then the supplier responses in whatever order they return, and `Common-Search-…-Response` last.

### File name parsing (front end, or have the API return the fields)

`{Layer}-{Operation}[-{Step}]-{TransactionId}-{CallId}-{Type}[-{Part}]`

- Layer: `Common` (our API) or `Original` (the supplier's raw call).
- Step: optional extra word after the operation (seen: `Charge` in `BookingCancellation-Charge`, `Intermediate` in `Book-Intermediate`).
- CallId: one call; its Request and Response (and the Common and Original sides) share it.
- Type: `Request` | `Response` | `Trace`. Part: supplier Search requests/responses can be split into numbered parts.
- Operations in the live logs: Search, SearchStream, Availability, ReCheck, CancellationPolicy, PreBook, Book, BackgroundBooking, BookingDetails, CancellationCharge, CancellationChargeV2, BookingCancellation, BookingCancellationV2 (shown as-is).
- Parse from the right using the known `TransactionId` (= `id`) as the anchor, since Operation/Step contain no `-` but are variable.

## Transaction timeline (drawer)

- Opens from the transaction ID badge or its timeline button — in the list, and in the viewer's info line (the viewer closes, the timeline shows). Header: "Transaction" + the ID badge, **Show in list**, ✕.
- **Built only from `get-log`** (max `per_page` 100, newest first), in **two separate parts** so Search never shares a page with the other calls. Both start together:
  - **Other calls**: `id` = the transaction, `includeSearch: false`, `per_page: 100`, page 1.
  - **Search**: `id` = the transaction, `includeSearch: true`, `operationName: 'Search'` (the new param), `per_page: 100`, page 1.
  - The timeline shows once the first page of the other calls is in (skeleton until then); Search shows a shimmer in its place (before its SearchStream trace) until its first page is in.
  - **Newest first**, like the API: the latest call on top, and inside each call its latest file on top.
  - **Load more** per part when its `totalRecord` is higher than what's loaded: it fetches that part's next page, i.e. **older** files, added at the **bottom** — Search's button under its oldest loaded Search call, the other calls' button at the end of the timeline. Label: "Load more · 132 earlier Search files".
  - A call's duration shows once its part is fully loaded.
  - No page-size increase needed.
- Info line: Portal | date | first – last loaded file time (one time when they're equal).
- **Calls** = files grouped by **call ID + operation** (both read from the file name), newest first. Each call: start time · operation · supplier (the supplier of its supplier-side files, otherwise Common) · duration (last file time − first file time; not shown for a one-file call — log times, so approximate).
- Under each call its files, newest first: file name (shortened, coloured, as in the list) · supplier (for supplier-side files) · time. A call's header lists **every** supplier it went to ("Dida, TBO Holidays"). Clicking a file opens it in the viewer **on top of** the timeline; prev / next walks the timeline's loaded files in order.
- **Show in list**: closes the timeline and shows the same files in the list: Transaction ID = this transaction, **Include search logs on**, From / To = the dates of the first and last loaded file, Supplier / Operation type / Portal cleared, then Search. Rows per page stay as the user has them (20 by default): `per_page` 100 is used only by the timeline's own `get-log` requests. The filter bar's chips show what was set; Reset restores the defaults.
- Esc / ✕ / outside click close the top drawer only (viewer first, then the timeline).
- **To confirm with backend (no code change):** does `get-log` need `from_date` / `to_date` when `id` is given? If yes, the page sends a wide window around the row's date (e.g. ±30 days) — a transaction spanning longer would be cut off.

## Log viewer (drawer, replaces the modal)

- **Previous / next file** (header arrows, "3 of 20"): steps through the list the file was opened from — the current page of the table, or the timeline's files. Keys: ↑ / ↓ (when the focus isn't in the editor or a field); Alt+↑ / Alt+↓ work everywhere. Hidden when there's only one file. The Request | Response switch keeps the position if the other file is in the same list.
- Opens from View. Header: the operation name, then the **Request | Response** switch beside it (when the pair exists); without a switch the title reads `operationName · Type`.
- One compact info line under the header: **Transaction ID | Supplier | full file name** (wraps, never shortened) + copy. No portal and no date/time here (date/time may not be known after switching to the paired file).
- **Request | Response** switch (in the header): shown only when the other file of the pair exists — **same supplier** (`supplierId`) and the same file name with just the last part swapped (`…-Request` ⇄ `…-Response`; a part number like `-3` is kept). The supplier matters: one Search call goes to several suppliers under the same call ID and they log **identical file names** (Dida and TBO Holidays both write `…-Request-4`). Picking the other side opens that file in the viewer. No switch for Trace files or when the other file isn't in the log. No Common / supplier switch and no part picker.
  - Finding the other file: `get-log` with `id` = the transaction (all dates, `includeSearch: true`) and match on `fileName`, or fetch it by name via `download`. No new endpoint needed.
- **Content viewer: Monaco** (the VS Code editor, read-only, VS Code light theme and font). Loaded only when a log is first opened (lazy; ~few MB, then cached). Folding, minimap, sticky headers, VS Code find (Find button or Ctrl+F).
- Content comes from `download` (the response is a JSON-encoded string → decode once to get the raw file). The **format is detected from the content** (the API doesn't say):
  - starts with `{` / `[` and parses → **JSON**, shown indented 2 spaces (files are stored on one line);
  - `<!DOCTYPE html` / `<html` → **HTML**, shown as is;
  - `<?xml` or another tag → **XML**, indented if it arrived on one line;
  - anything else → **Text**, as is (e.g. SearchStream traces).
- Bar above the content: **format dropdown** (JSON / XML / HTML / Text) · file size · **Find** · Wrap switch (off by default) · **Copy** (the shown, formatted text) · **Download** (the raw file as stored, named `<fileName>.<json|xml|html|txt>` by its format).
- **Format dropdown**: starts on the detected format; picking another shows the same file as that format (JSON is laid out if it parses, otherwise shown as is with JSON colours; one-line XML is indented). Opening another file starts from its own detected format again. Download uses the chosen format's extension. Backend request: store the format when writing the log (from the supplier's `Content-Type`) and return it, so the guess is only a fallback for old logs.
- **Loading** (`download` takes time): the header, info line and Request | Response switch show at once (they come from the list row); the content area shows a **skeleton of code lines** until `download` returns. Meanwhile Format, Find, Copy and Download are disabled and the size is a shimmer. Wrap stays usable.
  - Only the **latest** request counts: pressing next several times quickly shows only the file you land on (earlier responses are ignored).
  - Each file is fetched **once per page visit** and kept (files never change), so going back with prev / next or the Request | Response switch is instant.
  - **Error** (request fails or times out): "Couldn’t load this file" + the reason + **Try again** (fetches it again) in place of the content; the bar stays disabled. Prev / next and close still work.
- **File size**: UTF-8 bytes of the raw file (the string from `download`, after decoding its JSON wrapper), not of the formatted view. Under 1 KB → `457 B`; under 10 KB/MB one decimal (`2.1 KB`, `3.4 MB`), above that whole numbers (`48 KB`); 1 KB = 1024 B. Exact bytes on hover (`2,150 bytes`). Better still: the API returns the size with the log so nothing is measured in the browser.
- **Implementation note:** the portal's global `*{font-family:Poppins,sans-serif !important}` also reaches inside Monaco — code turns proportional and its icons (fold arrows, find box) become boxes. Exempt the editor: code text → `Consolas, 'Courier New', Menlo, Monaco, 'Droid Sans Mono', monospace !important`; `.codicon` → `font-family: codicon !important` (see `css/components.css`, `.cv-host …`), then `monaco.editor.remeasureFonts()`.
- Esc closes Monaco's find box first; with it closed, Esc closes the drawer.
- Esc, ✕ or clicking outside closes.

## Phones (≤ 640px wide)

Tablet and desktop are unchanged.

- **Filters**: Transaction ID takes the full row; Search, Filters and Reset share the next row equally.
- **List**: each row becomes a card, and the page scrolls (no scroll area inside the card):
  - line 1: operation name (opens the file);
  - line 2: the **full** file name, wrapped (no hover on phones, so nothing is cut), + copy;
  - line 3: transaction ID + copy, portal, timeline button;
  - line 4: date · time on the left, supplier on the right.
  - Tapping a card opens the file, as on desktop. The last opened card stays marked. The `#` column isn't shown.
- **Transaction timeline**: header row "Transaction" · Show in list · ✕, the transaction ID on its own row below. File rows use the full width (no indent under the call time); a call's line reads operation · supplier · time · duration.
- **Log viewer**:
  - Header row 1: operation name + ✕; row 2: Request | Response switch and prev / next.
  - Find, Copy and Download are icon buttons, so the bar stays on one row.
  - **Wrap starts on** and the minimap is off, so the content uses the full width without scrolling sideways. The Wrap switch still turns it off.

## Changelog

- 2026-11-20 — first version.
- 2026-11-20 — dummy data uses the live operation names and file patterns.
- 2026-11-20 — "API" → "Supplier" in the filter, list column and viewer.
- 2026-11-20 — Operation shows `operationName` only (step/part line removed); viewer title likewise.
- 2026-11-20 — file name shown under the operation name, shortened like the portal.
- 2026-11-20 — Type column removed; the file name's Request / Response ending is coloured instead.
- 2026-11-20 — Portal column (new field) in the list and the viewer's info strip.
- 2026-11-20 — Portal merged into the Transaction ID column (under the ID).
- 2026-11-20 — filter bar: separate From / To dates, Operation type + Portal filters, Search and Reset buttons (fields apply on Search).
- 2026-11-20 — filter bar restyled like Map-UI hotel-system: search box + Search · Filters (count) · Reset, collapsible labelled panel, chips when closed.
- 2026-11-20 — file name length follows the column width (no fixed 30 characters); last 12 always shown.
- 2026-11-20 — Action column: View only (Download moved to the viewer only).
- 2026-11-20 — viewer: only a Request | Response switch (file-name pair); Common / supplier switch and part picker removed.
- 2026-11-20 — viewer info strip: Date & Time removed; full file name shown.
- 2026-11-20 — viewer made compact: switch moved into the header, info on one line, so the file content gets the most room.
- 2026-11-20 — viewer info line: Transaction ID | Supplier | File name (portal removed).
- 2026-11-20 — viewer content in Monaco (read-only): JSON / XML / HTML / text detected from the content, folding, minimap, VS Code find; download keeps the file's own format.
- 2026-11-20 — file size back in the viewer bar: B / KB / MB, exact bytes on hover.
- 2026-11-20 — viewer: code font and icons protected from the portal's global Poppins rule (VS Code font, 14px).
- 2026-11-20 — viewer: format label is now a dropdown to correct a wrong guess.
- 2026-11-20 — row click opens the viewer, last opened row marked; prev / next in the viewer; transaction timeline (badge click — "Show in list" now does the old filter-by-transaction).
- 2026-11-20 — visible timeline button next to every transaction ID (list + viewer).
- 2026-11-20 — timeline built from paged get-log (100 max): non-search calls first, Search counted then loaded on demand 100 at a time.
- 2026-11-20 — timeline: Search fetched in its own query (all pages in parallel) and shown in full; no "Show files" button.
- 2026-11-20 — timeline: first 100 per part + Load more (earlier files); Show in list turns search logs on, sets dates and 100 rows, clears other filters.
- 2026-11-20 — timeline newest first (API order); Load more adds older files at the bottom.
- 2026-11-20 — dummy data: supplier Search parts are Request-N / Response-N pairs (as in the live logs), so the Request | Response switch works on them.
- 2026-11-20 — files identified by supplier + file name (live: one search call goes to several suppliers with identical file names); Search has a Common Request; timeline lists all suppliers of a call and the supplier per file.
- 2026-11-20 — Show in list keeps the user's rows per page (20 by default); per_page 100 only for the timeline's requests.
- 2026-11-20 — list: copy buttons for transaction ID and file name; timeline button moved next to the portal.
- 2026-11-20 — viewer: skeleton while `download` loads, bar disabled meanwhile, error state with Try again; files kept once loaded; only the latest request shows.
- 2026-11-20 — list: Action column (View) removed; the operation name opens the file (the row click still does).
- 2026-11-20 — phones: list rows as cards with the full file name; timeline and viewer headers on two rows; viewer bar with icon buttons, Wrap on and no minimap; filter buttons share one row.
- 2026-11-20 — sidebar: moved from Hotel Management to its live parent, Logs › Hotel Api.
