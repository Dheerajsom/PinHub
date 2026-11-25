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

## Follow-up: STM32 illustrations and connector-diagram zoom

A user with a NUCLEO-H753ZI on the bench reported that the Dynamic view did not
match the board. The RJ45 jack covered the end of a header. The switches were
drawn near the top, but the blue USER switch sits left of the RJ45 and the
black RESET switch to its right. The Zio connector diagram was unreadable
until zoomed.

### Sources

- NUCLEO-H753ZI: UM2407 Rev 4 (local copy). Figure 4 is the top layout and
  Figure 6 the mechanical drawing (70 × 133.34 mm). Header rows, holes, ports
  and switches were measured from the Figure 6 raster: 70 mm = 1,098 px, about
  0.06 mm per pixel.
- Nucleo-64 MB1136: the UM1724 top-layout figure, as reproduced in the Zephyr
  board docs (`nucleo_f103rb_connectors.jpg`).
- NUCLEO-C031C6 (MB1717), NUCLEO-H503RB (MB1814), NUCLEO-F303K8 pinout and
  STM32F4DISCOVERY: the top-view product photos in the Zephyr board docs.
- NUCLEO-G431RB and NUCLEO-G474RE (MB1367): perspective product photos only.

### Findings

1. **NUCLEO-H753ZI drawn wrong.**
   - Zio CN7–CN10 were single rows of about a dozen holes. They are two-row
     sockets (2 × 10, 2 × 8, 2 × 15 and 2 × 17).
   - The morpho headers were 2 × 19; they are 2 × 35.
   - The RJ45 covered the bottom of the right-hand header.
   - The switches were at the top. They belong on the bottom edge, in the
     order USER (blue), user USB, RJ45, RESET (black).
   - The ST-LINK USB was centred; it sits right of centre.
   - A snap-off line was drawn, but the MB1364 STLINK-V3E section is not
     breakable.
2. **Zio diagram rows aligned at the top.** On the board CN7 starts 9.1 mm
   above CN8, and CN9 and CN10 end level.
3. **Nucleo-64 boards.**
   - Each inner Arduino side was one strip. They are CN6 (8) + CN8 (6) on the
     left and CN5 (10) + CN9 (8) on the right.
   - The mounting holes, SWD header and CN2 jumpers were missing.
   - The switches had no colour.
   - "New" boards had an unexplained JST socket.
   - The H503RB's USB-C connectors were drawn as micro-USB.
4. **Nucleo-32.** The RESET switch is at the far end, not mid-board.
5. **STM32F4DISCOVERY.** The switches sat mid-board. They belong below the
   MCU. The audio jack was missing.
6. **Other boards with parts drawn over others.** A catalog-wide scan found
   these collisions:
   - HDMI over a header: RockPro64, ODROID-M1.
   - Ethernet over P9: BeagleBone AI-64. Its P8/P9 were also drawn 78 % of
     the board long; 2 × 23 at 2.54 mm is 57 %.
   - USB-B over the ICSP header: UNO, Mega.
   - Barrel jack over a mounting hole: every UNO- and Mega-size shield board.
   - Ethernet over USB-C: Orange Pi 5 Plus.
   - RESET over J1: MSP430 LaunchPad.
   - BOOT switch against the STEMMA QT socket: QT Py ESP32 boards.
   - USB over a Pmod: Nexys A7.
   - Small overlaps on Khadas VIM4, Orange Pi 3B, Orange Pi Zero 2W,
     BeagleBone Green, T-Display-S3, ESP32 Thing and XIAO nRF54.

### Changes

- **`board-portraits.ts`**
  - Added a measured MB1364 layout for the NUCLEO-H753ZI.
  - Added a shared Nucleo-64 header frame (UM1724), with per-board ST-LINK
    sections for MB1136, MB1367, MB1717 and MB1814.
  - Moved G071RB and G0B1RE to the MB1136 layout, which their photos show.
  - Redrew the Nucleo-32 and STM32F4DISCOVERY layouts.
  - New part kinds: `button-blue` and `silk`. A `snapOff` field marks a
    breakable ST-LINK section, for MB1136 and MB1717 only.
  - Shield boards: edge ports are scaled for Mega-size boards, and the
    left-hand holes are placed at the UNO's 14.0 mm and 15.2 mm.
  - Moved the colliding parts in finding 6 by the smallest step that clears
    them.
