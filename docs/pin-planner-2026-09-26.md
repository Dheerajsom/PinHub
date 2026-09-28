# Pin planner — 2026-09-26

Branch `feature/pin-planner` (built on `feature/pin-error-reports`). On a
board page, an engineer states what the circuit needs (for example 2× I2C,
1× SPI, 3× PWM, 2× ADC, 4× GPIO). PinHub proposes a conflict-free set of pins,
rings them on the board drawing, explains every caution in the source's own
words, and exports the plan as code.

The rule throughout: nothing is planned that the catalog cannot back with a
source. A board without source-backed pin functions says so in one line and
offers the data-error report link; it never gets a plan guessed from labels.

## Schema

All fields are optional and additive (`src/lib/boards.ts`). `role`, `label`,
and `aliases` are untouched, so pin nets, compare conflicts, board visuals,
and the CLI behave as before.

```ts
Pin += {
  mcu?: { name: string; gpio?: number; arduino?: string };
  functions?: { peripheral: "I2C" | "SPI" | "UART" | "PWM" | "ADC" | "DAC" | "CAN";
                instance: string; signal: string; default?: true }[];
  flags?: ("strapping" | "boot" | "onboard-led" | "usb" | "input-only"
           | "adc-unavailable-with-wifi" | "module-memory" | "jtag")[];
}
Board += {
  pinFunctions?: {
    sources: SourceLink[];                       // exact files, pinned to a tag or commit
    mux: { model: "fixed" | "matrix"; note: string;
           routable?: { peripheral; instances: string[]; signals: string[] }[] };
    flagNotes: Partial<Record<PinFlag, string>>; // the source's words, shown as the caution
    exports: ("c-header" | "micropython" | "arduino" | "json")[];
    micropythonBusIds?: Record<string, number>;
  };
}
```

- `mcu` is the chip's own name for the pin, recorded explicitly because the
  exports need it and it must never be derived from a silkscreen label.
- `module-memory` and `jtag` extend the flag list proposed in the brief. The
  ESP32 sources state both, with their own wording.
- The pin data sits on a **copy** of a board's connector map
  (`withPinFunctions`). Connector maps are shared between boards on different
  chips (the UNO header also serves the RA4M1-based UNO R4; the Pico map
  serves the RP2350 Pico 2), so chip-specific functions never go on the
  shared object. A catalog test checks that a pilot board's wiring data, minus
  the planner fields, still equals the map it shares.

## Pilot boards and sources

| Board | Sources (pinned) | What they back |
| --- | --- | --- |
| Raspberry Pi Pico | pico-sdk 2.3.1 `regs/io_bank0.h`, `boards/pico.h`, `hardware/adc.h`; MicroPython v1.27.0 `ports/rp2/machine_{spi,i2c,uart}.c` | Every header GPIO's SPI/UART/I2C/PWM functions (generated mechanically from the FUNCSEL values), ADC0–2 on GP26–28, SDK default pins, TX = MOSI and RX = MISO, MicroPython bus ids |
| ESP32-DevKitC V4 | ESP-IDF v5.4 `soc/{adc_channel,dac_channel,spi_pins,uart_pins,soc_caps}.h` and the v5.4 GPIO page; the DevKitC V4 user guide header tables; arduino-esp32 3.3.9 `pins_arduino.h` and `Wire.cpp`; MicroPython v1.27.0 `ports/esp32/machine_hw_spi.c` | GPIO identity per header pin, fixed ADC1/ADC2/DAC channels, IO_MUX SPI2/SPI3 and UART pins, I2C0 defaults (21/22), GPIO matrix routing and instance counts, every flag quoted from the GPIO table notes, MicroPython SPI(1)=SPI2 / SPI(2)=SPI3 |
| Arduino UNO Rev3 | ArduinoCore-avr 1.8.8 `variants/standard/pins_arduino.h` and `boards.txt`; Arduino reference source (`reference-en` @ b367b025a1eb) Serial, Wire, SPI, analogWrite, LED_BUILTIN | ATmega328P port pins, PWM timer outputs, SPI on 10–13, Wire on A4/A5, Serial on 0/1 (and the warning that those are the computer link), LED on 13 |
| Raspberry Pi 5 | Raspberry Pi documentation `gpio-on-raspberry-pi.adoc` @ 34dfb87309ab; Raspberry Pi utils `pinctrl/gpiochip_rp1.c` @ ebc4a56bac3a | The functions the documentation lists for the header (I2C on GPIO2/3, SPI0, SPI1, serial on 14/15, hardware PWM on 12/13/18/19), named as RP1 names them |

Each source was fetched and read before use, and the ESP32 GPIO table was
diffed across two ESP-IDF versions (identical). Deliberately left out:

