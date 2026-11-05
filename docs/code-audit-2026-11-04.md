# Council UX corrections — 2026-11-04

## Scope

Follow-up to the independent product, code, and browser review of
`4f0250aa071a82c2723b189fe323adc42414f4ee`. Work is on
`fix/council-ux-quality`. The target is at least 9/10 from every applicable
council seat, with final mobile-mojo verification before publishing.

The dense catalog, static source-backed data, existing visual language,
lightweight summaries, and on-demand detail/pin-index requests are preserved.
No database, new routes, or production deployment is part of this change.

## Corrections

- Standalone references show board logic/tolerance guidance, every board
  caution, verification provenance, and official documentation. Catalog details
  no longer fold late voltage/strap/reserved/revision restrictions away.
- Shared pin-caution rendering carries notes and source-backed flag explanations
  through Static/Dynamic maps, readouts, tables, paper schedules, and exports.
  Pad accessible names identify recorded flags. Unpinned hover readouts do not
  issue live announcements.
- Capability filters and pin search consult recorded alternate functions and
  matrix routing, respecting input-only restrictions. Primary-role highlighting
  is labeled separately; missing metadata is not presented as proof of absence.
- Lookup ranks board identities before chip/family matches, puts recorded defaults
  before labelled pins and alternate routes, and previews two pins per board.
  Per-board disclosures and a bounded scroll region keep the answer compact;
  Show more boards exposes later matches with an explicit count. Only matched
  function text appears, and human-readable flag labels replace raw identifiers.
  Comparison lookup starts collapsed. A page-session fetch revalidates the
  stable index URL so older deployment caches cannot hide new metadata.
  Board lists use the board qualifier of a pin query, with an explanation,
  instead of contradicting successful pin answers with an empty state. Lookup
  also respects active facets/favorites and includes recorded alternate signals.
- Catalog and comparison share catalog-order defaults, board-query semantics,
  and platform/connector terminology. The narrower catalog category is
  explained and collapsed; connector filtering precedes saved-library content. Catalog rows expose compact
  caution counts and exceptional no-map status. Comparison facts precede a
  collapsed informational overlap panel.
- Mobile detail/result scroll margins follow the measured sticky controls;
  query-only searches no longer allocate a separate Reset row. Light-theme
  fallback interface chips have readable dark text on an opaque pale fill.
- Complete print schedules are independent of screen filters, collapsed tables,
  and scroll caps. Connector orientation/notes and a printed source URL are
  retained; connector names repeat on continued pages. Content-bearing Link wire controls remain printable. Copied
  wire lists retain endpoint cautions; pin/table exports retain recorded safety
  context and existing Markdown/CSV escaping.
- Favorites and collection creation/membership/deletion/Undo distinguish stored
  outcomes from changes kept for this visit only. Persistence notices do not
  disappear before they can be read. Capacity feedback remains visible and
  announced; Undo pauses while focused and returns focus to the collection rail.
- Large shared collections explicitly name their four-board comparison subset;
  card-specific Compare actions include their own board. Clipboard failures
  have live feedback, retry, and selectable-link recovery for collections.
  Copy completion is bound to its original pin/request, so delayed writes cannot
  claim the newly selected pin was copied.
- Interfaces and Source references have heading semantics; boards without a map
  have no empty presentation switches. Design/route documentation describes
  the final behavior. Vendor marks keep explicit dimensions; the tiny catalog
  logo uses eager loading without an unused preload.

The CLI pin index and matcher were regenerated from their website sources;
generated records were not edited manually. No CLI publication is included.

## Verification before independent revised review

- Baseline: lint, typecheck and 1,671 tests passed before edits.
- Application lint: pass.
- Typecheck (`tsc --noEmit --incremental false`): pass.
- Vitest: 73 files / 1,725 tests pass, including new real-board safety,
  capability, export, persistence, comparison-subset and clipboard regressions.
- Production build: pass, including 800 generated pages and the existing
  source/visual validation gates.
