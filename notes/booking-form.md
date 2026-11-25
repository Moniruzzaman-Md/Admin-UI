# Hotel Booking Form — how it works (developer note)

Page: `booking-form.html` · Live portal: Booking Management (Hotel) › All Booking → **+ Add New** (`/admin/booking-management-hotel/booking-form?returnUrl=…`). Not a sidebar item; the sidebar highlights All Booking.
Scope: the whole form, Add and Edit. The header and sidebar are the existing shell, unchanged.
**This note is the complete guide for people building or testing the form**: every field, rule, calculation, message and payload field, plus how to test it (§13). It describes behaviour only (values, rules, conditions), not styling; the prototype shows the look.
The AI note (`notes/booking-form-auto-markup.ai.md`) covers the same feature for an AI coding assistant. The two must always agree; if they ever don't, this note wins.

**Prototype only (not part of the design):** the dashed controls at the top right.
- **Open edit sample / Open Add form** switches between a new booking and Edit for the newest saved booking (`?mode=edit`). All Booking › Edit opens a saved booking (`?id=…`).
- **Remarks: With remark | No remark** (edit only, when the booking has a remark) previews both read-only states. It only changes the screen and is never saved.
- **How it works / AI note** open these two notes.
- Saving stores the booking in the browser (`js/data.js` › `Bookings`) instead of the backend. With errors, a payload preview appears under the form.

## 1. Page structure

Every section is a full-width row, in fill-in order:

1. Booking source & pricing
2. Auto calculate markup (only while Auto calculate is ticked)
3. Hotel details
4. Contact details
5. Contracting comment & special requests
6. Rooms & guests
7. Cancellation policies
8. Price summary (read-only)
9. Remarks (Back office only)

A sticky save bar at the bottom shows Client total price, Cancel and **Create booking** / **Save changes**. After a save attempt with problems it also shows "n fields need attention" ("n to fix" on phones), which jumps to each problem in turn.

**Saving**
- **Save with problems:** nothing is saved. The problems are marked and the page goes to the first one (§9).
- **Save with no problems:** the booking is created (Add) or updated (Edit), and the page returns to All Booking.
  - All Booking shows and highlights the row with "Booking … created" / "Booking … updated".
  - A booking dated before today widens All Booking's default "today" Booking date filter back to its day, so the row still shows. (An older booking saved without a Booking date, from before it was required, clears that filter instead.)
- **Back (←) and Cancel** return to `returnUrl` (All Booking) without saving.

**Opening a saved booking (Edit)**
- Every saved value loads as it was saved. Room prices count as typed, so Auto calculate markup won't overwrite them.
- Bookings saved before a feature existed get that feature's "old booking" default, and load and save exactly as before:
  - Auto calculate markup is **off** (No. of rooms blank).
  - Auto calculate client policy is **off**.

**Rounding:** every money value is rounded to 2 decimals (half up) at each step shown in this note. Rates keep up to 6 decimals.

