# Supplier List — dev notes

Page: `hotel-apis.html` · Live portal: Hotel Management › Hotel API List (`/admin/hotel-management/apis`)
Scope: whole page redesigned (list, filters, create/edit, history). Header and sidebar are the existing shell, unchanged.

## List

Uses the **reusable table** (same component as every list; redesigned look, portal shape). Only the columns differ:

- Columns: **#** | NAME | SUPPLIER CODE | REFERENCE CODE | CURRENCY | STATUS | SHORT CODE | ALLOW B2C | **HOLD BOOKING** | ACTION
- **Contacts** action (first in Action, before Edit and History; address-book icon, tip "Contacts") opens the **Contacts drawer** (title "Contacts — ‹name›"). The button is **always active** — the list response needs no contact data or counts; the drawer loads the supplier's contacts when it opens (short skeleton while loading).
  - Two groups, **Emails** then **Phones** (a group with none is left out), each with an icon and its title; a group with 2+ values has **Copy all** on the right (emails joined with "; " — ready for a mail To field — phones with ", "; toast "Copied N emails / phones"; the link shows "✓ Copied" for 1.5 s).
  - Each value is its own row: the value (a phone shows its country code as a small chip, then the number), then **Send email** (opens a new email in a new tab — the mail app or webmail) / **Call** (`tel:`), then **Copy** (that value; the icon turns into a green tick, tip "Copied", toast "Copied ‹value›"; if the browser blocks it: "Couldn't copy — select the text instead").
  - None → empty state "No contacts added".
  - Footer: **Close** and **Edit contacts** ("Add contacts" when there are none) — closes this drawer and opens the supplier's edit drawer.
- **Hold Booking** is the only new column (Enabled / Disabled). The field already exists in the create form but wasn't listed → the list endpoint needs to return it.
- **Default is removed** from the page entirely — no list column, no form switch, not shown in history.
- **#** is the row's position in the whole filtered result, not within the page (first row on page 2 at 20 per page is 21). It follows the filters and is not an ID.
- **Auto Issue is removed** from the page entirely — no list column, no form switch, not shown in history.
- Hold Booking cell: Enabled / Disabled only. Hold booking has no charge, so there is no hold amount.
- Cell values as today: Active / Inactive, Enabled / Disabled. Supplier code and short code show as code badges. Actions: edit, history (each button names itself on hover).
- API suppliers only (`is_offline = 0`); offline suppliers are on Offline Supplier List.
- Sorted newest first (highest ID first, so a supplier just created is row 1). No column sorting (the reusable table has none).
- No rows → the table's standard empty state ("No Data Found"); pagination stays, showing 0.
- The list takes the screen's remaining height: rows scroll inside the table, the header row and pagination always stay in view. With few rows the table is only as tall as its rows.

## Filters

Shared filter bar (same as All Booking, Hotel API Logs, Hotel Logs, Default Markup).

- **Search box** replaces the "Select Api" dropdown. It matches Supplier name, Supplier code, reference code, short code and email (case-insensitive, contains), and phone by digits (3+ digits; spaces / + / hyphens ignored).
- **Filters** panel: **Currency** (empty = any; currency list) and **Status** (empty = any / Active / Inactive, no counts). The Filters button counts the set dropdowns; while the panel is closed each one shows as a chip, and a chip's × clears it (applies on the next Search).
- Every dropdown on the page (filters, form currency, rows per page) has a search box to type and narrow the options; arrow keys + Enter pick, Esc closes.
- Nothing filters until **Search** (or Enter in the search box).
- **Reset** clears the search box and both dropdowns and reloads the list.
- Changing any filter goes back to page 1.
- No results → the table's standard empty state.

## Pagination

- The reusable table's pagination: "Showing X–Y of Z", Previous / pages / Next, Rows 20 / 50 / 100.

## Create / edit (drawer)

- **Contacts** section (Emails, Phones) — same as on Offline Supplier List: optional, any number, one box each, + Add email / + Add phone, × removes a box; email format, phone `+` country code with 7–15 digits, no repeats. Rules: `notes/offline-suppliers.md` › Contacts.