- Playwright against the production build: **127/127 pass with retries disabled**
  (`npm run test:e2e -- --workers=4 --retries=0 --reporter=line`, reusing the
  already-running production server). Coverage
  includes all four required phone viewports in both themes, existing planner,
  Link, comparison, catalog, collection and pinout journeys, plus new mobile
  clearance, contrast, lookup-coherence and print-content assertions.
- CLI: generated catalog check, lint, 139 tests, and TypeScript build pass.

The first browser runs identified an actual print override problem and loss of
the collection-capacity live status; both were corrected. Tests were also
updated for intentional collapsed comparison analysis, catalog-order defaults,
correct PWM results, and precise board-title selection. The final full run is
green; earlier failures are not counted as passes. Post-round-3 validation also
caught a misplaced client directive and test-harness assumptions about pin names
and duplicate status text; these were corrected before the recorded passes.

## Council and mobile gate

The initial scores were product 7, code 6.5, and UI 8. The second product/code
review found lookup flooding, analog-only GPIO false positives, GPIO lookup
inconsistency, missing printed orientation notes, and a stale clipboard race.
These were corrected with real-record regressions before the final review.
The second browser pass was stopped when its snapshot was superseded; it is
not counted as a final mobile gate or passing score.

All seats in each round assess the same frozen uncommitted snapshot. Reports,
SHA-256 manifests, browser screenshots and paper PDF evidence are retained in
`%TEMP%/pinhub-council-20261104/`, with the third-round reports under `round3/` and post-review correction
evidence under `correction-drafts/`.
Round 3 scored product 8.5, code 8, UI/mobile 9.3. The UI/mobile seat passed
all required viewport/theme coverage, while code/product identified banked GPIO
names, alias-only capabilities, comparison voltage evidence and selected-pin
arrival as remaining material gaps. These were corrected and verified in
subsequent snapshots. The user explicitly extended the default three-round limit by one focused
council round, including a final mobile recheck, before committing and pushing.
Round 4 passed product at 9.2 and UI/mobile at 9.3; code scored 8.5 after
finding numbered-net/TWI omissions and punctuation-token identity rejection.
Those two code findings are corrected after the frozen review: numbered net
families are preserved, explicit TWI clock context is recognized, and qualifier
normalization handles decimal versions while keeping + variants distinct.
A displayed-name sweep covers all 190 mapped boards, and an independent comparison
with the existing Link signal parser found no I2C/UART omissions. These recall
checks supplement cross-surface parity, which alone cannot prove completeness.
The user approved up to two further focused verification rounds, stopping
as soon as every applicable seat reaches 9/10, then committing and pushing.
Round 5 passed code at 9.2 but product scored 8.5 after reproducing compact
decimal/revision shorthand failures and missing readable function explanations.
Its unfinished mobile review was superseded when those fixes became necessary;
it does not count as a pass. Whole compact identities are now checked before
splitting punctuation, with meaningful + and numeric boundaries retained.
R3 can identify Rev3 without rewriting literal R4 names. Processor core counts
and dot/dash/slash-only qualifiers cannot create board identities. The lazy index
keeps each peripheral attached to its instance and signal, so matched I2C lines
and PWM timer channels remain readable. Numbered nets retain recorded line
aliases. Regression sweeps require every mapped board's spaced and glued display
name to rank that board first and every matched family row to have an explanation.
Round 6 assessed that revised snapshot before publication.
Round 6 passed code at 9.6; product scored 8.8 after reproducing a remaining
decimal-family/spaced-revision regression. Its unfinished mobile run was stopped
as superseded, so it is not a passing final gate. The subsequent correction keeps
decimal boundaries as well as compact names, joins adjacent rev/R (including
the conventional trailing period) and number tokens, and rejects standalone
plus-only qualifiers. Display labels omit a
repeated peripheral prefix when the instance already names it. Real-record tests
cover Teensy4/Teensy3, spaced revision forms across the mapped catalog, plus-only
input, and the existing exact-version/plus/numeric safeguards. This post-round-6
correction passed the full local checks before renewed independent signoff.
The user subsequently resumed the task and explicitly instructed the coordinator
to continue until the review is finished, then commit and push the changes. This
extends the earlier review-round limit. The saved application snapshot and all
344 manifest hashes were verified unchanged on resumption; only this audit's
authorization/status text changed before the round-7 frozen review.