### Collapsing and section summaries
- Each section collapses with its arrow button only (clicking the header does nothing). The arrow reports open / closed to screen readers.
- A **collapsed** section shows a one-line summary in its header, plus a red **"n fields required"** pill when something is missing. Open sections show neither (the fields are visible).
- **"n fields required"**: before a save attempt it counts the section's empty required fields plus anything already shown in red there. After a save attempt it counts what's shown in red, so it matches the save bar. Clicking it opens the section and goes to the first one: text fields get the cursor, dropdowns get a highlight (they'd open on focus), and a missing policy goes to its "+ Add … policy" button.
- A locked section (one that waits for an earlier field) counts nothing. Its header already says what it waits for.
- Summaries never wrap. A long value is cut with "…", and on narrower screens less important items are dropped (below).

| Section | Summary (collapsed) | Counted as required |
|---|---|---|
| Booking source & pricing | Supplier · Supplier ref · Platform · Client "Name (ID: 1034)" · Rate "1 USD = MYR 4.034783" · Markup "10.12%" / "MYR 50.00 per room", + "auto" | supplier, supplier currency, supplier ref, conversion rate, platform, client, client currency, market, markup type (auto on) or markup amount (auto off, type chosen) |
| Auto calculate markup | Total client price · Total supplier price · No. of rooms | the three inputs (not while locked) |
| Hotel details | "(reconfirmed) on 12 Oct 2026" (booking status in lower case, then the booking date) · hotel name · category as its own item, the number and the Category field's star icon "4★" (tooltip "4 stars"; not shown when there is no category) · city, country · "20 Feb → 23 Feb 2027 (3)" (nights in brackets) · HCN | hotel name, address, country, city, booking date, check-in, check-out |
| Contact details | email · mobile with country code | email, country code, mobile |
| Rooms & guests | Meal · n rooms · n guests "3 adults; 1 child [5]" | every room's missing fields added up (the pill opens the first room that has any) |
| Cancellation policies | All rooms: Supplier n · Client n (auto) · Free cancellation until … · Per room: Rooms set x/n · Free cancellation until … | each missing policy, empty fees on rows without Full price, UTC hours (UTC chosen), offset hours (client auto) |
| Price summary | n rooms · Supplier · Converted · Markup (rule) · Client total | none (read-only) |
| Remarks | the remark's first line, or "No remarks" | none (optional) |

"Rooms set" counts rooms with at least one supplier policy (and a client one while client policies are typed). "Free cancellation until" is the booking's cancellation deadline in the chosen time format ("—" until it can be worked out).

### Screen sizes
- No sideways scroll from 320 px up. Checked at 320, 375, 600, 768, 900, 1024, 1280, 1440 and 1920 px, sections open and collapsed.
- Hotel details: 4 fields a row on wide screens (Name · Address · Country · City / Telephone · HCN · Booking date · Deadline / Check-in · Check-out · Booking status · Category), then 2, then 1. Contact details: email beside country code + mobile on wide screens. Contracting comment and Special requests sit side by side and always share one height.
- Section header at 900 px and narrower: title, pill and arrow on the first line; the collapsed summary gets its own line below. Rooms & guests' "Rooms filled" + Recalculate also go under the title.
- Booking source summary as space shrinks: Platform is dropped first (≤1240 px section width), then Supplier ref (≤1060 px), then Client (≤700 px). Supplier, Rate and Markup always show.
- Hotel details summary as space shrinks:
  - City is dropped first (≤1240 px section width).
  - HCN is dropped while the summary shares the title's line at 901–1060 px, and again at ≤760 px.
  - The status is dropped at ≤640 px.
  - On phones only the hotel name shows (not the status).
  - With no status the brackets are left out; with no booking date "on …" is left out; with neither it reads "No status".
- Price summary summary as space shrinks: Converted is dropped first (≤1060 px section width), then Supplier (≤760 px). Client total always shows.
- Cancellation policies summary: the Client count is dropped at ≤640 px, so "Free cancellation until" always shows.
- A closed room's summary always keeps Client price in view: the room type is cut with "…" first, then Supplier price, then the guests, then the room type are dropped, one at a time and only while the line still doesn't fit (the "n fields required" pill takes room too, so this is measured, not a fixed width).
- Phones (≤560 px): each summary shows its first item only, and a closed room's summary sits under its title with Remove as an icon.
- **Phones (≤560 px) also:**
  - Fields use 16 px text, so phones don't zoom the page when a field is tapped. Clear (×) buttons are larger to tap.
  - Room: Room no. is hidden (the header already says "Room: 1").
  - Guest fields: Title | Type, then First name, Last name, Gender (beside Age for a child), Nationality, each long value on its own full row.
  - Guest header stays on one line; at ≤400 px the guest's Remove is icon-only (accessible label kept). A duplicate-name message gets its own line under the header.
  - A locked section's "Select … first" sits under the title.
  - Price summary: each room (and the Total) is a card of label | amount rows instead of a wide table, so nothing scrolls sideways.
  - Settings rows (≤640 px only): the box reads "Auto calculate client policy · Offset [36 h] before the supplier" and, under a line, "One policy for all rooms"; the UTC controls and the Offset each get their own line. Wider screens keep the original single row.
  - Phones (≤560 px): calculation lines (room client price, client policy fee) wrap under their label instead of being cut.
  - Save bar (phones, ≤560 px): Client total price on the top row (or "n to fix" and the total), then Cancel | Save side by side.

## 2. Booking source & pricing

- **Supplier** (required): one list, "Suppliers", of active API suppliers and offline suppliers (`Name - SHORT CODE`; offline ones have no code and show an **Offline** tag). The footer **"Other — add offline supplier"** opens the New offline supplier drawer (same fields and rules as Offline Supplier List; always created Active). Text typed in the search is put in Supplier name. Create supplier saves it, selects it and toasts "‹name› added to Offline Supplier List".
- **Supplier currency** comes from the supplier and can't be changed.
- **Supplier reference no.** is required.
- **Platform type** (B2B only) → **Client** (required; filtered by platform; shows name + ID, searchable by both) → **Client currency** (required) → **Market** (required; the markets in that client currency, e.g. `Malaysia (MYR)`). Each is disabled until the one before it is set and cleared when it changes.
- **Conversion rate** "1 USD = x MYR" and **Reverse rate** "1 MYR = y USD": typing either fills the other with `1 ÷ value`, rounded to 6 dp. The rounded value is the one used in every calculation and sent in the payload (typing a reverse rate of 0.212766 gives a rate of 4.699999, not 4.69999906…). Both are disabled until both currencies are set. The same currency on both sides fixes both at 1. Changing a currency clears both.
- **Markup type** (Percent / Fixed) and **Markup amount** (required once a type is chosen, unless Auto calculate is on).
- **Edit mode:** Supplier, Supplier currency, Platform type, Client, Client currency and Market are locked ("Set when the booking was created"). Everything else stays editable.
- Amounts can't be entered before their currency. Clicking a locked field focuses what it waits for. A currency cleared after amounts were entered keeps them but flags them and blocks Save.

## 3. Auto calculate markup

Optional. An "Auto calculate" tick on the Markup amount label, **on by default for a new booking**. Bookings saved before this feature open with it off.

**Why:** agents quote the client a total first and book later. By then the supplier price may have changed, but the client still pays the quoted total, so the markup is worked out backwards from the quote.

- **On:** Markup amount becomes read-only. The Auto calculate markup section appears, with three required inputs: **Total client price** C (client currency), **Total supplier price** S (supplier currency) and **No. of rooms** N (1–9).
  - **New booking:** S is filled with Σ room prices if it's empty and every room has a price. N starts **blank** and must be entered.
  - **Edit:** all three are filled from the booking (C = current client total, S = Σ room prices, N = room count), so ticking changes nothing until a value is changed.
- **Off:** Markup amount is typed again and keeps the calculated value. The three inputs keep their values.
- **Waits for** supplier → client → client currency → conversion rate → markup type. The header names the first missing one, and clicking it goes there.
- **Maths:** `cost = round2(S × r)`, `diff = C − cost`. Fixed markup = `round2(diff ÷ N)` per room. Percent = `round2(diff ÷ cost × 100)`.
- **Worked examples** (each must come to exactly C):
  - **Fixed** (rate 4.7, C 1000.00, S 100.00, N 3):
    - cost 470.00, diff 530.00, rule 176.67 per room
    - prices 33.33 / 33.33 / 33.34 (balance)
    - converted 156.65 / 156.65 / 156.70
    - client 333.32 / 333.32 / **333.36** (last room's markup 176.66, adjustment −0.01); total **1000.00**
  - **Percent**, same inputs: rule 112.77 %, total 1000.00.
  - **Edit sample** (Percent, rate 4.034783, C 1839.44, S 414, N 3):
    - cost 1670.40, rule 10.12 %
    - rooms 138 / 138 / 138; client 613.15 / 613.15 / **613.14** (adjustment −0.01)
  - **C < cost** is an error at once: "Can't be lower than the cost: MYR 470.00 (supplier price × rate)."
- **Rooms follow N:**
  - Raising N adds rooms (copying Room 1's type).
  - Lowering N removes only untouched rooms it added. Rooms with data are never removed; the mismatch is flagged instead.
- **Prices:**
  - Rooms 1…N−1 get `round2(S ÷ N)` unless typed by hand.
  - **The last room takes the balance**, S − the others. It's read-only, labelled "Price (supplier · balance)".
  - Its client price is also a balance, C − the other rooms' client prices, so the booking total is exactly C.
  - Either balance below 1.00 is an error on that room ("Balance is USD -124.00. Must be at least 1.00 — …").
- **Rooms & guests header:**
  - **"Rooms filled: x/n"** pill: green when x = n, red otherwise.
  - **Recalculate** returns every room to the equal split. It's disabled when nothing differs, or when there are more rooms than N.
  - **+ Add room** reads "+ Add room: x/n" and is disabled once all n rooms are there ("All 3 rooms added"). It turns red when rooms are missing.
- **Save checks:** markup type and the three inputs are required, C ≥ cost, and the room count must match N.
- **Payload:**
  - `price_secret.markupAuto`, `quotedClientPrice`, `quotedSupplierPrice` and `quotedNoOfRooms` (null when off).
  - `rooms[].markup_amount` is that room's actual markup.
  - `rooms[].rounding_adjustment` is what the last room absorbed (null otherwise).
- **Decided:** No. of rooms 1–9; Percent rounded to 2 decimals. **The developer confirms the payload names with the backend.**

## 4. Hotel details

- **Hotel name, Address, Country, City, Booking date, Check-in and Check-out are required.**
- City is disabled until Country is set, filtered by it, and cleared when it no longer matches.
- **Check-out must be later than check-in** (not the same day). The check-out calendar starts the day after check-in. A clash shows "Check-out must be after check-in." at once and blocks Save. The night count is shown beside Check-out.
- **Booking date** is required (empty → red border on Save) and can't be in the future (the picker and Save both check).
- **Deadline date & time** is read-only, worked out from the client policies as Hotel_API does (`BookCHelper.GetEarliestPaidCancellationDate`): the earliest From of a client policy with a fee above 0, across all rooms. With only free policies it's now − offset hours, where "now" is kept from the first save. It shows "Waiting for client policy" / "…fees" until it can be worked out.
- **Booking status:** CONFIRMED / RE CONFIRMED / CANCELLED, disabled until a supplier is picked.
- Telephone, HCN and Category (1–5 stars, clearable) are optional. Booking status comes before Category.
- The booking ID beside the "Hotel details" title (edit only) uses the same size and weight as the other values on the page, in a distinct colour (amber on the blue header) so it stands out. Copying it selects the ID only, without the ": " before it.
- Dates display as `DD Mon, YYYY` (24-hour) and are stored as `YYYY-MM-DD`, `YYYY-MM-DDTHH:mm`, or `YYYY-MM-DDTHH:mm:ss` for policies.

## 5. Contact details and comments

- **Contact details:** Email (valid format), Country code (searchable, "+60 Malaysia") and Mobile (digits only, 6–15). All three are required.
- **Contracting comment:** rich text (bold, italic, underline, numbered and bullet lists). Sent as `JSON.stringify([html])`, or null when it has no text. Render it as sanitised HTML.
- **Special requests:** plain text, optional.

## 6. Rooms & guests

- **Meal** (top, optional): searchable by name or code, shown `Half Board (HB)`, sent as `meal_info.fullMealDetails` with the meal name only (`Half Board`), as the hotel API's `fullMealDetails` holds it.
- **Rooms are an accordion.**
  - Saved rooms load closed. A new booking's empty first room starts open.
  - **+ Add room** opens the new room and closes the rooms that were opened automatically. A room the user opened stays open until they close it.
  - Going to an error inside a closed room opens it.
  - Open / closed is screen state only and is not saved.
- **A closed room's header:** "Room: 2 · Superior Twin Room · 3 guests 1 adult; 2 children [5, ?] · Supplier price USD 138.00 · Client price MYR 613.15", plus "n fields required". Child ages show "?" until entered. Clicking the pill opens the room on its first empty field.
- **Room fields:**
  - **Room type** (required; Room 1's type fills every other room whose type is empty or still copied).
  - **Room no.** (automatic, renumbered on remove).
  - **Price** (supplier currency, required; new rooms copy Room 1's price).
  - **Client price** (read-only).
- **The calculation line** beside the Client price label (`138.00 × 4.034783 = 556.80 + 56.35 (10.12%)`) starts with an ⓘ and opens the **price breakdown** in the shared modal (click, Enter or Space):
  - **Header:** "Room: N", with the line "Client Price Calculation Breakdown" under it.
  - **Table:** Supplier price, Rate ("USD 1 = MYR 4.034783"), Converted, Markup (rule), Client price.
  - **Adjusted last room** (Auto calculate, rounding difference ≠ 0), modal 640 px wide:
    - The first table shows the room *before* the adjustment.
    - A second table adds: Total supplier price, Converted total price, Total markup, Total client price, All room client price sum, Rounding difference, Room N adjusted price (`613.15 − 0.01 = MYR 613.14`).
    - Info note: each room is rounded to 2 decimals, so the rooms can add up to slightly more or less than the total; the difference is added to the last room. The difference is always rounding, even after hand-edited prices, because the last room's supplier price is a balance.
- **Guests:**
  - Title (required; sets Gender: Mr → Male, Ms / Mrs → Female; still editable).
  - First name and Last name (required).
  - **No duplicate guest names:** no two guests, in the same room or different rooms, may have the same first + last name (case and extra spaces ignored). The later guest's First and Last name turn red at once (counted as one problem), and the guest's header says who already has the name: "Guest 2: David Brown is already Guest 1 in this room." (or "… in Room 1."). On phones the message sits on its own line under the header. Save is blocked until one name is changed.
  - Type (Adult / Child), and Age for a child (0–12, required; typing more is capped at 12).
  - Gender and Nationality (`Bangladesh (BD)`).
  - **+ Add guest: n to room m.** A room's last guest and the last room can't be removed (no Remove is shown).
  - **Each room needs an adult** ("Each room needs at least one adult.").
  - A child can't be the lead guest. Switching the lead to Child unticks it, and a child has no Lead guest tick.
- **Lead guest:**
  - Exactly one, across all rooms, and adults only. Room 1's first guest is ticked by default.
  - The lead's **Nationality is required**.
  - Only the lead's nationality is passed on, and only to guests with none. New guests start with the lead's nationality. Changing any other guest's nationality changes that guest only.
  - `lead_pax_name` = the lead's first + last name.
- **Pricing per room:**
  - `converted = round2(price × rate)`.
  - Markup: Percent = `round2(converted × rule ÷ 100)`; Fixed = the rule per room.
  - Client price = converted + markup.
  - Totals are sums.

## 7. Cancellation policies

- **Waits for** what the client policy is calculated from: supplier → platform → client → client currency → rate → markup amount (when a type is chosen) → room prices (Percent), plus the three auto inputs while Auto calculate markup is on. The header shows the first missing one, and clicking it goes there. Time format is locked too.
- **Time format** (one setting for all policies): Local (default) or UTC with sign, hours (required; 0–14 for +, 0–12 for −) and :00 / :30 / :45. Sent as `timeFormat` on each policy and as `cancellation_time_format`.
- **One policy for all rooms** (on), or per room ("Room {no}: {type}").
- **Essential information** starts filled with "In Case Of Early Exit Or No Show 100% Of The Fee Shall Be Applicable." for every new policy section. It's editable.
- **At least one policy:** one supplier policy (per room: one for each room). Client policies count too while they're typed. A missing one blocks Save, and its Add button turns red ("+ Add at least one supplier policy[ for this room]").
- **Policy dates:**
  - From empty = "until"; To empty = "onwards".
  - A new policy's From = the previous To + 1 s, and keeps following it until changed.
  - **To can't be before From**: "To can't be before From." shows at once and blocks Save. The same time is allowed.
- **Fees:**
  - **A fee can't exceed the price it covers**: supplier fee ≤ supplier price, typed client fee ≤ client price (totals for all rooms, the room's price per room). The check runs at once, with "Can't be more than the total supplier price: USD 240.00.".
  - **Full price** tick: the fee becomes read-only and equals the covered price. It follows price changes and stays empty until that price is known.
  - **Paired across sides:** the client and supplier policy in the same row always share the Full price state.
- **Auto calculate client policy** (switch; on for new bookings; off for bookings saved before it existed). It follows Hotel_API (`APICommonHelper.ConvertCancellationPolicy`, `HotelMapperManager.CalculateCancellationPrice`):
  - One read-only client policy per supplier policy.
  - **From = supplier From − offset − 1 s; To = supplier To − offset − 2 s.** The Offset is in hours (0–720, required, default 36).
  - **Fee = supplier fee × rate + the markup of the rooms covered.** A 0 fee stays 0. A full-price supplier policy gives a full-price client fee (= the covered client price). Fees are capped at the client price.
  - With Auto calculate markup on, the rooms' actual markups are used (including the last room's rounding).
  - **The fee's working** (`414.00 × 4.034783 = 1,670.40 + 169.04 markup`) sits beside the Cancellation fee label and looks like the room's calculation line (ⓘ, link colour). Clicking it opens the shared modal, titled **Client Cancellation Policy: n** with "Cancellation Fee Calculation Breakdown" under it: Supplier fee, Rate, Converted, Markup (short rule, e.g. "(10.12%)"), Client fee. A Full price or capped fee also shows Converted + markup and a note explaining the difference.
  - **Switching it off asks first** (shared modal: Keep on / Turn off), and the calculated policies stay as an editable start.
  - Payload: `client_policy_from_supplier`, `client_policy_hours_before`.

## 8. Price summary and remarks

- **Price summary** (read-only):
  - One row per room (type, guests, supplier price, converted, markup, client price) and a Total row.
  - Above the table: the supplier, the rate and the markup rule. Once every price is known, the rate · markup line looks like a room's calculation line (ⓘ, link colour) and opens the shared modal, titled **Price Summary** with "Client Total Price Calculation Breakdown" under it: the same five rows as a room's (Supplier price, Rate, Converted, Markup "(10.12%)", Client total price). With Auto calculate markup, one note line shows how the rule was worked out ("Auto calculated: 169.04 ÷ 1,670.40 = 10.12%.").
  - Below the table: the calculation (a link like the rate · markup line; opens the same Client Total Price breakdown), a note when a room's markup includes a rounding balance, and Client total price.
- **Remarks (Back office only):**
  - An optional admin-only note, **written only when the booking is created**.
  - On an edit it shows read-only, with line breaks kept ("No remarks" when empty). It's never sent to the client or supplier.
  - Payload: `remarks` on create only; an edit doesn't send it.

## 9. Validation model

- Checking starts on the first Save: nothing is red before that, except values that are wrong whatever happens, which show at once. Those are:
  - client price below cost
  - last-room balance below 1.00
  - fee above price
  - To before From
  - two guests with the same name
  - check-out not after check-in
  - invalid UTC offset
  - room-count mismatch (warning)
- **An empty required field shows only a red border**, with no message. Messages are only for wrong values and rule explanations.
- The save bar's "n fields need attention" counts what's red, in page order. Each click goes to the next one, opening its section and room.
- Locked fields (waiting for a currency or earlier choice) aren't counted. Hidden fields are skipped.

## 10. Payload

Field by field. Fields marked *add only* are not sent on Edit. `unique_trans_id` is sent on Edit only.

| Field | Value |
|---|---|
| `supplier_type` *(add only)* | `API` / `OFFLINE` |
| `supplier_id`, `platform_type`, `customer_id`, `supplier_currency`, `customer_currency`, `market_id` *(add only)* | the Booking source choices |
| `remarks` *(add only)* | text, or null |
| `unique_trans_id` *(edit only)* | the booking ID |
| `total_price` | client total |
| `hotel_name`, `address`, `country_name`, `city`, `hotel_phone_number`, `hcn`, `reference_no` | text |
| `booking_date` | `YYYY-MM-DD HH:mm:ss` |
| `check_in`, `check_out` | `YYYY-MM-DD` |
| `cancellation_deadline_date` | `YYYY-MM-DD HH:mm:ss`, or null |
| `star_rating` | 1–5 or null |
| `status` | `CONFIRMED` / `RE CONFIRMED` / `CANCELLED` |
| `lead_pax_name` | lead's first + last name |
| `guest_email`, `contact_country_code`, `contact_mobile` | contact details |
| `contact_no` | country code + mobile, e.g. `+60123456789` |
| `rooms[]` | `room_no` ("1"…), `room_type`, `supplier_price`, `supplier_currency`, `converted_price`, `markup_amount` (that room's actual markup), `rounding_adjustment` (null unless set), `price` (client), `currency` |
| `guests[]` | `room_no`, `title`, `first_name`, `last_name`, `full_name`, `type` (Adult / Child), `child_age` (children only, else null), `gender`, `nationality`, `nationality_code`, `is_lead` |
| `meal_info.fullMealDetails` | the meal name, e.g. `Half Board`, or null |
| `supplier_name` | supplier name |
| `original_total_price` | Σ supplier prices |
| `original_price_breakdown.original_currency` | supplier currency |
| `price_secret` | `supplier`, `supplierCurrency`, `supplierPrice`, `conversionRate`, `reverseConversionRate`, `convertedPrice`, `markupType` (Percent / Fixed / null), `markupRule`, `markupAmount` (Σ room markups), `noOfRooms`, `portalCurrency`, `finalPrice`, `sameCurrency`, `markupAuto`, `quotedClientPrice`, `quotedSupplierPrice`, `quotedNoOfRooms` (the `quoted*` fields are null when Auto calculate is off) |
| `contracting_comment` | `JSON.stringify([html])`, or null |
| `special_request` | text |
| `cancellation_time_format` | `Local` or e.g. `UTC+5:30` |
| `client_policy_from_supplier` | true / false |
| `client_policy_hours_before` | offset hours, or null when off |
| `cancellationPolicyResponse[]` | One entry for all rooms (`roomNo` null, `onePolicyForAllRoom` true, `roomType` = Room 1's), or one per room (`roomNo` "1"…, false, that room's type). Each has `essentialInformation`, `warning: []` and `hotelCancellationPolicies[]`, client policies first, then supplier ones. An entry with no policies isn't sent. |
| `hotelCancellationPolicies[]` | `fromDate` / `toDate` (`YYYY-MM-DDTHH:mm:ss` or null), `cancellationPrice`, `currency` (client or supplier), `timeFormat`, `isAPI` (true = supplier policy), `isFullPrice` (true when Full price is ticked, and also for client policies calculated from a Full price supplier policy) |

The backend must accept a last-room markup that differs from `markupRule` by the rounding, and must not re-derive room prices from the rule.

## 11. Code map (prototype)

- `booking-form.html`: markup for every section.
- `js/booking-form.js`:
  - `state` → `derive()` (all maths) → `refresh()` (renders, locks, live checks) → `validate()` (on save).
  - `CARD_SUMS` holds each collapsed section's summary parts and required fields; `updateCardHeads()` renders them.
  - `roomUi`, `setRoomOpen()` and `updateRoomHeads()` handle the room accordion; `fitRoomSums()` drops closed-room summary items that don't fit (also on resize).
  - `explainRoom()` builds the price breakdown modal.
  - `buildPayload()` builds the payload.
- `js/modal.js`: the shared modal.
  - `details` takes a `null` entry, which starts a second table.
  - `noteIcon` picks the note's icon.
  - `width` (px number or CSS length) widens it, never past the window.
  - It always fits the window height, scrolling its body.
- `js/data.js`:
  - `Bookings` stores the saved bookings (localStorage `admin-redesign:hotelBookings`).
  - The edit sample is NZH100000000012345: 3 rooms, Auto calculate on, with a back-office remark.
- `js/hotel-bookings.js` (All Booking): after a save it shows and highlights the row. A booking saved without a Booking date clears that filter so it still shows.

## 12. Messages

Only wrong values and rule explanations have messages. Empty required fields show a red border only.

| Where | Message |
|---|---|
| Email | Enter a valid email. |
| Mobile | Enter 6–15 digits. |
| Booking date | Booking date can't be in the future. |
| Check-out | Check-out must be after check-in. |
| Conversion rate | Conversion rate is required and must be more than 0. |
| An amount whose currency was cleared | Select {supplier / client} currency first — this amount has no currency. |
| Total client price | Can't be lower than the cost: {CUR amount} (supplier price × rate). |
| Last room supplier price | Balance is {CUR amount}. Must be at least 1.00 — lower another room's price. |
| Last room client price | Balance is {CUR amount}. Must be at least 1.00 — lower another room's price or raise the total client price. |
| Guest header, duplicate name | Guest {k}: {First Last} is already Guest {m} in this room / in Room {n}. |
| Room | Each room needs at least one adult. |
| Policy To | To can't be before From. |
| Policy fee | Can't be more than the {total / room} {supplier / client} price: {CUR amount}. |
| Missing policy (Add button) | + Add at least one {supplier / client} policy[ for this room] |
| UTC hours | A UTC+ offset can be at most 14 hours. · A UTC− offset can be at most 12 hours. · UTC+14 can't have minutes — choose :00. |
| Rooms filled pill (tooltip) | Matches the no. of rooms in Auto calculate markup · Auto calculate is for N rooms. Add / Remove a room or change the no. of rooms. · Room prices add up to {x}, not {S}. Recalculate or fix the prices. |
| Locked section headers | Select supplier first · Select platform type first · Select client first · Select client currency first · Enter conversion rate first · Select markup type first · Enter total client price first · Enter total supplier price first · Enter no. of rooms first · Total client price is below the cost · Enter markup amount first · Enter room n price first |
| Toasts | Room prices recalculated · ‹name› added to Offline Supplier List · Booking … created / updated (on All Booking) |

## 13. How to test

Run these on a new booking and on the edit sample (NZH100000000012345).

**Booking source and pricing**
- [ ] Each field in the chain is disabled until the one before it, and is cleared when that one changes. The same currency fixes both rates at 1. Typing either rate fills the other.
- [ ] Edit locks the six source fields. Clearing a currency after typing amounts flags them and blocks Save.

**Auto calculate markup**
- [ ] It's on for a new booking, with No. of rooms blank. Old bookings open with it off. With it off, pricing, payload and validation are unchanged.
- [ ] The three worked examples (§3) give exactly C. Fixed on the edit sample gives 56.35 per room, total 1839.44.
- [ ] Room 1 → 200 gives Room 3 = 76.00 and the total stays C. Room 1 → 400 gives both last-room errors and blocks Save. Recalculate → 138 × 3, errors cleared, Recalculate disabled.
- [ ] A Total client price below the cost shows the message at once; it clears when fixed.
- [ ] No. of rooms 3 → 4 adds a room and disables + Add room. 4 → 3 removes the untouched room, never one with a guest name. Typing 25 shows 9.
- [ ] Edit, tick Auto calculate: the three inputs fill from the booking; markup and total don't change.

**Price breakdown**
- [ ] Edit sample Room 3 shows Rounding difference − MYR 0.01 and `613.15 − 0.01 = MYR 613.14` in the wide modal. Room 1 shows one table.
- [ ] Enter opens it, Esc closes it, and focus returns to the calculation line.

**Validation**
- [ ] An empty new booking blocks Save and gives every required field a red border with no message.
- [ ] Each of these is flagged: a bad email, a short mobile, same-day check-out, a future booking date, a missing child age, a room without an adult, no lead guest, a missing lead nationality, two guests with the same name (also across rooms, any case).
- [ ] "n fields need attention" steps through every problem in page order and opens closed sections and rooms.

**Policies**
- [ ] Supplier From 18 Feb 2027 00:00, offset 36 h → client From 16 Feb 2027 11:59:59, deadline 16 Feb 2027 11:59:59.
- [ ] A fee above the total supplier price shows the error; equal is fine.
- [ ] Full price fills 414.00 (supplier) and 1839.44 (client) on the edit sample, and sends `isFullPrice: true`.
- [ ] To before From shows the error.
- [ ] Per room: each room needs a supplier policy.
- [ ] Turning client auto off asks first; Keep on keeps it.

**Sections and rooms**
- [ ] Every collapsed section shows its summary. "n fields required" matches §1's table and goes to the first missing field.
- [ ] + Add room opens the new room and closes auto-opened ones; rooms the user opened stay open.

**Payload and save**
- [ ] Edit payload: no `remarks`, no source ids, `unique_trans_id` present. New payload: ids, `remarks` and the default essential information present.
- [ ] Create → All Booking shows the row with "created", also when the booking date is before today. Edit → "updated".
- [ ] Typing a reverse rate fills the rate rounded to 6 dp (0.3 → 3.333333), and the payload sends that value.
- [ ] Collapsed Price summary and closed rooms keep Client total / Client price in view at every width (check every 10 px of form width from 300 to 1700, also with a "fields required" pill showing).

**Screen sizes**
- [ ] No sideways scroll at 320, 375, 600, 768, 900, 1024, 1280, 1440 and 1920 px, sections open and closed.
- [ ] Arrows report open / closed to screen readers.

## 14. Decisions and what's left to confirm

**Decided (2026-11-26):**
- No. of rooms is 1–9.
- The Percent rule is rounded to 2 decimals; the last room absorbs the cents.
- Each policy sends `isFullPrice`.

**The developer confirms with the backend before shipping:**
- The new payload names: `markupAuto`, `quotedClientPrice`, `quotedSupplierPrice`, `quotedNoOfRooms`, `rounding_adjustment`, `client_policy_from_supplier`, `client_policy_hours_before`, `isFullPrice`.
- The endpoint for each dropdown list (use the live portal's existing ones).

## Changelog

- 2026-11-22 — Moved into the admin-portal project from the standalone design (2026-10-18, updates 1–24). Reached from All Booking › + Add New. Behaviour unchanged.
- 2026-11-22 — Matched the live portal form: Supplier Currency comes from the supplier; Agent Currency enabled after the agent (the system's currencies, js/data.js); new required **Market** (`market_id`); Booking Status disabled until a supplier is picked, only CONFIRMED / RE CONFIRMED / CANCELLED; Meal is a searchable name + code list (was free text); Email, Country Code and Mobile Number required; supplier list is one "API Suppliers" group; Platform Type is B2B only; labels say Agent. Market list and supplier currencies in the prototype are dummy data.
- 2026-11-22 — "Other — add temporary supplier" now opens the New temporary hotel API drawer (same as Hotel Api List, as in the live portal) instead of the inline name box; the created API is selected and supplies the Supplier Currency. `temporary_supplier_name` removed from the payload (the API exists once created).
- 2026-11-22 — Removed explanatory text that restated the form: the note under the Agent pane, the "B2B booking" / "Select a platform first" pane hint, "Applies to every room / Set per room" beside the policy switch, "· applies to all policies" after Time Format, and "Sum of the room agent prices" under Agent Total Price.
- 2026-11-22 — Removed readouts that repeat a control: the "4 Star" / "Not rated" text beside the star rating, the "· 1 room, 1 guest" header hint, the "N guests" tag on each room, the "Child" tag on child guests, and the (N) counts after Guests and the cancellation-policy groups.
- 2026-11-22 — Star rating Clear is now a × icon (tooltip "Clear rating"), same as the date / dropdown clear buttons; shown only when a rating is set.
- 2026-11-22 — Supplier / API now lists the shared hotel API list (same records as Hotel Api List, saved in the browser): active APIs only, shown `Name - SHORT CODE`. An API created from "Other — add temporary supplier" is saved to that list (it appears on Hotel Api List as Temp) and selected; if it was created inactive it is added but not selected ("not available for booking").
- 2026-11-22 — Temporary supplier notice (with Make permanent) removed from the New temporary hotel API drawer; an API added here is always temporary and is made permanent on Hotel Api List.
- 2026-11-22 — Reference code removed from the New temporary hotel API drawer; a temporary API is saved without it and gets it when made permanent on Hotel Api List.
- 2026-11-22 — Short code removed from the New temporary hotel API drawer; a temporary supplier without one is listed by name only.
- 2026-11-22 — Active and Allow B2C removed from the New temporary hotel API drawer; a temporary API is always created Active with Allow B2C on (so it is always selectable here — the "added as inactive" case is gone).
- 2026-11-22 — "New" tag removed (list and field); every temporary supplier shows a Temp tag in the list, and the field's tag reads Temporary.
- 2026-11-22 — An API always has one currency (no "ALL"), so Supplier Currency always comes from the supplier and is never picked here.
- 2026-11-22 — Agent, Agent Currency, Market, Country/City, Nationality, Country Code and Meal lists now come from the shared reference data (js/data.js). Agents = Partners (enabled only); currencies = the system's 12; markets = the shared 14.
- 2026-11-22 — New temporary hotel API drawer: API code takes capital letters only (lower case turns upper case as you type), same as Hotel Api List.
- 2026-11-22 — Temporary supplier API code: capital letters A–Z and digits only (same rule as Hotel Api List).
- 2026-11-22 — An empty required field shows only a red border (no "Enter …" / "… is required" message); messages stay for a filled but wrong value.
- 2026-11-22 — Brought onto the shared look: colours from tokens.css; shared buttons, page header (back arrow + title, no subtitle or "Manual booking" pill), switch and card; section headers are a title + collapse arrow on white (no navy bar); inputs 38px; required marker and red border like the drawers (no pink fill); dropdown panel styled like the shared one ("No … found").
- 2026-11-22 — Wording: sentence-case labels and buttons; **Client** instead of Agent / Customer (Client, Client currency, Client price, Client cancellation policies, Client total price); **Platform type**; **Markup amount** (was Markup rule); markup types **Percent / Fixed** (as on the Markup page); Supplier (was Supplier / API); Temp tag on the selected supplier reads "Temp" (same colours as Hotel APIs). Buttons: **Create booking** / **Save changes**. **Cancel** now goes back to the list (like the back arrow); it no longer clears the form.
- 2026-11-22 — Dates show as 22-Nov-2026 with 12-hour time (same as the lists and history). Empty UTC hours: red border only. The edit sample's supplier name and currency come from the shared API list by id (a rename on Hotel APIs shows here). Markets read "Name (CUR)". Client currency lists the system's 12 currencies, then Market lists the markets in that currency (partners have no currency or market list of their own).
- 2026-11-22 — Temporary supplier drawer says "New temporary supplier", Supplier name / Supplier code; toast "‹name› added to Supplier List" (menu item renamed from Api List).
- 2026-11-22 — Create booking / Save changes now save to the shared booking list and return to All Booking, which lists the manual bookings. The edit sample is a saved booking (the hard-coded sample moved to `js/data.js`).
- 2026-11-23 — Added **Calculate client policy from supplier** switch + hours field under Time format (see Cancellation policies). Unconfirmed: the two payload field names.
- 2026-11-23 — Client policy calculation aligned with Hotel_API: markup is the rooms' markup (not a % of the fee), From −1 s / To −2 s after the hour shift.
- 2026-11-23 — Empty supplier From now gives client From = now − hours (as Hotel_API), instead of staying empty.
- 2026-11-23 — Calculate box reads **Auto calculate client policy · Offset: [36 h]** (was "Calculate client policy from supplier · 36 h before supplier times"); One policy for all rooms sits on the right of the same box.
- 2026-11-23 — Date-and-time fields (Booking date, Deadline, policy From / To) take the full row when their two-column row is narrower than ~560px, so the whole value shows (was cut off around 1280–1440px). Empty-supplier-From "now" is kept from the first save.
- 2026-11-23 — Small phones (≤ ~400px): policy boxes have tighter side padding, and a date-and-time box narrower than 250px drops its calendar icon (the field still opens the calendar), so date + time + seconds show in full down to 320px.
- 2026-11-23 — Policy To can't be before its From (calendar limit + message; blocks Save).
- 2026-11-23 — Deadline date & time is no longer typed: it comes from the client policies (earliest paid From; none → now − hours).
- 2026-11-23 — Cancellation policies (and auto calculate) locked until supplier, client, client currency, conversion rate, markup amount and (Percent) room prices are set; the line above says what's missing and goes to it.
- 2026-11-23 — Switching Auto calculate client policy off now asks for confirmation and explains why it should stay on.
- 2026-11-23 — Client and supplier policy columns line up when side by side: Policy N on both sides starts at the same line and has the same height (the taller one sets it), and both columns are the same height. Stacked (narrow) layout unchanged.
- 2026-11-23 — Fix: after confirming **Turn off** in the Auto calculate dialog, the switch kept showing on (the setting was off) and clicking it again only reopened the dialog. It now shows off.
- 2026-11-24 — Added Remarks (Back office only) card below Price summary.
- 2026-11-25 — Temporary suppliers are now **offline suppliers**: footer "Other — add offline supplier" opens the New offline supplier drawer (adds Emails and Phones); tag **Offline** (was Temp / Temporary) in the list and field; payload `supplier_type` `OFFLINE` (was `TEMPORARY`).
- 2026-11-25 — Added **Auto calculate markup** (tick on the Markup amount label): markup worked out from the quoted Total client price, Total supplier price and No. of rooms; room prices split equally (last room takes the rounding); last room's markup takes the rounding so the total equals the quote; rooms-vs-inputs check (warning, blocks Save) + Recalculate in Rooms & guests. See Rules. AI build note: `notes/booking-form-auto-markup.ai.md`.
- 2026-11-25 — Added **Full price** tick on the cancellation fee (as on the live form): fee = full price of the rooms the policy covers, read-only while ticked; supplier policies always, client policies when auto calculate is off.
- 2026-11-25 — Cancellation fee can't be more than the supplier / client price of the rooms the policy covers (error at once, blocks Save); auto-calculated client fees capped at the client price.
- 2026-11-25 — Full price is paired: the client and supplier policy in the same row are ticked / unticked together; with auto calculate client policy on, a full-price supplier policy gives a full-price client fee (= client price of the rooms covered).
- 2026-11-25 — Auto calculate markup inputs moved out of the client pane into their own full-width section below Booking source & pricing.
- 2026-11-25 — Auto calculate markup is on by default for a new booking (No. of rooms 1); saved bookings keep their own state (older ones: off).
- 2026-11-25 — Prerequisite messages ("Select supplier first" …) for Auto calculate markup and Cancellation policies moved into the section headers; clicking one goes to the field without collapsing the section.
- 2026-11-25 — Time format is now locked with the rest of Cancellation policies until the prerequisites are set.
- 2026-11-25 — No. of rooms (Auto calculate markup) starts blank and is never pre-filled; the user must enter it.
- 2026-11-25 — Lead guest's Nationality is required (other guests' stays optional).
- 2026-11-25 — Hotel Address, Country and City are required; check-out must be after check-in (same day no longer allowed).
- 2026-11-25 — Sections collapse / expand only from the round arrow button on the right of the header (clicking the rest of the header does nothing). The arrow is a real button: 32px (was 24px), hover highlight, keyboard-focusable; header height unchanged.
- 2026-11-25 — Edit mode: ticking Auto calculate fills Total supplier price from the booking's supplier price (Σ room supplier prices), replacing any earlier value.
- 2026-11-25 — Markup amount label and Auto calculate pill stay on one line; when the field is narrow the label shortens to "Markup".
- 2026-11-25 — Edit mode: ticking Auto calculate also fills Total client price with the booking's current client total.
- 2026-11-25 — Edit mode: ticking Auto calculate also fills No. of rooms from the booking (add mode still leaves it blank). Verified: edit sample 612.48 / 138.00 / 1 room → markup stays 10%, total unchanged.
- 2026-11-25 — Prototype: the edit sample (NZH100000000012345) now has 3 rooms (USD 138 each → MYR 1,837.44 total). A saved, never-edited copy of the old 1-room sample is updated automatically.
- 2026-11-25 — Auto calculate markup: the last room takes the balance. Its supplier price = total supplier price − the other rooms (read-only), and its client price = total client price − the other rooms. An edited room price is made up on the last room, and either balance below 1.00 is an error that blocks Save. The "room prices don't add up" warning is gone (it can't happen).
- 2026-11-25 — Rooms-count warning bar replaced by a "Rooms filled: x/n" pill + Recalculate in the Rooms & guests header (green = match, amber = mismatch, red after a save attempt).
- 2026-11-25 — Recalculate is disabled while the rooms are over-filled (more rooms than No. of rooms).
- 2026-11-25 — "Rooms filled" pill is red (was amber) whenever the rooms are over- or under-filled.
- 2026-11-25 — Save needs at least one cancellation policy: one for all rooms, or one for each room when set per room (supplier always; client too while typed).
- 2026-11-25 — Under-filled rooms: "+ Add room" turns red and reads "+ Add room x/n" (next room / No. of rooms); the pill and the save-error jump take you to it.
- 2026-11-25 — With Auto calculate on, "+ Add room" always shows "+ Add room x/n" and is disabled once all n rooms are there ("All n rooms added").
- 2026-11-25 — "+ Add room" always shows the number of the room being added: "+ Add room: 5", or "+ Add room: 3/4" while Auto calculate has a No. of rooms.
- 2026-11-25 — Add guest button shows which guest and room: "+ Add guest: 2 to room 3".
- 2026-11-25 — Nationality: only the lead guest's nationality is copied, and only to guests with none; editing another guest's nationality no longer changes anyone else. New guests take the lead's nationality.
- 2026-11-25 — Room 1's Room Type fills the other rooms whose type is empty (and keeps following until that room's type is typed by hand).
- 2026-11-25 — Room client price: hovering (or focusing) the calc line or the client price box shows the full calculation as a tooltip, step by step (supplier price × rate, + markup, = client price). For the last room under Auto calculate markup it also shows where its supplier price comes from (total supplier price − the other rooms), the balance added to / taken from its markup, and "Why adjusted": it's the last room, so it takes the balance (total client price − other rooms' client prices) to keep the booking total exactly at the total client price; the difference comes from rounding or from room prices changed by hand. Shared tooltip: multi-line text gets a wider box.
- 2026-11-25 — Last room explanation moved from the tooltip to the shared modal (info). Under the last room's client price a link **"ⓘ Why is this price adjusted?"** shows only when that room is adjusted: its markup took a balance, or another room's price was changed by hand. It opens **"Why is Room 3's price adjusted?"**: "Room 3 is the last room, so it takes what's left of the totals after rooms 1–2. This keeps the booking total exactly at the total client price (MYR 1,839.44)." The details are a subtraction, row by row: Total supplier price / Rooms 1–2 − … / Room 3 supplier price (only when a price was edited by hand), then Total client price / Rooms 1–2 − … / Room 3 client price, then Room 3 markup "MYR 56.34 (10.12% would give 56.35)" when the markup was adjusted. The note gives the cause: "Room 1's price was changed by hand, so Room 3 makes up the difference." or "The MYR 0.01 comes from rounding the other rooms' prices to 2 decimals." One button: **Got it**. The tooltip now shows only the calculation.
- 2026-11-25 — Room calculation tooltip removed. Clicking the small calculation line above a room's client price (or Enter / Space on it) opens the shared info modal **"Room 2 client price"**: "The supplier price is converted to MYR at the booking's rate, then the markup is added." Rows: Supplier price / Rate × / Converted / Markup + (rule) / **Client price**. For the adjusted last room (Auto calculate markup) the same line and the "Why is this price adjusted?" link open **"Room 3 client price (adjusted)"**. It has the last-room explanation and these rows: supplier price, or the supplier subtraction when a price was edited by hand / Rate / Converted / Total client price / Rooms 1–2 − / **Room 3 client price** / Markup (client − converted; rule would give …). The note gives the cause. One button: Got it.
- 2026-11-25 — Removed the "Why is this price adjusted?" link; the last room's explanation opens from its calculation line (same modal).
- 2026-11-25 — The room calculation line now looks clickable: a small info icon (ⓘ) in front, brand-blue text with a dotted underline (solid on hover) and a focus ring for keyboard users. It opens the calculation modal.
- 2026-11-25 — Room client price modal (every room except an adjusted last room): header "Room: N", then the line "Client Price Calculation Breakdown", then the table; Rate row reads "USD 1 = MYR 4.034783" (also in the adjusted last-room modal).
- 2026-11-25 — Adjusted last room (Auto calculate markup), same modal as the other rooms. First table: the room before the adjustment (supplier price, rate, converted, markup at the rule, client price). Second table: Total supplier price, Converted total price (S × rate), Total markup (C − converted total), Total client price (C), All room client price sum (every room before the adjustment), Rounding difference (C − that sum), Room N adjusted price (its price ± the difference). Info note: each room is rounded to 2 decimals, so the rooms can add up to slightly more or less than C, and the difference is added to the last room. The difference is always rounding (the last room's supplier price is a balance, so a hand-edited room never causes it); the old "Room X was changed by hand" note is gone. The second table shows only when the difference is not 0.
- 2026-11-25 — Shared modal always fits the window height (32px margin): the header and buttons stay in place, and the body scrolls when the content is taller.
- 2026-11-25 — Shared modal: optional `width` (a number = px, or any CSS length such as "40rem"). Without it the modal keeps the default 460px. It never gets wider than the window minus 16px on each side.
- 2026-11-25 — The adjusted last-room modal (the one with the totals table) opens at 640px. Every other room modal keeps the default 460px.
- 2026-11-25 — Rooms are an accordion. They load closed; a new booking's empty room starts open. "+ Add room" opens the new room and closes every room that was opened automatically (a new room, or one opened to show an error). A room the user opened with its arrow stays open until they close it. Only the arrow opens or closes a room. A closed room's header shows a summary: room type (or "No room type"), the guest count ("2 adults, 1 child", no names) and the price ("USD 138.00 → MYR 613.15", or "No price"). It also shows "n to fix" when the room has problems (the same ones counted in the save bar). Clicking that pill opens the room and goes to its first problem. Going to an error (save, the save bar's error jump, a prerequisite link) opens the room it sits in. Open/closed is screen state only and is not saved.
- 2026-11-25 — The pill on a closed room now reads "n fields required" (1 field / n fields) and shows at all times, not only after a save attempt. Before a save attempt it counts the room's empty required fields: room type, price (when it can be typed), each guest's title, first name and last name, a child's age and the lead guest's nationality. It also counts any problem already shown in red inside the room. After a save attempt it counts what the save bar counts. Clicking it opens the room and goes to the first one.
- 2026-11-25 — Closed-room summary now reads: "Room: 2 | Superior Twin Room | 3 guests  1 adult; 2 children [5, 12] | Supplier price USD 138.00 | Client price MYR 613.15". The guest total is followed by the adult / child split and each child's age ("?" while the age is empty). Missing values show as "No room type" or "—". Room titles read "Room: N".
- 2026-11-25 — Booking source & pricing, while collapsed, shows a summary in its header: Supplier | Supplier ref | Platform | Client (name and code) | Rate ("1 USD = MYR 4.034783") | Markup ("10.12%" or "MYR 50.00 per room", plus "auto" when Auto calculate is on). Missing values show "—". It also shows "n fields required", counted the same way as on a room: before a save attempt, the empty required fields (supplier, supplier currency, platform, client, client currency, market, conversion rate, plus markup type with auto on or the markup amount with auto off and a type chosen); after a save attempt, the problems shown in red. Clicking the pill opens the section and goes to the first one.
- 2026-11-25 — Auto calculate markup, while collapsed, shows the same kind of summary: Total client price | Total supplier price | No. of rooms ("—" when empty), with "n fields required" for whichever of the three are empty. While the section is locked it counts nothing; its header already says what it waits for. Section summaries are configured in one place (CARD_SUMS: the summary parts plus the required fields in page order).
- 2026-11-25 — Hotel details, while collapsed, shows a short summary on its own line under the title (it's a half-width section): hotel name · city, country · check-in → check-out (n nights) · HCN. Empty values show as "No hotel name", "No city", "No dates" or "—". It also shows "n fields required" for hotel name, address, country, city, check-in and check-out. Address, phone, stars, booking date and status are left out on purpose.
- 2026-11-25 — Hotel details summary stays on one line. A long hotel name is cut with "…" (the full value shows on hover); city, dates and HCN stay whole. On a very narrow screen the line is clipped at the end.
- 2026-11-25 — Contact details, while collapsed, shows a one-line summary under its title: email · mobile with its country code ("No email" / "No mobile number" when empty), plus "n fields required" for email, country code and mobile number. Booking source & pricing summary fixes: the client shows as "Name (ID: 1034)" to match the field, and the pill now counts Supplier reference no. (it's required).
- 2026-11-25 — Cancellation policies, while collapsed, shows what the policies add up to, not the policies themselves. One policy for all rooms: "All rooms | Supplier 2 | Client 2 auto | Free cancellation until 14 Feb 2027, 23:59 (Local)". Per room: "Per room | Rooms set 2/3 | Free cancellation until …". "Rooms set" counts rooms with at least one supplier policy, and a client one when client policies are typed. "Free cancellation until" is the booking's cancellation deadline in the chosen time format ("—" until it can be worked out). "n fields required" counts each missing policy (the pill goes to its "+ Add … policy" button), empty fees on rows without Full price, the UTC hours when UTC is chosen and the offset hours when client policies are auto. While the section is locked it counts nothing.
- 2026-11-25 — Layout: Hotel details, Contact details and Contracting comment & special requests are now full-width rows, in the same order (no more two columns), so a collapsed section never leaves a gap. Hotel details shows 4 fields a row on a wide screen (2, then 1, as it narrows). Contact details puts email next to country code + mobile. Contracting comment and Special requests sit side by side. The Hotel and Contact summaries now sit on the title line like the other sections, still on one line: the hotel name or email is cut with "…" first.
- 2026-11-25 — Contracting comment and Special requests, side by side, are always the same height: the shorter box stretches to match the taller one, whether the editor grows with its text or the textarea is dragged taller.
- 2026-11-25 — Price summary, while collapsed, shows the totals: "3 rooms | Supplier USD 414.00 | Converted MYR 1,670.40 | Markup MYR 169.04 10.12% | Client total MYR 1,839.44" ("—" until a total can be worked out). It's read-only, so it never shows "fields required".
- 2026-11-26 — Remarks (Back office only) can only be written when the booking is created. On an edit they show read-only, as written, line breaks kept ("No remarks" when there are none). The edit payload doesn't send `remarks`; only a new booking does. While collapsed, the section shows the remark's first line on one line, cut with "…" if long ("No remarks" when empty). It's optional, so it never shows "fields required".
- 2026-11-26 — Rooms & guests, while collapsed, shows "Meal Room Only | 3 rooms | 4 guests 3 adults; 1 child [5]". Its "n fields required" adds up every room's empty required fields; clicking it opens the section and the first room with any, on its first empty field. "Rooms filled" and Recalculate stay at the right.
- 2026-11-26 — The edit sample (NZH100000000012345) has a back-office remark: "Paid by bank transfer (ref BT-2291)." / "Confirm late check-out with the hotel 2 days before arrival." A saved copy without one gets it once. Prototype only: on an edit that has a remark, the page header shows "Remarks: With remark | No remark" to preview both read-only states. It switches in memory only and is never saved.
- 2026-11-26 — Essential information starts filled with "In Case Of Early Exit Or No Show 100% Of The Fee Shall Be Applicable.": for all rooms, and for each room when policies are set per room (including rooms added later). It can still be edited or cleared. A saved booking keeps whatever it was saved with.
- 2026-11-26 — The prototype "Remarks: With remark | No remark" switch also scrolls to the Remarks section, opens it if collapsed and briefly highlights the remark.
- 2026-11-26 — Responsive pass, checked at 320, 375, 768, 1024, 1440 and 1920 px, sections open and collapsed, edit and new booking: no sideways scroll anywhere. Section headers at 560px and narrower: title, "n fields required" and the arrow stay on the first line; a collapsed section's summary goes to its own line (one line, first item); Rooms & guests' "Rooms filled" + Recalculate go under the title. Closed rooms at that width: the summary goes on its own line and Remove is icon-only. Shared modal on phones (480px and narrower): labels sit above values. Scrolled modal content no longer runs under the header icon. The price summary table keeps its own sideways scroll on phones.
- 2026-11-26 — Deep test pass (functionality, maths, validation, payload, save / edit round trip, keyboard, every screen size, other pages sharing the modal). Fixes: section arrows now report open / closed to screen readers; All Booking now shows a booking saved without a Booking date (it cleared nothing before, so the new row was hidden by the default "today" filter); the Booking source summary drops Platform, then Supplier ref, then Client as space shrinks, so Rate and Markup always show; collapsed summaries move under the title at 900 px and narrower. The top of this note was rewritten as a current "how it works", and the dashed "How it works" / "AI note" buttons open the two notes.
- 2026-11-26 — **Booking date is required** (empty → red border on Save; still can't be in the future). It's counted in Hotel details' "n fields required". Booking status and Category swapped places, so Booking status now comes first. The booking ID beside "Hotel details" now uses the page's value font size and weight (13 px semi-bold, dark) instead of the 16 px grey header text.
- 2026-11-26 — Section and room header text can be selected and copied again (the booking ID, titles, collapsed summaries). Headers had blocked selection from when clicking a header toggled the section; only the arrow toggles now.
- 2026-11-26 — The booking ID beside "Hotel details" is shown in the brand accent colour. The ": " before it stays in the title colour and isn't part of the ID, so selecting it copies the ID alone.
- 2026-11-26 — Section headers take the live portal's header colour (#1A1AB9, white text). Summaries, the booking ID (now amber so it stays distinct on the blue), the arrow and the header buttons are adjusted to read on it.
- 2026-11-26 — Phones (≤560 px): "Rooms filled" and Recalculate share a full-width row under the Rooms & guests title, in two equal 36 px halves, with nothing cut off.
- 2026-11-26 — The AI note is now a complete build spec for the whole form (reference data, state, every section's rules, validation, payload, screen sizes, acceptance checks), so an AI can build the form from scratch with it.
- 2026-11-26 — Decisions: No. of rooms is 1–9 (was 1–50); Percent rule stays at 2 decimals; each policy now sends `isFullPrice`. Payload names are kept, and the developer confirms them with the backend.
- 2026-11-26 — How it works is now a complete guide too: save flow and old-booking defaults (§1), rounding, worked examples (§3), full payload table (§10), all messages (§12), how to test (§13) and decisions (§14). The notes viewer's download button now names the note it downloads.
- 2026-11-26 — Hotel details summary now starts with "(reconfirmed) on 12 Oct 2026" (status + booking date) right after the booking ID, and the hotel name shows its category "(4*)". On narrower widths it drops City, then HCN, then the status; phones show the hotel name.
- 2026-11-26 — Hotel details summary: the stay shows the number of nights in brackets without the word, "20 Feb → 23 Feb 2027 (3)".
- 2026-11-26 — Hotel details summary: the category uses the Category field's star icon, "Palm Grove Inn (4★)", instead of "*".
- 2026-11-26 — Hotel details summary: the category is its own item after the hotel name, "Palm Grove Inn | 4★" (no brackets), and is left out when the hotel has no category.
- 2026-11-26 — No duplicate guest names: two guests (same or different rooms) can't share a first + last name, case and spaces ignored. The later one is flagged at once ("Same name as Room 1, Guest 1.") and Save is blocked.
- 2026-11-26 — Duplicate guest name message made clearer: both name fields turn red, and one line under the guest says who already has the name ("David Brown is already Guest 1 in this room. Each guest needs a different name.").
- 2026-11-26 — Duplicate guest name message moved to the guest's header: "Guest 2: David Brown is already Guest 1 in this room." Both name fields stay red.
- 2026-11-26 — Mobile pass (checked at 375 and 320 px, Add and Edit): 16 px fields, bigger clear buttons, Room no. hidden, calculation lines wrap, guest fields reordered, guest header kept on one line, price summary as cards, save bar total on top with Cancel | Save side by side, locked-section hint under the title. Also fixed a stylesheet error that stopped the phone room-header rule from applying.
- 2026-11-26 — Cancellation policy settings redesigned: "One policy for all rooms" on its own row under a line; Offset reads "36 h before the supplier"; UTC controls and Offset get their own lines on phones. Policy fee fields use the full column (label no longer cut). Calculation lines never cut at any width. Save bar Cancel | Save side by side up to tablet width. Checked at 320, 375, 768, 1024, 1280, 1440 and 1920 px.
- 2026-11-26 — Policy fee row redesigned: Cancellation fee | Full price in two columns (Full price lined up with the amount); the client fee's working moved under the amount; calculated client policies show a plain "Full price" tag instead of a disabled checkbox.
- 2026-11-26 — Fix: the room client price working moved under the amount (it had wrapped above it on desktop and pushed the box out of line). Policy fee rows: client and supplier columns now always use the same layout. Checked every 20 px of form width from 300 to 1700: all boxes in each row line up, nothing cut, nothing overflows.
- 2026-11-26 — Desktop restored to the design from before the mobile pass: the room client price working is back beside its label on one line; policy fee rows are back to Cancellation fee with the Full price pill in the label row; settings rows and the save bar are back to the original layout above phone widths. All mobile changes now apply only at phone widths (≤560 px; settings rows ≤640 px).
- 2026-11-26 — A calculated client policy's fee working is now a link like the room's calculation line, and opens a Client Cancellation Fee Calculation Breakdown modal.
- 2026-11-26 — Price summary: the rate · markup line is a link like the room's calculation line and opens a Client Total Price Calculation Breakdown modal (with how an auto-calculated markup rule was worked out).
- 2026-11-26 — Breakdown modals trimmed: markup shows only the short rule "(10.12%)", like the room's; notes are one line.
- 2026-11-26 — Client total breakdown simplified to the room breakdown's five one-line rows; the auto-calculated rule moved to a one-line note.
- 2026-11-26 — The calculation line under the price summary table is a link too and opens the Client Total Price breakdown.
- 2026-11-26 — Full test pass (new booking end to end, edit sample, save / edit round trip, every rule in §13, every 10 px of form width from 300 to 1700). Everything in §3's worked examples, validation, policies, payload and save flow matched. Fixes:
  - Typing one rate now fills the other rounded to 6 dp (as shown). Before, the stored value was unrounded, so a typed reverse rate fed e.g. 4.69999906… into the maths and the payload.
  - Collapsed Price summary cut off Client total at 580–760 and ~920 px form width: it now drops Converted, then Supplier. Collapsed Cancellation policies cut off "Free cancellation until" at ~580 px: it now drops the Client count.
  - A closed room's header cut off Client price at 570–1060 px when the "fields required" pill showed: the room type now shrinks with "…" first, then Supplier price, the guests and the room type are dropped only while it still doesn't fit.
  - Note fixes: `meal_info.fullMealDetails` is the meal name (`Half Board`), as the code sends; Booking date is required, so the "saved with no booking date" case only applies to older bookings.
