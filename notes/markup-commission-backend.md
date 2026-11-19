# Default Markup (Hotel) — backend guide (MySQL 8)

Screen behaviour and texts: [markup-commission.md](markup-commission.md). Rename tables and columns to your conventions.

1. [Tables and view](#1-tables-and-view)
2. [Save](#2-save)
3. [List](#3-list)
4. [Total count](#4-total-count)
5. [Overlap detection](#5-overlap-detection)
6. [History](#6-history)
7. [Markup on search](#7-markup-on-search)
8. [Moving the current data](#8-moving-the-current-data)

---

## 1. Tables and view

Uses the existing `portal`, `partner`, `market`, `hotel_api` and `user` tables. All IDs are `BIGINT UNSIGNED` and start at 1, so **0 means "All"**.

| Name | Holds |
|---|---|
| `markup_rule` | the rule: portal, client, type, amount, status, overlap |
| `markup_rule_market` | the markets a rule names |
| `markup_rule_supplier` | the suppliers a rule names |
| `markup_rule_history` | create / edit / status / delete entries |
| `markup_rule_scope` | **view**: one row per supplier × market of a rule |

```sql
CREATE TABLE markup_rule (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,   -- also the priority: higher = newer = wins
  portal_id      BIGINT UNSIGNED NULL,                      -- NULL = All portals
  client_id      BIGINT UNSIGNED NULL,                      -- NULL = All clients
  all_markets    TINYINT(1) NOT NULL DEFAULT 0,             -- 1 = no market rows
  all_suppliers  TINYINT(1) NOT NULL DEFAULT 0,             -- 1 = no supplier rows
  markup_type    ENUM('percent','fixed') NOT NULL,
  amount         DECIMAL(12,2) NOT NULL,                    -- fixed: in the market's currency
  is_active      TINYINT(1) NOT NULL DEFAULT 1,
  overlap        JSON NULL,                                 -- last overlap result (section 5); NULL = none
  deleted_at     DATETIME(3) NULL,                          -- soft delete
  deleted_by     BIGINT UNSIGNED NULL,
  created_by     BIGINT UNSIGNED NOT NULL,
  created_at     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_by     BIGINT UNSIGNED NULL,
  updated_at     DATETIME(3) NULL ON UPDATE CURRENT_TIMESTAMP(3),
  portal_key     BIGINT UNSIGNED AS (IFNULL(portal_id, 0)) STORED,   -- NULL → 0, for indexed lookups
  client_key     BIGINT UNSIGNED AS (IFNULL(client_id, 0)) STORED,
  PRIMARY KEY (id),
  KEY ix_rule_level (portal_key, client_key, is_active, deleted_at, id),
  CONSTRAINT ck_client_needs_portal  CHECK (client_id IS NULL OR portal_id IS NOT NULL),
  CONSTRAINT ck_all_suppliers_client CHECK (all_suppliers = 0 OR client_id IS NOT NULL),
  CONSTRAINT ck_all_markets_client   CHECK (all_markets = 0 OR client_id IS NOT NULL),
  CONSTRAINT ck_amount               CHECK (amount >= 0)
  -- FKs portal_id, client_id, created_by, updated_by: plain (no CASCADE / SET NULL; MySQL refuses those with CHECKs and generated columns)
) ENGINE=InnoDB;

CREATE TABLE markup_rule_market (
  rule_id    BIGINT UNSIGNED NOT NULL,
  market_id  BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (rule_id, market_id),
  KEY ix_market (market_id, rule_id),
  CONSTRAINT fk_rm_rule FOREIGN KEY (rule_id) REFERENCES markup_rule(id) ON DELETE CASCADE
  -- + FK market_id → market
) ENGINE=InnoDB;

CREATE TABLE markup_rule_supplier (
  rule_id      BIGINT UNSIGNED NOT NULL,
  supplier_id  BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (rule_id, supplier_id),
  KEY ix_supplier (supplier_id, rule_id),
  CONSTRAINT fk_rs_rule FOREIGN KEY (rule_id) REFERENCES markup_rule(id) ON DELETE CASCADE
  -- + FK supplier_id → hotel_api
) ENGINE=InnoDB;

CREATE TABLE markup_rule_history (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  rule_id     BIGINT UNSIGNED NOT NULL,                   -- no FK
  op          ENUM('create','edit','status','delete','recorded') NOT NULL,  -- recorded: oldest old-system row (section 8)
  snapshot    JSON NULL,                                  -- create: all fields
  changes     JSON NULL,                                  -- edit / status: [{"field","old","new"}]
  user_id     BIGINT UNSIGNED NOT NULL,
  created_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY ix_hist_rule (rule_id, created_at)
) ENGINE=InnoDB;

-- supplier × market pairs of each rule; 0 = All
CREATE VIEW markup_rule_scope AS
SELECT r.id AS rule_id,
       COALESCE(s.supplier_id, CAST(0 AS UNSIGNED)) AS supplier_id,
       COALESCE(m.market_id,   CAST(0 AS UNSIGNED)) AS market_id
FROM markup_rule r
LEFT JOIN markup_rule_supplier s ON s.rule_id = r.id
LEFT JOIN markup_rule_market   m ON m.rule_id = r.id;
```

Check in the service layer:

- `all_markets = 1` ⇔ no market rows; otherwise at least one. Same for suppliers.
- A disabled partner can't be the client of a new rule.
- Amount: max 2 decimals. No upper limit for percent.

---

## 2. Save

Everything in **one transaction**.

### New rule

```sql
INSERT INTO markup_rule (portal_id, client_id, all_markets, all_suppliers, markup_type, amount, is_active, created_by)
VALUES (:portal, :client, :all_markets, :all_suppliers, :type, :amount, :active, :user);
SET @id = LAST_INSERT_ID();

INSERT INTO markup_rule_market   (rule_id, market_id)   VALUES (@id, :m1), (@id, :m2);   -- skip for All markets
INSERT INTO markup_rule_supplier (rule_id, supplier_id) VALUES (@id, :s1), (@id, :s2);   -- skip for All suppliers

INSERT INTO markup_rule_history (rule_id, op, snapshot, user_id)
VALUES (@id, 'create', :all_fields_json, :user);
```

### Edit rule

```sql
UPDATE markup_rule
SET portal_id = :portal, client_id = :client, all_markets = :all_markets, all_suppliers = :all_suppliers,
    markup_type = :type, amount = :amount, is_active = :active, updated_by = :user
WHERE id = :id AND deleted_at IS NULL;

DELETE FROM markup_rule_market   WHERE rule_id = :id;
INSERT INTO markup_rule_market   (rule_id, market_id)   VALUES (:id, :m1), (:id, :m2);
DELETE FROM markup_rule_supplier WHERE rule_id = :id;
INSERT INTO markup_rule_supplier (rule_id, supplier_id) VALUES (:id, :s1), (:id, :s2);

-- only when something changed
INSERT INTO markup_rule_history (rule_id, op, changes, user_id)
VALUES (:id, 'edit', :changed_fields_json, :user);
```

### "Check for overlaps" on / off

| Box | What happens |
|---|---|
| **Off** | Save as above. `overlap` is not touched. |
| **On** | Before saving: run the rule check (section 5) with the draft. Overlaps found → the screen asks; admin picks **Back to edit** (nothing saved) or **Save anyway**. Then save as above, and in the same transaction update `overlap` (below). |

Update `overlap` (box on only):

1. Before the update (edit only): run the rule check with the **old** markets / suppliers → old partner IDs.
2. After the update: run the rule check with the **new** ones → new partner IDs.
3. For the saved rule and every old + new partner, work out its overlap (section 5) and write it:

```sql
UPDATE markup_rule SET overlap = :overlap_json WHERE id = :rule_id;   -- NULL when it has none
```

### Status change and delete

```sql
UPDATE markup_rule SET is_active = :active, updated_by = :user WHERE id = :id;                  -- + history 'status'
UPDATE markup_rule SET deleted_at = NOW(3), deleted_by = :user WHERE id = :id;                   -- + history 'delete'
```

After any save, refresh the search copy of the rules (section 7).

---

## 3. List

Add only the filter lines that are set.

```sql
SELECT r.id, r.portal_id, p.name AS portal_name,
       r.client_id, c.code AS client_code, c.name AS client_name,
       r.all_markets, r.all_suppliers, r.markup_type, r.amount, r.is_active, r.overlap,
       (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', m.id, 'name', m.name, 'currency', m.currency))
          FROM markup_rule_market x JOIN market m ON m.id = x.market_id
         WHERE x.rule_id = r.id) AS markets,
       (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', a.id, 'name', a.name))
          FROM markup_rule_supplier x JOIN hotel_api a ON a.id = x.supplier_id
         WHERE x.rule_id = r.id) AS suppliers
FROM markup_rule r
LEFT JOIN portal  p ON p.id = r.portal_id
LEFT JOIN partner c ON c.id = r.client_id
WHERE r.deleted_at IS NULL
  AND CAST(r.id AS CHAR) LIKE CONCAT(:id_prefix, '%')        -- ID
  AND r.portal_key = :portal                                 -- Portal (0 = All)
  AND r.client_key = :client                                 -- Client (0 = All clients)
  AND r.is_active  = :active                                 -- Status
  AND (r.all_markets = 1 OR EXISTS (SELECT 1 FROM markup_rule_market x
        WHERE x.rule_id = r.id AND x.market_id = :market))   -- Market
  AND (r.all_suppliers = 1 OR EXISTS (SELECT 1 FROM markup_rule_supplier x
        WHERE x.rule_id = r.id AND x.supplier_id = :supplier)) -- Supplier
ORDER BY r.id DESC                                           -- latest first
LIMIT :size OFFSET :offset;
```

---

## 4. Total count

```sql
SELECT COUNT(*)
FROM markup_rule r
WHERE r.deleted_at IS NULL
  -- same filter lines as the list
;
```

---

## 5. Overlap detection

Two rules **overlap** when both are active, have the same portal and client, and share a supplier and a market ("All" is its own value). The newer rule (higher ID) wins.

### Rule check (one rule: Save with the box on)

Pass the rule's supplier × market pairs. Returns the active rules that share them:

```sql
SELECT r.id AS rule_id, s.supplier_id, s.market_id
FROM markup_rule r
JOIN markup_rule_scope s ON s.rule_id = r.id
WHERE r.portal_key = :portal
  AND r.client_key = :client
  AND r.is_active = 1 AND r.deleted_at IS NULL
  AND r.id <> :rule_id                                     -- 0 for a new rule
  AND (s.supplier_id, s.market_id) IN ((:s1, :m1), (:s1, :m2) /* …its pairs… */);
```

- Hit ID higher than the rule → it **beats** the rule (`by`).
- Hit ID lower → the rule **beats** it (`over`). A new rule beats every hit.

### Full check (all rules: the list's Check overlaps button)

One pass. Returns each supplier × market that 2 or more rules share:

```sql
SELECT r.portal_key, r.client_key, s.supplier_id, s.market_id,
       GROUP_CONCAT(r.id ORDER BY r.id DESC) AS rule_ids    -- e.g. "1117,1110"; first = winner
FROM markup_rule r
JOIN markup_rule_scope s ON s.rule_id = r.id
WHERE r.is_active = 1 AND r.deleted_at IS NULL
GROUP BY r.portal_key, r.client_key, s.supplier_id, s.market_id
HAVING COUNT(*) > 1;
```

Then in one transaction: `UPDATE markup_rule SET overlap = NULL;` and write each overlapping rule's JSON. The screen reloads the list on the same page.

### The `overlap` value

| Key | Value |
|---|---|
| `status` | `blocked` (newer rules take all its pairs), `partial` (some), or `null` |
| `by` | newer rules that beat it, with the shared supplier / markets |
| `over` | older rules it beats, with the shared supplier / markets |

```json
{"status":"partial","by":[{"id":1117,"supplier":3,"markets":[12]}],"over":[{"id":998,"supplier":3,"markets":[7]}]}
```

Store IDs only; the list shows names. Pill and tooltip texts: see the dev notes.

---

## 6. History

```sql
SELECT h.op, h.snapshot, h.changes, h.created_at, u.name, u.email
FROM markup_rule_history h
JOIN user u ON u.id = h.user_id
WHERE h.rule_id = :id
ORDER BY h.created_at DESC;
```

| `op` | Written on | Holds |
|---|---|---|
| `create` | new rule | `snapshot`: every field |
| `edit` | edit with changes | `changes`: only changed fields, old → new |
| `status` | Active ↔ Inactive | `changes`: `is_active` old → new |
| `delete` | delete | nothing extra |
| `recorded` | only from moving the old log (section 8) | `snapshot`: every field of the oldest old row — shown as an Edit card with all its values |

---

## 7. Markup on search

Inputs: portal, client, supplier, **market = the customer's (source) market**.

1. Only **one** markup applies.
2. Only active, not deleted rules.
3. Most specific level wins: **client › portal all-clients › All portals**.
4. Same level: **named supplier › named market › All**.
5. Still tied: **newest rule** (highest ID).

Reference query:

```sql
SELECT r.id, r.markup_type, r.amount
FROM markup_rule r
JOIN markup_rule_scope s ON s.rule_id = r.id
WHERE r.is_active = 1 AND r.deleted_at IS NULL
  AND r.portal_key  IN (:portal, 0)
  AND r.client_key  IN (:client, 0)
  AND s.supplier_id IN (:supplier, 0)
  AND s.market_id   IN (:market, 0)
ORDER BY (r.client_key <> 0) DESC, (r.portal_key <> 0) DESC,
         (s.supplier_id <> 0) DESC, (s.market_id <> 0) DESC, r.id DESC
LIMIT 1;
```

Searches run this for every result, so keep the active rules **in memory** and reload them after any save. If that's not possible, make `markup_rule_scope` a stored table with `KEY (supplier_id, market_id, rule_id)` and refill a rule's rows on save.

---

## 8. Moving the current data

1. Copy each rule into `markup_rule` **with the same ID** (the ID is the priority). No portal / client → both `NULL`.
2. Markets: remove duplicates and blanks → `markup_rule_market`. A rule left with no market is bad data: fix it by hand.
3. One API per rule → one `markup_rule_supplier` row.
4. Drop the Commission column. Keep percents over 100.
5. Set `AUTO_INCREMENT` above the highest copied ID.
6. Run the full overlap check (section 5) once.
7. **History** — move the old log into `markup_rule_history`, so it shows in the same timeline:
   - Source: the old log rows with `type = 'hotel-default'` for each rule (what `POST /api/admin/get-log` returns). Each row's
     `difference` is the **full rule after that save** (every field in a 1-item array), not a diff. Creates were never logged.
   - Per rule, oldest → newest. Read: `market_list` ("2,1", NULL = All markets), `hotel_api_info_id`, `markup_type` (1 = percent,
     2 = fixed), `markup_amount`, `is_active`. Ignore `commission_*` and `market_name_list` (names are stale).
   - Oldest row → `op = 'recorded'`, `snapshot` = its values.
   - Every later row: compare with the row before it. Only `is_active` differs → `op = 'status'`; other fields differ →
     `op = 'edit'`; `changes` = `[{"field","old","new"}]` for the fields that differ. Nothing differs (e.g. only commission) → no row.
   - `user_id` = the user whose email is `done_by_email` (if none matches, a placeholder "Old system" user);
     `created_at` = `updated_at` (UTC, keep it UTC).
   - Check: each rule's newest old row should equal the rule as copied in step 1. Log the ones that don't.
   - Keep the old log table read-only until the result has been checked.