Round 7 independently passed every applicable seat:

| Seat | Exact model | Explicit effort | Score | Verdict |
| --- | --- | --- | --- | --- |
| Product UX/coherence | claude-opus-5-5 | high | 9.1/10 | Pass |
| Code UX correctness | gpt-6.1-sol | xhigh | 10/10 | Pass |
| UI/browser and final mobile-mojo | gpt-6.1-sol | xhigh | 9.4/10 | Pass |

All seats reviewed the same 62 staged paths, candidate tree
`38e7c948656602e8a1e81bac4747bd9e75ecf428`, exact 344-file manifest SHA256
`68889524d81e5dd1c3758a663a74d5d9f0115b9fa05a5aed53f9d36f06bd6b42`,
and production BUILD_ID `Vixqs_7-lrTnwnzrVzg1x`. Each verified all hashes, the
exact file set and Git/build state before and after review, with no drift.
Models and effort settings were explicitly dispatched from resolved capabilities;
no substitutes were used. Current-round conclusions were not shared before
initial reports. Read-only behavior was instructed rather than technically
enforced. No P0-P2 defect or required correction remained in the final scope.

The UI seat read and applied mobile-mojo, freshly exercised desktop and exact
360x800, 390x844, 412x915 and 844x390 in both themes, and inspected screenshots,
overflow, sticky controls, focus/keyboard/navigation, pin arrival/reveal/panning,
line explanations, loading/error/retry and adjacent capability/safety states.
All 20 instrumented interaction-phase records contained zero captured application
errors; instrumentation starts after initial paint, so this is not a full startup
log guarantee. Its environment used CSS resizing with a desktop UA and no touch
emulation. The product seat independently supplemented this with the same four
phone sizes in both themes using mobile UA/touch emulation, reporting no console
errors or document overflow. Broad unchanged journeys and paper references reuse
the explicitly attributed earlier independent coverage.

Acceptance is at least 9/10 from every applicable seat, with the final required
mobile gate complete. After review, only factual audit status/score text changed;
application sources remain identical to the reviewed snapshot. Publication targets
`fix/council-ux-quality`; the delivery record identifies the commit and remote SHA
verification. Seven council rounds were used with the user's explicit extensions.

Digital GPIO classification is shared by the capability explorer and lazy pin
lookup. Explicit analog-only notes override MCU identities; an ADC-only name is
insufficient to imply digital I/O. Input-only digital GPIO remains eligible.
The relevant Nano/Pro Mini, ESP8266, Cmod A7, UNO, and ESP32 cases are covered.
Banked forms such as GPIO1_B7, GPIO0_23, GPIOA.14 and GPIOAO_8 are recognized.
Filters and lookup share recorded-alias matching without inventing planner
instances. Orange Pi 5 retains 17 GPIO and 9 PWM candidates. An exhaustive
1,140-category check across 190 mapped boards found no lookup/filter differences.
Explicit power/ground/reserved roles and input-only output restrictions take
precedence over capability-name tokens.

Comparison tolerance uses the same explicit warnings and connector-note evidence
as the logic caution. Undocumented 3.3 V behavior remains Unknown in comparison;
partial tolerance remains Mixed. An explicit never-apply-5-V-to-IO instruction
is treated as recorded non-tolerance, rather than an inferred 3.3 V restriction.

A valid per-pin link shows its pin identity, physical position, aliases and
recorded cautions near the heading. Its diagram action pans and focuses the
selected pad, including right-header pins on phones. Invalid keys produce no
fabricated selection. The summary is excluded from the complete paper schedule.

Long print labels may wrap within their fixed-width signal column; the Lattice
160-pin and Cmod 60-pin A4 samples have no measured signal-column overflow.

Actual A4 PDFs were checked for complete rows, connector orientation, source
URLs and repeated connector headers, including ESP32 and the long Milk-V map.
They are evidence of paper layout, not physical wiring validation.

## Remaining nonblocking findings and polish