- **Raspberry Pi 5:** other RP1 functions (I2C0/2/3, UART2–4). The
  documentation does not list them for the header. SPI2–5 are also out,
  because their data lines are named `SIO0/SIO1`, and calling them MOSI/MISO
  would be inference.
- **ESP32 CAN (TWAI):** "CAN" is not in the board's catalog interfaces.
- **UNO:** "any pin as chip select". The current Arduino reference lists only
  10(CS).

## Solver rules (`src/lib/pin-planner.ts`)

- Pure and deterministic: the same board and requirements always give the
  same plan (tested, including with requirement keys in another order).
- Counts are clamped to 0–8 and the total number of units to the board's
  assignable pins.
- **Eligible pins:** a pin must carry an `mcu` identity and must not be
  power, ground, or reserved. `system` pins are never assigned, except a
  system-role GPIO that carries a source-stated risk flag (an ESP32
  strapping pin), which is a last resort with its caution. EN, RUN, and
  RESET never qualify.
- **Buses:** a bus uses a full signal set from one instance:
  - I2C: SDA, SCL
  - SPI: SCK, MOSI, MISO, CS (CS matches CS0/CS1/… on the Pi)
  - UART: TX, RX

  Two buses of one kind use distinct instances. CS stays on the instance's
  own chip-select pins; no source in the pilot says a plain GPIO may stand in.
- **Channels:** PWM, ADC, and DAC channels are exclusive resources. On the
  Pico, GP0 and GP16 are the same `PWM0 A` output, so they are never both
  planned as PWM.
- **Matrix boards (ESP32):** routable peripherals can use any capable pin.
  Source defaults are preferred and marked "default"; other placements are
  marked "routed". ADC and DAC stay on their fixed pins. The matrix note is
  shown with the plan and written into every export.
- **Input-only pins** take only inputs: MISO, RX, or ADC. They never take
  outputs or plain GPIO.
- **Flagged pins** are left out on a first pass and used only when nothing
  else fits. The plan then says so, and every such assignment carries an
  orange caution quoting the board's `flagNotes`.
  - Among flagged pins, the least consequential go first: JTAG (1), then
    strapping and LED (2), then module memory, USB link, and boot (3).
  - The ADC2 + Wi-Fi caution applies only when the pin is used as an ADC.
- **Search order:** most constrained first (ADC, DAC, buses, PWM, GPIO).
  Candidates are ordered by: risk, then default, then fixed before routed,
  then input-only for inputs, then distance to the bus's first pin (keeps a
  bus together), then spare pins for GPIO, then physical order.
- **Backtracking:** runs with an explicit step budget (50,000). Units of one
  kind are searched in one order only, and a counting bound (remaining
  outputs against free output-capable pins) prunes early. Realistic
  requests finish in tens of steps. A search that hits the budget says so
  rather than returning a guess.
