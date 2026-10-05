# Board link — 2026-10-04

Branch `feature/board-link`, from `main` at `d01cd68`. A new section, `/link`:
pick two catalog boards and a bus, and PinHub lists the wires that join them,
from each board's own pin map. Design language: `docs/DESIGN.md` section 19.

The rule throughout is the catalog's: derive, never declare. A wire is drawn
only between pins whose records name the signal, and the link stops where the
records cannot vouch for a direct connection.

## What it does

- **UART:** A TX → B RX, B TX → A RX, and a shared ground.
- **I2C:** SDA to SDA, SCL to SCL, and a shared ground.
- **Logic levels** come from each record's `logicLevel` through the discovery
  profile. Matching levels link directly. Different levels put a level
  shifter on every signal wire; for a 3.3 V board facing 5 V, the wording
  comes from `fiveVoltCaution` ("states it is not 5 V tolerant", "does not
  state 5 V tolerance", or "mentions tolerance but not input thresholds").
  A level the record does not settle (Mixed or Unknown) asks for a check.
- **Never joins power rails.** The notes say why: power each board from its
  own supply unless both datasheets say a shared rail is safe.
- **Cautions** for each chosen pin come from the record only: flag notes,
  the reserved role, and the pin's own note (the UNO's D0/D1 USB serial
  warning, for example).
- **Bus choice:** a board with more than one complete bus gets a select
  (Pico UART0/UART1, Teensy 4.1 UART1–UART8). The default is the instance the
  sources name as default, then the one with fewest cautions.
- **Alternate pins:** on boards with source-backed pin functions, each end
  lists the other pins carrying the same signal (Pico UART0 TX: also GP12,
  GP16, GP28).
- **Shareable:** `?a=&b=&bus=` plus `pa`/`pb` for a non-default bus.
- **Entry points:** header nav ("Link"), and "Wire these two boards" on the
  compare page when exactly two mapped boards are compared.
- **Copy wire list** puts the schedule on the clipboard as plain text.

## Deliberately left out: SPI

SPI needs one board to run as a peripheral, and which data pin is the input
in that mode depends on the chip's SPI controller. On an RP2040 the SPI TX
pin stays an output in peripheral mode, so the common "MOSI to MOSI" rule
would join two outputs. No record states this, so PinHub does not draw SPI
links. The page says so next to the bus switch.

## How signals are found (`src/lib/board-link.ts`)

1. Boards with source-backed pin functions (Pi 5, Pico, ESP32-DevKitC, UNO
   Rev3): only `pin.functions`, with their instances and defaults.
2. Every other board: the signal names already in the label and aliases,
   read token by token. Spellings covered include `TX0`, `U0TXD`, `UART3_RXD`,
   `USART2_TX`, `TXO`/`RXI`, `SDA1`, `I2C-3 SDA`, `I2C4_SDA_M0`, `TWI1-SCK`,
   and `I2C2_DAT`/`_CLK`.
   - Only a number names an instance. "UART TX" and a bare "SDA" name the
     bus family, never a numbered controller.
   - Clock and data spellings (`SCK`, `CLK`, `DAT`) count as I2C only under
     an I2C or TWI prefix; a bare `SCK` is an SPI clock.
   - Unnamed buses are split by connector group, so two unrelated "TX/RX"
     pairs on different headers are never mixed.
   - Rails, grounds, debug pins, flow control (`RTS`/`CTS`), and other
     protocols (`PCM`, `CAM`, …, shared with `pin-nets`) are ignored.
3. Ground: a pin on the `GND` net, preferring the connector group of the
   chosen signal pins.

Coverage on today's catalog: 125 of 142 mapped boards can link over UART and
112 over I2C. The rest are blocked with a reason (for example the ESP32-S3
DevKitC-1 record names no I2C pins, because its I2C is GPIO-matrix routed).

## Files

- `src/lib/board-link.ts`: signal parsing, ports, wires, level check, text
  export.
- `src/lib/link-params.ts`: URL state, bounded and shape-checked
  (`isBoardId`, a printable 64-character cap on port ids, a scan cap on the
  query); port ids are matched against the board's real ports before use.
