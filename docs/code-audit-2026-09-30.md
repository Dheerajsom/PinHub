# Visual polish audit — 2026-09-30

## Findings

- "Before you wire" drew an orange inset rule on its leading edge and set
  zinc-300 text at 13 px on a brown (#1b1410) slab, which read poorly.
- The board price card used the same amber as favorites and packed three
  lines of terms ("USD · Checked … · tax/shipping extra") under the amount.
- Templated finish across the site: gradient-filled wordmarks (catalog and
  compare headers), a gradient hairline over the header, glowing cyan dots,
  a cyan bloom shadow on the selected row, a gradient Favorites button, hover
  lifts on rows, chips and compare cards, a search-focus glow, a
  backdrop-blurred command bar, and a tilted yellow "New / Dynamic render"
  sticker on Raspberry Pi rows.
- `/prices` opened with a three-fragment tagline that claimed "Popular
  boards", which the data does not back.

## Changes

- Cautions panel: neutral opaque surface, warm header band, diamond bullets,
  14 px zinc-200 text, no edge rule. All colours are `.ph-cautions-*` classes
  with light-theme counterparts.
- Prices are green (`.ph-price-*`, green-300 / green-800), distinct from the
  emerald used for official sources. The board price card is a shelf tag:
  eyebrow + retailer, mono amount + variant, dashed rule, "Last checked".
  The Prices nav link, `/prices` amounts and "View store", and compare-table
  prices use the same ink.
- Removed the gradients, glows, lifts and blur listed above. The sticker is
  now a flat "Board diagram" chip. The `/prices` intro states what the page
  lists.
- `CLAUDE.md`: strict rule to never create git worktrees; branch in this
  checkout instead. Colour-role line updated for green prices.

## Verification

- `npm run lint`, `npm run typecheck`, `npm test` (466 passed),
  `npm run build`, `npm run test:e2e` (81 passed). The price e2e locators and
  the light-theme nav colour test were updated to the new card and green ink.
- Desktop, both themes: board page, catalog, prices checked in the browser.
- mobile-mojo (Playwright, real widths): 360×800, 390×844, 412×915, 844×390,
  dark and light, on `/`, `/boards/raspberry-pi-5`, `/prices`, `/compare`.
  No horizontal overflow, no console errors, price card and caution rows
  ≥44 px.

## Known limits

- Header section links and compare toolbar buttons are 40 px tall, and two
  `/prices` text links are 24 px (pre-existing, not changed here).
- The pin map itself was not re-inspected in landscape; this change does not
  touch it.
- In light theme the static pin-map legend chips keep their dark fills
  (pre-existing).