- **Unsatisfiable plans name the binding constraint:**
  - an instance or channel count ("Only one I2C instance is routable on this
    board.")
  - a pin count
  - the first requirement that cannot join the ones before it ("6× PWM
    doesn't fit alongside 1× SPI: they need the same pins.")
- **Unsupported boards:** a board without `pinFunctions` returns
  `unsupported`.

## UI

- **Placement:** a "Plan pins" section on `/boards/[id]` and under the sheet on
  `/pinout/[id]`. Design pass decision: not in the catalog detail panel. The
  panel is 21–32 rem and already holds the cautions, pin map, and sources, and
  a stepper grid, results table, and export preview would push the pin map
  (the product) out of view. The board page is one tap away from the panel.
- **Steppers:** one per peripheral the board can supply, showing its maximum.
  - Each is a labelled group ("I2C, 2 planned, up to 2") with 44 px −/+
    buttons.
  - The plan summary is the only live region, so a tap announces the result
    rather than the count.
- **URL state:** `?plan=i2c2.spi1.pwm3.adc2.gpio4`.
  - Parsed in `src/lib/plan-params.ts` as untrusted input: at most 64
    characters and 8 tokens. Unknown keys, repeats, and counts outside 1–8
    are dropped, then counts are clamped to what the board supports.
  - Restored after hydration and written with `history.replaceState`, so
    `/boards/[id]` stays statically generated (no `useSearchParams` Suspense
    bailout).
- **Drawing:** planned pads get a dashed ring in their function's role hue
  (the role's lighter `ink` step), and unplanned pads recede.
  - `roles.ts`'s I2C `edge` equals the probe's `#22d3ee`, so the ring
    deliberately uses `ink` plus a dash, never the probe's solid cyan.
  - Tall boards shrink to a 520 px height rather than scrolling, so every
    planned pad is visible. On wide containers the drawing stays in view
    beside the table.
- **Results:** a Geist Mono table (function, signal, pin, label) with
  "default" and "routed" chips and orange caution rows. Each label is a
  button that probes the pin on the drawing and scrolls it into view, with
  no smoothing when reduced motion is set.
- **Export:** only the formats the board's naming supports, with Copy and
  Download.

## Exports (`src/lib/pin-plan-export.ts`)

| Format | Boards | Naming |
| --- | --- | --- |
| C header | all four | GPIO numbers (Pico, ESP32, Pi 5); `PORTx/DDRx/PINx/Pxn` quads for the ATmega328P; `_CHANNEL` for ADC/DAC |
| MicroPython | Pico, ESP32 | `machine.Pin(n)`, bus ids from the board's MicroPython port (`I2C(0, sda=…, scl=…)`, ESP32 `SPI(2, …)` for SPI3) |
| Arduino | UNO | `const uint8_t PINHUB_… = A4;` from the UNO core variant |
| JSON | all four | the plan, pins, MCU names, cautions, sources |

Every file opens with:
- the board name and id
- the connector
- the revision notes (`revisionNotesFor`)
- the verification source URL
- the pin-function source URLs
- the matrix note (on matrix boards)
- "Generated by PinHub — verify against the source before wiring." and the date

Catalog text is folded onto one line before it enters a comment, so it cannot
break out into code. Filenames are `pinhub-plan-<id>…` from `[a-z0-9-]`.

## Boundaries and payload

- `isBoardPayload` validates and size-bounds the new fields, because
  `/api/boards/[id]` serves them to the catalog:
  - known peripherals and flags, identifier-shaped instances and signals
  - at most 16 functions per pin
  - safe HTTPS sources, bounded notes, known export formats
  - pin data only alongside board-level sources
- The `/api/boards` index (50,722 bytes) and the catalog summaries (185,045
  bytes) are byte-identical to `main`. Only the pilot boards' own records
  grow (Pico 3.7 → 11.5 KB, Pi 5 3.7 → 6.7 KB).
- CLI: the generator copies fields explicitly. Regenerating produced no
  content change (only line endings on Windows, reverted), and all four
  `cli/` checks pass. `boards.ts` and `pin-function-data.ts` import each other
  by relative path, because the CLI runs them under `tsx` without the web
  app's `@/` alias.

## Verification

- `npm run lint`, `npm run typecheck`: clean.
- `npm test`: 452 tests in 45 files. New:
  - `pin-functions.test.ts`: the integrity gate the brief asked for, plus
    source spot checks
  - `pin-function-schema.test.ts`: payload validation
  - `pin-planner.test.ts`: each pilot's happy path, unsatisfiable reasons,
    strapping avoidance, least-harmful flagged pins, ADC2 caution scope,
    input-only, determinism, step budget, clamping, unsupported
  - `plan-params.test.ts`
  - `pin-plan-export.test.ts`: 11 snapshots, each read line by line before
    being accepted
- `npm run build`: passes; board pages stay SSG.
- `npm run test:e2e` (worktree dev server on port 3110): 78 passed. New
  `e2e/pin-planner.spec.ts`:
  - builds a Pico plan, reloads it from the shared URL, checks 11 rings
    (none in the probe's cyan), probes a row, and checks the C header,
    MicroPython, clipboard, and download name
  - shows an unsatisfiable UNO plan in orange in both themes
  - checks the planner on `/pinout/esp32-devkitc`
  - checks the fallback line with its report link on the Pi 4
- CLI: `check:boards`, `lint`, `test` (136), `build` all pass.
- Desktop screenshots in both themes: Pico, ESP32 (six cautions), UNO
  unsatisfiable, Pi 4 fallback.
- Mobile gate: see the end of this document.
- Re-run on 2026-09-27 before merging to `main`: lint, typecheck,
  `npm test` (456 tests in 46 files), build, `test:e2e` (78 passed,
  including the 4 planner cases), and the four CLI checks all pass.

## Known limits

- Four pilot boards. Every other board shows the fallback line.
- No Zephyr overlays, and no Arduino pin numbers beyond the UNO. PWM
  frequency, timer sharing, and ESP32 IO_MUX vs matrix speed limits are not
  modelled.
- Pi 5 plans cover only the documented header functions. Raspberry Pi OS
  still has to enable each bus (for example I2C and SPI in `config.txt`),
  which PinHub does not document.
- Plain GPIO is treated as needing output capability. Input-only pins never
  get plain GPIO, even for a circuit that would only read them.
- Existing data quirks surfaced, not changed:
  - The UNO grouped map repeats position 14 (D13 and A0), so grouped exports
    say "position", not "pin".
  - `revisionNotesFor` matches the ESP32's flash notes on the word "module",
    so its exports list them as revision notes (one appears twice, from the
    warnings and the connector notes).
- An existing global rule, `button, input { font: inherit }`, sits outside
  Tailwind's layers and overrides text-size utilities on every button
  app-wide. The planner sizes its button labels on inner spans. The global
  fix is filed as a separate task.

## Adding `functions` data for a new board

1. Find a machine-readable source for the chip's pin mux: an SDK register or
   pin header, a core variant file, or an HTML pin table. Pin it to a release
   tag or commit and read it. Do not rely on a PDF you cannot read here or on
   memory.
2. Write a label-keyed table in `src/lib/pin-function-data.ts`:
   - `mcu` for every assignable pin
   - `functions` with source instance names and normalised signals
     (SDA/SCL, SCK/MOSI/MISO/CS, TX/RX, CHn)
   - `default: true` only where the source names a default
   - `flags` only where a source states the risk
3. Write the board's `PinFunctionData`: every file used in `sources`, the
   mux model and note, a quoted `flagNotes` entry for each flag used, the
   export formats its naming supports, and MicroPython bus ids when
   MicroPython is offered.
4. In `boards.ts`, give the board `pinout: withPinFunctions(sharedMap, table)`
   and `pinFunctions`.
5. Add the board to `pilotIds` in `test/pin-functions.test.ts`, add a
   source spot check, and add a plan and export case to the planner and
   export tests.
6. Run everything in CLAUDE.md step 6, including the `cli/` checks.

## Mobile gate (2026-09-27)

The `mobile-mojo` subagent tested the production build (`next start`) with
Playwright at 360 × 800, 390 × 844, 412 × 915, and 844 × 390 landscape, in
both themes:

| Journey | Result at all four sizes |
| --- | --- |
| Pico plan (2× I2C, 1× SPI, 3× PWM, 2× ADC): 13 pins, rings on the drawing, `?plan=` reload restores it, all three exports | Pass |
| Unsatisfiable plan: orange explanation, readable in both themes | Pass |
| `/pinout/raspberry-pi-pico` carries the planner | Pass |
| Board without pin-function data (Pi 500): one-line fallback with an HTTPS report link | Pass |
| Pin readout action row (Copy, Report, Clear): fits, links are HTTPS with `rel="noopener noreferrer"` | Pass |
| Catalog home, board selection, back navigation | Pass |

No console errors, no horizontal page overflow, and every planner stepper
and readout action is at least 44 × 44 px. Tab focus shows the standard
outline. Export code blocks scroll inside their own box, as intended.

Not covered: planner flows on the ESP32, UNO, and Pi 5 at phone sizes
(desktop and e2e coverage only), and screen-reader testing.

Follow-up (resolved 2026-09-27): the catalog's inline `BoardDetailPanel`
had no planner and no link to `/boards/[id]`, so the planner could not be
reached from the catalog's main browsing flow. The panel now has an "Open
full board page" link under its action toolbar. For boards with pin
function data it goes to `/boards/[id]#plan` and adds "Plan pins for your
circuit"; other boards get the plain board page link and no planner
promise. Covered by `test/board-detail-panel.test.tsx` and the phone case
in `e2e/pin-planner.spec.ts`.

While verifying it, `a board without pin function data` in
`e2e/pin-planner.spec.ts` failed 3 of 6 runs on `main` against the dev
server (`Unexpected end of JSON input` while compiling
`/boards/raspberry-pi-4-model-b`). It passed 6 of 6 with one worker and
10 of 10 against the production build, so it is a dev-server compile race
under parallel workers, not an app bug. Filed as a separate task.

Follow-up (resolved 2026-09-27): Web CI had been red since the pin error
report merge, with every failure in `npm run test:e2e`. Two causes:

- Exact `lab()` colour strings. Chrome on Linux serializes the dark-theme
  inks with different float noise than Chrome on Windows
  (`lab(94.7127 3.58394 14.3151)` against the recorded `3.58391`). The
  checks in `pin-planner.spec.ts` and `pin-reports.spec.ts` now use
  `e2e/color.ts`, which compares channels numerically within 0.01. A
  throwaway probe confirmed it accepts that drift and still rejects a
  different colour.
- The dev-server compile race above. CI now runs Playwright against the
  production build it already makes (`next start`); local runs keep
  `next dev`. That also covers the pinned-pin report test on
  `/pinout/raspberry-pi-5`, which timed out on every CI attempt but has
  never failed locally. No CI trace existed to confirm its cause, so the
  workflow now uploads `test-results/` on failure (seven-day retention).

Verified: lint, typecheck, `npm test` (459), build, and `CI=1` e2e with
two workers against `next start` (79 of 79, no retries, 43 s), plus the
edited specs against `next dev` (10 of 10).