- Same fields as before: Supplier name, Supplier code, Reference code, Short code, Currency — all required.
- The radio pairs become switches: Active, Allow B2C, Hold booking. (Default and Auto issue are no longer on the form.)
- **Hold booking is a plain on/off switch — no charge.** The old `hold_amount_type` + `hold_amount` fields are gone from the form, list and history; send them empty / stop using them.
- New supplier defaults: Active on, everything else off. *(Assumption — confirm the current form's defaults.)*
- Edit pre-fills every field. Title: "Edit supplier · ‹name›", no subtitle; button says "Save changes" (create: "Create supplier").
- Validation on submit: an empty required field gets a red border only (no message); a filled but wrong value says why ("Already used by ‹supplier›", "Another supplier already has this name"). Supplier name, Supplier code, Reference code and Short code are unique (not case-sensitive).
- **Supplier code and Short code must be unique** (case-insensitive) — the message names the API already using it. *(Assumption — confirm the backend enforces this.)*
- Saving with no changes doesn't write a history entry.
- Success → drawer closes, toast "‹name› created / updated".
- Esc, Cancel, ✕ or clicking outside closes without saving.

## Offline suppliers

- Offline suppliers (formerly temporary suppliers) are **not on this page**: they have their own list, Offline Supplier List (`notes/offline-suppliers.md`). This page lists online (API) suppliers only; New supplier here always creates an online supplier.
- An offline supplier made online there (**Make online**) moves to this page. An online supplier can't be made offline.

## History (drawer)

Same as the Map-UI screens' Edit History. Title: "History — ‹name›".

- One card per entry, newest first, each labelled "Entry N of M".
- Each card: user name + email, date (DD-Mon-YYYY) + time (hh:mm AM/PM), then an **operation** and a **description**.
- Operations:
  - **Create** — no summary text, just the starting values as a labelled grid: Supplier name, Supplier code, Short code, Reference code, Currency, Status, Allow B2C (Enabled / Disabled), Hold booking (Enabled / Disabled).
  - **Status Change** — only Status changed. No summary text: old → new status pill, then what it means: "Used for search and booking again." / "No longer used for search or booking." (If Status changes together with other fields in one save, it is an Edit row instead.)
  - **Edit** — everything else. No summary text: one row per changed field: label, old value (struck through) → new value. One save = one entry. Hold booking, amount type and amount show as one "Hold booking" row (e.g. "Enabled · 50 MYR → Enabled · 15%").
  - Values in every entry use the list's wording: Active / Inactive, Enabled / Disabled, codes as code chips.
- Saving with no changes writes nothing.
- Needs per entry: operation, the changed fields with old + new values (or the full snapshot for Create), user name, user email, timestamp.
- Note: in the live portal, STATUS / B2C STATUS come back empty in history rows — that needs fixing for this to work.
- No history → "No history yet".
- **Legacy history** (saves made in the old system) continues the same timeline, after the current entries, in the same cards — no tabs, no separate look. "Entry N of M" counts both; old-system entries have "Old system · " before it.
  - The old log (`get-log`) stores one row per save with the **full record as it was after that save** (not a diff), who (name + email) and when (UTC). Creates were never logged.
  - Each old row is compared with the one before it: what differs becomes a normal **Edit** (old → new rows) or **Status Change** (only Status differed) entry, using the same field labels and wording as today.
  - The **oldest** old row: what it changed isn't known (no earlier row, no create row), so it shows as an Edit card with all its values as a field grid (no summary text).
  - An old save that changed no field shown here (e.g. only a removed field) gets no entry — same rule as today.
  - A field missing from an old row (added to the log later) is not compared.
  - Records created after the switch have a Create entry and no legacy rows; records from before it have no Create entry.
  - Old fields used: api_name, api_code, short_code, api_reference_code, currency_code, is_active, is_allowed_for_b2c, is_allowed_for_book_and_hold (Hold booking row; old hold_amount_type / hold_amount ignored — hold has no charge). Ignored: is_default, is_auto_ticket_allow, color_code (removed from the page). The old modal's blank STATUS / B2C STATUS were a display bug — the data has them.

## Open questions

1. Descriptions under each switch are my reading of the field — please confirm wording (especially Hold booking).
2. ~~Temporary suppliers~~ — replaced by offline suppliers on their own list (2026-11-25).

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
- 2026-11-17 — Make permanent only in the edit drawer (row button removed); Temporary tag removed, amber row marker kept.
- 2026-11-17 — History drawer matches the Map-UI Edit History (entry cards, operation pills, user + email, date + time).
- 2026-11-17 — History Create entry shows the starting values as a labelled field grid.
- 2026-11-17 — History Edit / Status Change entries show one old → new row per changed field.
- 2026-11-17 — History Status Change entries say Activated / Deactivated with old → new status and what it means.
- 2026-11-17 — Serial number (#) column added.
- 2026-11-17 — Small "Temp" pill after a temporary supplier's name.
- 2026-11-17 — Amber row stripe for temporary suppliers removed; the Temp pill is the only marker.
- 2026-11-17 — History drawer: Temp pill after the supplier name in the title (while temporary), and as the Type value (Temporary) in Create and Edit entries.
- 2026-11-18 — Drawer subtitle removed; the API name moved into the title.
- 2026-11-18 — History drawer title is "History — ‹name›" (matches Markup Commission).
- 2026-11-18 — Status filter counts removed.
- 2026-11-18 — "Make permanent" confirm uses the shared modal (API name + code, "can't be changed back here" note).
- 2026-11-19 — Legacy history (old system's log) shown in the same timeline and cards: each old save as an Edit / Status Change, the oldest as an Edit card with all its values.
- 2026-11-19 — Create entry: summary text removed. Old-system entries marked "Old system · Entry N of M".
- 2026-11-19 — Status Change ("Activated" / "Deactivated") and Edit ("N fields changed") summary text removed.
- 2026-11-19 — "Earliest recorded settings" removed too: no summary text on any history entry.
- 2026-11-20 — "Clear filters" replaced by the Reset button used on the other lists (always shown).
- 2026-11-22 — The API list is shared with the booking form and saved in the browser: an API created or changed here or from the booking form (Supplier / API › "Other — add temporary supplier") shows on both and survives a reload. Home › Reset demo data restores the seed list. Create / edit drawer is the shared one (js/api-drawer.js).
- 2026-11-22 — The Temporary supplier notice shows only when editing a temporary API (not in the booking form's New temporary hotel API drawer).
- 2026-11-22 — Temporary APIs may have no Reference code (seed temporary examples cleared to match); Make permanent requires it and saves the drawer's values.
- 2026-11-22 — Temporary APIs may have no Short code either (seed temporary examples cleared); Make permanent requires it.
- 2026-11-22 — A temporary API is created Active with Allow B2C on (not asked in the booking form's drawer); seed temporary examples match. Both stay editable here.
- 2026-11-22 — "ALL" removed from the Currency list: an API (supplier) has exactly one currency. Manual Contracts seed now MYR.
- 2026-11-22 — Currency list = the system's currencies from the shared reference data (12); history emails from the shared admin users.
- 2026-11-22 — API code and Short code take capital letters only: lower case typed or pasted turns upper case as you type.
- 2026-11-22 — API code and Short code: capital letters A–Z and digits 0–9 only; lower case turns upper case, other characters (spaces, hyphens, symbols) are dropped as typed or pasted.
- 2026-11-22 — Editing a temporary API shows only the temporary form's fields; Make permanent reveals Reference code, Short code, Active, Allow B2C and requires the codes before the confirm. Pressing Save instead keeps the API temporary without those values.
- 2026-11-22 — An empty required field shows only a red border (no "Enter …" / "… is required" message); messages stay for a filled but wrong value.
- 2026-11-22 — History: a temporary supplier's Create entry says "Created from Manual Booking" and shows only its form's fields (API name, API code, Currency, Type, Hold booking). Make permanent is one Edit entry: the filled Reference code / Short code (— → value) + Type Temporary → Permanent. Seed temporary suppliers match (Create entry, no old-system rows, no Active / B2C edits).
- 2026-11-22 — List is latest first: the newest API (created last, incl. temporary suppliers from the booking form) is row 1. Filters keep that order.
- 2026-11-22 — Removed the "Created from Manual Booking" line from the Create history entry (and its stored source).
- 2026-11-22 — Make permanent is two steps in the drawer: the notice's **Make permanent** shows Reference code, Short code, Active, Allow B2C (empty codes marked red) and turns the footer button into **Make permanent** (the notice's button hides); the footer button checks the permanent rules, asks to confirm, saves and closes the drawer. Cancelling the confirm keeps the drawer in that step. (Before, pressing Save changes after filling the codes kept the API temporary and dropped them.)
- 2026-11-22 — Consistency pass: table headers read API code · Reference code · Short code · Allow B2C · Hold booking (same words as the drawer; history says Allow B2C too). Toolbar dropdowns show "Currency" / "Status" while empty, like the other filters. API names must be unique (two suppliers with one name can't be told apart in a dropdown). The Make permanent confirm shows the form's values (name, codes) instead of the saved ones. Pager total uses thousands separators. Reset is in the sidebar (Reset Demo Data).
- 2026-11-22 — Menu item **Api List** renamed **Supplier List** (tab title "Hotel Supplier List", page title "Supplier List"). Where the page meant a supplier it now says supplier: New supplier / Create supplier, drawer title "New supplier" / "Edit supplier · ‹name›" / "New temporary supplier", Supplier name, Supplier code (list header, drawer, history, Make permanent confirm), switch descriptions, "Another supplier already has this name."
- 2026-11-22 — Reference code must be unique too: a code another supplier has shows "Already used by ‹supplier›" (red border + message), on save and on Make permanent.
- 2026-11-23 — Filters use the shared filter bar, as on every other list page: search box (name or code) + **Search**, **Filters** and **Reset**; Currency and Status are in the Filters panel. Nothing filters until Search (or Enter in the search box); the Filters count and chips show the set dropdowns; a chip's × clears that dropdown (applies on the next Search); Reset clears everything and reloads.
- 2026-11-24 — Hold booking has no charge: Amount type and Hold amount removed from the drawer, list cell and history; Hold booking is just Enabled / Disabled.
- 2026-11-25 — Temporary suppliers became **offline suppliers** with their own list (Offline Supplier List). This page now lists API suppliers only: the Temp pill, the Make permanent notice + confirm and the history's Type row are gone.
- 2026-11-25 — Online suppliers get **Emails** and **Phones** too (optional, any number): Contacts section in the drawer, Email and Phone columns, search, history. Offline suppliers can be **made online** from Offline Supplier List; history shows Type Offline → Online.
- 2026-11-25 — Email and Phone columns merged into one **Contact** column: a button with the email / phone counts that opens a Contacts drawer listing each with a Copy button.
- 2026-11-25 — Phone in Contacts is taken as Country code (dropdown) + Number (digits), as on Offline Supplier List.
- 2026-11-25 — Contact column removed: Contacts is now an icon button in Action (no email / phone counts; disabled when there are none).
- 2026-11-25 — Contacts stay optional for online suppliers (offline suppliers need at least one email or phone). Make online doesn't require contacts.
- 2026-11-25 — Contacts button always active (no disabled state, so the list needs no contact counts); the drawer loads the contacts on open and shows "No contacts added" when there are none.
- 2026-11-25 — Menu item renamed **Supplier** ("List" dropped). Page title unchanged.
- 2026-11-25 — Contacts drawer redesigned: group headers with Copy all, a row per value with Send email / Call + Copy, country code as a chip, empty state, footer Edit contacts / Add contacts.
- 2026-11-25 — Contacts drawer: Send email opens in a new tab.
- 2026-11-25 — Fix: Send email opened in the same tab in Firefox (it ignores target="_blank" on mailto links); the new tab is now opened by script.
