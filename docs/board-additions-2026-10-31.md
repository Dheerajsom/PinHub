# Planner and board link expansion — 2026-10-31

This is the original implementation record. The follow-up review, provenance
disclosures, UI fixes, and fresh verification are recorded in
[`code-audit-2026-10-31.md`](code-audit-2026-10-31.md). The later data review in
[`code-audit-2026-11-01.md`](code-audit-2026-11-01.md) corrects maps and the
single-source list here, and takes UART link boards to 179.

Branch `feature/planner-link-more-boards`, from `main` at `4c631c3`.

| | Before | After |
| --- | --- | --- |
| Catalog boards | 157 | 196 |
| Boards with a pin map | 151 | 190 |
| Planner auto-assign | 16 | 126 |
| Link over UART | 135 | 178 |
| Link over I2C | 122 | 181 |

Counts were derived from the catalog with `linkPorts` and `pinFunctions`.

## How the planner data is built

`src/lib/pin-functions/` holds one module per chip family. `withPlannerData`
(`index.ts`) attaches the data to `boards` in one place, and adds any peripheral
it shows to the board's `interfaces`, so the catalog filters agree with the
planner. All tables were generated from these files, pinned to a tag or commit:

| Module | Boards | Sources |
| --- | --- | --- |
| `espressif.ts` | 31 ESP32, S2, S3, C2, C3, C5, C6, C61, H2, and P4 boards | ESP-IDF v5.5 `adc_channel.h`, `dac_channel.h`, `soc_caps.h`; `gpio.html` v5.5.1 (quoted notes); arduino-esp32 3.3.9 variants |
| `raspberry-pi.ts` | 13 Pi models | `raspberrypi/utils` `gpiochip_bcm2835.c`; the Pi 500 and 500+ reuse the Pi 5's RP1 table |
| `stm32.ts` | 24 Nucleo, Blue Pill, and Black Pill boards | stm32duino 3.0.0 `PeripheralPins.c` and variant files |
| `arduino-core.ts` | 38 AVR, SAMD, RA4M1, megaAVR, ESP8266, nRF, and Teensy 4 boards | Each board's core variant, Zephyr board files, PJRC cores |
| `pin-function-data.ts` | 4 more RP2 boards in `rp2BoardSpecs`: Feather RP2350, KB2040, RP2350-Plus, RP2350-Zero | pico-sdk 2.3.1, CircuitPython 10.3.1 |

Rules the generators follow:

- A bus whose required signals are not all on the mapped headers is dropped.
- Defaults are what the core or SDK sets up, and a default is marked only when
  it is on the header.
- Flags carry a quote or a source line; an unused note fails the integrity test.
- CHxN complementary timer outputs and flow control are left out.

### Planner changes

