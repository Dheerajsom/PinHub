# Planner and board link review — 2026-11-01

Second review of `feature/planner-link-more-boards` (`4566b1a`, `dec8710`,
`5fad365`) against `docs/board-additions-2026-10-31.md`. It covers the 39 new
boards, the tables behind the 126 planner boards, and the code in the diff.
Standards and spec reviews ran as separate passes; pin maps were compared with
files fetched for this review.

## Errors found in the data

| Board | Problem | Effect | Fix | Evidence |
| --- | --- | --- | --- | --- |
| Nano 33 BLE, BLE Sense, BLE Sense Rev2 | TX and RX ports swapped: `D1 / TX` was P1.10 and `D0 / RX` was P1.03 | Port-level code and the planner's MCU column named the wrong pin for each signal | TX is P1.03, RX is P1.10; the pad note explains the core's numbering | ArduinoCore-mbed `variant.cpp` and `pins_arduino.h`; Zephyr `arduino_nano_33_ble-pinctrl.dtsi` |
| Grand Central M4 | A8 to A15 read past A7 into the RX/TX LEDs, USB, and SD pins (A11 was PA24, USB D-) | The planner could assign GPIO to USB data lines; no ADC on those pads | Rows now start at `PIN_A8` (54): PB05 to PB09, PA04, PA06, PA07 | Adafruit core `variant.h`, `variant.cpp` |
| Arduino Nano, Pro Mini | A6 and A7 had no `input-only` flag | Offered as GPIO and SPI chip select, on pins with no digital function | Flagged, with a datasheet note | ATmega328P datasheet |
| LOLIN D1 mini, NodeMCU | A0 had no `input-only` flag | Same | Flagged, with a core note | ESP8266 Arduino `reference.rst` |
| 13 SAMD boards | The DAC was missing from the table | Planner reported no DAC | PA02 is DAC.CH0 on all; PA05 is DAC.CH1 on the four SAMD51 boards | Core `variant.h`, `variant.cpp` |
| Grand Central M4 | D50 to D53 had no SPI rows | Planner reported no SPI | Rows added | `variant.cpp`: "same as MISO", "MOSI", "SCK", "SS" |
| Leonardo | ICSP SPI pins had no rows | Planner reported no SPI, though chip select is software | Rows added; the test that pinned the old behaviour is corrected | `variants/leonardo` numbering |
| Orange Pi 3B | Pin 24 labelled SPI3_CS1 | Wrong chip select | Labelled SPI3_CS0, with a note | wiringOP GPIO 134 is GPIO4_A6; Adafruit Blinka calls it SPI3_CS0_M0 |
| Nucleo-G431KB | D13 had the SPI role from the shared map, but it is PB8 | Drawn as an SPI pin | Role is GPIO on this board | Table rows; Zephyr LD2 on PB8 |
| MKR 1000 | Notes named the 1010's NINA-W102 and a PDF that was not the source | False hardware claim | Own notes, naming the ATSAMW25 and the core variant | Catalog record |
| RedBoard Qwiic | Notes discussed "UNO Rev3 and UNO R4" | Copy written for other boards | Own notes | Catalog record |

All 13 SAMD tables were then compared row by row with `variant.cpp`. Twelve
matched by index. The Feather M4's rows are correct; its variant has placeholder
rows that shift the index, so its 21 rows were read by hand. AVR, RA4M1,
megaAVR, nRF, ESP, and STM32 tables did not get that row-by-row recheck here.

## Provenance: nine disclosures down to two

The 2026-10-31 audit labelled nine maps as single-source. Sources not tried then
settle most of them. The Nucleo-32 comparison covers label-to-port rows; the
physical order still rests on the Arduino Nano layout.

| Boards | Second source | Result | Disclosure |
| --- | --- | --- | --- |
| L432KC | Mbed OS 6.17, MicroPython | All 22 rows match both | Removed |
| F303K8 | Mbed OS 6.17 | All 22 rows match | Removed |
| G431KB | Mbed OS 6.17 | 19 rows match. Mbed lists A4, A5, and D13 as PB7, PA15, and PB3, and notes this map's PA5, PA6, and PB8 from ST's manual | Removed; a warning names the difference |
| Alta, Solitude, Tritium H5 | Libre Computer's schematic-derived GPIO sheets | All 40 pins match by name | Removed |
| Orange Pi 5 Plus | Adafruit Blinka (third party) | All 28 GPIO positions match | Removed |
| Orange Pi 3B | Blinka, plus wiringOP's GPIO numbers | 26 of 28 GPIO positions match; pin 24 fixed above; pin 26 disagrees (wiringOP GPIO3_D6, Blinka GPIO4_A7) | Narrowed to **Unverified pin 26** |
| Orange Pi Zero 2W | None found outside Orange Pi | Not cross-checked | Kept in full |

