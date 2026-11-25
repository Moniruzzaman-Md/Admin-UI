# AI build note — Manual hotel booking form (Add / Edit), complete

> **For an AI coding assistant.** This note is the complete build spec for the admin portal's manual hotel booking form.
> It works whether you are changing the live form or starting from an empty component.
> - Live portal: Booking Management (Hotel) › All Booking › **+ Add New** → `/admin/booking-management-hotel/booking-form?returnUrl=…` (Angular). Edit opens the same form for a saved booking.
> - Reference implementation (plain JS prototype): `admin-portal/booking-form.html` + `admin-portal/js/booking-form.js`. Function names are given in **[brackets]** so you can read the exact code.
> - Human spec: `notes/booking-form.md` ("How it works"). **If this note and the spec disagree, the spec wins.** Ask the developer when something here is unclear rather than guessing.
> - Rewritten 2026-11-26 as a complete spec (it used to describe only the Auto calculate markup changes).

## 0. Ground rules

1. **Reuse the portal.** Use the portal's existing controls: searchable dropdown, money input with a currency prefix, number stepper, date / date-time picker, rich-text editor, toast, shared modal, the section card with a collapse arrow, and the sticky save bar. Don't invent new styles. The prototype shows the intended look.
2. **One source of truth.** Keep the form in one state object, recompute every derived value from it on every change [`derive`], then render [`refresh`]. Never store a derived value in two places. **Never ask for the same value twice**: derive or mirror it.
3. **Validation model.**
   - Nothing is red before the first Save, except values that are wrong whatever happens (listed in §11).
   - **An empty required field shows only a red border, with no message.** Messages are only for wrong values and rule explanations.
4. **Rounding:** `round2(n) = Math.round((n + Number.EPSILON) * 100) / 100`. Every money value is rounded to 2 decimals at each step shown below, in that order. Rates keep up to 6 decimals.
5. **Edit-mode compatibility.** Bookings saved before a feature existed must load and save exactly as before. Each feature below says what its default is for old bookings.
6. Locked fields (waiting for an earlier choice) and hidden fields are never validated or counted.

## 1. Page

- Title: "Add New Booking" / "Edit Booking" (as the live portal). Back (←) and Cancel return to `returnUrl` (All Booking). The sidebar highlights All Booking.
- **Sections**, each a full-width card, in this order:
  1. Booking source & pricing
  2. Auto calculate markup (only while that option is on)
  3. Hotel details
  4. Contact details
  5. Contracting comment & special requests (side by side, always the same height)
  6. Rooms & guests
  7. Cancellation policies
  8. Price summary (read-only)
  9. Remarks (Back office only)
- **Sticky save bar:**
  - Shows "{Client} total price" (the client total, or "—").
  - Buttons: Cancel and **Create booking** / **Save changes**.
  - After a save attempt with problems it shows "n fields need attention" ("n to fix" on phones). See §12.
- **Save:**
  - **Valid:** create or update the booking, then go back to All Booking. All Booking shows and highlights the row with a "Booking … created / updated" toast. If the booking date is before today, All Booking widens its default "today" Booking date filter back to that day so the row still shows (an older booking saved without a booking date, from before it was required, clears that filter instead).
  - **Invalid:** mark the problems and jump to the first one.

## 2. Reference data (use the portal's existing endpoints)

| List | Items / label | Notes |
|---|---|---|
| Suppliers | Active API suppliers `Name - SHORT CODE`, plus offline suppliers `Name` with an **Offline** tag | Edit keeps the booking's own supplier listed even if it's now inactive. Each supplier has exactly one currency. |
| Platform type | `B2B` only | |
| Client | Enabled B2B partners, shown "Name" + "ID", searchable by both | Label word is "Client". |
| Currencies | Portal currency list | |
| Market | Markets whose currency = client currency, label `Malaysia (MYR)` | |
| Country / City | Hotel countries; cities of the chosen country | |
| Nationality | All countries, label `Bangladesh (BD)`; `nationality_code` = the country code | |
| Country code (dial) | All countries, label `+60 Malaysia` | |
| Meal | Meal list, label `Half Board (HB)`, searchable by name or code | |
| Booking status | `CONFIRMED`, `RE CONFIRMED`, `CANCELLED` | |
| Markup type | `Percent`, `Fixed` | Same names as the Markup page. |
| Title | `Mr`, `Ms`, `Mrs` | |
| Guest type | `Adult`, `Child` | |
| Gender | `Male`, `Female` | |

**Offline supplier from the form:**
- The Supplier dropdown's footer "Other — add offline supplier" opens the existing **New offline supplier** drawer. It uses the same fields and rules as Offline Supplier List (`notes/offline-suppliers.md`):
  - name, Supplier code (A–Z and 0–9), currency
  - at least one email or phone
  - name and code unique across all suppliers
- The supplier is always created Active, and any text typed in the dropdown search pre-fills Supplier name.
- On save: select it, set the supplier currency, and toast "‹name› added to Offline Supplier List" [`openApiDrawer`].

## 3. State

