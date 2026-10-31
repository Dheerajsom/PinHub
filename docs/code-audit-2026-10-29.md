# Planner coverage, share images, touch targets, vendor marks — 2026-10-29

Branch `feature/planner-coverage-og-touch`. This work covers four items from a
review of the codebase: pin-planner coverage, per-board link-preview images,
the 44 px touch-target debt, and missing vendor marks.

## Findings

- **Planner coverage.** Only 4 of 157 boards had planner data (Pico,
  ESP32-DevKitC, UNO R3, Pi 5). Every other board's planner said it had no
  source-backed pin functions.
- **SparkFun Pro Micro RP2040 SPI pins were wrong (hardware-critical).** The
  catalog put the right-edge SPI pins on GP18/GP19/GP20/GP17 and noted that
  "GP17 is also the CS for the onboard SPI flash". Three sources disagree, and
  agree with each other:
  - SparkFun's own board file nets (`Hardware/SparkFun_ProMicro-RP2040.brd`,
    J4 pads 9–12): 22/SPI_SCK, 20/SPI_CIPO, 23/SPI_COPI, 21/SPI_CS.
  - pico-sdk 2.3.1 `boards/sparkfun_promicro.h`.
  - arduino-pico 6.3.1 `variants/sparkfun_promicrorp2040`.

  The RP2040's flash sits on its dedicated QSPI pins, so the flash note was
  also false. The board's I2C default (GPIO16/17) is the Qwiic connector, not
  the edge.
- **Adafruit QT Py RP2040 analog pins were reversed (hardware-critical).** The
  catalog mapped A0 to A3 onto GPIO26 to GPIO29. CircuitPython 10.3.1
  `adafruit_qtpy_rp2040/pins.c` and arduino-pico's `adafruit_qtpy` variant
  both give A0 = GPIO29 (ADC3) down to A3 = GPIO26 (ADC0).
- **Link previews.** Every page shared the square logo with a `summary` card.
  No board or pinout link showed which board it opened.
- **Touch targets under 44 px:**
  - The active-filter Remove chips were 34 px.
  - The pin filter chips on pinout pages were 36 px.
  - The discovery filter and compare chips were 36 px.
  - The quick-search chips were 36 px.
  - The header theme toggle, GitHub button, and site wordmark link were
    40 px, as was the pinout back link.
  - The coarse-pointer `.touch-target` rule itself raised controls to only
    40 px.
- **Vendor marks:**
  - Four vendor domains answered 404 from Google's favicon service (wemos.cc,
    microbit.org, nodemcu.com, weactstudio.cn). Orange Pi had been left out
    for the same reason.
  - Eight catalog vendors had no domain entry at all: Waveshare, Khadas, NXP,
    Silicon Labs, StarFive, Flipper Devices, DOIT, and Terasic.
  - "BeagleBoard.org" boards did not match the "BeagleBoard" key.

  Each of these rows showed an empty slot.

## Changes

### Planner data for 12 more RP2040 and RP2350 boards

`src/lib/pin-function-data.ts` adds one function-select row per GPIO for each
chip:

- **How the rows were made.** They were generated mechanically from the
  `FUNCSEL` defines in pico-sdk 2.3.1 `io_bank0.h`, with SPI RX/TX/SCLK/SS_N
  written as MISO/MOSI/SCK/CS and CTS/RTS left out.
- **RP2040 check.** The generated RP2040 rows match the hand-transcribed Pico
  table exactly, and a test keeps them matched.
- **RP2350 difference.** The RP2350 rows differ only by its auxiliary UART
  selects (function 11). MicroPython v1.27.0 `machine_uart.c` accepts those
  as TX/RX on the RP2350.

`rp2FunctionTable` builds a board's table from three inputs:

- the header label to GPIO map, checked against the board's CircuitPython
  `pins.c`;
- the board header's `PICO_DEFAULT_*` pins;
- its `PICO_DEFAULT_LED_PIN`.

It also follows three rules:

- It drops a bus instance whose full signal set is not on the header. For
  example, the XIAO RP2040's GPIO4 can be UART1 TX, but no UART1 RX reaches
  the edge.
- It marks an SDK default only when every pin of that default bus is on the
  header.
- It flags the LED pin, quoting the header's `#define` line.

New planner boards:

