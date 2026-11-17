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
    table.css         the portal's REUSABLE TABLE + pagination + empty state, 1:1 — every list uses it as-is
    skeleton.css      placeholder blocks for un-redesigned sections
  js/
    shell.js          injects the portal header + sidebar; sidebar lists only redesigned screens (MENU)
    <screen>.js       page prototype logic + dummy data
  notes/<screen>.md   dev notes (behaviour only) + changelog
  source/             captures of the live portal - git-ignored, never published
```

## Rules

- Only the sections asked for get redesigned; everything else stays skeleton.
- One section = one self-contained block, so a change is one skeleton swapped for one section.
- Dev notes describe values/rules/conditions, never styling.
- Lists use the portal's reusable table (`css/table.css`) unchanged — only columns and cell content vary per page.
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
