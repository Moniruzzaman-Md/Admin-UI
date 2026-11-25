# Offline Supplier List — dev notes

Page: `offline-suppliers.html` · Live portal: Hotel Management › **Offline Supplier List** (new menu item, after Supplier List)
Scope: whole page (list, filters, create/edit, history). Header and sidebar are the existing shell, unchanged.

Offline suppliers replace the temporary suppliers: suppliers with no API, booked by email / phone (manual bookings only). They are the same supplier records as Supplier List (`hotel_api`) with a flag (`is_offline = 1`, replaces `is_temporary`), plus contact lists. Everything not listed here works as on Supplier List (`notes/hotel-apis.md`): reusable table, pagination, filter bar, drawer behaviour, history.

## List

- Offline suppliers only (`is_offline = 1`), newest first.
- Columns: **#** | NAME | SUPPLIER CODE | CURRENCY | STATUS | HOLD BOOKING | ACTION (Contacts, Edit, History).
- No Reference code, Short code or Allow B2C columns: offline suppliers don't have them.
- No "Offline" tag on this page (every row is offline). The tag shows only where both kinds are listed together (booking form).
- **Contacts** action (first in Action, before Edit and History; address-book icon, tip "Contacts") opens the **Contacts drawer** (title "Contacts — ‹name›"). The button is **always active** — the list response needs no contact data or counts; the drawer loads the supplier's contacts when it opens (short skeleton while loading).
  - Two groups, **Emails** then **Phones** (a group with none is left out), each with an icon and its title; a group with 2+ values has **Copy all** on the right (emails joined with "; " — ready for a mail To field — phones with ", "; toast "Copied N emails / phones"; the link shows "✓ Copied" for 1.5 s).
  - Each value is its own row: the value (a phone shows its country code as a small chip, then the number), then **Send email** (opens a new email in a new tab — the mail app or webmail) / **Call** (`tel:`), then **Copy** (that value; the icon turns into a green tick, tip "Copied", toast "Copied ‹value›"; if the browser blocks it: "Couldn't copy — select the text instead").
  - None → empty state "No contacts added".
  - Footer: **Close** and **Edit contacts** ("Add contacts" when there are none) — closes this drawer and opens the supplier's edit drawer.

## Filters

- **Search box**: Supplier name, Supplier code and email (contains, any case); phone by digits (3+ digits typed, spaces / + / hyphens ignored — "60 3 1234" finds "+60 3 1234 5678").
- **Filters** panel: Currency, Status — as on Supplier List.

## Create / edit (drawer)

Same drawer as Supplier List. Title "New offline supplier" / "Edit offline supplier · ‹name›"; buttons "Create supplier" / "Save changes".

- **Details**: Supplier name, Supplier code, Currency — all required. Same rules as Supplier List: Supplier code capitals A–Z + digits only; name and Supplier code unique across **all** suppliers, API and offline ("Another supplier already has this name." / "Already used by ‹supplier›.").
- **Contacts** (every supplier has them — online suppliers on Supplier List too):
  - **Emails** and **Phones** — any number of each. An **offline supplier needs at least one email or phone** (either is enough). A line under the Contacts heading says so: "Add at least one email or phone." Online suppliers: both optional, no line.
  - Saving an offline supplier with neither → red border on the first email box and the first phone number box (no message; the line above explains it). Typing an email or a phone number clears both. A country code alone doesn't count.
  - Each value has its own box. **+ Add email / + Add phone** adds a box; × removes one (no × while there is only one box). Empty extra boxes are ignored on save.
  - Email must look like an email (`name@domain.tld`): "Enter a valid email address, e.g. name@supplier.com."
  - Phone = **Country code** + **Number**, taken separately on one row. Country code: searchable dropdown of the system's countries (list shows "+60 Malaysia", the field shows "+60"; search by code or country). Number: digits only (anything else is dropped as typed or pasted), 6–15 digits: "Enter 6–15 digits." A number without a country code → red border on the code (no message). A new phone row starts with the row above's country code. A row with a code but no number is ignored.
  - The same email (any case) or phone (same code + number) twice in one supplier: "Already added above."
  - Only a wrong box turns red, not the whole list.
  - Saved in the order entered. The first email / phone is the one the list shows first.
