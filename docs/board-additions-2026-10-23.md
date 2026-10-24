# Board additions — 2026-10-23

Ten boards added to the catalog (142 → 152), each with a full pin map for its
main connector. Candidates came from Make:'s 2026 Boards Guide, Hackster and
CNX Software launch coverage, and Seeed/Arduino release notes. Searches of
r/embedded, r/esp32, and r/raspberry_pi surfaced no board threads the search
index could reach, so Reddit did not decide any pick.

## What was added

| Board id | Why it is in | Pin map |
| --- | --- | --- |
| `arduino-uno-q` | Arduino's Qualcomm + STM32 board; in Make:'s 2026 guide | JDIGITAL (18) + JANALOG (14) |
| `arduino-nano-r4` | RA4M1 Nano, 5 V I/O, released 2025 | JP1/JP2, 30 pins |
| `arduino-nano-matter` | MGM240S Matter/Thread Nano | JP1/JP2, 30 pins |
| `seeed-xiao-mg24` | EFR32MG24 Matter XIAO | 14 edge pads |
| `seeed-xiao-rp2350` | RP2350 XIAO | 14 edge pads |
| `seeed-xiao-nrf54l15` | nRF54L15 XIAO | 14 edge pads |
| `seeed-xiao-nrf54lm20a` | nRF54LM20A XIAO (newest launch on the list) | 14 edge pads |
| `seeed-xiao-esp32c5` | Dual-band Wi-Fi 6 XIAO | 14 edge pads |
| `seeed-xiao-ra4m1` | RA4M1 XIAO at 3.3 V | 14 edge pads |
| `raspberry-pi-500-plus` | 2025 keyboard computer, 40-pin header | Shared 40-pin map |

## How each map was verified

Every pin row was matched across at least two independent machine-readable
sources. A row went in only when they agreed; a disagreement became a warning.

- **UNO Q** — ABX00162 datasheet JDIGITAL1/JANALOG1 tables (text extracted
  with pypdf) against Zephyr `boards/arduino/uno_q/arduino_r3_connector.dtsi`.
  All 20 D/A pins agree on STM32U585 port.
- **Nano R4** — ABX00142 datasheet JP1/JP2 tables against
  `ArduinoCore-renesas` `variants/NANOR4/variant.cpp` (424e86e) and Zephyr
  `arduino_nano_connector.dtsi`. All 22 pins agree.
- **Nano Matter** — the datasheet shows the pinout only as a figure, so the
  header order came from the ABX00112 full-pinout PDF's text coordinates
  (labels sorted by position within one label cluster). MCU ports from the
  Silicon Labs Arduino core `variants/nano_matter/arduino_variant.cpp`
  (74f6af5) and Zephyr `arduino_nano_matter_connector.dtsi`, which agree.
  The same coordinate method reproduces the Nano R4 table exactly, which is
  how the Nano Matter's D0-at-the-corner order was confirmed as real rather
  than a figure error: its D0 is Serial1 **TX**.
- **XIAO boards** — Seeed wiki "Pin Map" HTML tables against each board's
  Zephyr `seeed_xiao_connector.dtsi` `gpio-map` (zephyr 2a9e8ac) and the net
  names in Seeed's schematic PDFs. The schematic header symbol gives the pad
  numbers (1–7 = D0–D6, 8–11 = D7–D10, 12 = 3V3, 13 = GND, 14 = 5V). RP2350
  was also checked against arduino-pico's `seeed_xiao_rp2350/pins_arduino.h`;
  MG24 against the Silicon Labs core variant.
- **Pi 500+** — `raspberrypi/documentation` `keyboard-computers/intro.adoc`
  (41e24fb) lists the same BCM2712 + RP1 pairing and "Horizontal 40-pin GPIO
  header" as the Pi 500, so it reuses the shared 40-pin map.

Logic levels come from a stated rail, not the chip family: schematic nets
(`VSYS_3V3`, `+3.3V`, Zephyr's nPM1300 BUCK2 at 3.3 V), Arduino's datasheet
voltage sections, or Seeed's tables. No board claims 5 V tolerance unless
its source says so.

## Discrepancies found and recorded

- **XIAO MG24 I2C:** Zephyr's `xiao_mg24-pinctrl.dtsi` routes I2C0 SCL to
  PC4 (D4) and SDA to PC5 (D5). Seeed's wiki, schematic nets, and the Silicon
  Labs core all put SDA on D4. The map follows Seeed; a warning names the
  Zephyr swap.
- **Nano R4 JP1 pin 13** is BOOT, not RESET as on the classic Nano.
- **UNO Q JANALOG pin 1** is the MCU BOOT0 strap where a classic UNO has NC.
- **Nano R4 Zephyr comments** in `analog-connector` name P009/P104/P103 for
  A0/A6/A7; the `gpio-map` itself (P014/P004/P003) matches the datasheet and
  core variant. The comments are wrong, not the map.

## Verification

- Baseline before edits: lint, typecheck, 590 unit tests green.
- After: lint, typecheck, and 605 unit tests green (13 new cases in
  `test/october-2026-boards.test.ts` pin every new map row to its sources).
- `cli/`: `check:boards` (152 generated boards verified), lint, tests, and
  build all pass.
- `npm run build` compiled and prerendered every route, including all ten new
  `/pinout/<id>` pages, so the board-visual and source-link gate passed. The
  command still exited 1 afterwards: Next.js 16.4.0 printed a
  "SecurityFatalError" saying the installed version has a known
  vulnerability and asking for `next upgrade`. That upgrade is out of scope
  for this change and was not run.
- `npm run test:e2e` could not start the dev server for the same reason, so
  the suite ran in CI mode against the production build (`CI=1`): 85/85
  passed.
- All ten pages return 200 from `next start`, and all ten ids appear on the
  catalog page.
- Mobile gate (mobile-mojo, Playwright with emulated viewports and touch, both
  themes) at 360 × 800, 390 × 844, 412 × 915, and 844 × 390. Catalog search,
  drawings, Fit width, pin selection, filter chips, the detail panel, and
  back navigation pass. No page-level overflow and no console errors.
  - One defect found and fixed: the UNO Q pin table's narrow phone Notes
    column wrapped its long notes into rows up to 201 px tall at 360 px
    (7 rows over 80 px). After the notes and aliases were shortened, the
    recheck measured an average row of 48 px with a single 105 px row (the
    BOOT note). That note was then cut to "BOOT0 strap."; the full
    explanation stays in the warnings.
  - Pre-existing issues seen on the comparison boards too, so not fixed
    here: filter chips are 36 px tall and several header controls are 40 px,
    both under the 44 px target.
  - Not checked: device safe-area insets, hit-area padding on SVG pin
    circles, and keyboard focus beyond the first tab stop.

## Known limits

- Only the main connector of each board is mapped. Not drawn: UNO Q JSPI,
  Qwiic, JMISC, and JMEDIA; XIAO back-side pads (D11+), SWD, NFC, and battery
  pads.
- XIAO nRF54LM20A: Seeed's wiki table names pins by chip port and A number
  only, so its D numbers rest on Zephyr plus schematic net names.
- The Pi 500+ map is the shared 40-pin header; Raspberry Pi does not publish
  a 500+-specific header drawing that was readable here.
- No price listings were added for the new boards.
- Candidates considered and left out: PocketBeagle 2 (two muxed 36-pin
  headers, not finished to this bar this pass), Adafruit Feather RP2350, and
  Meshtastic boards (Heltec, LilyGO), whose physical pad order is published
  only as images.