New cautions: on the F303K8, stm32duino states SB18 joins PA5 to PB7 and SB16
joins PA6 to PB6 by default, so A4/D4 and A5/D5 are one net until opened. The
L432KC warning points at the same bridges without asserting them, because no
source read here states it for that board.

## Code

- **Chip select.** The solver treated a pin with a real CS function the same as
  any free pin, so a G071RB plan could put CS on D2 with `D10 / CS` free. It now
  takes the bus's own CS pin first.
- **Link.** Orange Pi 5 Plus aliases from Blinka give it UART and more I2C; UART
  link boards go from 178 to 179.
- **Exports.** `revisionNotesFor` kept the disclosure only because of its wording.
  It now matches "unverified" directly.
- **Compact pin map.** The stage overflows at phone width but had no hint or
  keyboard access, against `docs/DESIGN.md` section 18. When it overflows it now
  has both; when it fits it adds no tab stop.
- **Compare.** Three 40 px buttons, the board name and Overview and Pinout links
  (16 to 20 px), the remove button (32 px), and "Show more findings" (34 px) now
  meet 44 px. They contradicted the 2026-10-31 claim that no undersized controls
  remained. A new case in `e2e/touch-targets.spec.ts` covers them.
- **Schema.** `maxFunctionsPerPin` is back to 16. The catalog's maximum is 10, so
  24 loosened a boundary for nothing.
- **Cleanup.** `isOfficialVerificationSource` replaces three copies. The
  `softwareCs` note string is renamed, and the dead `is-zoomed` class and stale
  "letterbox" comments are gone.
- **Docs.** The planner guide points at `src/lib/pin-functions/`, and `DESIGN.md`
  says 44 px where it said 36.

## Mobile gate

The `mobile-mojo` subagent read the skill and tested the production build with
Playwright Chrome (touch, `isMobile`, DPR 2, `window.innerWidth` and theme
asserted) at 360 × 800, 390 × 844, 412 × 915, 844 × 390, and 1280 × 900, in dark
and light.

- Pin map stages on the G431KB, Grand Central, and Nano 33 BLE: hint and tab stop
  only on overflow, arrow-key panning, visible focus, 44 px hit areas.
- Planner on Grand Central, Leonardo, and Zero; link from Orange Pi 5 Plus to Pico
  over UART; Orange Pi 3B pages; Compare; Pi compact zoom.
- No page overflow, console errors, or page errors.
- Confirmed and fixed from its reports: the Compare controls above, then the
  Pinout link's width (35 to 38 px). Compare was rechecked at all sizes after the
  fixes.

Seen, not caused by this work, and not fixed: at 360 and 390 the sticky catalog
header sits over the top edge of a focused stage; the G431KB drawing starts with
about 110 px of empty gutter at 360. The planner's 8-unit limit means 16 ADC
channels are reachable only in the engine test. Physical phones and iOS Safari
were not tested.

## Flagged, not fixed

- `allPins` still repeats a few lines in `pin-functions/index.ts` and
  `pin-function-data.ts`.
- The `rows.ts` string format casts flags and relies on the integrity test.
- `plannerFields` is an `in` cascade, so each new chip family edits that file.
- Link shows `I2C_AOS0`, a target-mode function, as a second port on the Libre
  boards' AO pins, and writes `I2C_AO_M0` as `I2C_AOM0`.
- Bluetooth Raspberry Pis mark UART0 as the default on GPIO14 and GPIO15, though
  the radio holds it. The planner's mux note says so; the mark itself is shared
  across models.
- Libre Renegade could return: its vendor sheet resolves the `gpio.map` duplicate.
- Descriptions and specs not tied to a file above remain unchecked against
  datasheets.

## Verification

Totals re-derived from the catalog: 196 boards, 190 pin maps, 126 planner
boards, 179 UART link boards, 181 I2C link boards.

- Baseline: lint and typecheck clean, 1,644 tests pass.
- Regressions: 28 cases failed before the data fixes. With `src/` restored to the
  branch head, 34 cases failed, including every later case, so each fails without
  its fix. The new Compare case failed on the 20 px stacked name link before that
  link was fixed.
- Final: lint and typecheck clean, 1,671 tests pass.
- `npm run build` exits 0. `CI=1 npm run test:e2e`: 106 of 106 pass.
- `cli/`: regenerated; `check:boards` (191 records), lint, 139 tests, and build
  pass.

No physical hardware was tested. `st.com` timed out again, so ST manuals were not
read; Orange Pi's manuals were not read.
