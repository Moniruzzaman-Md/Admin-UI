# Hotel APIs — dev notes

Page: `hotel-apis.html` · Live portal: Hotel Management › Hotel API List (`/admin/hotel-management/apis`)
Scope: whole page redesigned (list, filters, create/edit, history). Header and sidebar are the existing shell, unchanged.

## List

Uses the **reusable table** (same component as every list; redesigned look, portal shape). Only the columns differ:

- Columns: NAME | API CODE | REF. CODE | CURRENCY | STATUS | SHORT CODE | B2C STATUS | **HOLD BOOKING** | ACTION
- **Hold Booking** is the only new column (Enabled / Disabled). The field already exists in the create form but wasn't listed → the list endpoint needs to return it.
- **Default is removed** from the page entirely — no list column, no form switch, not shown in history.
- **Auto Issue is removed** from the page entirely — no list column, no form switch, not shown in history.
- Hold Booking cell: Enabled + the hold amount (`20%` for Percent, `50 MYR` for Fixed — amount + the API's currency); Disabled otherwise.
- Cell values as today: Active / Inactive, Enabled / Disabled. API code and short code show as code badges. Actions: edit, history (each button names itself on hover).
- **Temporary suppliers**: the name shows a "Temporary" tag and the row has an amber marker on its left edge. Needs a new field on the API (e.g. `is_temporary`) in the list response.
- No column sorting (the reusable table has none) — rows keep the API's order.
- No rows → the table's standard empty state ("No hotel APIs found"); pagination stays, showing 0.
- The list takes the screen's remaining height: rows scroll inside the table, the header row and pagination always stay in view. With few rows the table is only as tall as its rows.

## Filters

- **Search** replaces the "Select Api" dropdown. It matches API name, API code, reference code and short code (case-insensitive, contains).
- **Currency**: "All currencies" + currency list.
- **Status** (dropdown): All statuses / Active / Inactive. Each option shows a count, calculated with the search and currency filters applied.
- Every dropdown on the page (filters, form currency, rows per page) has a search box to type and narrow the options; arrow keys + Enter pick, Esc closes.
- Filters apply as you type or change them. The separate search button is removed.
- "Clear filters" appears only when a filter is set, and resets all three.
- Changing any filter goes back to page 1.
- No results → the table's standard empty state.

## Pagination

- The reusable table's pagination: "Showing X–Y of Z", Previous / pages / Next, Rows 20 / 50 / 100.

## Create / edit (drawer)

- Same fields as before: API name, API code, Reference code, Short code, Currency — all required.
- The radio pairs become switches: Active, Allow B2C, Hold booking. (Default and Auto issue are no longer on the form.)
- **Hold booking on → two more fields appear** under it (as in the portal, `hold_amount_type` + `hold_amount`); hidden while it's off:
  - **Amount type** — Percent / Fixed. Required. Turning Hold booking on picks Percent if nothing is set.
  - **Hold amount** — required, a number ≥ 0 with up to 2 decimals. Unit shown next to it: `%` for Percent, the API's currency for Fixed.
  - Percent can't be more than 100 ("A percent can't be more than 100.").
  - Turning Hold booking off clears both values on save (sent as empty).
  - Both show in history like any other field (e.g. Hold amount 50 → 15).
- New API defaults: Active on, everything else off. *(Assumption — confirm the current form's defaults.)*
- Edit pre-fills every field. Title shows "Edit hotel API" + name and code; button says "Save changes" (create: "Create API").
- Validation on submit: each required field shows its own message.
- **API code and Short code must be unique** (case-insensitive) — the message names the API already using it. *(Assumption — confirm the backend enforces this.)*
- Saving with no changes doesn't write a history entry.
- Success → drawer closes, toast "‹name› created / updated".
- Esc, Cancel, ✕ or clicking outside closes without saving.

## Make permanent

- Only for temporary suppliers. Two ways in: the **Make permanent** action button in the row (temporary rows only), or the "Temporary supplier" notice at the top of the edit drawer.
- Asks to confirm first ("Make ‹name› permanent?"). Cancel / Esc / clicking outside does nothing.
- On confirm: the supplier is permanent right away (no need to save the form), the tag and button disappear, toast "‹name› is now permanent", and history gets "Type: Temporary → Permanent".
- One-way: a permanent supplier can't be made temporary from this page. *(Assumption.)*
- New APIs are created permanent; the form has no Temporary option. *(Assumption — how do temporary suppliers get created?)*

## History (drawer)

- Replaces the snapshot table with a timeline, newest first.
- Each edit shows who, when, and **only the fields that changed**: old value → new value.
- First entry is "Created" with who/when.
- Needs: either the old values stored per edit, or consecutive snapshots so the frontend can diff them.
- Note: in the live portal, STATUS / B2C STATUS come back empty in history rows — that needs fixing for the diff to work.

## Open questions

1. Descriptions under each switch are my reading of the field — please confirm wording (especially Hold booking).
2. Hold amount: the portal pre-fills 0 — is 0 a valid hold amount, or should it be more than 0? Can Fixed go above the booking value? Is the Fixed amount in the API's currency?

3. Temporary suppliers: how are they created, and should an admin also be able to mark one temporary (or back)? Is there anything else that changes for a temporary supplier (e.g. hidden from B2C, expiry date) that the list should show?

## Changelog

- 2026-11-17 — Whole page redesigned: list, filters, create/edit drawer, history timeline.
- 2026-11-17 — List switched back to the portal's reusable table format; only change is the added Hold Booking column.
- 2026-11-17 — Reusable table restyled (same shape and font, new look in the Map-UI style); applies to every list.
- 2026-11-17 — Page subtitle and breadcrumb removed; header is just the title and New API.
- 2026-11-17 — Default removed: list column, form switch and history.
- 2026-11-17 — Hold booking now shows Amount type (Percent / Fixed) and Hold amount when on, as in the portal.
- 2026-11-17 — Status filter is a dropdown; all dropdowns are searchable (Map-UI style). Auto Issue column removed. Status / B2C / Hold cells restyled; Hold shows its amount. List fits the screen height with pagination always visible.
- 2026-11-17 — Auto issue removed from the edit form and history too.
- 2026-11-17 — Temporary suppliers tagged in the list; Make permanent (row action + edit-drawer notice, with confirm).
