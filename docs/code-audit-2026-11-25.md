# Code audit, 2026-11-25: sideways labels in the Dynamic pin map

Branch `fix/dynamic-pinout-orientation`, from `main` at `6c00ce2`.

## Finding

On the STM32 Nucleo-F401RE the Dynamic pin map's zoomable connector diagram
drew every signal name turned 90°. Reading a pin meant tilting your head,
and zooming only made the sideways text bigger.

A sweep of the geometry for every catalog board found the same fault in
three layouts, because each one lays a header's pads along a horizontal edge
and can only fit the names by rotating them (`rotateLabel: true` in
`src/lib/board-visual-geometry.ts`):

| Layout | Boards | Where the reader saw it |
| --- | --- | --- |
| `shield-split` | 29: Nucleo-64 (18), Arduino Uno/Mega/Due/Uno Q/RedBoard, nRF52/nRF5340/nRF52840 DKs, MSP430 LaunchPad | Connector diagram (always zoomable) |
| `edge-connector` | 1: BBC micro:bit V2 | Connector diagram |
| `header2x` on a picture | 18: 14 Raspberry Pi models (artwork), 4 Orange Pi boards (portrait) | **Zoom to touch size** on the board picture |

The 25 other 40-pin SBCs, all edge modules, the Nucleo-144 and the
function-grouped boards already zoomed into level labels.

## Changes

- `buildBoardGeometry(board, { sheet: true })` now builds a level connector
  chart for `shield-split` and `edge-connector` boards (`buildColumnSheet`):
  one column of pads per connector, names to the right, titled with the
  connector's name. A connector longer than 18 pins wraps into balanced
  columns (the Mega's 54-pin header is 3 × 18). Anchor keys (`g0:n`, `g1:n`,
  `e:n`) match the board drawing, so selection, links and plans carry over.
  The planner, pin check and board link sheets use the same chart, so their
  labels are level as well.
- New `readableDiagramFor(board, geometry)` decides what a zoomable view
  reads its labels from. It returns null only when the board drawing's own
  labels are already level.
- `BoardDrawingViewport`: a picture-mapped board whose labels would rotate
  (Raspberry Pi, Orange Pi) keeps its clickable whole-board picture and gains
  the level odd/even connector chart as its zoomable diagram. The Raspberry
  Pi workbench places that chart below the board and its pin readout
  (`ReadableConnectorDiagram`, `diagramElsewhere`), so picking a pin still
  shows its details beside the board rather than past a tall chart.
- **Show selected pin on diagram** focuses the pad on the zoomable diagram
  when a board draws a pad on both the picture and the diagram.
- Connector titles on plain sheets are drawn at 0.62 opacity, up from 0.28,
  because on a chart they name the connectors. This also lifts the Zio
  designators on the Nucleo-144 planner sheet.

## Regression tests

- `test/readable-pin-diagram.test.ts`: for every board, no rotated label in
  the zoomable view; diagram keys and pins match the board drawing; the
  F401RE lays out as level columns titled with its connectors; the Mega wraps
  into three columns; columns never collide; the Pi 5 and Orange Pi 5 keep
  their picture and gain a diagram, and the Pico still zooms in place. It
  fails on `main`.
- `e2e/readable-pin-labels.spec.ts`: the catalog's Dynamic tab for the
  F401RE, Mega, micro:bit, Pi 5 and Orange Pi 5, zoomed, has no rotated label,
  and every label of four or more characters is wider than it is tall on screen.
- Updated for the new behavior: `test/inspector-body.test.tsx`,
  `test/raspberry-pi-connector.test.tsx` (touch zoom now exercised on the
  Pico; the Pi 4 checked for its level diagram), `test/board-family-art.test.tsx`
  (pads drawn twice on picture-plus-diagram boards), and
  `e2e/dynamic-pin-size.spec.ts` (scoped to the zoomable view),
  `e2e/raspberry-pi-redesign.spec.ts` (40-pin Pis zoom on the diagram, the
  Pico on its picture; pad selectors scoped to picture or diagram) and
  `e2e/board-link.spec.ts` (the Mega's link sheet opens on its UART pair
  and has no rotated label; it no longer needs a sideways scroll to reach it).

## Verification

- `npm run lint`, `npm run typecheck`: clean.
- `npm test`: 110 files, 2,641 tests passed (baseline 2,631).
- `npm run build`: passed, including the board-visual and source-link gates.
- Board-by-board browser sweep of the production build at 1280 × 900: all
  196 board pages opened, and each zoomable view was zoomed and its labels
  measured. 190 boards draw pins; 0 rotated labels on any of them. The other 6 have no pin map
  yet and show the static reference. Screenshots of all 190 diagrams were
  reviewed on contact sheets. The sweep's 19 "taller than wide" flags were
  all function-grouped sheets whose two-part names stack as two level lines.
- Catalog Dynamic tab checked in dark and light themes.
- `CI=1 npx playwright test --retries=0` against the final production
  build: 189 passed, 0 failed.
- Mobile gate (mobile-mojo, real Chrome with touch emulation at 360 × 800,
  390 × 844, 412 × 915 and 844 × 390; light theme at 390 × 844): F401RE,
  Mega, micro:bit, Pi 5 and Orange Pi 5 on the Dynamic tab, the board pages,
  and the Inspect dialog. No confirmed defects, no overflow, no console
  errors, and zoomed pads 45–79 px. A recheck covered the Pi workbench after
  its diagram moved below the readout.

## Mobile observations not changed

- In landscape at fit, the canvas is capped at `min(70svh, 640px)`, so a
  chart's labels are 6–8 px until **Zoom to touch size**. The same holds for
  the Mega at fit in portrait.
- The Pi and Orange Pi whole-board pictures no longer have their own zoom;
  their pads are 6–9 px across. The touch path is the chart (and, on Pis,
  the pin-pair list), whose pads are 50–79 px when zoomed.
- Not covered: real iOS Safari, the OS select picker, virtual keyboard,
  320 px and 200% text zoom, and light theme in landscape.

## Known limits

- Picture-mapped 40-pin boards now draw each pad twice (picture and
  diagram), so a keyboard user meets two pad groups. Both are labelled and
  stay in sync.
- The chart orders shield-header pins by the catalog's signal order, not the
  physical sequence along the header; the existing order note says so.
- The geometry builders still produce rotated labels for the full-board
  drawings of these layouts. No view renders those labels any more: the
  whole-board pictures are drawn without labels, and every zoomable view
  reads from `readableDiagramFor`.
