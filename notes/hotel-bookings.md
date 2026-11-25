# Hotel All Booking — dev notes

Page: `hotel-bookings.html` · Live portal: Booking Management (Hotel) › All Booking (`/admin/booking-management-hotel/all`)
Scope: the **booking list** and its **filters** are redesigned.

## Page header

- **Status switcher** (live: "All Booking" next to Download): All booking (default), Confirmed, Reconfirmed, Cancellation in progress, Cancelled, Booking in progress, Failed. Applies at once (no Search needed) and stays as it is on Reset. Combines with the filters.
- **Download**: the list as currently shown (status + applied filters, every page) as a CSV file `hotel-bookings-DD-Mon-YYYY.csv`, one row per booking: the list's columns, with currency and amount in separate columns, plus booking type and payment status. Message: "N bookings downloaded" / "No bookings to download". (Live's file format wasn't checked.)
- **New booking** opens the booking form.

## Booking list

- In the live portal the list holds API bookings (`booking_type: online`) and manual bookings (`booking_type: offline`, made with the booking form) together. API bookings come from the suppliers, so the prototype can't create them: **it lists only manual bookings** (`js/data.js` › `Bookings`, 4 dummy ones to start with; one is dated the day the demo data is first loaded, so the default today list has a row).
- Every manual row carries a **Manual** tag after the booking ID (live has no marker; the type is only visible through the Booking type filter).
- Order: newest booking date first (then the most recently added).
- Columns, in the live order (API field in brackets):
  - Booking ID (`unique_trans_id`) + Manual tag
  - Client name (`agent_name`)
  - Guest name: the lead guest, title + first + last name (`lead_pax_name`)
  - Hotel name (`hotel_name`)
  - Booking date: date + time (`booking_date`)
  - Deadline date: date + time, — when there is none (`deadline_date` / `cancellation_deadline_date`)
  - Check-in / Check-out: date (`check_in`, `check_out`)
  - Supplier code: the supplier's short code (`api_name`); an offline supplier has no short code, so its supplier code is shown. Hover = supplier name.
  - Supplier ref. (`reference_no`)
  - Cost: supplier price in the supplier currency (`total_price_buying` + `original_currency`)
  - Payment: client total in the client currency (`total_price_selling` + `currency`) + payment status icon (`payment_layer.status`: Fully Paid / Refunded / Unpaid; hover = status)
  - Platform type (`platform_type`)
  - Status (`status`): CONFIRMED → Confirmed, RE CONFIRMED → Reconfirmed, CANCELLED → Cancelled
  - Action: **Edit** → the booking form in edit mode for that booking (`booking-form.html?id=…`). Live has View details here instead; there's no details page in the prototype.
- Pagination: 20 / 50 / 100 rows per page.

## Filters

Shared filter bar (same as Hotel API Logs / Markup). Nothing filters until **Search** (or Enter in the search box); **Reset** puts every field back to its default and reloads the list. While the panel is closed, each set field shows as a chip; a chip's × clears that field (applies on the next Search). The Filters button counts the panel fields that differ from their default.

- **Default: today's bookings** (as live): Booking date From = To = today; every other field empty. The default doesn't count or show a chip; Booking date emptied (Clear in both) shows the chip "Any date" and lists every date; its chip × goes back to today.

- **Search box**: Booking ID (contains, any case).
- **Panel fields**
  - Supplier reference, Hotel name, Guest name (lead guest): separate text fields, each its own API parameter (contains, any case).
  - Booking type: Online / Offline (`booking_type`). Every booking in the prototype is Offline, so Online shows no data.
  - Panel sections, in order: Client (Platform type, Client) · Supplier (Supplier, Supplier reference) · Booking (Booking type, Hotel name, Hotel country, Guest name, Staff, Has HCN, Has special request) · Dates.
  - Client depends on Platform type: no platform = Client can't be picked ("Select platform first"); a platform = that platform's clients. Changing the platform empties Client if the chosen client isn't on the new platform's list. B2B clients = partners (disabled partners included, so their old bookings can still be found). Assumption: the prototype has a client list for B2B only; other platforms show "No clients for this platform".
  - Supplier (every supplier: API and offline), Hotel country (countries that have hotels).
  - Staff: the admin user who created or last saved the booking (assumption: live's Staff list was empty, so its source isn't confirmed).
  - Has HCN: Yes = HCN filled. Has special request: Yes = special request filled.
- **Dates** (live: Date Filters drawer; last section of the panel): 4 From / To pairs, as live, each end its own field: Booking date, Status date, Check-in date, Deadline date. Either end may be empty: From only = on or after, To only = on or before, both = between (inclusive). To can't be before From. Booking and status dates can't be in the future; check-in and deadline can. A × in a filled date field clears it. Status date = the booking's last save (the prototype keeps no status history). Chip: "from 01-Jan-2027", "until 31-Oct-2026" or "01-Jan-2027 – 31-Jan-2027".
- All set filters must match (AND).

## Coming back from the booking form

- **Create booking** (no errors) saves the booking to the list with a new transaction ID and returns here; **Save changes** updates the booking. The list then shows "Booking ‹ID› created / updated", opens on the page that holds the row, and highlights the row. If the booking's booking date is before today, Booking date From moves back to that day (To stays today) so the row is in the list.
- A booking created in the prototype starts as **Unpaid** (assumption: payment is recorded later, outside the form).

## Changelog

- 2026-11-22: Page added as a skeleton with the working + Add New entry to the booking form.
- 2026-11-22: Booking list redesigned: shows the saved manual bookings with the live list's columns; Edit opens the form; save in the form comes back here.
- 2026-11-22: Filters redesigned in the shared filter bar (Map-UI style); New booking moved to the page header.
- 2026-11-22: Search box is Booking ID only; Supplier reference, Hotel name and Guest name are separate panel fields (the API filters each one separately).
- 2026-11-22: Status switcher and Download kept outside the filter bar, in the page header (as live); Status removed from the Filters panel.
- 2026-11-22: Date filters are separate From / To fields (4 pairs, as live), each pair in one field's width.
- 2026-11-22: Date fields use the shared date field (calendar icon, "From" / "To" inside); From above To so each pair keeps one field's width. Calendar opens aligned to its field.
- 2026-11-22: List opens on today's bookings (Booking date = today by default, as live); fourth dummy booking dated today.
- 2026-11-22: Date picker = the booking form's calendar (now the shared one); × in the field clears a date (calendar footer removed).
- 2026-11-22: Dates moved to the top of the Filters panel; each From / To is its own field (as on Hotel API Logs), a pair always kept side by side.
- 2026-11-22: Filter fields resize with the page: as many columns as fit, stretched to the full width; From / To stay side by side until only one column fits.
- 2026-11-22: Date pairs always split evenly: 4 per row on wide screens, 2 per row on mid-size, 1 per row below that (never 3 + 1).
- 2026-11-23: On a narrow screen the filter bar is one line: search box + Search, Filters and Reset as icon buttons (count on the Filters icon; Reset always visible).
- 2026-11-25: Supplier filter now also lists offline suppliers (formerly temporary, which were excluded): manual bookings are made with them.
