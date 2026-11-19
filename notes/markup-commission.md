# Default Markup (Hotel) — dev notes

Page: `markup-commission.html` · Live portal: `/admin/hotel-management/markup-commission` · Prototype sidebar: Hotel Management › Markup
Name: the page is **markup only** — renamed from "Default Markup / Commission (Hotel)" to **Default Markup (Hotel)**, menu "Markup". There is no separate commission value.
Scope: whole page redesigned (list, filters, create/edit, delete, history). Header and sidebar are the existing shell, unchanged.
Backend (MySQL schema, overlap queries, API contract, booking-time lookup, migration): [markup-commission-backend.md](markup-commission-backend.md)

## Portal + client markup — new

The business has several portals. For now **only the B2B portal** can have its own markup. A rule is one of:

| Portal | Client | Meaning |
|---|---|---|
| *(none)* = All | — (no client field) | Today's default markup, unchanged. |
| B2B | *(none)* = All clients | Every B2B booking. |
| B2B | one client | Only that client's B2B bookings. |

- **Portal first, then client.** The Client field only appears once a portal is picked. With no portal there is no client (stored empty).
- The Portal list holds only the portals that support their own markup — **B2B** for now. Adding a portal later = adding it to that list. Each portal brings its own client list.
- **B2B clients** are the portal's **Partners** (Partner Management › Partner List). They show as **partner code + name** (e.g. `BDP118 · Skyline Travels`), the same code the Partner List uses.
- **All** (no portal) rules work as today, except a rule can now name **several APIs** (see Create / edit).
- **All suppliers** (new) is an API choice that covers every hotel API in one rule. It is **only allowed when a portal and a client are both set**, because the current system has no all-suppliers option. The backend must reject it otherwise, not just the form.
- So one client rule can cover **all markets + all suppliers** (Markets = All markets + APIs = All suppliers).
- **All markets** (new) is an explicit option, never a default: nothing is picked until the admin chooses. Like All suppliers, it is **only allowed when a portal and a client are both set**: today every rule names its markets (a rule with no market shouldn't exist). The backend must reject it otherwise.
- **Market** means the **customer's market** (the customer's / agent's country, source market), not the hotel's country.
- **Which rule applies** to a booking (confirmed): only **one** markup applies, the most specific: client rule › portal rule (all clients) › all-portals rule. At the same level a named supplier beats All suppliers, a named market beats All markets, and when one rule names the supplier and another names the market, the **named supplier wins**. Same level and same supplier × market: the **latest** rule (created last) wins.
- **B2B all-clients rule** (portal B2B, no client) is allowed (confirmed); client rules override it.
- **Fixed markup** (confirmed): the amount is in the **market's currency**, the same number in each market's own currency (a Fixed 1,000 rule for Bangladesh + India = 1,000 BDT in Bangladesh, 1,000 INR in India). Per room today; the API backend decides how it's applied.
- Data: the rule gets optional `portal` and `client_id`. `client_id` needs `portal`. The API becomes a list (`api_ids`); "all" is allowed only when `client_id` is set, and never together with named APIs.

## List

Uses the **reusable table**. Columns: **#** | ID | MARKET | SUPPLIER | PORTAL / CLIENT | MARKUP | STATUS | ACTION

- **#** is the row's position in the whole filtered result (row 1 on page 2 at 20 per page is 21). Not an ID.
- **ID**: the rule's own ID from the API. It never changes, so it stays the same across filters, pages and edits.
- **Portal / Client** (one column): the portal as a small grey label (`B2B ›`), then the partner code (badge), with the client name under the code (code and name left-aligned). A portal rule without a client shows `B2B ›` All clients; a rule with no portal shows `ALL ›` All clients. A disabled partner gets a grey "Disabled" tag.
- **Market**: every market of the rule, as "Name CUR | Name CUR". Nothing is hidden or truncated. A rule with no market shows "All markets".
  - The live list shows duplicate and empty market entries (e.g. "Maldives, Maldives", ", ,"). The list should get a clean, de-duplicated market list per rule, and saving must not store duplicates or blanks.
- **Supplier** (was "API name"): every API of the rule, as "Name | Name", or "All suppliers" (client rules only).
- **Markup**: the amount with 2 decimals and a thousands separator, plus its type: `5.00%` Percent, `1,000.00` Fixed.
- **Check overlaps** (button in the toolbar): works out the overlap of every rule and **saves it on each rule**. While it runs, the button says "Checking…" and the rows are dimmed; when done, only the list reloads, same filters and same page.
  - The pills (below) show from the saved result and **stay** (also after a reload) until the next check.
  - Saving, editing or deleting a rule does **not** recalculate them: run the check again to refresh. A new rule has no pills until then.
  - Exception: saving with **Check for overlaps** ticked saves the result on the saved rule **and on every rule it overlaps now or overlapped before the edit** (their pills update; none found clears them). Other rules keep their last check.
- **Status**: Active / Inactive. Under the status (from the last check), overlapping Active rules show which one is applied (the latest rule wins):
  - red **"Blocked …"**: newer rules take **all** of this rule's suppliers × markets, so nothing of it applies. Decided on all newer rules **together** (e.g. one takes Bangladesh, another India → a Bangladesh + India rule is Blocked).
  - amber **"Partial …"**: newer rules take only some of it; the rest still applies.
  - blue **"Overrides …"**: this rule beats older ones.
  - One rule → its ID (`Blocked #1061`); several → a count (`Overrides · 2 rules`).
  - A rule can be Partial **and** Overrides at the same time; both pills show (Blocked / Partial first).
  - Hover / focus lists each rule and what it takes, one per line ("#1117: Hotelbeds in United States"), and for Partial what still applies ("Still applies: Hotelbeds in Malaysia").
- **Actions** (right-aligned): Edit, History, Delete. Each names itself on hover.
- No column sorting. Sorted **latest first** (highest ID first).
- No rows → standard empty state ("No markups found"). Pagination stays, showing 0.
- The list fills the screen height: rows scroll inside the table, header row and pagination stay in view.

## Filters

In this order: **ID · Portal · Client · Market · Supplier · Status**.

- **ID** (new): a number box. Shows rules whose ID starts with what's typed (`11` → 1180, 1173, 1103…). Only digits are kept; a leading "#" is ignored.
- Each filter shows its field name while it's not set (**Portal**, **Client**, **Market**, **Supplier**; Status shows **All statuses**); picking that first entry clears the filter. There's no "Any …" entry, so "Any portal" and "All" can't be confused.
- **Portal**: All (rules for every portal) · each portal (B2B).
- **Client**: always shown; **disabled** until a portal is picked in the Portal filter (hover: "Pick a portal first"). All clients (the portal's rules without a client) · each client of that portal. Changing the portal back clears it and disables it again.
- **Market**: each market as "Name (CUR)". Shows every rule that **covers** it: rules that name it **and** All-markets rules.
- **Supplier**: each hotel API. Shows every rule that covers it: rules that name it **and** All-suppliers rules.
- **Status**: All statuses (default) / Active / Inactive (no counts).
- Filters apply right away. The separate Search and Reset buttons are replaced by **Clear filters**, which appears only when a filter is set and resets all of them.
- Changing a filter goes back to page 1.

## Create / edit (drawer)

- **Portal** — optional, no hint text. Options: "All" (empty = every portal, today's default markup) and "B2B". Portals are named by their short name only ("All", "B2B"), never "All portals" / "B2B portal".
- **Client** — shown only while a portal is picked; optional, no hint text. Empty ("All clients") = all that portal's clients.
  - Searchable; options "CODE · Name", so typing a code or a name both find it.
  - Only **Enabled** partners can be picked. Disabling a partner does nothing to its rules (confirmed): they keep working as stored. In the list it shows a grey "Disabled" tag. When editing that rule, the partner stays selectable as "(Disabled)".
  - Clearing the portal clears the client.
- **APIs** — required, multi-select, nothing picked for a new rule (searchable; the panel stays open while picking; picked APIs show as removable chips; the field reads the API name for one pick, "N APIs selected" for more). At least one ("Select at least one API." — or "…, or All suppliers." when a client is set).
  - **All suppliers** is listed only while a portal and a client are set (hint: "Pick All suppliers to cover every hotel API."). It doesn't mix with named APIs: picking All suppliers clears the named ones, picking a named API clears All suppliers.
  - If All suppliers is picked and the portal or client is then cleared, it is removed and the field shows "All suppliers needs a portal and a client. Select an API."
- **Markets** — required, multi-select (searchable; options "Name (CUR)"; picked markets show as removable chips). Nothing picked for a new rule. **All markets** is listed only while a portal and a client are set; it doesn't mix with named markets (picking it clears them, picking a market clears it). None picked → "Select at least one market." ("…, or All markets." when a client is set). If All markets is picked and the portal or client is then cleared, it's removed and the field shows "All markets needs a portal and a client. Select a market." Editing an All-markets rule shows All markets picked.
- **Markup type** — Percent / Fixed, required, default Percent.
- **Markup amount** — required. Numbers only (digits and one decimal point; other characters can't be typed). 0 or more, up to 2 decimals. 0 is allowed. `%` is shown next to it for Percent.
  - No upper limit (confirmed): a percent can be more than 100.
- **Status** — Active switch, on for a new rule.
- **Overlapping active rules — the latest wins, saving allowed**: two Active rules overlap when they have the same portal + client **and** share at least one supplier (All suppliers counts as its own value) **and** a market (or both All markets). Inactive rules are never checked.
  - **Priority**: where rules overlap, the **latest rule** (highest ID, i.e. created last) is applied; the older one is not applied for the shared suppliers and markets. It still applies to the rest of its scope. "Latest" = **created last**; editing a rule doesn't change its priority.
  - **Check for overlaps** — optional checkbox next to the drawer's buttons, off by default (stays as the admin left it while the page is open). Overlaps are only looked for when it's ticked:
    - Ticked + overlaps found → on Save, a screen "This markup overlaps ‹N› rule(s)" with "Where markups overlap, the latest one is applied." and one box per message: **red** when this rule won't apply at all, **amber** when it partly applies, **blue** when it takes priority over older rules (same texts as the list's tooltips). Buttons: **Back to edit** (nothing saved, drawer stays open) / **Save anyway** (create: **Create anyway**).
    - Ticked + no overlaps → saves right away; toast adds "· No overlaps found".
    - Not ticked → saves without looking. An inactive rule never overlaps.
  - Rules at different levels never clash (a client rule vs a B2B all-clients rule vs an all-portals rule), and neither do an All-suppliers rule and a named-API rule. The more specific one applies (see "Which rule applies").
- Edit pre-fills every field. Title: "Edit markup #‹ID›" (the rule's ID), no subtitle (create: "New markup"). Button: "Save changes" (create: "Create markup").
- Saving with no changes writes no history.
- Success → drawer closes, toast "Markup created / updated" (+ " · No overlaps found" when checked).
- Esc, Cancel, ✕ or clicking outside closes without saving.

## Delete

- Row action, confirm first (shared modal). Title: "Delete markup #‹ID›?"
- Message: "It stops being added to hotel prices right away." + for a client rule "This client falls back to the next matching markup." / for a portal rule without a client "B2B bookings fall back to the next matching markup." + when this rule overrides others: "#‹ID› applies again where this one overrode it."
- Shows what is deleted: Portal / Client, Markets (with currency), Suppliers, Markup (amount · type), Status.
- Note: "It's kept in the records (soft delete) but can't be brought back from this page." Buttons: Cancel (focused first) / Delete markup.
- Cancel / ✕ / Esc / clicking outside does nothing. Confirm → the row is removed, toast "Markup #‹ID› deleted".
- **Soft delete** (confirmed): the rule is hidden everywhere (list, filters, overlaps, booking price) but kept in the database with who / when deleted. There's no restore on this page.

## History (drawer)

Same Edit History as Hotel APIs (same layout and rules). Title: "History — #‹ID›".

- One card per entry, newest first, "Entry N of M". User name + email, date (DD-Mon-YYYY) + time (hh:mm AM/PM).
- **Create** — no summary text, just the values: Portal (All / B2B), Client (code + name, or All clients), Markets (each with its currency, "Bangladesh BDT"), Suppliers (or All suppliers), Markup (amount · type), Status.
- **Status Change** — only Status changed, no summary text: old → new status, and "Added to hotel prices again." / "No longer added to hotel prices."
- **Edit** — no summary text, one row per changed field, **old value → new value**. **Markets** and **Suppliers** show only what changed: a "Removed" line (the markets / suppliers taken out) and an "Added" line (the ones put in), each only when it has something. Switching to or from All markets / All suppliers shows old → new instead (nothing to add or remove). Markup type + amount are one "Markup" row.
- The live history's **Commission** column is dropped: it only ever shows "%". The live API NAME is empty in history rows and needs fixing.
- Needs per entry: operation, changed fields with old + new values (full snapshot for Create), user name, user email, timestamp.
- No history → "No history yet".
- **Legacy history** (saves made in the old system) continues the same timeline, after the current entries, in the same cards — no tabs, no separate look. "Entry N of M" counts both; old-system entries have "Old system · " before it.
  - The old log (`get-log`) stores one row per save with the **full record as it was after that save** (not a diff), who (name + email) and when (UTC). Creates were never logged.
  - Each old row is compared with the one before it: what differs becomes a normal **Edit** (old → new rows) or **Status Change** (only Status differed) entry, using the same field labels and wording as today.
  - The **oldest** old row: what it changed isn't known (no earlier row, no create row), so it shows as an Edit card with all its values as a field grid (no summary text).
  - An old save that changed no field shown here (e.g. only a removed field) gets no entry — same rule as today.
  - A field missing from an old row (added to the log later) is not compared.
  - Records created after the switch have a Create entry and no legacy rows; records from before it have no Create entry.
  - Old fields used: market_list (ids; null = All markets), hotel_api_info_id (one supplier, shown by name), markup_type (1 = Percent, 2 = Fixed) + markup_amount (one Markup row), is_active. Portal shows All and Client All clients (old rules were all-portal). Ignored: commission_type, commission_amount, market_name_list (stale names — use market_list). The old modal's blank API NAME was a display bug — the id is there.

## Open questions

Answered on 2026-11-18 (now part of the notes above): precedence, named supplier over named market, Fixed currency (market's, same number), Fixed per room (API backend decides), B2B all-clients rule allowed, All markets is new (client-only), disabled partners (no change), soft delete, no percent cap, markup only (page renamed).

Also answered: a rule's **market** is the **customer's market** (source market), and booking pricing uses exactly the screen's logic (so the overlap tags always match what bookings get).

Still open (backend, doesn't change the screen): whether the pricing service can keep rules in memory. See the backend guide, section 7.

## Changelog

- 2026-11-18 — Whole page redesigned: list, filters, create/edit drawer, delete confirm, history.
- 2026-11-18 — Action column right-aligned (standing rule for every list).
- 2026-11-18 — Agent-specific markup for B2B; All suppliers for agent rules only, so one rule can cover all markets + all suppliers.
- 2026-11-18 — B2B agents shown as the portal's Partners: partner code + name, Enabled partners only for new rules, Disabled tag.
- 2026-11-18 — Portal → Client: Portal field first (B2B only for now); Client appears only once a portal is picked. Portal + Client columns; Client filter appears only once a portal is picked. All suppliers needs a portal and a client.
- 2026-11-18 — Portal hint removed; portals named "All" / "B2B" (not "All portals" / "B2B portal").
- 2026-11-18 — Client hint removed.
- 2026-11-18 — APIs is a multi-select: a rule can name several APIs (All suppliers stays exclusive and client-only); list shows API chips; overlap check and history handle API lists.
- 2026-11-18 — All markets is an explicit option (Markets required, nothing picked by default), like All suppliers for APIs; a single pick shows its name in the field.
- 2026-11-18 — Rule preview line removed from the form.
- 2026-11-18 — Markup amount: numbers only, 0 allowed.
- 2026-11-18 — Portal and Client list columns merged into one Portal / Client column.
- 2026-11-18 — Portal / Client cell: portal badge grey, client name on its own second line.
- 2026-11-18 — Portal / Client cell restyled: portal as a small grey label on line 1, partner code + name on line 2.
- 2026-11-18 — Portal / Client cell: "B2B ›" then the code, the client name under the code, aligned.
- 2026-11-18 — All-portals rows show `ALL ›` All clients, in the same format as the other rows.
- 2026-11-18 — All markets / All suppliers in the list shown as outlined "all" chips with an icon.
- 2026-11-18 — Market chips and the Market filter show each market's currency.
- 2026-11-18 — "+N" on Market / Supplier shows the full list; column "API Name" renamed "Supplier".
- 2026-11-18 — "+N" expands the cell in place ("Show less" collapses) instead of opening a panel.
- 2026-11-18 — "+N" opens a full-width detail row (all markets + all suppliers) instead of growing the cell.
- 2026-11-18 — Market / Supplier cells: "Name CUR | Name" list with Show more / Show less inside the column (animated), replacing the "+N" chips and detail row.
- 2026-11-18 — Market / Supplier always show every value; Show more removed.
- 2026-11-18 — ID column added after #.
- 2026-11-18 — Edit drawer title shows the rule ID ("Edit markup #1180").
- 2026-11-18 — Drawer subtitle (rule summary / "Add a hotel markup.") removed.
- 2026-11-18 — History drawer title is "History — #‹ID›".
- 2026-11-18 — History aligned with Hotel APIs: every edit row is old → new (Markets / Suppliers too, no "Added / Removed"); "APIs" field renamed "Suppliers"; Client reads "All clients" for an all-portals rule.
- 2026-11-18 — History shows each market with its currency.
- 2026-11-18 — History Markets / Suppliers edits show only what changed (Removed / Added), not the full old and new lists.
- 2026-11-18 — Overlaps checked live with Save disabled; overlapping rules flagged in the list ("Overlaps #ID").
- 2026-11-18 — Overlapping rules listed first; their warning shows as icon + #ID.
- 2026-11-18 — Overlap is a warning, not a block: saving an overlapping rule is allowed; the list flags both.
- 2026-11-18 — Latest rule wins on overlap: older rule shows "Not applied / Partly applied · #ID", newer shows "Overrides #ID"; form says which applies.
- 2026-11-18 — Confirmed: "latest" = created last; edits don't change priority.
- 2026-11-18 — Filters: ID added; Market / Supplier show rules that cover the pick (incl. All markets / All suppliers); "All APIs" → "Any supplier"; status default "Active & inactive".
- 2026-11-18 — Client filter is disabled (not hidden) until a portal is picked; overlap pairs listed together; dummy "Not applied" example added.
- 2026-11-18 — Filters show their field name when not set (no "Any portal" vs "All" confusion); "All (default)" → "All", "All clients (none set)" → "All clients".
- 2026-11-18 — Status filter counts removed.
- 2026-11-18 — Status filter default reads "All statuses".
- 2026-11-18 — "Partly applied · #ID" shortened to "Partial #ID".
- 2026-11-18 — Fully overridden rule shows red "Blocked #ID".
- 2026-11-18 — Hover explanations use the shared instant tooltip (also on keyboard focus).
- 2026-11-18 — Delete confirm moved to the shared modal: title with ID, what is deleted, which rule applies again, "can't be undone" note.
- 2026-11-18 — Several overlaps: Blocked decided on all newer rules together; pills show a count for several rules; Partial + Overrides can both show; tooltips list each rule.
- 2026-11-18 — Portal / Client column moved after Supplier.
- 2026-11-18 — Form overlap messages split into separate boxes, coloured by meaning (red / amber / blue).
- 2026-11-18 — Backend guide added (MySQL): markup-commission-backend.md.
- 2026-11-18 — Open questions answered: All markets client-only (new), no percent cap, soft delete, page renamed "Default Markup (Hotel)" / menu "Markup", precedence + Fixed currency recorded.
- 2026-11-18 — Market = customer's market; pricing uses the screen's logic (confirmed).
- 2026-11-18 — List sorted latest first (overlapping rules no longer moved to the top).
- 2026-11-18 — Overlaps in the list are now a manual **Check overlaps** (not calculated on save, nothing stored); the edit form's overlap warning stays.
- 2026-11-18 — Form overlap warning is now optional: "Check for overlaps" checkbox; when ticked, Save shows an overlap screen (Back to edit / Save anyway). No live check while editing.
- 2026-11-18 — Check overlaps reloads only the list on the same page ("Checking…" while it runs).
- 2026-11-18 — Check overlaps saves the result on each rule (stays until the next check); summary bar removed.
- 2026-11-18 — Save with "Check for overlaps" ticked also saves the result on that rule.
- 2026-11-18 — Save with "Check for overlaps" also updates the overlapped rules (now and before the edit).
- 2026-11-19 — Legacy history (old system's log) shown in the same timeline and cards: each old save as an Edit / Status Change, the oldest as an Edit card with all its values.
- 2026-11-19 — Create entry: summary text removed. Old-system entries marked "Old system · Entry N of M".
- 2026-11-19 — Status Change ("Activated" / "Deactivated") and Edit ("N fields changed") summary text removed.
- 2026-11-19 — "Earliest recorded settings" removed too: no summary text on any history entry.