The final product seat documented a minor false-empty lookup for uncommon
separator spellings such as `uno r4 - sda` and `pi 3 model b + gpio2`. Ordinary
supported names/variants work and no wrong pin is shown; the correct catalog
cards remain available. A future correction should attach a separated plus to
the preceding identity token and ignore other separator-only tokens while
preserving the all-punctuation empty case. This predates the final correction
and was explicitly nonblocking at 9.1/10.

`pico gpio2` remains unsupported where the record uses `GP2`; `pico gp2` works.
The final product seat identifies this as pre-existing on main and optional,
not a new regression or an electrical capability claim. A future naming-equivalence
change should be limited to source-supported RP2xxx namespaces and retain exact
label/numeric-boundary regressions.

Accepted earlier polish includes nuanced conservative Unknown tolerance summaries
on two records, match-tier/primary-role terminology and preview ordering,
restating alternate timer functions in selected-pin summaries, sparse ESP32 paper
pagination, and long source labels visually shortened despite full accessible
names. These are not represented as fixed or used to claim a perfect product.

## Limits

Browser regressions use Chrome desktop/mobile emulation; this is not physical
device, mobile Safari, virtual-keyboard, screen-reader, or electrical validation.
Viewport-specific screenshot/focus/overflow evidence is required from the
independent mobile reviewer. External vendor data was not re-audited against
current silicon/datasheets. This change preserves and presents existing recorded
restrictions and sources; it cannot establish electrical compatibility or
completeness of undocumented pin capabilities. No performance benchmark is
claimed, and the existing summary/detail loading boundary remains a gate.

## Corrective follow-up: embedded Raspberry Pi map usability

The user's screenshot demonstrated a usability failure that the council's
passing scores did not catch. A desktop catalog detail panel measured 334 px
inside the map, while the SVG's touch-size calculation forced the entire board
to 1,552 px wide and about 1,088 px high. Only numbered pads and a cropped part
of the board were initially visible; the physical-pin picker and readout sat
below the oversized artwork (the readout began around page y=1,608).

The earlier review accepted internal diagram panning and verified the larger
inspector, but did not establish that an engineer could identify and select a
named pin in this narrow embedded state. A lack of document-wide overflow and
44 px SVG hit regions were insufficient acceptance criteria. The prior council
scores must not be used as evidence that this state was usable.

`RaspberryPiPinout` now puts labelled physical pin pairs first. It preserves
the source pairing (GPIO 1/2, Pico 1/40), numbers, aliases, notes and warnings.
The connector is a bounded vertical list with buttons at least 48 px high;
selection details follow it, or sit beside it in a wide container. The
physical-pin selector is above the list and reveals its selection within that
list. Arrow keys, Home/End, Enter and Escape support keyboard use.

Board artwork is available under **Board overview and orientation**, fitted to
the container and noninteractive. **Inspect** and **Full view** retain the full
interactive drawing. Role highlighting is optional so it no longer pushes the
named pins down the initial panel. Source data, loading boundaries and electrical
claims are unchanged. The design notes now distinguish interactive inspector
touch targets from the fitted embedded overview.

Three component regressions cover source pair ordering, named selection,
keyboard movement, picker selection and clearing. Five new browser regressions
cover the embedded catalog at 360, 390, 412, 844 and 1280 px, including the
narrow desktop detail panel. Existing Pi and mobile release gates now check the
new interaction rather than the removed artwork zoom controls.

The independent mobile check also caught a misleading shared empty-state hint:
the new connector requires Enter to select a focused pin, whereas the hint
promised that arrowing alone inspected it. The readout now says to select a
pin, and the embedded connector explicitly explains arrows followed by Enter.

Final automated verification: lint and typecheck passed; all 1,728 unit tests
in 74 files passed; the production build passed (BUILD_ID
`zNMDuUbJVjYWCHQPddeD5`); all 132 Chrome browser regressions passed without
retries against that production server. The first broad browser run had eight
failures because the older release-gate test still required the removed zoom
controls; it was updated to verify named-pin selection, source pairing,
keyboard access and fitted overview. Those failed attempts are not counted as
passes. Browser logs and screenshots are in the local temporary evidence folder
`pinhub-compact-map-fix`.