```ts
// [blankState]  a new booking starts like this
supplier_id: id|null, supplier_currency: string|null,
platform: '' | 'B2B', customer_id: id|null, customer_currency: string|null, market_id: id|null,
reference_no: '',
hotel_name: '', address: '', country_name: '', city: '', hotel_phone_number: '', hcn: '',
booking_date: '',                 // 'YYYY-MM-DDTHH:mm'
check_in: '', check_out: '',      // 'YYYY-MM-DD'
cancellation_deadline_date: '',   // derived
status: '', star_rating: '' | 1..5,
guest_email: '', contact_dial: '', contact_mobile: '', lead_pax_name: '' /* derived */,
contracting_comment: '' /* HTML */, special_request: '', remarks: '',
meal: '',
rooms: [{ room_type: '', typeAuto?: bool, price: '', priceAuto: true, autoAdded?: bool,
          cancellation: Scope, guests: [Guest /* is_lead: true */] }],
ps: { supplier: '' /* name */, supplierCurrency: '', portalCurrency: '' /* client currency */,
      conversionRate: '', reverseRate: '', markupType: '' | 'Percent' | 'Fixed', markupRule: '',
      // derived totals
      supplierPrice: '', convertedPrice: '', markupAmount: '', finalPrice: '', noOfRooms: n,
      // Auto calculate markup
      auto: true, autoClient: '' /* C */, autoSupplier: '' /* S */, autoRooms: '' /* N */, markupManual: '' },
onePolicy: true, cancellation_all: Scope,
tz: { mode: 'Local' | 'UTC', sign: '+' | '-', hours: '', mins: '00' | '30' | '45' },
clientAuto: true, clientHours: '36',   // Auto calculate client policy + its offset
clientNow: '',                         // "now" for client policies, kept from the first save

Guest = { title: '', first_name: '', last_name: '', type: 'Adult', child_age: '', gender: '', nationality: '', is_lead: false }
Scope = { essentialInformation: 'In Case Of Early Exit Or No Show 100% Of The Fee Shall Be Applicable.',
          agent: Policy[] /* client */, supplier: Policy[] }
Policy = { fromDate: '', fromAuto?: bool, toDate: '', cancellationPrice: '', full: false }   // 'YYYY-MM-DDTHH:mm:ss'
```

- **Per-room derived values** (never saved): `_conv`, `_mk`, `_cust`, `_adj`.
- **UI-only state** (never saved): which sections and rooms are open, and whether a save was attempted.
- **Opening a saved booking** [`savedState`]: start from `blankState`, then overlay the saved state.
  - Defaults for fields the old booking lacks:
    - `clientAuto = false`
    - `ps.auto = false`
    - `ps.autoRooms = ''`
    - each room's `priceAuto = false` (saved prices count as typed)
  - `unique_trans_id` comes from the record.

## 4. Booking source & pricing

| Field | Rule |
|---|---|
| Supplier | Required. Picking it sets `ps.supplier` (name) and the supplier currency. |
| Supplier currency | Read-only, from the supplier ("Comes from the supplier"). |
| Supplier reference no. | Required, text. |
| Platform type | Required. |
| Client | Required. Disabled until Platform ("Select platform first"). |
| Client currency | Required. Disabled until Client. |
| Market | Required. Disabled until Client currency; lists that currency's markets. |
| Conversion rate "1 {SUP} = x {CLI}" | Required, > 0, up to 6 dp. Disabled until both currencies ("Select both currencies"). |
| Reverse rate "1 {CLI} = y {SUP}" | Typing either rate sets the other to `1 ÷ value` **rounded to 6 dp** (`+(1 / v).toFixed(6)`). Store the rounded value: it's what the maths and the payload use (reverse 0.3 → rate 3.333333). |
| Markup type | Percent / Fixed. Required while Auto calculate is on. |
| Markup amount (`markupRule`) | % or client currency. Disabled until a type is chosen ("Select type first"). Required once a type is chosen, unless Auto calculate is on. Then it's read-only and calculated. |

- **Chain:**
  - Changing Platform clears Client, Client currency and Market.
  - Changing Client clears Client currency and Market.
  - Changing Client currency clears Market.
- **Rates:**
  - A currency change clears both rates.
  - If supplier currency = client currency, both rates are fixed at 1 and read-only (`sameCurrency`).
- **Amounts need their currency:**
  - A money input whose currency isn't set is disabled, with the placeholder "Select currency first".
  - If a currency is cleared after amounts were typed, keep the amounts but flag them: "Select {supplier|client} currency first — this amount has no currency." This blocks Save.
- **Locked fields:** clicking a locked field focuses the field it waits for.
- **Edit mode:** Supplier, Supplier currency, Platform type, Client, Client currency and Market are fixed and disabled, with the tooltip "Set when the booking was created". Everything else stays editable.
- **Booking status** is disabled until a supplier is picked.

## 5. Pricing

```
per room:  converted = round2(price × rate)
           markup    = Percent → round2(converted × rule / 100)   |   Fixed → round2(rule)   (per room)   |   no type → 0
           client    = round2(converted + markup)
totals:    supplierPrice = Σ price, convertedPrice = Σ converted, markupAmount = Σ markup, finalPrice = Σ client
```

- Totals are empty until every room has a price and the rate is set.
- A room's client price shows "Enter price" or "Needs conversion rate" until it can be calculated.
- **Calculation line** beside each room's client price label: `138.00 × 4.034783 = 556.80 + 56.35 (10.12%)`.
  - It shows "(fixed)" for Fixed, and adds ", incl. −0.01 balance" when the room has a rounding adjustment.
  - It is focusable (role button) and opens the price breakdown modal (§10) on click, Enter or Space.

## 6. Auto calculate markup

### Why
Agents quote the client a total first and book later; the supplier price may have changed by then. This option works the markup out **backwards from the quoted client total**, so the booking's client total equals the quote exactly.

