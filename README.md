# Admin Portal Redesign

A single project that mirrors the admin portal screen by screen.
Each page shows the **real redesigned sections**, and everything not yet redesigned
stays as a **labelled skeleton** in its true position, so the page fills in turn by turn.

## Structure

Published with GitHub Pages as a clickable prototype (same model as Map-UI):
the repo root is the site root, and every screen is one HTML file sharing the same CSS/JS.

```
admin-portal/
  index.html          screen list + progress (site home)
  <screen>.html       one page per admin screen: redesigned sections + skeletons
  css/
    tokens.css        colours, type, spacing (captured from the live portal)
    shell.css         header + sidebar, 1:1 copy of the live portal (incl. collapse, hover, dropdowns)
    components.css    shared redesign components (buttons, drawer, switch...)
    table.css         the REUSABLE TABLE + pagination + empty state: portal shape, redesigned look — every list uses it as-is
    select.css        searchable dropdown (every <select>), Map-UI style — needs js/select.js
    history.css       Edit History cards (Map-UI design) — every History drawer uses it
    skeleton.css      placeholder blocks for un-redesigned sections
  js/
    shell.js          injects the portal header + sidebar; sidebar lists only redesigned screens (MENU)
    select.js         turns every <select> into the searchable dropdown (css/select.css)
    <screen>.js       page prototype logic + dummy data
  notes/<screen>.md   dev notes (behaviour only) + changelog
  source/             captures of the live portal - git-ignored, never published
```

## Rules

- Only the sections asked for get redesigned; everything else stays skeleton.
- One section = one self-contained block, so a change is one skeleton swapped for one section.
- Dev notes describe values/rules/conditions, never styling.
- Lists use the reusable table (`css/table.css`) unchanged — only columns and cell content vary per page. Its shape (markup, bordered grid, navy header, badges, Action column, footer parts) and the Poppins font stay the portal's; its look follows the Map-UI style (city-system.html).
- Every dropdown is the searchable dropdown (`css/select.css` + `js/select.js`, call `SearchableSelect.init()` after filling options). Write a normal `<select>`; `data-no-search` opts out.
- Header and sidebar copy the live portal exactly; the sidebar shows only screens that have been redesigned.
- Tag each handoff: `git tag <screen>-handoff-<n>`.

## Caching

CSS/JS links carry `?v=N`. Bump N in every page when shared files change, so viewers don't get stale copies.

## Viewing

Local: `http://localhost:5500/admin-portal/` (the `designs` server in `.claude/launch.json`).
Published: GitHub Pages from the `main` branch root.

Use dummy data only in published pages - no real customer names, booking refs, emails or internal URLs.

## Screens

| Screen | Sections redesigned | Status | Last change |
|---|---|---|---|
| [Hotel APIs](hotel-apis.html) | Whole page (list, filters, create/edit, history) | Draft | 2026-11-17 |
