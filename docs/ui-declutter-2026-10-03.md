# UI declutter — 2026-10-03

Branch `ui/declutter-catalog`. A pass over the catalog, board, compare, and
prices screens to remove text and controls that repeat what the page already
says, plus a redesign of the catalog's selected-board card.

## Selected-board card (catalog detail panel)

Before: a "Selected board" eyebrow, a category chip, the board name, a
`vendor / family` line, four boxed spec tiles with decorative icons, a
Collection / Compare / ⋯ row, an "Open full board page" row, and a "Plan pins
on this board" row with a subtitle.

After: name with vendor logo → the ruled Processor / Logic / Power / Format
table the board page already used (now the shared `SpecTable`) → one action
row: **Board page**, **Plan pins** (only with a pin map), and **⋯**. The ⋯
menu holds Add to collection, Compare with other boards, Copy link, Copy board
ID, Copy pin lookup, and Print reference. The "Not 5 V tolerant" caution
stays under Logic, still sourced only from `fiveVoltCaution`.

`CollectionButton` became `CollectionPanel`, a trigger-less dialog opened from
the menu. It takes focus when it opens and returns it to ⋯ on close or Escape.
The board page uses the same `BoardActions` row (without the Board page link)
and the same `SpecTable`.

## Removed elsewhere

- Catalog: the visible "Showing N of M boards" line (kept as an `sr-only`
  live region), "4 reference picks", the "Curation notes" card, the
  "Board diagram" row chip and its CSS, the per-row Compare icon (now in ⋯),
  the boxed category tag on rows (folded into the meta line), and the cyan
  dots on active filter items, filter headers, and active-filter chips.
- Header: the Boards / Interfaces / Sources metric tiles (the Category facet
  already shows the board count).
- Background: the "REFERENCE HARDWARE / COMPUTE" and "/ CONTROL" labels.
- Footer: the "147 boards · 277 source links" line.
- Detail panel: the interface, highlight, and source count badges; the empty
  "Revision notes" placeholder (the section now appears only with notes, on
  both the panel and the board page); the visible "GitHub" tag on "Report a
  data error" (still announced to screen readers).
- Pin map widget: the repeated board name; its heading is now the connector.
- Board page: the `vendor / family` line under the title.
- Compare: the slogan, Boards / Sources metrics, the "Discovery workspace"
  marketing block, and the visible match count (kept `sr-only`).
- Prices: the slogan, the "US listings / USD / quantity 1" bar text, the
  intro sentence, "Price & stock as of the date shown", the visible listing
  count (kept `sr-only`), "· USD" on every row, and the duplicate "Shipping
  and tax excluded."
- `PlanPinsLink`: the subtitle. It no longer takes `auto`.

## Kept on purpose

Hardware-safety text: Before you wire, Verify against, the 5 V caution, the
pin-readout safety note, "Check your silkscreen revision…", and the footer
disclaimer. The prices "older check" banner and the "How to read these
prices" notes stay because they change what a reader should trust.

## Verification

- `npm run lint`, `npm run typecheck`, `npm test` (522 tests), `npm run test:e2e`, `npm run build`.
- New regression tests: `test/board-detail-panel.test.tsx` (no eyebrow or
  duplicate line, single heading, Board page / Plan pins links, hidden empty
  revision notes), `test/board-actions.test.tsx` (tools behind ⋯, collection
  dialog focus return), `test/pinhub-app.test.tsx` (no visible count, no
  "Board diagram", "reference picks", "Curation notes", row Compare, or active
  dot). They fail against the previous UI.
- Playwright specs updated for Collection moving into ⋯ and the "Plan pins"
  link name.
- Browser: catalog and board page checked in dark and light themes.
- Mobile (mobile-mojo agent, real Chrome with touch on the production build, dark
  theme) at 360×800, 390×844, 412×915, 844×390. All pages listed above:
  no page overflow, all actions 44 px tall, the ⋯ menu and collection dialog
  fit, Escape returns focus to ⋯, and no console errors.
  - Found and fixed: "Board page" truncated to "Board pa…" at 360 px. The
    action-row icons now drop out when the link row is under 16rem
    (container query). Rechecked at all four sizes: no truncation.
  - Flagged and confirmed intentional: the result counts on catalog and
    compare are `sr-only` live regions (1×1 px).

## Known limits

- Mobile checks ran in the dark theme only. Light theme was checked on
  desktop.
- On the board page at 360 px the lone "Plan pins" link also hides its icon,
  because the container query measures the link row, not the link. This is
  cosmetic.
- In 844×390 landscape the sticky catalog toolbar takes about 225 px. That
  predates this change and is not addressed here.