The independent mobile-mojo subagent passed the final affected flows at
360×800, 390×844, 412×915, 844×390 and the 1280×800 narrow desktop catalog,
in both themes. It inspected screenshots and exercised named pins 3/40,
the picker, copy/readout, cautions/source links, keyboard navigation,
role highlighting, fitted overview, Inspect/focus return and Full view.
Pi 4, Zero 2 W and Pico 2 W source pairing and endpoint readouts were also
checked at 390 px. No remaining correction was identified in that scope.
The final report and screenshot evidence are in the local temporary
`pinhub-compact-map-fix/mobile` directory.

The shared T3 preview became inconsistent after the production restart,
reporting mismatched viewport sizes and stale frames. Those attempts were
not counted as final coverage. The reviewer finished in an isolated Chrome
Playwright browser with exact viewport and touch/mobile emulation. This is
focused verification of the reported embedded-map failure, not a new full
council score or physical-device, Safari, screen-reader or hardware validation.

## Correction: physical board restored as the primary Dynamic view

The user rejected the previous follow-up: the Dynamic view exists so people
can see a physical representation of the board. That commit (`3ad2d4c`)
replaced the board with a named list and moved the artwork into a collapsed
**Board overview and orientation** disclosure whose drawing was `inert` and
`aria-hidden`, so by default no board was visible and no board pad could be
used. The list was not the defect. Hiding the board was.

### Raspberry Pi Dynamic view

- The interactive board (`BoardStage`, compact framing) is again the first
  content under the heading, with the orientation line above it. It is fitted
  to the container with no forced minimum width, so the whole Pi 5 board fits
  the 334 px catalog panel and 360 px phones (Pico capped at 200 px wide).
  The collapsed inert overview is removed.
- Board pads stay interactive at fit size (pointer, `Tab`/arrows, Enter). The
  footer says the pads are small at this size; it does not claim 44 px.
  **Zoom to touch size** sets the frame to `touchDrawingWidth(geometry, true)`
  (content-box, so the padding does not eat into it), makes it a focusable
  pannable region, and scrolls the selected pad into view. **Fit whole board**
  returns.
- Readout and electrical note follow the board (beside it at 650 px+
  container width). The 48 px named pin list in source physical pairs and the
  physical-pin picker follow as the secondary selector. Board, list, picker and
  readout share one selection state.
- Source pins, cautions, logic-level note, official-docs link, wiring notes,
  role highlighting, schedule table, **Inspect** and **Full view** are
  unchanged.

### Cross-family board renders

Before this change, every non-Pi physical board used one generic outline: a
rule-placed QFN, a few passives, and connectors on the recorded edges. A new
family layer (`src/lib/board-family-art.ts`, drawn by
`board-visual/FamilyArtwork.tsx`) adds the features a family is recognized by.
Features are chosen from metadata the catalog already curates (visual
template, recorded radio interfaces):

- **Espressif DevKit / NodeMCU**: shielded module with PCB-antenna meander at
  the end away from the USB, two push-buttons beside the USB.
- **Arduino Nano** (Arduino-branded only): centre reset button; module can
  when a radio is recorded. **UNO/Mega footprint**: reset button by the USB
  corner.
- **STM32 Nucleo-64**: dashed ST-LINK section with its MCU, then USER (blue)
  and RESET (black) buttons. Nucleo-144 keeps its builder-drawn STLINK-V3E
  delimiter.
- **TI LaunchPad**: dashed eZ-FET emulation section.
- **BBC micro:bit**: 5×5 LED matrix with A/B buttons, and no generic IC,
  because the processor is on the back.
- **STM32 pills**: boot jumpers and reset (blue pill), two buttons (black
  pill).
- **Feather, XIAO, MKR, D1 mini**: shielded radio module only when the record
  lists a radio. XIAO cans have no PCB antenna. QT Py ESP32 boards, ESP32 Thing
  and Nano Matter are excluded because their radios are not a separate
  shielded module of that shape.
- **40-pin and Zero-size SBCs** (non-Pi, non-enclosed): SoC with heat spreader
  plus memory package. **Jetson dev kits**: heatsink and fan.

