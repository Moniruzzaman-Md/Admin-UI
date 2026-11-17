# Hotel APIs — dev notes

Page: `hotel-apis.html` · Live portal: Hotel Management › Hotel API List (`/admin/hotel-management/apis`)
Scope: whole page redesigned (list, filters, create/edit, history). Header and sidebar are the existing shell, unchanged.

## List

- Columns: API (name + API code), Ref. code, Short code, Currency, Status, B2C, Auto issue, Hold booking, actions.
- **Default** is no longer its own column. It shows as a "Default" tag next to the name, only when the API is default.
- **Hold booking** column is new. The field already exists in the create form but wasn't shown in the list → the list endpoint needs to return it.
- Status values: Active / Inactive. B2C, Auto issue, Hold booking: On / Off.
- Default sort: API name A→Z; clicking the API header toggles A→Z / Z→A.

## Filters

- **Search** replaces the "Select Api" dropdown. It matches API name, API code, reference code and short code (case-insensitive, contains).
- **Currency**: "All currencies" + currency list.
- **Status**: All / Active / Inactive. Each shows a count, calculated with the search and currency filters applied.
- Filters apply as you type or change them. The separate search button is removed.
- "Clear filters" appears only when a filter is set, and resets all three.
- Changing any filter goes back to page 1.
- No results → empty state with a clear-filters link.

## Pagination

- "Showing X–Y of Z", previous / page numbers / next, rows per page 20 / 50 / 100 (unchanged options).

## Create / edit (drawer)

- Same fields as before: API name, API code, Reference code, Short code, Currency — all required.
- The five radio pairs become switches: Active, Default, Allow B2C, Auto issue, Hold booking.
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
- Note: in the live portal, DEFAULT / STATUS / B2C STATUS come back empty in history rows — that needs fixing for the diff to work.

## Open questions

1. Descriptions under each switch are my reading of the field — please confirm wording (especially Default and Hold booking).
2. Can more than one API be Default? The live data has several, so the design allows it.
3. Breadcrumb says "API Settings" but the page sits under Hotel Management in the menu — which should it be?

## Changelog

- 2026-11-17 — Whole page redesigned: list, filters, create/edit drawer, history timeline.
