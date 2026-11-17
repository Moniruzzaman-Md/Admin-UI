# Hotel APIs — dev notes

Page: `hotel-apis.html` · Live portal: Hotel Management › Hotel API List (`/admin/hotel-management/apis`)
Scope: whole page redesigned (list, filters, create/edit, history). Header and sidebar are the existing shell, unchanged.

## List

Uses the **reusable table** (same component as every list; redesigned look, portal shape). Only the columns differ:

- Columns: NAME | API CODE | REF. CODE | CURRENCY | STATUS | SHORT CODE | B2C STATUS | AUTO ISSUE | **HOLD BOOKING** | ACTION
- **Hold Booking** is the only new column (Enabled / Disabled). The field already exists in the create form but wasn't listed → the list endpoint needs to return it.
- **Default is removed** from the page entirely — no list column, no form switch, not shown in history.
- Cell values as today: Active / Inactive, Enabled / Disabled. API code and short code show as code badges. Actions: edit, history (each button names itself on hover).
- No column sorting (the reusable table has none) — rows keep the API's order.
- No rows → the table's standard empty state ("No hotel APIs found") and no pagination.

## Filters

- **Search** replaces the "Select Api" dropdown. It matches API name, API code, reference code and short code (case-insensitive, contains).
- **Currency**: "All currencies" + currency list.
- **Status**: All / Active / Inactive. Each shows a count, calculated with the search and currency filters applied.
- Filters apply as you type or change them. The separate search button is removed.
- "Clear filters" appears only when a filter is set, and resets all three.
- Changing any filter goes back to page 1.
- No results → the table's standard empty state.

## Pagination

- The reusable table's pagination: "Showing X–Y of Z", Previous / pages / Next, Rows 20 / 50 / 100.

## Create / edit (drawer)

- Same fields as before: API name, API code, Reference code, Short code, Currency — all required.
- The radio pairs become switches: Active, Allow B2C, Auto issue, Hold booking. (Default is no longer on the form.)
- New API defaults: Active on, everything else off. *(Assumption — confirm the current form's defaults.)*
- Edit pre-fills every field. Title shows "Edit hotel API" + name and code; button says "Save changes" (create: "Create API").
- Validation on submit: each required field shows its own message.
- **API code and Short code must be unique** (case-insensitive) — the message names the API already using it. *(Assumption — confirm the backend enforces this.)*
- Saving with no changes doesn't write a history entry.
- Success → drawer closes, toast "‹name› created / updated".
- Esc, Cancel, ✕ or clicking outside closes without saving.

## History (drawer)

- Replaces the snapshot table with a timeline, newest first.
- Each edit shows who, when, and **only the fields that changed**: old value → new value.
- First entry is "Created" with who/when.
- Needs: either the old values stored per edit, or consecutive snapshots so the frontend can diff them.
- Note: in the live portal, STATUS / B2C STATUS come back empty in history rows — that needs fixing for the diff to work.

## Open questions

1. Descriptions under each switch are my reading of the field — please confirm wording (especially Hold booking).

## Changelog

- 2026-11-17 — Whole page redesigned: list, filters, create/edit drawer, history timeline.
- 2026-11-17 — List switched back to the portal's reusable table format; only change is the added Hold Booking column.
- 2026-11-17 — Reusable table restyled (same shape and font, new look in the Map-UI style); applies to every list.
- 2026-11-17 — Page subtitle and breadcrumb removed; header is just the title and New API.
- 2026-11-17 — Default removed: list column, form switch and history.