Family features are placed only in the clear field between connectors.
Generic parts that would sit under a feature are dropped, never moved onto a
connector, and a feature that does not fit is dropped rather than shrunk. The
caption names the family and calls the drawing representative, not the
model's exact layout. No Raspberry Pi artwork is reused on another board, and
no feature carries a pin or an electrical claim. References are cited in the
module header: the Espressif DevKitC guide, micro:bit hardware pages, ST
UM1724, TI SLAU772, Arduino hardware docs, and NVIDIA Jetson guides.

The embedded generic map (`BoardPinoutVisualization`) now also opens physical
boards fitted whole, with the same **Zoom to touch size** / **Fit whole
board** toggle. Function-grouped schematics stay at touch size, unchanged.

### Coverage inventory (derived by `renderCoverage`, pinned by a unit test)

| Tier | Boards |
| --- | --- |
| dedicated | 18 |
| family | 98 |
| generic | 31 |
| schematic | 43 |
| unmapped | 6 |
| total | 196 |

Family illustrations by family and drawn features:

- UNO-footprint board (button) — 5: `arduino-uno-r4-wifi`, `arduino-uno-rev3`, `arduino-uno-r4-minima`, `arduino-uno-q`, `sparkfun-redboard-qwiic`
- Arduino Nano (rf-module, button) — 6: `arduino-nano-esp32`, `arduino-nano-33-ble-sense`, `arduino-nano-33-iot`, `arduino-nano-rp2040-connect`, `arduino-nano-33-ble`, `arduino-nano-33-ble-sense-rev2`
- Espressif DevKit (rf-module, button, button) — 14: `esp32-devkit-v1`, `esp32-devkitc`, `esp32-s3-devkitc-1`, `esp32-c3-devkitm-1`, `esp32-c3-devkitc-02`, `esp32-s2-devkitm-1`, `esp32-c6-devkitc-1`, `esp32-s2-saola-1`, `nodemcu-devkit-v1`, `esp32-h2-devkitm-1`, `esp32-c61-devkitc-1`, `esp8684-devkitm-1`, `esp32-s3-devkitm-1`, `esp32-c6-devkitm-1`
- STM32 Nucleo-64 (debug-section, button, button) — 18: `stm32-nucleo-f401re`, `stm32-nucleo-f103rb`, `stm32-nucleo-f446re`, `stm32-nucleo-l476rg`, `stm32-nucleo-g071rb`, `stm32-nucleo-f411re`, `stm32-nucleo-f072rb`, `stm32-nucleo-f091rc`, `stm32-nucleo-f303re`, `stm32-nucleo-f334r8`, `stm32-nucleo-g431rb`, `stm32-nucleo-g474re`, `stm32-nucleo-g0b1re`, `stm32-nucleo-c031c6`, `stm32-nucleo-l053r8`, `stm32-nucleo-l073rz`, `stm32-nucleo-l152re`, `stm32-nucleo-h503rb`
- NVIDIA Jetson developer kit (heatsink) — 4: `jetson-orin-nano-dev-kit`, `nvidia-jetson-nano-dev-kit`, `nvidia-jetson-xavier-nx-dev-kit`, `nvidia-jetson-agx-orin-devkit`
- Zero-size single-board computer (soc) — 3: `radxa-zero-3w`, `banana-pi-bpi-m2-zero`, `radxa-zero-3e`
- 40-pin single-board computer (soc) — 20: `orange-pi-5`, `banana-pi-bpi-m5`, `odroid-c4`, `pine64-rockpro64`, `libre-computer-le-potato`, `beagley-ai`, `radxa-rock-5b`, `odroid-n2-plus`, `odroid-m1`, `pine64-quartz64-model-b`, `khadas-vim4`, `google-coral-dev-board`, `starfive-visionfive-2`, `radxa-rock-3a`, `libre-computer-alta`, `libre-computer-solitude`, `libre-computer-tritium-h5`, `orange-pi-zero-2w`, `orange-pi-3b`, `orange-pi-5-plus`
- Mega-footprint board (button) — 2: `arduino-mega-2560-rev3`, `arduino-due`
- Arduino Nano (button) — 4: `arduino-nano`, `arduino-nano-every`, `arduino-nano-r4`, `arduino-nano-matter`
- Arduino MKR (rf-module) — 2: `arduino-mkr-wifi-1010`, `arduino-mkr-1000-wifi`
- BBC micro:bit (led-matrix, button, button) — 1: `bbc-microbit-v2`
- XIAO / QT Py (rf-module) — 10: `seeed-xiao-esp32s3`, `seeed-xiao-nrf52840`, `seeed-xiao-esp32c3`, `seeed-xiao-esp32c6`, `seeed-xiao-mg24`, `seeed-xiao-nrf54l15`, `seeed-xiao-nrf54lm20a`, `seeed-xiao-esp32c5`, `seeed-xiao-esp32s3-sense`, `seeed-xiao-nrf52840-sense`
- STM32 pill (boot-jumpers, button) — 1: `stm32f103-blue-pill`
- STM32 pill (button, button) — 1: `weact-black-pill-stm32f411`
- TI LaunchPad (debug-section) — 1: `ti-msp-exp430g2et-launchpad`
- ESP-12 module board (rf-module) — 1: `lolin-d1-mini`
- Adafruit Feather (rf-module) — 4: `adafruit-feather-nrf52840-express`, `adafruit-esp32-s3-feather`, `adafruit-feather-esp32-v2`, `adafruit-feather-esp32-s2`
- STM32 Nucleo-144 (builder ST-LINK delimiter) — 1: `stm32-nucleo-h753zi`