- **`board-visuals.ts` and `board-visual-geometry.ts`.** `firstRowMm` places
  each Zio header of the Nucleo-144 diagram at its measured row height.
- **`ConnectorDiagramCanvas.tsx` and `diagram-view.ts`.** Every board drawn as
  a separate connector diagram (99 boards) now gets a pan-and-zoom canvas
  under the product illustration. The illustration no longer disappears when
  the diagram is zoomed. The canvas behaves as follows:
  - The wheel zooms about the pointer.
  - A left, middle or right drag pans, with no context menu. A drag never
    selects a pad.
  - Touch pans and pinches once zoomed. At the whole-diagram view, a finger
    or a wheel-out scrolls the page.
  - Buttons (−, +, Zoom to touch size, Fit diagram) and the keys `+`, `−`,
    `0` and the arrows do the same.
  - A pad picked from the list or focused by keyboard is brought into view.

### Tests

- `test/stm32-portraits.test.ts`:
  - Every STM32 board is covered, with no overlapping parts.
  - The MB1364 bottom-edge order, Zio and morpho row counts, Zio heights,
    the Nucleo-64 header frame, the switch colours, the snap-off line only
    on breakable boards, and the F4 Discovery switches.
- `test/portrait-overlaps.test.ts`: on every illustration, no port is drawn
  over a header, hole, switch or package, and no header over a hole or
  switch. This is 177 cases; the XIAO ESP32S3 Sense camera board is exempt
  because it is stacked.
- Against the previous drawings, 37 cases in these two files fail.
- `test/connector-diagram-canvas.test.tsx`:
  - Wheel zoom about the pointer, and the wheel at fit left to the page.
  - Right-drag pan and the suppressed context menu.
  - Drag versus click on a pad.
  - The keyboard, and revealing a pin picked from the list.
  - The view math.
- `e2e/connector-diagram-zoom.spec.ts`: in Chrome, the wheel, a right-button
  drag and a pad click. `e2e/dynamic-pin-size.spec.ts` gained a touch
  button-zoom and one-finger pan case, and accepts **Fit diagram** for
  connector boards.

### Verification

- `npm run lint`, `npm run typecheck`, `npm test` (99 files, 2,527 tests) and
  `npm run build`: pass.
- `npm --prefix cli run generate:boards` and `check:boards`: pass, with no
  content change.
- `CI=1 npx playwright test --retries=0`: 176/176 in two consecutive full runs.
- Mobile gate (mobile-mojo, Chrome with touch emulation and CDP touch input),
  at 360 × 800, 390 × 844, 412 × 915 and 844 × 390 in both themes, on the
  board page and the catalog panel:
  - The first pass found two defects:
    - At the whole-diagram view, a one-finger swipe on the canvas did not
      scroll the page. `overscroll-behavior: contain` stopped scroll chaining.
    - The − and + buttons were 26 px wide.
  - Both were fixed. A real CDP swipe case was added to
    `e2e/dynamic-pin-size.spec.ts`; it fails with the old CSS.
  - The recheck passed:
    - The page scrolls by about 146 px per swipe at fit, in every cell.
    - Once zoomed, a swipe pans the diagram, pinch works in both directions,
      and the page stays still.
    - The zoom buttons measure 44 × 44. Pad hit areas are at least 45.3 px
      after **Zoom to touch size**.
    - There were no console errors.
    - The six nudged and new illustrations were opened and show no overlaps.

### Known limits

- The MB1367 (G431RB, G474RE) ST-LINK section is placed from perspective
  photos. Only the arrangement is claimed: USB at the top, blue switch left
  of black.
- Blue Pill and Black Pill were checked only for overlaps; no layout source
  was available.
- Nucleo-64 mounting holes follow MB1136 on every variant.
- Two-finger pinch at the whole-diagram view is left to the browser. Zoom in
  with **+** first.
- In one of 42 emulated runs, a **Zoom to touch size** tap made while the
  page was still momentum-scrolling did not zoom. Browsers normally spend such
  a tap stopping the fling, and 26 repeat attempts all zoomed. This was not
  checked on a real device.
- Not covered by the mobile gate: real devices, iOS Safari, 320 px width and
  text zoom.