- `mux.softwareCs` means SPI chip select is any free GPIO. The solver now picks
  chip selects after everything else is placed, because branching on them hit
  the 50,000-step budget on STM32 boards without changing the outcome. The
  variant files say the same thing ("HW SS isn't used. Set here only for
  reference").
- A function list may hold 24 entries (was 16), for STM32 port pins.
- The picker's quick picks are 12 common boards, with the auto-assign count in
  the heading. 126 buttons would have pushed everything else off the screen.

### Link changes

- Controllers named by a letter or mux tag are read as instances: `UART_A TX`,
  `I2C_M2 SDA`, `I2C_AO_M0_SDA`. A socket name in front of a signal
  (`mikroBUS SDA`) is dropped.
- Every ESP32-family board with its variant's default I2C pins on the header
  can now link over I2C. Those defaults can be strapping pins (ESP32-C3 uses
  GPIO8 and GPIO9); the wire list shows the caution.

## New boards (39)

Pin maps were matched against two sources unless noted.

- **STM32 Nucleo-64 (13):** F411RE, F072RB, F091RC, F303RE, F334R8, G431RB,
  G474RE, G0B1RE, C031C6, L053R8, L073RZ, L152RE, H503RB. Header pins from the
  stm32duino variant, matched row by row to Zephyr
  `arduino_r3_connector.dtsi`. Every Nucleo-64 matched except F303RE (below).
- **STM32 Nucleo-32 (3):** L432KC, G431KB, F303K8. stm32duino variant only;
  Mbed's file was not reachable at the path tried. The Nano layout is the
  documented form factor. Single-source: see Known limits.
- **Raspberry Pi (2):** 3 Model B, 1 Model A+, on the shared 40-pin map.
- **Adafruit (6):** Feather RP2350, KB2040, ESP32 Feather V2, ESP32-S2 Feather,
  Feather M0 Express, QT Py ESP32-S2. Pad order and nets from Adafruit's EAGLE
  `.brd` files (JP1, JP2, JP3), GPIO from CircuitPython `pins.c`.
- **Waveshare (2):** RP2350-Plus (Pico footprint), RP2350-Zero (RP2040-Zero
  footprint). CircuitPython `pins.c` plus the pico-sdk board header.
- **Arduino (3):** Nano 33 BLE, Nano 33 BLE Sense Rev2, MKR 1000 WiFi.
- **SparkFun (2):** RedBoard Qwiic, Pro Micro.
- **Seeed (2):** XIAO ESP32S3 Sense, XIAO nRF52840 Sense.
- **Libre Computer (3):** Alta, Solitude, Tritium H5, from the vendor's
  `libretech-wiring-tool` `gpio.map`. Single-source.
- **Orange Pi (3):** Zero 2W, 3B, 5 Plus, from `wiringOP` `gpio/readall.c`.
  Single-source.

## Errors found in existing maps, and fixed

Matching every map to its variant file turned these up. All have regression
tests in `test/planner-link-expansion.test.ts`.

| Board | Problem | Fix |
| --- | --- | --- |
| ItsyBitsy M4 | Most port aliases were wrong (D13 listed PA11, is PA22), SDA and SCL were labelled D2 and D3, and D24/D25 are not on this board | Rebuilt from Adafruit's `.brd` file and `pins.c` |
| Arduino Zero | D10 to D13 were labelled SPI; the core's SPI is on ICSP | Relabelled; SPI rows are on the ICSP pins |
| Metro M4 Express | D11 to D13 labelled SPI; A4 and A5 labelled SDA and SCL | Relabelled; added the SDA and SCL pads |
| RedBoard Turbo | D10 to D13 had the SPI role | Role changed to GPIO |
| ESP32-S3 Feather | Pin 16 was a second D13 | It is the DB debug TX pad |
| Teensy 4.1 | Function groups listed pins twice, so the planner could have used one pin for two jobs | Rewritten in physical order, 48 pins |

Label gaps fixed for the link: Teensy LC (SDA0, SCL0 were only in notes), Milk-V
Duo (milkv.io pin table), Flipper Zero (I2C on PC0 and PC1), Le Potato AO bus
aliases.

## Disagreements and candidates dropped

- **Nucleo-F303RE:** Zephyr v4.2.0 maps D11 to D13 to PB15, PB14, and PB13.
  stm32duino and Mbed OS 6.17 agree on PA7, PA6, and PA5. The map follows those
  two; a warning names the difference.
- **Libre Renegade:** `gpio.map` lists pin 33 twice. Dropped.
- **Pimoroni Pico Plus 2:** RP2350B's ADC is on GPIO40 and up, and the board
  also exposes GP26 to GP28, so the Pico-footprint map cannot show which header
  pads are analog without Pimoroni's schematic. Dropped.
- **Arduino UNO WiFi Rev2:** its SPI and I2C pins differ from the shared UNO
  map, so it needs its own map. Left out.
- **Adafruit Metro RP2350:** its header footprints did not parse from the
  `.brd` file. Left out.

## Verification

- Baseline before edits: lint and typecheck clean, 730 unit tests pass.
- Final tree: lint and typecheck clean; 1,632 unit tests pass, including 19
  new cases in `test/planner-link-expansion.test.ts`.
- `npm run build` exits 0, so the board-visual and source-link gate passed.
- `CI=1 npx playwright test`: 96 of 96 pass against the production build. Two
  are new (long names on the phone picker and link cards), and the Pi planner
  case was split, because a Pi 4 can now auto-assign.
- `cli/`: `check:boards` (191 generated boards), lint, 139 tests, and build pass.
- A scratch run planned one of each available peripheral on all 126 boards. All
  pass except three Nucleos, where CAN shares the I2C pins on the Arduino
  headers; that result is pinned in a test.
- Link regression: for every planner board, each complete port the labels gave
  before was compared with the ports after. Two were lost at first
  (ESP32-S2-DevKitM-1 UART1, LOLIN S2 Mini I2C) and were restored.
- Looked at in the browser at desktop width: picker and Nucleo planner in dark,
  ESP32-S3 to Feather RP2350 link in both themes. No console errors.

## Mobile gate

The original check below did **not** complete the required gate because the
skill was not loaded. It is superseded by the skill-loaded mobile review in
[`code-audit-2026-10-31.md`](code-audit-2026-10-31.md).

The mobile-mojo agent tested the production build with Playwright (Chrome,
touch, `isMobile`, DPR 2, `window.innerWidth` asserted) at 360 × 800, 390 × 844,
412 × 915, and 844 × 390, in both themes. The `mobile-mojo` skill was not
registered in that session, so it worked from the written brief.

No page overflow and no console errors in any journey: picker, Nucleo, Teensy,
ESP32-S3, and Pi 4 planners, first tap on every Pi 4 and ESP32-S3 pad, the
Teensy 4.1 and ItsyBitsy M4 drawings, new board pages, and three link pairs.

Two defects were confirmed and fixed, then rechecked at all four sizes in both
themes. Both are covered by new e2e cases:

- **Picker results truncated at 360 px.** G431KB and G431RB read the same, and
  the subtitle that tells them apart was cut too. Names and subtitles now wrap.
- **Link board cards truncated at every width.** Card and search names now wrap.
  The Change button stays 69 × 44 and Swap 44 × 44.

Seen, not caused by this change, and not fixed: pin table buttons are 20 px
tall, the footer Privacy link is 16 px, planner source links are 16 px, SVG pad
hit areas fall to 17–28 px in portrait, Fit width shrinks labels to 3–5 px at
360 px, link selects have no `aria-label`, and Escape does not close the pin
popover. Not covered: physical phones and iOS Safari.

## Known limits

- 64 mapped boards have no auto-assign: Linux SBCs other than Raspberry Pi
  (their mux depends on device-tree overlays), FPGAs, Teensy 3.x and LC, the
  Arduino Due, GIGA, and UNO Q, Particle boards, and others without a pinned
  machine-readable mux source yet.
- Link stays blocked on 12 mapped boards for UART and 9 for I2C. The FPGAs have
  no fixed pins for these buses. BeagleBone AI-64, Khadas VIM4 (I2C), micro:bit
  V2 (UART), and Orange Pi 5 Plus (UART) have no such pins named in their
  records.
- Link uses the pins a record names. On a GPIO-matrix chip it does not move a
  bus off a strapping pin, even though the chip could.
- Planner capacity counts instances, so a Pi offers 2× UART although UART0 and
  UART1 share GPIO14 and GPIO15. Asking for both reports that they do not fit.
- NUCLEO-H753ZI 8× UART exhausts the step budget and says so.
- The Nucleo maps cover the Arduino headers only, not ST Morpho.
- Nucleo-32 maps, Libre Computer maps, and Orange Pi maps rest on one vendor
  source each. `st.com`, `raspberrypi.com`, and `orangepi.org` could not be
  fetched from this environment, so those links were not checked; every other
  new source URL returned 200 in the original run. All nine single-source maps
  now begin with an explicit **Unverified pinout** caution in the catalog and
  pinout notes. The disclosure is retained in the planner, links, and exports.
- No price listings were added for the new boards.
- The new boards' descriptions and specs that do not come from the files above
  were written from general knowledge of each board and were not checked
  against a datasheet here.