Generic outline only (31): `teensy-41`, `adafruit-feather-rp2040`, `seeed-xiao-rp2040`, `adafruit-qt-py-esp32-s3`, `adafruit-qt-py-esp32-c3`, `nordic-nrf52840-dk`, `milkv-duo`, `seeed-wio-terminal`, `arduino-mkr-zero`, `arduino-mkr-wan-1310`, `adafruit-feather-m4-express`, `seeed-xiao-samd21`, `seeed-reterminal`, `sparkfun-pro-micro-rp2040`, `sparkfun-esp32-thing`, `teensy-40`, `teensy-lc`, `nordic-nrf5340-dk`, `nordic-nrf52-dk`, `adafruit-qt-py-rp2040`, `seeed-xiao-rp2350`, `seeed-xiao-ra4m1`, `stm32-nucleo-l432kc`, `stm32-nucleo-g431kb`, `stm32-nucleo-f303k8`, `adafruit-feather-rp2350`, `adafruit-kb2040`, `waveshare-rp2350-plus`, `adafruit-qt-py-esp32-s2`, `adafruit-feather-m0-express`, `sparkfun-pro-micro`.

Function-grouped schematic (43): `beaglebone-black`, `adafruit-metro-esp32-s3`, `sparkfun-thing-plus-rp2040`, `sparkfun-thing-plus-esp32-wroom-usbc`, `sparkfun-redboard-artemis-atp`, `lilygo-t-display-s3`, `lolin-s2-mini`, `particle-photon-2`, `adafruit-itsybitsy-m4`, `arduino-giga-r1-wifi`, `arduino-pro-mini`, `seeed-beaglebone-green`, `arduino-leonardo`, `arduino-micro`, `arduino-zero`, `adafruit-itsybitsy-rp2040`, `adafruit-metro-m4-express`, `adafruit-grand-central-m4-express`, `sparkfun-redboard-turbo`, `teensy-32`, `particle-boron`, `particle-argon`, `beaglebone-ai-64`, `ti-lp-mspm0g3507`, `silabs-xg24-explorer-kit`, `waveshare-rp2040-zero`, `lattice-machxo2-breakout`, `lattice-machxo3d-breakout`, `lattice-icestick`, `lattice-machxo3l-starter`, `lattice-crosslink-nx-eval`, `nxp-frdm-kl25z`, `digilent-nexys-a7-100t`, `terasic-de10-lite`, `flipper-zero`, `esp32-p4-function-ev-board`, `digilent-zybo-z7-20`, `digilent-arty-s7-50`, `digilent-cmod-a7-35t`, `arduino-nicla-sense-me`, `milkv-duo-s-v12`, `esp32-c5-devkitc-1`, `waveshare-rp2350-zero`.