- Raspberry Pi: Pico W, Pico 2, Pico 2 W
- Adafruit: Feather RP2040, ItsyBitsy RP2040, QT Py RP2040
- Arduino: Nano RP2040 Connect
- Seeed: XIAO RP2040, XIAO RP2350
- SparkFun: Pro Micro RP2040, Thing Plus RP2040
- Waveshare: RP2040-Zero

Each board cites seven sources:

- the chip's `io_bank0.h`
- its pico-sdk board header
- its CircuitPython `pins.c`
- `hardware/adc.h`
- MicroPython's rp2 SPI, I2C, and UART drivers

All are pinned to a tag. Pico 2 and Pico W now carry copies of the shared
Pico map. The shared-map test checks that their wiring, without the planner
fields, still equals the Pico's.

### Pin-map corrections

- Pro Micro RP2040: the SPI edge is now SCK/GP22, MISO/GP20, MOSI/GP23, and
  CS/GP21, in SparkFun's pad order. The false flash note is replaced with the
  board's real SPI and Qwiic assignments.
- QT Py RP2040: the analog aliases are A0 GPIO29/ADC3, A1 GPIO28/ADC2,
  A2 GPIO27/ADC1, and A3 GPIO26/ADC0.
- The CLI catalog (`cli/src/boards/generated.ts`, `pin-index.ts`) was
  regenerated.

### Link-preview images

- Both `/pinout/[id]` and `/boards/[id]` now have an `opengraph-image.tsx`:
  - 1200 × 630, prerendered for every board (`generateStaticParams`,
    `dynamicParams = false`).
  - Their pages use `summary_large_image`.
- `src/lib/share-card.ts` builds the card's data and
  `src/components/og/BoardShareCard.tsx` draws it:
  - It shows the board name, vendor, pin count, processor, and logic level.
  - Below that, one pad per catalog pin, in catalog order, row by side or
    group, colored by the `roles.ts` palette.
  - A legend explains every pad color with its catalog count.
  - Nothing is drawn that the record does not list.
- Design pass:
  - The card uses the page base (`#090b0f`), a raised panel, and the role
    palette.
  - Cyan stays unused (it belongs to the pin probe), and there is no
    marketing copy.
  - Group names wider than the label column end in an ellipsis.

### Touch targets

The controls above now follow the existing token precedent: `min-h-11` below
1024 px, with the dense desktop size kept from `lg` up. The header controls
use `size-11`/`h-11` below 1024 px. The coarse-pointer `.touch-target` rule
is now 2.75 rem (44 px).

### Vendor marks

- `vendor-domains.ts` points at domains whose favicons serve the vendor's
  real mark, each checked by eye:
  - `weactstudio.com`
  - `nodemcu.readthedocs.io`
  - `makecode.microbit.org`
  - `www.orangepi.org`
- It adds seven entries: Waveshare, Khadas, NXP, Silicon Labs, StarFive,
  Flipper Devices, and `BeagleBoard.org`. Terasic's favicon is a photo and DOIT
  has no usable mark, so both are left out.
- LOLIN (no working mark) is removed, so no failing request is made.
- `VendorLogo` shows a neutral monogram (`.ph-vendor-monogram`):
  - It appears when a vendor has no mark or its mark fails to load.
  - It uses `--well` and `--panel-border`, with its own light-theme text
    color.
  - "Generic" still shows nothing.
- The page background no longer excludes the four repaired vendors.

## Verification

Regression tests, each confirmed to fail without its fix:

- `test/rp2-pin-functions.test.ts`:
  - The generator equals the Pico table.
  - RP2350 adds only aux UART.
  - Incomplete instances are dropped, and defaults need the whole bus.
  - The LED flag carries its quoted source.
  - A Feather plan lands on the SDK I2C pins.
  - Every mapped label agrees with any GPIO named in the catalog.
  - The QT Py and Pro Micro corrections hold.
- `test/share-card.test.ts`: pads equal catalog pins, the legend explains
  every color, and both routes are prerendered with large cards.
- `test/vendor-logo.test.tsx`: domain coverage, the four 404 domains are gone,
  and the monogram fallback (without a mark, after a load error, and nothing
  for Generic).
- `e2e/touch-targets.spec.ts`, at 360 × 800 and 390 × 844: the Remove chip,
  theme toggle, GitHub link, and every pin filter chip measure at least 44 px.
  It fails on the previous classes.

Checks:

- `npm run lint`, `npm run typecheck`: clean.
- `npm test`: 66 files, 730 tests pass.
- `npm run build`: exits 0. Every board and pinout image route is listed as
  SSG.
