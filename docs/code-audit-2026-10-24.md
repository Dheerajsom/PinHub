# Filter rail and match badges — 2026-10-24

Branch `feature/filter-menus`. Follows the 2026-10-18 sort-menu change
(`SortMenu`), which left the rail's two dropdowns as native `<select>`s.

## Findings

- **Match badge noise.** Every search result carried a "name match" chip, and
  part-number searches a "specs match" chip. Both name things the row already
  shows (its name, its processor line), so they added a chip to nearly every
  row without explaining anything.
- **Native dropdowns.** Manufacturer (38 options) and Processor family (92)
  were native `<select>`s: an OS-drawn list that ignored the theme, gave no
  way to narrow a long list, and showed no counts. The Category panel beside
  them already showed counts.
- **Rail length.** At 1440 × 1000 the rail measured 3,248 px of content in a
  900 px viewport. The Interface list alone (18 short names, one per row) was
  858 px.
- **Light-theme rest fill (pre-existing bug).** Rail list options used a
  `hover:bg-white/[0.06]` utility. The light theme's `[class*="bg-white/"]`
  substring rule matches that class, so every idle option had a faint fill
  at rest on paper.
- **Duplicate icon.** Logic level and Power input both used the Zap icon.
- **Phone tap targets.** Rail list options were `min-h-10` (40 px) below
  1024 px.

## Changes

- `shownMatchReason` (`src/lib/board-search.ts`) drops name and spec reasons;
  the catalog and discovery views pass reasons through it. Vendor, interface,
  warning, and description badges remain.
- New `FacetMenu` (`src/components/catalog/FacetMenu.tsx`) for Manufacturer
  and Processor family. It reuses the sort menu's option rows
  (`.ph-menu-option` shares the `.ph-sort-option` rules in both themes):
  - It is a button that shows the current value and its board count, and
    expands a list in place. The rail scrolls on its own, so a floating popup
    would be clipped by it.
  - Focus moves to a search field (editable combobox, `aria-activedescendant`).
  - Typing narrows the list while "All …" stays first. Typing on the closed
    trigger opens it already narrowed.
  - Arrows, Page Up/Down, and Enter choose an option. Escape clears the field,
    then closes the list. Tab and outside presses close it.
  - Each option shows its count in Geist Mono and a cyan check when chosen.
    Manufacturers carry their vendor mark.
  - The field is 16 px below 1024 px, so iOS does not zoom on focus. Its focus
    cue is a cyan underline, because an outline would be clipped inside the
    panel.
  - On open the panel scrolls into view. Inside the desktop rail it uses
    `nearest`. When the page scrolls, it measures the sticky command bar
    (`data-sticky-header`): bottom-aligned when the panel fits below the bar,
    otherwise the search field goes just under the bar (landscape phones).
    The scroll is instant under reduced motion.
  - The highlighted option is kept visible by scrolling the list alone. An
    earlier version used `scrollIntoView`, which also scrolled the page and
    cancelled the smooth reveal (see Mobile gate).
- `FilterPanel` gains `layout="tokens"`, a wrapping grid of mono tokens, used
  for Interface and Logic level. List options and tokens are 44 px below
  1024 px.
- Every rail option shows a catalog-wide board count, computed with
  `matchesCatalogFilters` itself, so a count equals the results that option
  returns alone. Wireless and Documentation are included.
- Power input uses the Plug icon.
- Hover fills moved to `.ph-filter-option` / `.ph-token` CSS rules with light
  counterparts. This fixes the light-theme rest fill.
- Count colors were chosen for contrast with small text: `#91919b` on the dark
  well (6.1:1) and `#475569` on the light well (6.4:1). The first pass
  measured 3.9:1 and 4.0:1 and was corrected.
- `docs/DESIGN.md` §7 records the rail controls and the badge rule.

Result: the rail at 1440 × 1000 is 2,538 px (was 3,248). Interface is 274 px
(was 858) and Logic level 94 px (was 228).

## Tests

- `test/facet-menu.test.tsx` covers the following. Each case fails against
  the old native `<select>`:
  - The menu is themed and shows counts.
  - Typing narrows the list, keeps "All" first, and Enter chooses an option.
  - The empty state, and Escape clearing before it closes.
  - Typing on the closed trigger opens the list already narrowed.
  - The trigger's filtering state.
  - The `shownMatchReason` rules.
- `test/pinhub-app.test.tsx`:
  - The "Raspberry Pi 5" case now asserts no badge on the name hit and a
    description badge on the HAT.
  - A new case filters by manufacturer through the menu and asserts there is
    no `<select>` in the rail.

## Verification

- Baseline before edits: lint, typecheck, 590 unit tests green.
- After: lint and typecheck clean, 599 unit tests pass.
- `npm run build` compiles and prerenders every route, then exits 1 on the
  Next.js 16.4.0 "SecurityFatalError" upgrade notice, the same as `main`. The
  notice also blocks `next dev`, so Playwright ran in CI mode against the
  production build. In the final run 84 passed and one passed on retry: the
  collection-creation case at 844 × 390. Run alone with retries off at all
  four viewports, 5 times each, it passed 20/20.
- Browser at 1440 × 1000, both themes: menus, counts, vendor marks, tokens,
  and the active-filter chip render as designed. Measured contrast is listed
  above.
- Mobile gate (mobile-mojo; Playwright, real Chrome, touch, DPR 2, dark and
  light) at 360 × 800, 390 × 844, 412 × 915, and 844 × 390:
  - Passes:
    - Choosing a manufacturer and a family through the menus, with the sheet
      closing and the filter chip appearing.
    - Interface and logic tokens (all at least 44 × 44 px).
    - A 16 px search field.
    - Match chips: none for name or spec hits; warning, interface, vendor, and
      description chips still appear.
    - No page overflow and no console errors.
  - Fixed during the gate:
    - Opened menus landed below the fold. Opening now scrolls the panel
      into view.
    - In landscape, the search field then landed under the sticky bar, and
      the highlighted option's `scrollIntoView` cancelled the reveal. Both
      are fixed. Final landscape result: the search field is visible with 4
      full rows (it was 0). ArrowUp/ArrowDown through the 93-row family list
      kept the highlight inside the list on 75 of 75 presses with no page
      movement.
  - Not fixed:
    - Four vendor marks 404 from the favicon service (wemos.cc,
      microbit.org, nodemcu.com, weactstudio.cn). Those rows keep an empty
      mark slot, and the labels stay aligned. This is a pre-existing logo
      gap that the menu now shows.
    - The command-bar "Remove" chips are 34 px tall (pre-existing, outside
      the rail).
    - In landscape the panel can settle up to about 50 px below the bar
      rather than 8 px, because the bar compacts while the page scrolls.
  - Not checked: iOS Safari on a device.

## Known limits

- Counts are catalog-wide, like Category's. They do not narrow as other
  filters are applied, so an option can show a count but return nothing in
  combination.
- Rail controls that were already under 44 px at desktop width are unchanged.
  Tokens are 32 px from 1024 px up, matching the existing list rows.
- Power input and Form factor stay as lists. Their labels are prose, not
  machine names, so they do not suit the mono token grid.