No map yet (6): `stm32f4-discovery`, `ti-ek-tm4c123gxl-launchpad`, `digilent-arty-a7`, `digilent-basys-3`, `arduino-portenta-h7`, `nordic-nrf9160-dk`.
The family tier means recognizable family features, not verified per-model
placement. No board is claimed to have an exact model layout except the
dedicated Raspberry Pi artwork, and that artwork's own caption says that
component placement is illustrated.

### Known limits (flagged, not fixed here)

- Shield-split headers (UNO, Mega, Due, Nucleo-64, Nordic DKs, LaunchPad,
  RedBoard, UNO Q) are drawn in the catalog's group order (D0 upward, analog
  before power on the UNO records), not the physical sequence along the
  board. The drawing now says so in its caption (`SHIELD_ORDER_NOTE`).
  Reordering needs per-board physical sequences, including headers the
  records omit (SCL/SDA/AREF), and was not attempted.
- 31 physical boards remain on the generic outline (list above). Teensy,
  RP2040/RP2350 Feathers and XIAOs without radios, QT Py, Nucleo-32, Nordic
  DKs, Wio Terminal and reTerminal need model sources before adding
  features.
- Button and module positions are family-typical. Within a family, the exact
  side or offset can differ by model and revision.
- At fit size, board pads are below 44 px. The named list, picker, schedule
  table and **Zoom to touch size** provide touch-sized selection.

### Verification in this implementation pass

- `npm run lint`, `npm run typecheck`: clean.
- `npm test`: 1,742 tests in 75 files, all passing (baseline before this pass was 1,728 tests
  in 74 files). The new and rewritten regressions are
  `test/raspberry-pi-connector.test.tsx` (visible, non-inert board first;
  fit-by-default with no min-width; every source pin is a board pad;
  board ↔ list ↔ picker selection sync; 44 px zoom and back; board-pad
  keyboard) and `test/board-family-art.test.tsx` (features never cover a pad,
  leave the body, or overlap; Pi stays dedicated; RF can only with a recorded
  radio; rendered feature sets; captions and order note; inventory counts;
  generic fit/zoom; schematic stays touch-size).
- Browser specs updated, not deleted: `e2e/raspberry-pi-redesign.spec.ts` now
  requires the fitted board to be visible and interactive, zooms to touch size
  and checks a ≥44 px hit region, selects pin 40 on the board, and checks list
  sync. The landscape and desktop keyboard tests now use the board's own pads.
  `e2e/mobile-release-gate.spec.ts` checks that the Pico board is visible and
  fits.
- Parent integration: production build `foZiZ69hjvzcq-SvWqWE3` passed; all 132
  Playwright tests passed against that production server without retries.
  The TI LaunchPad debugger illustration distinguishes MSP430 eZ-FET from
  TM4C ICDI, checked against https://www.ti.com/tool/EK-TM4C123GXL and covered
  by a regression. The TM4C board still has no pin map and is not counted as
  a rendered board.
- Independent final mobile-mojo gate passed: Pi 5 and Pico 2 W at
  360×800, 390×844, 412×915 and 844×390 in both themes; ESP32-DevKitC V4,
  UNO Rev3, Nucleo-F401RE and micro:bit V2 at 390×844 in both themes and
  the narrow 1280×900 desktop catalog. Fit/zoom, pad targets, synchronized
  artwork/picker/readout, keyboard navigation, inspector focus, captions,
  console errors and page overflow were checked from real browser screenshots.
  All 156 source-file hashes matched before/after. Evidence is under local
  Temp/pinhub-physical-boards/mobile; prefer CLEAN-* captures, because earlier
  captures had screenshot-positioning artifacts.
- Landscape limit: at 844×390, fitted Pi/Pico canvases are 379/451 px high
  beneath a 118 px sticky toolbar. Ordinary page scrolling is required; the
  whole board cannot be seen simultaneously on that short screen. Geometry
  has no internal clipping. Verification used Chrome mobile UA/touch emulation
  and fresh T3 preview, not physical devices, Safari or virtual keyboards.
