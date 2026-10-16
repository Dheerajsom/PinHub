# Background redesign — 2026-10-16

Branch: `feature/background-redesign`

## Why

The old `CircuitBackground` drew two cartoon reference boards (a Raspberry Pi 5
and an Arduino Uno) drifting over a blueprint grid, with dashed traces running
between them. The grid looked generic, the boards competed with the catalog,
and none of it told the visitor anything about what PinHub does.

## What changed

- **Logic-analyzer backdrop.** The page now sits on a running bus capture:
  ten channels (SCL, SDA, CS, SCK, MOSI, MISO, TX, RX, PWM, GPIO) scroll slowly
  (160 s per loop) past a fixed trigger line, over faint dotted time divisions.
  It ties to the product: pins carry signals, and this backdrop shows them.
- **Real traffic, not squiggles** (`src/components/bus-capture.ts`):
  - I2C: display at 0x3C switched on (`00 AF`), a temperature read from 0x48
    with the controller NACKing the last byte, then charge pump on (`00 8D 14`).
  - SPI mode 0: flash JEDEC ID read (`9F` → `EF 40 18`), a data read from
    address 0 that returns `50 69 6E` ("Pin"), and a status-register read.
  - UART 8N1, LSB first: TX sends `AT␍␊` and `PinHub␊`; RX answers `OK␍␊` twice.
  - PWM duty cycle swinging 10% → 90% → 10%; a pulled-up button press with
    contact bounce on both edges.
  - Decode labels above each byte, Saleae-style, in Geist Mono.
- **Color carries meaning.** Each lane uses its pin-role hue from
  `board-visual/roles.ts`: the ink step in dark mode, the fill step in light
  mode. It never uses the probe cyan `#22d3ee`.
- **Layout.** Full strength in the desktop gutters, masked to 34% behind the
  1560px content column. Channel labels (`D0 SCL` …) and the trigger flag
  appear only at 1800px and wider, where the gutter can hold them. All widgets
  stay opaque.
- **Motion.** One composited `transform` animation. It is turned off below
  1024px and under `prefers-reduced-motion`.
- **Removed:** the board artwork, the blueprint grid, the trace map, and their
  keyframes (`.pinhub-*` classes). The print stylesheet now hides `.ph-scope`.
- `docs/DESIGN.md` background section updated.

## Verification

- `test/bus-capture.test.ts` (new, 6 cases) decodes every lane back out of
  the waveforms. It checks the UART text and stop bits, I2C START/STOP framing
  and ACK/NACK, SPI mode-0 bytes on both MOSI and MISO, that the decode labels
  match the wire, a seamless loop at the strip boundary, and lane ordering.
- `npm run lint`, `npm run typecheck`: clean.
- `npm test`: 60 files, 577 tests passed.
- `npm run build`: passed (includes the board-visual and source-link gates).
- `npm run test:e2e`: 85 passed.
- Desktop browser check in dark and light at 1920 × 1000 and 1440 × 900 on
  `/`, `/privacy` and `/compare`.
- Mobile gate (mobile-mojo, production build): `/`, `/pinout/raspberry-pi-5`,
  `/compare`, `/planner`, `/link`, `/collections`, `/privacy` and `/nope` at
  360 × 800, 390 × 844, 412 × 915 and 844 × 390, in dark and light. All 64
  combinations passed:
  - `scrollWidth == innerWidth`.
  - No `elementFromPoint` hit lands on the backdrop.
  - The strip animation is `none`.
  - No console errors (except the expected 404 on `/nope`).
  - Catalog search, the detail panel and Back to results, the theme toggle,
    nav and keyboard focus all work.

## Known limits / not fixed

- On pages where text sits directly on the backdrop (`/privacy`, `/link`
  intro), low-contrast traces pass behind the heading and paragraph. They stay
  readable, and the mobile gate called it a polish note, not a defect.
- `prefers-reduced-motion` was checked in CSS (the strip is listed in the
  reduced-motion block) but not emulated in a browser.
- Pre-existing issues seen during the mobile pass, not caused by this change
  and not fixed:
  - The sticky catalog header is about 260px tall at 360 × 800.
  - The dark-mode nav items have no pill fill.
  - The light-mode CSI/PCIe chips look washed out.