- `CI=1 npx playwright test` against `next start`: 93/93 pass.
- CLI: `check:boards` verifies 152 boards. `lint` is clean, `test` passes
  139/139, and `build` succeeds.
- Rendered cards were fetched from the production server and inspected
  (Raspberry Pi 5, ESP32-DevKitC, QT Py RP2040, Nucleo-F401RE). The
  `og:image`, `og:image:alt`, `twitter:card`, and `twitter:image` tags are
  present.
- Desktop screenshots at 1440 × 900 in both themes (catalog with LOLIN
  monograms, Pico pinout, Feather RP2040 planner) show no console errors.

## Mobile gate

Run on 2026-10-31 with the `mobile-mojo` subagent against the production build,
using Playwright with touch emulation, at 360 × 800, 390 × 844, 412 × 915, and
844 × 390, in dark and light. The `mobile-mojo` skill file was not found on
disk, so the agent followed the `AGENTS.md` and `CLAUDE.md` gate instead.

Coverage:

- 8 routes, plus `/pinout/[id]` and `/boards/[id]` for 7 newly covered boards
  (112 page loads): no horizontal page overflow and no console errors.
- Every control this change touched measures at least 44 px tall. The 360 px
  header fits.
- A plan was made end to end on all 7 boards. The Pro Micro and QT Py
  corrections show on the page and in the plan table.
- Share images return 200 `image/png` at 1200 × 630.
- Monograms show in catalog and discovery rows in both themes, with no broken
  images.

Defect found and fixed:

- **Planner "Your pins" table clipped on RP2040-Zero (medium).** The board's
  long connector group, "Left/bottom edge (GP0–GP15)", could not wrap, which
  pushed the Label column out of the table's scroll area (447 px of content in
  a 294 px wrapper). The Pin and Signal cells now wrap, and the cell padding
  dropped from `px-2` to `px-1.5` to clear a remaining 9 px at 360 px.
  `e2e/mobile-workflows.spec.ts` covers this at all four viewports, with claimed
  rows, and failed before each fix.

Recheck on the final build: the table's scroll width equals its width on
RP2040-Zero, Pico, and Feather RP2040 at all four viewports in both themes.
Label buttons are 44 px, and there are no console errors.

Recheck limits: Pico and Feather tables, and the 390 and 412 wrapped rows, were
checked by measurement, not by eye. The desktop screenshots predate the table
fix, which the Playwright suite covers at desktop width. Home-indicator and
notch insets need a real device.

## Known limits

- **Controls still under 44 px.** The gate measured these outside this change:
  - Catalog: card favorite star 36 px; Favorites toggle and search input 40 px.
  - Detail panel: Back to results and clear-search 40 px, Reset 32 px.
  - Discovery: per-card Compare, Filters, and Favorites 40 px; card title links
    24 px.
  - Pinout: table row buttons 20 px; SVG pin pads 16–43 px.
  - Other: footer Privacy link 16 px, Prices links 24 px and checkbox 16 px,
    `/boards` summary toggles 20 px.
  - The GitHub header button is 44 px tall but 42 px wide in portrait.
- **Soft vendor marks.** StarFive's favicon is 8 px and Flipper's is 16 px, so
  both look soft when scaled. The catalog monogram sits inside the row's outer
  tile, a square within a square.

- **Remaining boards.** Planner data still covers only boards whose pin
  functions come from machine-readable sources. ESP32-S3/C3, STM32 Nucleo,
  and Teensy are the next candidates.
- **RP2350 erratum.** The planner does not model the RP2350 A2 stepping's
  GPIO input erratum (E9). The board warnings remain the place for it.
- **Pro Micro RP2040 I2C labels.** The edge pins labelled "SDA / GP2" and
  "SCL / GP3" are I2C1 by the function table. SparkFun's nets name them only
  "2" and "3", and its default I2C is the Qwiic connector. The labels were
  kept, flagged here.
- **Arduino Nano RP2040 Connect pin names.** CircuitPython names D0 as TX,
  but the catalog follows Arduino's naming (D0/RX). The GPIO behind each pad
  (TX = GPIO0, RX = GPIO1) agrees in both.
- **Fixed alt text.** The share images use one alt text per route, not one
  per board.
- **Fonts.** The cards use the bundled Geist Regular only (no Geist Mono
  file ships for `next/og`).
- **Missing marks.** LOLIN, Terasic, and DOIT show monograms. "Generic" shows
  nothing.