### Behaviour
- **Checkbox:** "Auto calculate" on the Markup amount label. It is **on for a new booking** and off for old bookings.
  - **On:** Markup amount becomes read-only ("Calculated"). The Auto calculate markup section appears with three required inputs:
    - Total client price **C** (client currency)
    - Total supplier price **S** (supplier currency, > 0)
    - No. of rooms **N** (stepper, integer 1–9; typing more caps at 9)
  - **Off:** Markup amount is typed again and keeps the calculated value. If nothing was calculated, it gets back the value it had before the tick (`markupManual`).
- **On tick:**
  - **Add mode:** if S is empty and every room is priced, S = Σ room prices. N stays **blank**; the user must enter it.
  - **Edit mode:** S = Σ room prices, C = the booking's current client total (read before anything recalculates), N = the room count. Ticking therefore reproduces the booking's own markup and total.
- **Locked** until, in this order: supplier → client / client currency → conversion rate → markup type.
  - The section header shows the first missing one as a clickable item ("Select supplier first", "Select client first", "Select client currency first", "Enter conversion rate first", "Select markup type first") that focuses that field [`autoNeed`].

### Algorithm (inside `derive`, every change) [`autoState`, `derive`]
```
cost = round2(S × rate);  diff = round2(C − cost)               // diff < 0 → error on C, markupRule empty, block save
markupRule = Fixed   ? round2(diff / N)
             Percent ? (cost ? round2(diff / cost × 100) : 0)
if rooms.length == N and S > 0:
   per = round2(S / N)
   rooms 0…N−2: price = priceAuto ? per : typed price
   last room:   price = round2(S − Σ other prices)              // read-only "balance"; < 1.00 → error
compute every room normally with markupRule (§5)
if rooms match N, every room is priced and diff ≥ 0:
   last.client = round2(C − Σ other rooms' client)                // < 1.00 → error
   last._adj   = round2((last.client − last.converted) − last.markup)
   last.markup = round2(last.client − last.converted)
```
- Because the last room's supplier price is a balance, Σ converted ≈ cost whatever was hand-edited. **The adjustment is therefore always rounding** (a few cents).
- Typing a room price sets that room's `priceAuto = false`.

**Worked examples** (they must give exactly C):
- **Fixed** (rate 4.7, C 1000.00, S 100.00, N 3):
  - cost 470.00, diff 530.00, rule 176.67
  - prices 33.33 / 33.33 / 33.34
  - converted 156.65 / 156.65 / 156.70
  - client 333.32 / 333.32 / **333.36** (markup 176.66, adjustment −0.01); total **1000.00**
- **Percent**, same inputs: rule 112.77 %, total 1000.00.
- **Edit sample** (Percent, rate 4.034783, C 1839.44, S 414, N 3):
  - cost 1670.40, rule 10.12 %
  - rooms 138 / 138 / 138; client 613.15 / 613.15 / **613.14** (adjustment −0.01)

### Room count sync [`syncAutoRooms`, `pristineRoom`]
- **Changing N, or ticking the box:** add rooms until `rooms.length == N`. New rooms copy Room 1's type and price (as "+ Add room" does) and are flagged `autoAdded`.
- **Lowering N** removes trailing rooms only while they're untouched:
  - `autoAdded`, with the price not typed
  - one guest with no title or name
  - room type empty or equal to Room 1's
- **Never delete a room with entered data**; show the mismatch instead.

### Messages and controls
- **C < cost:** error at once: "Can't be lower than the cost: {CUR amount} (supplier price × rate)."
- **Rooms & guests header** (shown while S and N are set):
  - **"Rooms filled: {rooms}/{N}"** pill: green when it matches, red otherwise. Its tooltip is one of:
    - "Matches the no. of rooms in Auto calculate markup"
    - "Auto calculate is for N rooms. Add / Remove a room or change the no. of rooms."
    - "Room prices add up to {S'}, not {S}. Recalculate or fix the prices."
  - **Recalculate:** syncs rooms to N, sets every `priceAuto = true`, and toasts "Room prices recalculated". It is disabled when nothing differs, or when rooms > N (it never removes a room with data).
- **+ Add room:**
  - Reads "+ Add room: {rooms+1}/{N}" while N is set.
  - Disabled with "All {N} rooms added" once rooms ≥ N.
  - Red when there are fewer rooms than N. It's the error target then, and clicking the pill goes to it.
  - With auto off or N empty it reads "+ Add room: {rooms+1}".
- **Last room:**
  - Its price is read-only, labelled "Price (supplier · balance)".
  - A balance below 1.00 shows inline on that room's field and blocks Save:
    - "Balance is {CUR amount}. Must be at least 1.00 — lower another room's price."
    - for the client price: "Balance is {CUR amount}. Must be at least 1.00 — lower another room's price or raise the total client price."
- **Save blocks:** markup type missing, any of C / S / N missing, C < cost, room count ≠ N, either last-room balance < 1.00.

## 7. Hotel details

Fields, 4 a row on wide screens:
- Name, Address, Country, City
- Telephone, HCN, Booking date, Deadline
- Check-in, Check-out, Booking status, Category