- **Status & booking options**: Active, Hold booking (on/off, no charge). New: Active on, Hold booking off.
- Not on the form (offline suppliers don't have them): Reference code, Short code (saved empty), Allow B2C (saved on, as temporary suppliers were).
- An offline supplier can be made online (below); an online supplier can't be made offline.

## Make online

- Only when editing an offline supplier: an "Offline supplier" notice at the top of the drawer ("Make it online once it is connected by API.") with a **Make online** button. Not in the booking form's quick-add drawer, no row action.
- Step 1 (the notice's button): shows Reference code, Short code and Allow B2C in the drawer (Allow B2C keeps its saved value, on); empty codes get a red border; the footer button becomes **Make online** (the notice's button hides).
- Step 2 (footer **Make online**): checks the online rules — every Supplier List field required (incl. Reference code, Short code), codes unique, contacts valid (but not required: online suppliers may have none). Wrong fields are marked and nothing happens; once they pass, a confirm opens.
- Confirm (shared modal, info): "Make ‹name› online?" · "It moves to Supplier List and is no longer marked Offline." · Supplier name, Supplier code, Reference code, Short code (the form's values) · note "It can't be made offline again." · **Make online** / Cancel. Cancel / Esc / outside click keeps the drawer in step 2.
- On confirm: the drawer's values are saved, the supplier is online at once (`is_offline = 0`), the drawer closes, it leaves this list and shows on Supplier List; toast "‹name› is now online (Supplier List)".
- Pressing Save changes after step 1 is the same as the footer Make online (the footer button is Make online then).
- History: one Edit entry — the filled codes (— → value), any other changed fields, and **Type Offline → Online**.
- One-way. Bookings already made with it keep pointing to the same supplier.

## History (drawer)

Same cards as Supplier List. Fields: Supplier name, Supplier code, Currency, **Emails**, **Phones**, Status, Hold booking. After Make online the supplier's history (on Supplier List) keeps its offline entries; its Create still shows the offline fields.

- Create: those fields as a grid; Emails / Phones one per line.
- Edit: changing the emails or phones (add, remove, change, reorder) is one row each: the old list (struck through) → the new list, one value per line.
- Only Status changed → Status Change entry, as on Supplier List.

## Where offline suppliers appear

- **Booking form › Supplier**: listed with API suppliers (active only), with an **Offline** tag in the list and in the field. Footer "Other — add offline supplier" opens this drawer (no Active switch there: always created Active). Payload `supplier_type` = `API` / `OFFLINE`.
- **All Booking › Supplier filter**: listed (manual bookings are made with them). Supplier code column shows their Supplier code (no short code).
- **Not listed**: Hotel API Logs (no API, so no logs) and Markup (manual bookings carry their own markup; the backend rejects an offline supplier on a rule).

## API needs

- `hotel_api.is_offline` (replaces `is_temporary`; existing temporary suppliers → offline).
- Contacts endpoint per supplier (called when the Contacts drawer opens; the list response doesn't need them): `emails[]` (strings) and `phones[]` = `[{ country_code: "+60", number: "312345678" }]` (ordered), in the list, create / update and history (old + new list). Shown everywhere as `+60 312345678`; phone links dial `+60312345678`.
- List endpoint: filter by `is_offline`; search also matches emails and phone digits on this page.

## Open questions

1. ~~Are emails and phones required?~~ — both optional (2026-11-25).
2. ~~Split phone into country code + number?~~ — yes, separate (2026-11-25).
3. Should the emails / phones have a label each (e.g. Reservations, Accounts), or is a plain list enough?
4. Markup: confirm offline suppliers never have markup rules.
5. Make online: should the confirm also warn about anything else (e.g. markup rules to set up, B2C)?

## Changelog

- 2026-11-25 — New page. Temporary suppliers became offline suppliers with their own list (Hotel Management › Offline Supplier List): Emails and Phones (one or more each) added; tag "Temp" → "Offline"; Make permanent removed.
- 2026-11-25 — Emails and Phones are optional (were required, at least one each).
- 2026-11-25 — **Make online** added (edit drawer notice → shows Reference code, Short code, Allow B2C → confirm → moves to Supplier List; history Type Offline → Online). Contacts now on online suppliers too.
- 2026-11-25 — Email and Phone columns merged into one **Contact** column (button → Contacts drawer with a Copy button per email / phone).
- 2026-11-25 — Phone is taken as **Country code** (dropdown) + **Number** (digits, 6–15) instead of one box; saved as `{country_code, number}`.
- 2026-11-25 — Contact column removed: Contacts is now an icon button in Action (no email / phone counts; disabled when there are none).
- 2026-11-25 — Offline suppliers need at least one email or phone (online suppliers: still optional). Also in the booking form's quick-add.
- 2026-11-25 — Contacts button always active (no disabled state, so the list needs no contact counts); the drawer loads the contacts on open and shows "No contacts added" when there are none.
- 2026-11-25 — Menu item renamed **Offline Supplier** ("List" dropped). Page title unchanged.
- 2026-11-25 — Contacts drawer redesigned: group headers with Copy all, a row per value with Send email / Call + Copy, country code as a chip, empty state, footer Edit contacts / Add contacts.
- 2026-11-25 — Contacts drawer: Send email opens in a new tab.
- 2026-11-25 — Fix: Send email opened in the same tab in Firefox (it ignores target="_blank" on mailto links); the new tab is now opened by script.
