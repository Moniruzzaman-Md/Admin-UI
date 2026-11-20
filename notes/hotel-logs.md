# Hotel Logs — dev notes

Page: `hotel-logs.html` · Live portal: Logs › Hotel (`/admin/logs/hotel`)
Scope: whole page redesigned (filters, list, log viewer). Header and sidebar are the existing shell, unchanged.
Data source is unchanged: `POST api/admin/hotel/search-log` (list) and `GET api/admin/hotel/hotel-log-json?id=<row id>&type=request|response` (file content).

What this page lists: the agents' calls to our hotel API. One row = one call (`type`), with a Request file and a Response file. (Hotel Api Logs lists our calls to the suppliers, a different log.)

## Filters

Shared filter bar, same as Hotel Api Logs: main search box · **Search** · **Filters** (count of set filters) · **Reset**; the other fields sit in the collapsible **Filters** panel.
- Fields apply only on **Search** (or Enter in a text box), then the list goes to page 1. **Reset** restores the defaults and reloads right away.
- While the panel is closed, each set panel field shows as a chip ("Agent: skyway ×"); × clears it (applies on the next Search).
- Row: **Transaction ID** -> `unique_transaction_id`.
- Panel: **From date** / **To date** -> `from_date` / `to_date` (default today / today, no future dates, To can't be before From) · **Agent** (text, name or SL number) -> `agent_sl_or_name` · **Operation type** (searchable dropdown) -> **new param** (e.g. `type`). Empty = all; then the 10 operations seen in the live log: search, paginated_search, availability, reprice, cancellation_policy, prebook, booking, booking_details, v2_cancellation_charges, v2_cancel_booking.
- A date counts as set when it isn't today.

## List

Reusable table. Columns: **#** | DATE & TIME | AGENT | TRANSACTION ID | OPERATION | IP ADDRESS. No Action column. Newest first (API order).

- **#** = position in the whole filtered result.
- **Date & Time**: `date` in local time, date line `20-Nov-2026`, time line `06:15:11 PM`.
- **Agent**: `agent_name`, with `agent_sl_no` under it (the two live columns merged). Empty agent (the system's own calls, e.g. booking_details from 127.0.0.1, and some calls the API couldn't match to an agent) -> `—`.
- **Transaction ID**: badge; clicking it copies the ID (doesn't open the row).
- **Operation**: `type` as is.
- **IP Address**: `ip`.
- **Clicking a row** (anywhere except the badge) opens the call in the viewer. Keyboard: Tab to the row, Enter / Space. Selecting text in a row doesn't open it.
- The last opened row stays marked after the viewer closes.
- The row's Request / Response / Download buttons are gone: all three are in the viewer.
- Empty: the shared "No Data Found".
- Pagination as today (`per_page` 20 / 50 / 100, `page`), total from `dataCount`.

## Log viewer (drawer, replaces the Request / Response modals)

- Header: the operation (`type`) + **Request | Response | Side by side** switch.
- Info line: Transaction ID (click copies) | agent name + SL ("No agent" when empty) | IP.
- Opens on **Response**. The switch choice is kept for the next row opened during this visit (pick Request once, the next call opens on Request).
- **Side by side** (screens 1100px+ wide only): Request left, Response right, each in its own pane with its own bar.
- **No request file** (`request_file_path` empty, seen live): Request and Side by side are disabled for that call; it shows the Response.
- Content: `hotel-log-json` returns the stored JSON (wrapper `unique_transaction_id`, `log_id`, `type`, `timestamp`, `data_type`, `data`), shown whole, indented. Monaco viewer, same as Hotel Api Logs: Format dropdown · size · Find · Collapse all · Wrap · Copy · Download.
- **Download**: the file shown, named like the live download: `<type>-<transaction ID>-<request|response>.json`.
- **Loading**: header, info line and switch show at once (from the list row); the content shows a code skeleton until `hotel-log-json` returns; Format, Find, Copy, Download are disabled meanwhile. Each file is fetched once per visit. Only the latest request counts.
- **Error**: "Couldn’t load this file" + the reason + **Try again**.
- **Copy feedback**: the clicked element itself shows success for 1.5 s, same size (badge "Copied ✓", viewer Copy a tick); no toast. A failed copy shows the toast "Couldn’t copy".
- Esc, ✕ or clicking outside closes (Esc closes Monaco's find box first).

## Phones (≤ 640px wide)

- List rows become cards: operation + IP / transaction ID / agent + date, time. Tapping a card opens the viewer.
- Viewer: title + ✕, then the switch; bar buttons become icons; Wrap on.

## Changelog

- 2026-11-20 — first version.
- 2026-11-20 — viewer: minimap removed.