- `src/app/link/page.tsx` and `src/components/link/`: `LinkApp` (state,
  on-demand board loading), `LinkBoardSlot` (search or chosen board),
  `LinkHarness` (the wire list), and `LinkSheets` (the two connector sheets).
- `src/app/globals.css`: the `.ph-link-*` block, with light-theme tokens.
- `SectionNav`, `sitemap`, `CompareTable`: the entry points.
- `src/lib/pin-nets.ts`: exports `FOREIGN_PROTOCOLS` for reuse.

## Verification

- `test/board-link.test.ts` (15), `test/link-params.test.ts` (4), and
  `test/link-ui.test.tsx` (6), covering signal spellings, port splitting and
  ranking, UART crossing, the Pi 5 ↔ UNO shift verdict and its USB caution,
  the Pico ↔ ESP32 I2C link, instance choice, the check and blocked states,
  no power wires, URL bounds, and the compare entry point.
- `e2e/board-link.spec.ts`: pick, wire, select (a pad is marked on each
  sheet), reload, and back; 360 px fit with 44 px controls. The nav e2e now
  expects five links on one row at 360 px, `/link` included.
- `npm run lint`, `npm run typecheck`, `npm test` (565 passing), and
  `npm run build` pass. `npm run test:e2e` passes all 85 tests against the
  production server, after the mobile fixes as well.
- Looked at in the browser in both themes: Pi 5 ↔ UNO (shift), Pico ↔ ESP32
  (I2C, match), Pico 2 ↔ Mega (picked through the search).
- Found and fixed while verifying: with a fifth nav link, the icons
  overflowed the row at 412 px (436 px wide). Icons now hide below 480 px.

## Mobile gate

The mobile-mojo agent tested the production build with Playwright (Chrome, touch,
`isMobile`, DPR 2, `window.innerWidth` asserted) at 360 × 800, 390 × 844,
412 × 915, and 844 × 390. Every journey passed, with no page overflow and no
console errors: pick by search, the Pi 5 ↔ UNO shift verdict, row and pad
selection on both sheets, the I2C toggle, swap, the bus select, a dropped
unmapped board, the five-link nav on every section, and compare → link.
Defects it confirmed, all fixed:

- **Mega sheet unreadable in portrait** (pads about 5 px, hit circles 8–9 px).
  Each sheet now keeps a minimum drawing scale and scrolls sideways inside
  its panel. Selecting a wire scrolls its pad into view. The same rule fixes
  the 40-pin sheets in landscape, which had been capped to 110 px wide.
- **Sheet captions clipped board names** ("Ardu…"). The name now wraps on its
  own line, with the connector below it.
- **Ferrule labels and column heads truncated** at 360 and 390 ("D0 /…").
  Both now wrap.
- **"Link" nav item 40 px wide** below 400 px. Nav links are now at least
  44 × 44.
- **Bus select 36 px tall.** It is now 44 px.

Regression checks in `e2e/board-link.spec.ts` (Mega pad size, sheet scroll,
select height) and the nav e2e (44 px width).

The agent rechecked every fix at all four sizes, and all passed:

- **Mega sheet:** hit circle 30.8 px and labels at least 12 px. Each row
  scrolls its pad into view, and each pad selects its row.
- **Labels:** captions, ferrules, and heads are not clipped anywhere. At
  360 px, "D0 / RX" wraps to two lines.
- **Landscape Pi 5 sheet:** hit circle 30.9 px.
- **Select:** 44 px tall.
- **Nav:** every link is at least 44 × 44, on one row, with no overflow.

It noted that nothing showed that a sheet scrolls, so a "Scroll sideways"
line now appears only when a sheet is wider than its panel (covered by the
e2e). Keyboard users reach every pad by Tab, and focusing a pad scrolls it
into view, so the scroller gets no extra tab stop.

## Known limits

- SPI is not offered (see above).
- I2C target mode, pull-up values, and baud rates are not in the records;
  the notes say so instead of guessing.
- On GPIO-matrix chips (ESP32 family) the link uses the pins the records
  name, not every routable pin.
- In landscape a tall 40-pin sheet is about 760 px high and needs a
  vertical scroll; that is the cost of keeping its pads tappable.
- The ground pin is the first suitable one; another ground on the same
  header works equally well, and the sheet shows them all.
