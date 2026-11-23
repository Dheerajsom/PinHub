# Board link: sheets that fit, cautions people read (2026-11-22)

Branch `fix/link-sheet-fit`. Reported on `/link` with a Raspberry Pi 4 Model B
and an STM32 Nucleo-H753ZI over UART: the Pi's header was readable, but the
Nucleo's sheet drew all four Zio connectors, so the three linked CN7 pins sat
far off to the right ("Scroll sideways for the rest of the connector") and
below a long vertical scroll. The "Before you connect" section listed ten full
sentences, most of them about pins the link never touches.

## Findings

1. **Sheets drew the whole board.** The H753ZI sheet rendered 1649 × 2440 px
   in a 441 px panel at a 1024 px window. The 44 px touch rule sets the
   drawing's minimum width from the whole sheet, so a large board could never
   fit its panel.
2. **Overflowing sheets opened at the left edge.** The scroller only moved
   after a wire row was picked, so a connector on the right edge started out
   of view.
3. **Half-width panels for sheets that cannot be legible at half width.** A
   UNO, nRF52 DK, or 11-column schematic strip was squeezed beside its
   partner and scrolled, though stacking the pair would show it whole.
4. **Cautions were a wall of text.** Every board warning was listed, plus the
   power and bus notes, at 13 px. For the reported pair that was 10 items.
5. **Mobile gate finding (fixed):** with the first fix, an overflowing sheet
   was centred on the midpoint of its linked pads. On a phone, the Grand Central
   M4's I2C pads sit at both ends of a strip, so the midpoint fell between
   them. The sheet opened with none of its 3 ringed pins visible, and the UNO
   with 1 of 3.
6. **Flaky test (unrelated area):** `council-fixes.spec.ts` "mobile detail
   clears measured sticky controls" threw when a `boundingBox()` was null for
   a frame, ending its `expect.poll` as a failure instead of polling again
   (about 1 in 15 runs).

## Changes

- `src/components/link/sheet-view.ts` (new, pure):
  - `linkedSheetView` frames a sheet on every connector (pin group) that
    carries a linked pin. It keeps each connector whole, with its label rail
    and designator. Ungrouped pins count as one connector, so a 2 × 20 header
    is never cut in half.
  - It returns no frame when a linked end has no pad, or when the frame would
    keep more than 72% of the sheet's area.
  - `sheetScrollCentre` picks where an overflowing sheet opens: the window
    holding the most linked pads, with ties going to the earliest wire.
- `BoardStage` takes an optional `view` (viewBox). `LinkSheets` passes it and
  draws only the pads inside the frame, so keyboard focus never lands on a
  cropped pad.
- `LinkSheets`:
  - Each framed sheet shows a caption ("Showing CN7 Zio (upper right)") and a
    44 px **Whole board** toggle (`aria-pressed`). The choice is keyed to the
    board, bus and ports.
  - An overflowing sheet opens on its linked pins. When they cannot all fit,
    the hint says so: "The linked pins span more than the screen…".
  - The pair stacks when either sheet's legible minimum is wider than half
    the row. That minimum is 0.7 px per unit, or touch width on coarse pointers.
- Touch sizing (`globals.css`, `.ph-link-sheet-art`): the 44 px minimum width
  is now a CSS variable. It is switched off only for `(hover: hover) and
  (pointer: fine)` without `any-pointer: coarse`, so a mouse-only desktop can
  shrink a sheet to its legible minimum. Touch devices are unchanged. This is
  recorded in `docs/DESIGN.md` under "Link sheets show the linked connector".
- `src/lib/link-checklist.ts` (new): "Before you connect" now shows:
  - **Essentials:** 2–3 short cards for the bus (UART: Ground only, Match
    settings; I2C adds Pull-ups and One target).
  - **Board notes for this link:** only the warnings that mention the bus, a
    linked signal pin by label or by "pin N", a logic level or voltage, or the
    board revision.
  - **N more board notes:** every other warning, in a `<details>` disclosure.

  Warnings are filtered, never reworded, so no electrical claim is added.
  `link.notes` and the copied wire list still carry every note in full. For
  the reported pair: 2 cards, 3 notes, 5 behind the disclosure.