| Field | Rule |
|---|---|
| Hotel name, Address | Required. |
| Country | Required. |
| City | Required. Disabled until Country, lists its cities, and is cleared when it no longer matches. |
| Telephone, HCN | Optional. |
| Booking date (date + time) | Required, and **never in the future** (the picker and Save both check: "Booking date can't be in the future."). |
| Deadline date & time | Read-only, derived (§9). Shows "Waiting for client policy" / "Waiting for client policy fees" until it can be worked out. |
| Check-in, Check-out | Required. **Check-out must be later than check-in** (not the same day). The check-out picker starts the day after check-in. A clash shows "Check-out must be after check-in." at once and blocks Save. Show "· n nights" beside Check-out. |
| Booking status | Optional, list in §2. Disabled until a supplier is picked. |
| Category | 1–5 stars, optional, clearable (clicking the current star clears it). |

- **Edit:** show the booking ID (`unique_trans_id`) beside the "Hotel details" title, as selectable text.
- **Dates:**
  - Display as `DD Mon, YYYY` (24-hour).
  - Store as `YYYY-MM-DD` (stay), `YYYY-MM-DDTHH:mm` (booking date) and `YYYY-MM-DDTHH:mm:ss` (policies).

## 8. Contact, comments, rooms & guests

**Contact details** (all required):
- **Email:** valid format, `^\S+@\S+\.\S+$`, else "Enter a valid email."
- **Country code:** searchable dial list.
- **Mobile:** digits only, 6–15, else "Enter 6–15 digits."

**Contracting comment and special requests:**
- **Contracting comment:** rich text (bold, italic, underline, numbered and bullet lists). Sent as `JSON.stringify([html])`, or null when it has no text. Render it as sanitised HTML.
- **Special requests:** plain text, optional.

**Rooms & guests:**
- **Meal** (optional) is at the top.
- **Each room:**
  - **Room type** (required). Room 1's type fills every other room whose type is empty or still copied (`typeAuto`). Typing in another room makes it that room's own.
  - **Room no.** is automatic and renumbered on remove.
  - **Price (supplier)** is required.
  - **Client price** is read-only.
- **"+ Add room"** copies Room 1's type and price. Remove is shown only when there is more than one room.
- **Each guest:**
  - **Title** (required). Picking it sets Gender: Mr → Male, Ms / Mrs → Female; Gender stays editable.
  - **First name** and **Last name** (required).
  - **No duplicate guest names:** no two guests, in the same room or different rooms, may have the same first + last name (case and extra spaces ignored). The later guest's First and Last name turn red at once (counted as one problem), and the guest's header says who already has the name: "Guest 2: David Brown is already Guest 1 in this room." (or "… in Room 1."). On phones the message sits on its own line under the header. Save is blocked until one name is changed.
  - **Type:** Adult / Child.
  - **Age**, children only: a 0–12 stepper, required. Typing more caps at 12.
  - **Gender.**
  - **Nationality.**
- **"+ Add guest: {n} to room {m}".** A room's last guest can't be removed.
- **Each room needs at least one adult**, else "Each room needs at least one adult." under the room.
- **Lead guest:**
  - Exactly one, across all rooms, and adults only. Room 1's first guest is the default.
  - A child can't be lead (switching a lead to Child unticks it). Ticking another guest moves it there.
  - **The lead's nationality is required.**
- **Nationality fill:**
  - New guests start with the lead's nationality.
  - Setting the **lead's** nationality fills every guest who has none.
  - Changing anyone else's nationality changes only that guest.
- **`lead_pax_name`** = the lead's first + last name.

## 9. Cancellation policies

- **Locked** until what the client policy is calculated from is set [`policyNeed`]. The header shows the first missing item, which is clickable:
  - supplier → platform → client → client currency → conversion rate
  - then, with Auto calculate markup on: markup type → C → S → N, plus "Total client price is below the cost" while C < cost
  - otherwise: markup amount, if a type is chosen
  - then, for Percent only, every room price ("Enter room n price first")
- **Time format** (one for all policies): **Local** (default) or **UTC** with:
  - a sign
  - hours (required; 0–14 for +, 0–12 for −)
  - minutes :00 / :30 / :45
  - Errors: "A UTC+ offset can be at most 14 hours.", "UTC+14 can't have minutes — choose :00."
  - Preview: `UTC+5:30`.
