# Dynamic board illustration review (2026-11-24)

Branch `codex/catalog-board-renders`. This review covers the Dynamic-view
product illustrations added on this branch (`src/lib/board-portraits.ts`,
`src/components/board-visual/ProductPortrait.tsx`). The goal was a drawing a
person can match to the board in front of them.

## Method

- Every one of the 129 distinct portraits, covering 178 boards (the 18
  Raspberry Pi models keep their dedicated artwork), was rendered onto one
  contact sheet with `renderToStaticMarkup` and inspected.
- The 73 boards whose pins sit on the illustration (69 dual-edge modules and
  four Orange Pi boards) were rendered through `BoardStage` as the Dynamic tab
  draws them. A script then mapped every portrait landmark into stage
  coordinates and tested it against every real pad.
- Uncertain features were checked against the manufacturers' product photos
  (Adafruit Feather M4 Express, ESP32-S3 Feather, Feather RP2040).

## Findings

1. **Parts drawn over real pins (12 boards).** On every Adafruit Feather the
   LiPo socket covered the BAT and EN pads. On the MKR Zero it covered VIN,
   3V3 and GND, and on the SparkFun ESP32 Thing it covered four pads. On the
   LOLIN D1 mini the reset button, I²C socket and both mounting holes landed
   on TX, RST, 5V and 3V3. On the Orange Pi 5 Plus a corner hole sat on the
   40-pin header.
2. **Wrong Feather orientation note.** The caption said "JST battery at
   top-left", but the socket shares the 12-pin header's edge. With USB at the
   top, that edge is drawn on the right. This note came from `main`, not this
   branch.
3. **Wrong connector types.** Many USB-C products were drawn with the
   micro-USB/USB-B shell. These include the Feather RP2040, RP2350, ESP32 V2,
   ESP32-S2 and ESP32-S3; the KB2040; the UNO R4 Minima and WiFi; the UNO Q;
   the GIGA R1; the Nano ESP32, Nano R4 and Nano Matter; the Portenta H7; the
   Metro ESP32-S3; the LOLIN S2 mini; the T-Display-S3; the RP2040/RP2350-Zero
   and RP2350-Plus; the Milk-V Duo; and the Black Pill. The Teensy 4.1 and
   Thing Plus RP2040 card sockets and the Nucleo-144 Ethernet jack were drawn
   as USB-A shells. The Radxa ZERO 3W's micro-HDMI and two USB-C ports were
   drawn as USB-A. The BPI-M2 Zero camera ribbon was drawn as a JST socket.
4. **Missing module antennas.** The ESP32 Feathers and the Thing Plus ESP32
   showed a radio can with no PCB antenna. The antenna overhangs the board's
   far end and helps identify the board.
5. **Header rows that misdescribe the board.** These headers were drawn as
   one row with an inferred pin count:
   - BeagleBone Black, Green and AI-64 P8/P9 (2 × 23)
   - Nucleo-64 morpho (2 × 19)
   - Mega 2560 end header (2 × 18)
   - STM32F4DISCOVERY P1/P2 (2 × 25)
   - TM4C123 LaunchPad BoosterPack headers (2 × 10)
   - ESP32-P4 Function EV 40-pin header (2 × 20)

   The MSP430 LaunchPad's J1/J2 had five pins instead of ten. The BeagleBone
   Black showed two USB-A-like sockets and no Ethernet jack or barrel jack.
   The Blue Pill's BOOT jumpers were drawn as a blank block. The Blue Pill
   and Black Pill had no SWD header.
6. **Module mark crossed by a line.** The shield's scratch line crossed the
   ESPRESSIF/model text when the module is turned on DevKit maps.

## Changes

- `board-portraits.ts`: moved or resized the landmarks in finding 1 to clear
  the pads. Corrected the connector kinds in finding 3, added the antennas in
  finding 4 and redrew the headers and ports in finding 5. Feather pad rows now
  have 16 and 12 pins in their recorded positions.
- `ProductPortrait.tsx`: the shield's scratch line sits in a corner, clear of
  any mark.
- `board-visuals.ts`: the Feather orientation note now reads "JST battery at
  top-right beside the short header".
- `test/board-family-art.test.tsx`: new regression cases. On every mapped
  board, no illustrated landmark may cover a pad (one case per board, 73
  cases). Named products must keep their USB-C, module antenna and two-row
  header counts. The Feather battery note must match the side of the
  12-pin row. Before this review, the 12 boards in finding 1
  fail the pad case and the connector case fails.

## Verification

- `npm run lint`, `npm run typecheck`, `npm test` (96 files, 2,309 tests),
  `npm run build`: pass.
- `npm --prefix cli run generate:boards` and `check:boards`: pass, with no
  content change.
- `CI=1 npx playwright test --retries=0`: 173/173 in two consecutive full
  runs, after the finder test fix below.

## Follow-up: Board finder browser test

Before the fix, `board-finder.spec.ts` "the Tools menu reaches the finder…"
failed in every full parallel run and passed alone. The failing check moved
between the example-plan step and the "Add one SPI" step. A failure trace
showed the cause. A finder change replaces the URL only once the server's
new plan arrives. Under a 12-worker run, the first `/find?plan=…` RSC
response took 4,817 ms, so the URL changed just after Playwright's default
5 s wait. The app was not wrong: `findBoards` takes about 10 ms for these
plans, and alone the request returns in about 0.2 s. The counts update at
once because they are optimistic.

The URL and result-status assertions in that test now use a 15 s
server-round-trip timeout. The test also asserts that the optimistic count
("SPI, 1 needed") appears straight away, which is what a user sees. Not
changed: each finder step returns about 335 KB of RSC. That is a possible
payload optimisation, not a defect.
- Mobile gate (mobile-mojo, Playwright with touch emulation and system
  Chrome): 88 runs, all passing. The Feather RP2040, ESP32-S3 Feather,
  BeagleBone Black and Orange Pi 5 Plus ran at 360 × 800, 390 × 844, 412 × 915
  and 844 × 390. The D1 mini, MKR Zero, Blue Pill, ESP32-S2-DevKitM-1,
  Nucleo-F401RE and Mega 2560 ran at 390 × 844. Each ran in light and dark,
  on the catalog panel and on the board page. The checks covered fit with no
  page overflow, 44 px pads after zoom, panning inside the drawing's own
  viewport, pad selection, the return to fit, visible focus and no console
  errors. Screenshots showed no part over a pad and no line crossing module
  text. Not covered: real devices, arrow-key panning, 200% text zoom, and the
  explicit theme-toggle path, because the theme came from OS colour-scheme
  emulation.

## Known limits

- Portraits remain simplified identification drawings, not dimensioned
  layouts. Several shared footprints (Nordic DKs, generic SBC layouts such as
  Le Potato, Quartz64 and VisionFive 2, the Lattice breakouts) still use a
  common arrangement. Their connector order is plausible but is not checked
  against each model's photo.
- Pad counts on hidden `pads` rows of other dual-edge modules are still
  inferred from length. They appear only on standalone portraits of
  unmapped boards (ESP32-C5-DevKitC-1, RP2350-Zero).
- Product photos were compared for three Adafruit boards only. Other
  corrections rest on the boards' published specifications, such as USB-C
  and header counts.