- `board-link.ts`: the unsettled-level verdict is one shorter sentence.
- `e2e/council-fixes.spec.ts`: the sticky-controls poll returns "not yet"
  for a null box instead of throwing.

## Verification

- Baseline before edits: lint, typecheck, `npm test` all green.
- After: `npm run lint`, `npm run typecheck`, `npm test` (92 files, 1990
  tests), `npm run build` (801 pages), and
  `CI=1 npx playwright test --retries=0` (149 passed).
  - The Next.js CLI stopped the first build after it finished, with a
    security advisory for 16.4.3. A re-run built cleanly. Dependabot's open
    PR #57 bumps Next to 16.4.6.
- Regression tests:
  - `test/link-sheet-view.test.ts`: the H753ZI frame is CN7 only and under
    half the sheet's size; the Pi stays whole; a catalog-wide sweep checks
    that no linked pad or label rail is framed out; and the scroll-window
    choice for the Grand Central and UNO cases.
  - `test/link-checklist.test.ts`: the relevant notes for the reported pair,
    no warning dropped, and the I2C note is relevant only on I2C.
  - `test/link-ui.test.tsx`: the framed `viewBox` and its toggle, and the
    condensed notes.
  - `e2e/board-link.spec.ts`:
    - The H753ZI fits its panel beside the Pi at 1160 px, with all three
      rings shown, and its disclosure works.
    - On a phone, the Mega opens scrolled to the linked pads.
    - On a phone, the Grand Central opens with at least 2 of 3 rings on screen.
  - The two new browser cases fail against the old `LinkSheets`.
- Catalog sweep (Pi 4 as board A, every mapped board as B, UART and I2C, 358
  pairs), modelled at a 1280 px window for framing alone: sheets overflowing
  their panel went from 112 to 39, and total sideways overflow fell by 64%.
  The model used touch sizing and ran before the stacking rule, so it
  understates the desktop result. In the browser at
  1024 px, 10 representative pairs show every ringed pad on screen at load.
  The Mega and Due still scroll inside a full-width panel but open on the
  linked pins.
- Mobile gate (`mobile-mojo`): Chrome with touch emulation at 360 × 800,
  390 × 844, 412 × 915 and 844 × 390, both themes, 7 pairs.
  - First pass: finding 5. Everything else passed, with no page overflow,
    44 px targets, visible focus and no console errors.
  - Recheck after the fix: pass on all 56 runs (7 pairs × 4 viewports × 2
    themes), with zero console errors.
    - Every sheet opens with 3/3 linked pads on screen. The exceptions are the
      UNO and the Grand Central at 360/390/412, which show 2/3 with the
      "span more than the screen" hint.
    - Wire taps bring each pad into view, and the Whole board toggle and the
      disclosure work.
    - Targets are 44 px or more, and the focus outline is visible.
    - Screenshots reviewed: the Grand Central and UNO at 360 dark, and the
      Pi 4 + H753ZI sheet and notes at 360 light.

## Known limits

- On a phone at 44 px touch sizing, a sheet whose linked pins span more than
  the screen cannot show them all at once:
  - The Mega's outer rings clip by about 15 px at 360 px, with all centres
    visible.
  - The UNO and Grand Central show 2 of 3 and say so in the hint.
  - Picking a wire row scrolls to that wire's pad.
- Shield-split boards (UNO, Mega, Nucleo-64, nRF DKs) are rarely framed. Each
  header spans a whole board edge, and the link's ground pin is often on the
  opposite header. They rely on stacking, desktop shrinking and the scroll
  target instead.
- The relevance filter is keyword-based. A warning that matters but names no
  bus, pin, voltage, logic level or revision goes behind the disclosure. It
  is still one click away and in the copied list.
- The mobile gate ran Chrome with touch emulation only: no WebKit, real
  devices, 320 px or 200% text zoom.