- **Scope:** "One policy for all rooms" (on), or per room ("Room {n}: {type}"). Switching rebuilds the policy sections.
- **Essential information** (text): every new scope starts with "In Case Of Early Exit Or No Show 100% Of The Fee Shall Be Applicable." It's editable, and saved bookings keep their own value.
- **Columns:** Client policies | Supplier policies, laid out row by row so pairs line up.
- **Each policy:**
  - **From** (empty = "Until") and **To** (empty = "Onwards"), date-time with seconds.
  - **Cancellation fee** (≥ 0, in that side's currency).
  - **Full price** tick.
- **New policy:**
  - From = the previous To + 1 s, and keeps following it until changed.
  - Full price copies the paired row's state.
- **Rules:**
  - **To can't be before From** ("To can't be before From.", at once). The same time is allowed.
  - **A fee can't exceed the price it covers**, checked at once:
    - supplier fee ≤ supplier price; typed client fee ≤ client price
    - the totals for all rooms, or the room's price per room
    - Message: "Can't be more than the {total|room} {supplier|client} price: {CUR amount}."
  - **Full price:** the fee is read-only and equals the covered price. It follows price changes and is empty until that price is known.
  - **Full price is paired:** the client and supplier policy in the same row always share it.
  - **At least one supplier policy** (per room: one for each room). Typed client policies need one too. A missing one blocks Save, and its Add button turns red with "+ Add at least one {supplier|client} policy[ for this room]".
- **Auto calculate client policy** (switch with Offset hours; on for new bookings, off for old ones). It matches Hotel_API (`APICommonHelper.ConvertCancellationPolicy`, `HotelMapperManager.CalculateCancellationPrice`).
  - One read-only client policy per supplier policy:
    - **From = supplier From − offset − 1 s.** An empty supplier From gives `now − offset`.
    - **To = supplier To − offset − 2 s.**
    - The offset is in hours: 0–720, required, default 36.
  - **Fee = round2(supplier fee × rate) + the markup of the rooms covered:**
    - Fixed: rule × rooms
    - Percent: `round2(converted × rule / 100)`
    - With Auto calculate markup on: the rooms' **actual** markups, including the last room's adjustment
  - **Other fee rules:**
    - A 0 fee stays 0 (no markup).
    - A Full price supplier policy gives client fee = the covered client price.
    - Fees are capped at the covered client price.
    - Show the working beside each fee's label, styled like a room's calculation line (ⓘ, link colour, dotted underline): `100.00 × 4.70 = 470.00 + 50.00 markup`.
    - Clicking it (or Enter / Space) opens the shared modal (info), title "Client Cancellation Policy: n" ("Room: r · Client Cancellation Policy: n" when policies are per room), message "Cancellation Fee Calculation Breakdown". Rows: Supplier fee · Rate · Converted · Markup (+ amount, short rule in brackets: "10.12%", "50.00 × 3" or "fixed") · Client fee (bold). When the fee isn't converted + markup, a "Converted + markup" row comes before it and a one-line note: "Full price: the client price of the rooms covered." or "Capped at the client price of the rooms covered."
  - **Turning it off asks first** (shared modal, warning):
    - Title "Turn off auto calculate?"
    - Details: Times "36 h before the supplier's"; Fees "Supplier fee × rate + markup"
    - Danger note: you enter client policies yourself and they won't update
    - Buttons Turn off / **Keep on** (focused)
    - On Turn off, the calculated policies stay as an editable start.
- **Deadline** (`cancellation_deadline_date`), as Hotel_API `BookCHelper.GetEarliestPaidCancellationDate`:
  - It is the earliest From of a client policy with a fee above 0, across all rooms.
  - With only free policies it is `now − offset`.
  - It is empty while there's no client policy or any client fee is unknown.
  - "now" = `clientNow`, set at the first successful save and kept.

## 10. Price summary, remarks, price breakdown modal

**Price summary** (read-only):
- **Above the table:** the supplier, `1 USD = 4.034783 MYR · 1 MYR = 0.247845 USD` (or "Same currency · rate 1"), and the markup label (`Markup 10.12%` / `Markup 50.00 fixed per room`, plus " (auto calculated)").
  - When `finalPrice` is known, that rate · markup line is a link styled like the room calculation line (ⓘ, link colour, dotted underline; Enter / Space too). It opens the shared modal (info), title "Price Summary", message "Client Total Price Calculation Breakdown", with the same five one-line rows as a room's breakdown: Supplier price (n rooms) · Rate `USD 1 = MYR x` (or "Same currency") · Converted · Markup `+ MYR m (10.12%)` / `(f × n)` / `(no markup)` · Client total price (bold).
  - The calculation line under the table (`(USD 414.00 × 4.034783) = MYR 1,670.40 + MYR 169.04 = MYR 1,839.44`) is the same kind of link and opens the same modal.
  - With Auto calculate markup ready, one note line: `Auto calculated: diff ÷ cost = r%.` (Percent) or `Auto calculated: diff ÷ N rooms = f per room.` (Fixed). No note otherwise.
- **Table:** one row per room (Room, Room type, Guests, Supplier price, Converted, Markup, Client price) and a Total row.
- **Below the table:**
  - the calculation `(USD 414.00 × 4.034783) = MYR 1,670.40 + MYR 169.04 = MYR 1,839.44`
  - "A fixed markup is added per room" (Fixed)
  - "Room n markup includes −0.01 balance so the total matches the total client price" (when adjusted)
  - "{Client} total price"
- **Missing data:** "To calculate, add the {missing list}."

**Remarks (Back office only):**
- An optional textarea, **written only when the booking is created**.
- On edit, show it read-only with line breaks kept ("No remarks" when empty).
- **Don't send `remarks` in the edit payload.**

**Price breakdown modal** [`explainRoom`] (shared modal, info tone, single "Got it" button):
- **Title and table:** title "Room: N", with the line "Client Price Calculation Breakdown" under it.
  - Supplier price · Rate "USD 1 = MYR r" · Converted · Markup "+ MYR x (10.12%)" (or "(no markup)") · **Client price**.
- **Last room with `_adj ≠ 0`** (Auto calculate on): modal width 640 (default 460).
  - The first table shows the room **before** the adjustment: markup = `markup − adj`, client = `client − adj`.
  - A second table:
    - Total supplier price S
    - Converted total price `round2(S × rate)`
    - Total markup `C − converted total` (+ rule)
    - **Total client price** C
    - All room client price sum (before adjustment)
    - Rounding difference `± (C − sum)`
    - Room N adjusted price `613.15 − 0.01 = MYR 613.14`
  - Info note: "Each room's price is rounded to 2 decimals, so the rooms can add up to a little more or less than the total client price. The difference is added to the last room so the booking total matches the total client price exactly."

## 11. Validation [`validate`, `checkAuto`, `checkFees`, `checkPolicyDates`]

- **Required (on Save, red border only):**
  - Booking source: supplier, supplier currency, supplier ref, platform, client, client currency, market, rate > 0.
  - Markup: markup amount (auto off, type chosen) or markup type (auto on); C, S and N (auto on).
  - Hotel: hotel name, address, country, city, booking date, check-in, check-out.
  - Contact: email, country code, mobile.
  - Rooms: each room type and price; each guest's title, first and last name; a child's age; the lead's nationality.
  - Policies: UTC hours (UTC chosen), offset hours (client auto on), every non-full policy fee, at least one policy per scope (§9), exactly one lead guest.
- **Wrong whatever happens (shown at once, with a message):**
  - C < cost
  - a last-room balance < 1.00
  - a fee above its price
  - To before From
  - two guests with the same name
  - check-out not after check-in
  - an invalid UTC offset
  - room count ≠ N (a warning before Save; it blocks Save)
  - an amount without a currency
- The full list of messages, word for word, is in `notes/booking-form.md` §12; the same texts appear in the sections above.
- **Wrong only when filled (on Save):** an invalid email, a mobile under 6 digits, a booking date in the future, a value outside min / max, and a room without an adult.

## 12. Collapsible sections, summaries, room accordion, error navigation

**Collapse:**
- Only the round arrow button collapses a section (not the header), and it sets `aria-expanded`.
- A **collapsed** section shows a one-line summary and a red **"n fields required"** button. Open sections show neither.

**The "n fields required" count** [`CARD_SUMS`, `updateCardHeads`]:
- Before the first save: the section's empty required fields (from the table) plus anything already red inside it.
- After a save attempt: the red fields inside it, matching the save bar.
- Locked sections count nothing.

**Clicking the button:**
- It opens the section and goes to the first problem.
- Text inputs get focus. Dropdowns are highlighted only (they open on focus).
- A missing policy goes to its "+ Add … policy" button. A room problem opens that room.

| Section | Summary parts | Required fields counted |
|---|---|---|
| Booking source & pricing | Supplier · Supplier ref · Platform · Client "Name (ID: n)" · Rate "1 USD = MYR 4.034783" · Markup "10.12%" / "MYR 50.00 per room" + "auto" | supplier, supplier currency, supplier ref, rate, platform, client, client currency, market, markup type (auto) / markup amount (manual, type chosen) |
| Auto calculate markup | Total client price · Total supplier price · No. of rooms | the three inputs |
| Hotel details | "(reconfirmed) on 12 Oct 2026" (booking status in lower case, then the booking date) · hotel name · category as its own item, the number and the Category field's star icon "4★" (tooltip "4 stars"; not shown when there is no category) · city, country · "20 Feb → 23 Feb 2027 (3)" (nights in brackets) · HCN | hotel name, address, country, city, booking date, check-in, check-out |
| Contact details | email · "+44 7700900123" | email, country code, mobile |
| Rooms & guests | Meal · n rooms · n guests "a adults; c children [ages]" | Σ of every room's count |
| Cancellation policies | All rooms · Supplier n · Client n (auto) · Free cancellation until {deadline (format)}; or Per room · Rooms set x/n · Free cancellation until … | UTC hours, offset hours, each missing policy, empty non-full fees |
| Price summary | n rooms · Supplier · Converted · Markup (rule) · Client total | — |
| Remarks | first line, or "No remarks" | — |

**Summary layout:**
- An empty value shows "—" or its placeholder ("No hotel name", "No city", "No dates", "No email", "No mobile number").
- **Never wraps:** long values are cut with "…".
- **Narrower section widths drop items:**
  - Booking source drops Platform at ≤1240 px, Supplier ref at ≤1060 px and Client at ≤700 px.
  - Hotel details drops City at ≤1240 px, HCN at 901–1060 px (summary on the title's line) and at ≤760 px, and the status at ≤640 px. On phones it shows the hotel name.
    - Status words: CONFIRMED → "confirmed", RE CONFIRMED → "reconfirmed", CANCELLED → "cancelled".
    - No status → no brackets; no booking date → no "on …"; neither → "No status".
  - Price summary drops Converted at ≤1060 px and Supplier at ≤760 px, so Client total always shows.
  - Cancellation policies drops the Client count at ≤640 px, so "Free cancellation until" always shows.
  - At ≤900 px the summary moves to its own line under the title.
  - At ≤560 px it shows the first item only.

**Rooms accordion** [`roomUi`, `setRoomOpen`, `updateRoomHeads`]:
- Each room has an arrow (`aria-expanded`).
- Saved rooms load closed. A new booking's empty first room is open.
- **+ Add room** opens the new room and closes rooms that were opened *automatically*. Rooms the user opened stay open.
- Going to an error inside a closed room opens it, as an automatic open.
- Open / closed is never saved.
- **Closed room header:** "Room: N · {room type | No room type} · {g} guests {a adults; c children [ages, ? if empty]} · Supplier price {CUR x} · Client price {CUR y}" + "n fields required".
  - The count covers: room type, price (when it can be typed), each guest's title / first / last name, a child's age, and the lead's nationality.
  - Clicking it opens the room on its first empty field.
  - **Client price always stays in view** [`fitRoomSums`, run after every header update and on resize of the form]: the summary is a one-line flex row; the room type shrinks with "…" first (min 60 px), then Supplier price, the guests and finally the room type are hidden one at a time while `scrollWidth > clientWidth`. Measure, don't use width breakpoints: the "n fields required" pill changes the space available.

**Save bar navigation** [`errTargets`, `goToError`]:
- After a save attempt, "n fields need attention" counts what's red, in page order.
- The lead-guest ticks count once, and a nested red element isn't counted twice.
- Each click goes to the **next** one (wrapping), opening its section and room.
- Save itself jumps to the first.

## 13. Payload [`buildPayload`]

```jsonc
{
  // add only
  "supplier_type": "API" | "OFFLINE", "supplier_id": 12, "platform_type": "B2B", "customer_id": 1034,
  "supplier_currency": "USD", "customer_currency": "MYR", "market_id": 5, "remarks": "…" | null,
  // edit only
  "unique_trans_id": "NZH100000000012345",
  // both
  "total_price": 1839.44,                       // client total
  "hotel_name": "", "address": "", "country_name": "", "city": "", "hotel_phone_number": "", "hcn": "",
  "reference_no": "", "booking_date": "2026-11-20 14:30:00", "check_in": "2027-02-20", "check_out": "2027-02-23",
  "cancellation_deadline_date": "2027-02-16 11:59:59" | null, "star_rating": 4 | null, "status": "CONFIRMED",
  "lead_pax_name": "John Smith", "guest_email": "", "contact_country_code": "+60", "contact_mobile": "123456789",
  "contact_no": "+60123456789",
  "rooms": [{ "room_no": "1", "room_type": "", "supplier_price": 138, "supplier_currency": "USD",
              "converted_price": 556.8, "markup_amount": 56.35, "rounding_adjustment": null, "price": 613.15, "currency": "MYR" }],
  "guests": [{ "room_no": "1", "title": "Mr", "first_name": "", "last_name": "", "full_name": "", "type": "Adult" | "Child",
               "child_age": null | 0-12, "gender": "Male" | null, "nationality": "Bangladesh" | null, "nationality_code": "BD" | null, "is_lead": true }],
  "meal_info": { "fullMealDetails": "Half Board" | null },   // the meal name only (as the hotel API's fullMealDetails); the list shows "Half Board (HB)"
  "supplier_name": "", "original_total_price": 414, "original_price_breakdown": { "original_currency": "USD" },
  "price_secret": { "supplier": "", "supplierCurrency": "USD", "supplierPrice": 414, "conversionRate": 4.034783,
    "reverseConversionRate": 0.247845, "convertedPrice": 1670.4, "markupType": "Percent" | "Fixed" | null, "markupRule": 10.12,
    "markupAmount": 169.04, "noOfRooms": 3, "portalCurrency": "MYR", "finalPrice": 1839.44, "sameCurrency": false,
    "markupAuto": true, "quotedClientPrice": 1839.44, "quotedSupplierPrice": 414, "quotedNoOfRooms": 3 },  // quoted* null when auto is off
  "contracting_comment": "[\"<p>…</p>\"]" | null, "special_request": "",
  "cancellation_time_format": "Local" | "UTC+5:30",
  "client_policy_from_supplier": true, "client_policy_hours_before": 36 | null,
  "cancellationPolicyResponse": [{ "roomNo": null | "1", "onePolicyForAllRoom": true, "roomType": "",
    "essentialInformation": "…", "warning": [],
    "hotelCancellationPolicies": [   // client ones (isAPI false, client currency) then supplier ones (isAPI true, supplier currency)
      { "fromDate": "2027-02-16T11:59:59" | null, "toDate": null, "cancellationPrice": 613.15, "currency": "MYR", "timeFormat": "Local", "isAPI": false, "isFullPrice": false } ] }]
}
```

- `isFullPrice` is true when the policy's Full price is ticked (its fee follows the covered price). Client policies calculated from a Full price supplier policy are true too.
- Per-room policies send one entry per room (`roomNo` "1".., `onePolicyForAllRoom` false). Entries with no policies are dropped.
- `rooms[].markup_amount` is that room's actual markup (the last room includes the adjustment). `rounding_adjustment` is null unless set.
- **The backend must accept a last-room markup that differs from `markupRule` by the rounding.** Don't re-derive room prices from the rule server-side.

## 14. Screen sizes and accessibility

- **No sideways scroll** from 320 px up (checked at 320, 375, 600, 768, 900, 1024, 1280, 1440 and 1920, sections open and closed).
- **Hotel details:** 4 → 2 → 1 fields a row. Contact: email beside code + mobile → stacked.
- **Section headers at ≤900 px:** title, pill and arrow on the first line; the summary below. "Rooms filled" and Recalculate also go under the title.
- **Phones (≤560 px):**
  - "Rooms filled" and Recalculate share one full-width row as two equal halves.
  - A closed room's summary sits under its title, and Remove is icon-only, keeping an accessible label.
  - The save bar says "n to fix".
  - Fields use 16 px text, so phones don't zoom the page when a field is tapped. Clear (×) buttons are larger to tap.
  - Room: Room no. is hidden (the header already says "Room: 1").
  - Guest fields: Title | Type, then First name, Last name, Gender (beside Age for a child), Nationality, each long value on its own full row.
  - Guest header stays on one line; at ≤400 px the guest's Remove is icon-only (accessible label kept). A duplicate-name message gets its own line under the header.
  - A locked section's "Select … first" sits under the title.
  - Price summary: each room (and the Total) is a card of label | amount rows instead of a wide table, so nothing scrolls sideways.
  - Settings rows (≤640 px only): the box reads "Auto calculate client policy · Offset [36 h] before the supplier" and, under a line, "One policy for all rooms"; the UTC controls and the Offset each get their own line. Wider screens keep the original single row.
  - Phones (≤560 px): calculation lines (room client price, client policy fee) wrap under their label instead of being cut.
  - Save bar (phones, ≤560 px): Client total price on the top row (or "n to fix" and the total), then Cancel | Save side by side.
- **Shared modal:**
  - Always fits the window height (header and buttons fixed, body scrolls).
  - Never wider than the window minus 32 px.
  - On phones (≤480 px) labels sit above values.
- **Accessibility:**
  - Header text (titles, summaries, booking ID) is selectable and copyable.
  - Arrows and the calculation line are keyboard-operable.
  - Esc closes the modal and focus returns to where it was opened from.

## 15. Shared modal API (reuse; add the missing options if the portal's modal lacks them)

`Modal.open({ tone, title, message, details, note, noteTone, noteIcon, width, confirm, cancel })` → `Promise<boolean>`.
- **`tone`:** `'info'` / `'warning'` / `'danger'`.
- **`details`:** `[[label, valueHtml], …]`; a `null` entry starts a second table.
- **`noteIcon`:** the note's icon.
- **`width`:** px number or CSS length. The default is 460.
- **`cancel: null`:** hides Cancel.

## 16. Acceptance checks

**Booking source and pricing**
- [ ] Each field in the chain is disabled until the one before it, and is cleared when that one changes. The same currency fixes both rates at 1. Typing either rate fills the other.
- [ ] Edit locks the six source fields. Clearing a currency after typing amounts flags them and blocks Save.

**Auto calculate markup**
- [ ] It's on for a new booking, with N blank. Old bookings open with it off. With it off, pricing, payload and validation are unchanged.
- [ ] Both worked examples give exactly C. The edit sample shows 10.12 %, 138 × 3, and last room 613.14. Fixed on the edit sample: 56.35 per room, total 1839.44.
- [ ] Room 1 → 200 gives Room 3 = 76.00 and the total stays C. Room 1 → 400 gives both last-room errors and blocks Save. Recalculate → 138 × 3, errors cleared, Recalculate disabled.
- [ ] C < cost shows the message at once and clears when fixed.
- [ ] N 3 → 4 adds a room and disables + Add room. 4 → 3 removes the untouched room, never one with a guest name.
- [ ] Edit, tick auto: C, S and N are filled from the booking; markup and total are unchanged.

**Price breakdown modal**
- [ ] Room 3 of the edit sample shows Rounding difference − MYR 0.01 and `613.15 − 0.01 = MYR 613.14`, 640 wide. Room 1 shows one table, 460 wide.
- [ ] Enter opens it, Esc closes it, and focus returns to the calculation line.

**Validation**
- [ ] An empty new booking blocks Save and flags every required field with a red border and no message.
- [ ] A bad email and a short mobile show their messages.
- [ ] Each of these is flagged: same-day check-out, a future booking date, a missing child age, a room without an adult, no lead guest, a missing lead nationality, two guests with the same name (also across rooms, any case).
- [ ] "n fields need attention" steps through every problem in page order and opens closed sections and rooms.

**Policies**
- [ ] Supplier From 18 Feb 2027 00:00, offset 36 h → client From 16 Feb 2027 11:59:59, deadline 16 Feb 2027 11:59:59.
- [ ] A fee above the total supplier price shows the error; equal is OK. Full price fills 414.00 (supplier) and 1839.44 (client) on the edit sample. To before From shows the error.
- [ ] Per room: each room needs a supplier policy. Turning client auto off asks first, and Keep on keeps it.

**Sections and rooms**
- [ ] Every collapsed section shows its summary. "n fields required" matches the table and goes to the first missing field.
- [ ] + Add room opens the new room and closes auto-opened ones; user-opened rooms stay open.

**Payload and save**
- [ ] Edit payload: no `remarks`, no source ids, `unique_trans_id` present. New payload: ids present, `remarks` present, the default essential information.
- [ ] Create → All Booking shows the row with "created", also when the booking date is before today. Edit → "updated".
- [ ] Reverse rate 0.3 fills the rate as 3.333333, and `price_secret.conversionRate` / `reverseConversionRate` are those 6-dp values.
- [ ] Collapsed Price summary and closed rooms keep Client total / Client price in view at every 10 px of form width from 300 to 1700, also with a "fields required" pill showing.

**Layout and accessibility**
- [ ] No sideways scroll at the widths in §14, sections open and collapsed. Arrows expose `aria-expanded`.

## 17. Decisions and what's left to confirm

**Decided (2026-11-26):**
- No. of rooms (Auto calculate markup) is **1–9**.
- The Percent rule is rounded to **2 decimals**; the last room absorbs the leftover cents.
- Each policy carries **`isFullPrice`** in the payload.

**Developer to confirm with the backend before shipping:**
- The new payload field names: `markupAuto`, `quotedClientPrice`, `quotedSupplierPrice`, `quotedNoOfRooms` (in `price_secret`), `rounding_adjustment` (per room), `client_policy_from_supplier`, `client_policy_hours_before` and `isFullPrice` (per policy). Use these names unless the backend gives others.
- The reference data endpoints: use the live portal's existing ones for each list in §2.
