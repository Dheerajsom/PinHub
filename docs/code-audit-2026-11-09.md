# Code audit — 2026-11-09

Full review of PinHub, with most of the time spent on what merged after the
filter-menu work (PR #48). Fixes are on `audit/2026-11-09`, cut from
`origin/main` at `12c74d0`.

## Reviewed range

`2c86461..12c74d0` on `origin/main`: 21 commits, 140 files, about 3,200 changed
lines of hand-written source (the rest is board data, generated CLI files,
tests, docs, and lock files).

| PR | What it brought |
| --- | --- |
| #49 | Ten October 2026 boards with full pin maps |
| #50 | Planner coverage, link-preview (Open Graph) images, 44 px touch targets |
| #53 | Planner and board link extended to 126 boards; 39 more boards; data corrections |
| #54 | Council UX review: cautions, pin lookup, Pi pin maps, family artwork, saved-state feedback |
| #51, #52 | Dependabot: CLI lock file; web patch bumps (`@vercel/blob` 2.8.2, `react`/`react-dom` 19.3.1, `@playwright/test` 1.64.1, `@types/node` 25.9.9, `postcss` 8.5.32) |

On the base commit: `docs/code-audit-2026-11-04.md` is the write-up that
shipped inside #54, and it reviewed the snapshot at `4f0250a` (the #52 merge).
Starting there would have left out #49 to #53, so the range starts at the #48
merge, which is the last commit before #49.

The lighter whole-repo pass covered `src/app`, `src/components`, `src/lib`,
`src/lib/server`, `cli/`, `test/`, `e2e/`, `README.md`, and `docs/`.

## Branch housekeeping

`fix/council-ux-quality` (`9d4c91b`) and `fix/council-ux-review` (`7cf80b6`)
were both ancestors of `origin/main` (checked with
`git merge-base --is-ancestor`), so both were deleted locally and on the
remote. The repository now has `main` and `audit/2026-11-09`.

## Baseline (before any edit)

All green, so every later failure would have been this audit's:
`npm run lint`, `npm run typecheck`, `npm test` (77 files, 1,751 tests),
`npm run build`, and in `cli/`: `check:boards` (191 generated boards), `lint`,
`test` (12 files, 139 tests), `build`.

## Findings

Ranked hardware-safety, security, correctness, UX, cleanup.

| # | Severity | Area | Finding | Fixed |
| --- | --- | --- | --- | --- |
| 1 | Correctness | Planner | The Auto-assign panel advertised a "max N" that could not be planned on 17 boards | Yes |
| 2 | Security (low) | API | `/api/prices` accepted any query string and answered other methods without the shared rules | Yes |
| 3 | Hardware-safety (design call) | Planner | The planner folds board cautions after three; on 8 boards the folded part is electrical or boot text | No, needs a decision |
| 4 | Dependencies (moderate, dev only) | Tooling | `minimatch` advisory GHSA-g3hv-75wg-m249 under ESLint's toolchain | No |
| 5 | Performance | Catalog | The catalog reached the size at which `docs/DESIGN.md` plans virtualization | No |
| 6 | UX (low) | Catalog | The "Catalog category" disclosure closes itself when its last filter is cleared | No |
| 7 | Cleanup | Lookup | Flag labels and the pin-index byte limit are each written in two places | No |
| 8 | Robustness (low) | Catalog | URL state is restored on the first animation frame, so a tab opened in the background restores only when shown | No |

### 1. Planner maximum that could not be planned (fixed)

`PinPlanModel.capacity()` (`src/lib/pin-planner.ts:334`) counts bus instances
and ADC/PWM channels one at a time. That is an upper bound, not a plan:
instances share pins. `PlannerAutoAssign.tsx:113,124,148` prints the number as
"max N", reads it out as "up to N", and stops the stepper there, so the page
claimed more than the board data backs.

Reproduced before the fix by asking for each advertised maximum with nothing
else requested. 19 board and peripheral pairs on 17 boards failed:

- Raspberry Pi 4 Model B and Pi 400: 5× SPI and 5× UART. GPIO0/1 are reserved
  for the HAT ID EEPROM and several BCM2711 instances overlap on the header.
- Every 40-pin Pi with a single PL011/mini-UART pair on GPIO14/15 (Zero, Zero W,
  Zero 2 W, 1 A+, 1 B+, 2 B, 3 B, 3 A+, 3 B+): 2× UART.
- NUCLEO-G431RB and G474RE: 3× I2C. NUCLEO-L432KC and G431KB: 3× UART.
  NUCLEO-L053R8: 8× PWM.
- NUCLEO-H753ZI: 8× UART ran out of the 50,000-step search budget.

`docs/board-additions-2026-10-31.md` listed the Pi and H753ZI cases under
known limits. They were still open, and the limit was wider than recorded.

Fix: `planCapabilities` (`src/lib/pin-planner.ts:758`) now lowers each maximum
to the largest count `planPins` can place on its own. Whole-board limits are
kept per board in a `WeakMap`; claiming pins by hand can only remove room, so
those limits cap the recalculation and a costly failed proof is paid once per
board. The proof uses `capabilityStepBudget` (10,000 steps, line 783): the
costliest maximum in the catalog that does fit takes 2,953 steps
(NUCLEO-H503RB, 4× UART), and without the smaller budget the H753ZI spent
about one second proving nothing. All 126 planner boards now compute in about
0.4 s in total on this machine, most of it that one board's failed proof, and
a repeat call for the same board is answered from the cache.

New values: Pi 4 and Pi 400 SPI 4 and UART 4; single-UART Pis UART 1;
G431RB and G474RE I2C 2; L432KC and G431KB UART 2; L053R8 PWM 7; H753ZI UART 7.
Whether the H753ZI can route eight UARTs is not settled by the search, so
seven is what the planner can deliver, not a statement about the chip.

A shared planner link that asked for more than the new maximum is clamped on
restore, as over-capacity links already were (`PlannerWorkspace.tsx` `fit`).

Regression tests in `test/pin-planner.test.ts`:

- line 304, every advertised maximum plans on its own, and the costliest one
  stays under half the proof budget (failed before the fix with the 19 pairs);
- line 320, one more than the maximum is unsatisfiable under the full budget,
  so the smaller proof budget does not under-report;
- line 331, the shared-pin cases by name (failed before the fix);
- line 348, hand-claimed pins never raise a maximum and each one still plans.

### 2. `/api/prices` outside the shared route rules (fixed)

`/api/boards`, `/api/boards/[id]`, and `/api/pins` reject query strings with
400 and mutating methods with a JSON 405 through
`src/lib/server/read-only-route.ts`. `/api/prices` did neither. Checked against
the production build: `/api/prices?x=1` returned 200, and `POST` returned
Next's bare 405 with no `Allow` header. A shared price response is cached at
the CDN for 30 seconds, so each query variant was its own cache key and its
own function invocation. The store reuses one read per instance for 30
seconds, which bounds the cost; this closes the gap rather than a live hole.

Fix: `src/app/api/prices/route.ts` uses `rejectQuery`, `methodNotAllowed`, and
`readOnlyOptions`. The only caller (`src/lib/live-price-feed.ts:22`) sends no
query. `README.md` now says every API route rejects query strings.
Regression: `test/price-store.test.ts:96` (failed before the fix with 200).

### 3. Planner folds board cautions (not fixed, needs a decision)

#54 removed `collapseAfter={3}` from the catalog detail panel because a late
voltage or strap warning could sit behind "Show more". The same commit added
the cautions panel to the planner with `collapseAfter={3}`
(`PlannerWorkspace.tsx:344`), and it is now the fold's only user. 12 of the
126 planner boards have more than four cautions; on 8 the folded part includes
voltage, current, boot, or strap text (ESP32 DevKit V1, ESP32-DevKitC,
ESP32-C3-DevKitC-02, ESP32-S2-DevKitM-1, ESP32-C5-DevKitC-1,
ESP32-P4-Function-EV-Board, NUCLEO-H753ZI, Arduino Nano R4). The one board
with an "Unverified pinout" caution (Orange Pi Zero 2W) has it first, so it is
never folded, and it is not a planner board.

Left as is because it was a deliberate, recent layout choice: showing nine
cautions pushes the connector sheet well down a phone screen. Removing the
fold is a one-prop change plus a test if wanted.

### 4 to 8. Flagged, not fixed

- **`minimatch` advisory.** `npm audit` reports 8 moderate findings for the web
  app and 10 for `cli/`, all one advisory reached through
  `@typescript-eslint` in dev dependencies. `npm audit --omit=dev` reports 0.
  The only offered fix is `npm audit fix --force`, a breaking upgrade. CI fails
  on high and critical only, so it stays green.
- **Catalog size.** 196 boards. The home page is 707 KB of HTML (253 KB RSC
  payload) and the summary list is 227 KB of JSON; full records are 1.42 MB
  and stay out of it (`summarizeBoard` carries no pin map). `/api/pins` is
  1.17 MB (97 KB gzipped), 59% of the 2 MB limit the client enforces
  (`PinLookupAnswer.tsx:19`, held by `test/pin-lookup.test.ts:112`). At about
  6 KB a board that limit is reached near 330 boards. `docs/DESIGN.md:416`
  plans result virtualization "past ~200 boards".
- **Category disclosure.** `PinHubApp.tsx:732` sets `open` from the filter
  state. Choosing "All" inside the open panel removes the attribute and the
  panel closes under the pointer. Not reproduced in a browser here (see
  limits), so not changed.
- **Duplication.** `flagLabels` in `PinLookupAnswer.tsx:73` restates flag names
  that `pin-reference.ts` also words; the 2,000,000-byte limit is a literal in
  both the component and its test. `share-card.ts` imports role labels from a
  component folder. None is wrong today.
- **Background tabs.** `useCatalogUrlState.ts:76` restores the URL on the first
  animation frame. A tab opened in the background shows the default catalog
  until it is brought forward, then restores. Nothing is lost or overwritten.

## Checked and found sound

- **Pin maps.** Eight of the 49 added boards were compared pin by pin with
  files fetched for this audit: Adafruit Feather RP2350, KB2040, QT Py
  ESP32-S2, Feather ESP32 V2, Waveshare RP2350-Zero, Seeed XIAO RP2350, and
  Seeed XIAO nRF52840 Sense against CircuitPython `pins.c`; Seeed XIAO
  ESP32-C5 against arduino-esp32 `variants/XIAO_ESP32C5/pins_arduino.h`.
  Every GPIO number, the Feather RP2350's D12 = GPIO4
  and D13 = GPIO7, the ESP32 V2's input-only, strapping, JTAG, and ADC2 flags,
  and the C5's strapping pins on D2 and D3 matched. This is a sample, not a
  re-verification of all 49; the 11-01 review did the row-by-row pass.
- **Catalog invariants** (script over all 196 boards): no duplicate ids, no
  duplicate pin positions, every source link HTTPS, every board has an
  official source, `validateBoardSources` reports nothing, every board with a
  pin map has drawing geometry, no power or ground pin carries a function or
  counts as GPIO, no input-only pin lists an output function. Render tiers:
  18 dedicated, 98 family, 31 generic, 43 schematic, 6 unmapped.
- **5 V tolerance.** Discovery says "Yes" only for the ten boards whose logic
  level is 5 V, "Mixed" for the three that state partial tolerance, and never
  "Yes" where a record says not tolerant.
- **Planner.** One of each bus and analog peripheral plans on every planner
  board except the three Nucleos already pinned in a test (CAN shares the I2C
  pins). Adding one plain GPIO on top needs a twelfth pin that the XIAO SAMD21
  and QT Py ESP32-S2 do not have, and the planner says so.
- **Security.** Checked against the production server: Open Graph images
  return 200 only for catalog ids and 404 otherwise (`dynamicParams = false`,
  including an encoded path-traversal id); the board and pin routes return 400
  on a query and 405 on other methods; `/api/cron/prices` returns 503 with no
  secret configured and compares the bearer token with `timingSafeEqual`; CSP,
  `X-Frame-Options: DENY`, `nosniff`, HSTS, referrer and permissions policies
  are set. All 20 `target="_blank"` links carry `rel="noopener noreferrer"`.
  No `http://` URL in source. Both CSV exports pass every cell through
  `csvCell`.
- **Boundaries.** The generated pin index passes `parsePinIndex`; its largest
  values (41 signals on a pin, 160 pins on a board, 138-character note) sit
  inside the limits. Favorites and the personal library report a refused
  write instead of claiming it was saved.
- **Design rules** (measured in the browser at 800 px, both themes, on `/`,
  `/?q=pico+sda`, `/link`, `/compare`, `/compare?boards=…`, `/collections`):
  no control under 44 px, no horizontal overflow, no text under WCAG AA
  contrast once theme transitions settle.
- **Dependabot.** Patch-level bumps only; `next` did not move. The CLI change
  is lock-file only.
- **CLI drift.** `generate:boards` rewrote the three generated files with no
  content change (`git diff --ignore-cr-at-eol` is empty).
- **Docs.** `README.md` has no board counts to drift; its route table lists
  both Open Graph routes. The 10-31 and 11-01 totals (196 boards, 190 pin
  maps, 126 planner boards, 191 CLI records) still match the catalog.

## Earlier known limits, re-checked

| Source | Item | Status |
| --- | --- | --- |
| 10-31 additions | Planner capacity counts instances | Closed by finding 1 |
| 10-31 additions | H753ZI 8× UART exhausts the budget | The planner no longer offers eight; undecided for the chip |
| 10-31 additions | 64 mapped boards without auto-assign; link blocked on 12 (UART) and 9 (I2C) | Open, unchanged |
| 10-31 additions | Single-source maps | One board still carries "Unverified pinout" (Orange Pi Zero 2W) |
| 10-31 additions | No prices for the new boards | Open |
| 11-01 | `allPins` repeated; `rows.ts` casts flags; `plannerFields` cascade | Open, cleanup |
| 11-01 | Link shows `I2C_AOS0` and writes `I2C_AOM0` on Libre boards | Open |
| 11-01 | Bluetooth Pis mark UART0 default on GPIO14/15 | Open; the mux note says so |
| 11-04 | Shield-split headers drawn in catalog order | Open; captioned |
| 11-04 | 31 boards on the generic outline | Open; count confirmed |
| 11-04 | Board pads under 44 px at fit size | Open by design; zoom and list are touch-size |

## Verification

Run after the last code change, on the committed tree:

| Command | Result |
| --- | --- |
| `npm run lint` | exit 0 |
| `npm run typecheck` | exit 0 |
| `npm test` | 77 files, 1,756 tests passed (5 new) |
| `npm run build` | exit 0 (board-visual and source-link gate) |
| `npm --prefix cli run generate:boards` | exit 0, no content change |
| `npm --prefix cli run check:boards` | Verified 191 generated boards |
| `npm --prefix cli run lint` | exit 0 |
| `npm --prefix cli test` | 12 files, 139 tests passed |
| `npm --prefix cli run build` | exit 0 |
| `CI=1 npx playwright test --retries=0` | 132 passed against the production build |

Both new regressions were run before their fixes and failed for the stated
reason.

## Mobile gate

The planner's "max N" values are the only visible change, so the gate covered
the planner journey. The `mobile-mojo` subagent read its skill first and ran
the final production build (`next start`, no rebuild) in Chrome through the
repo's Playwright with phone emulation (touch, DPR 2), confirming
`window.innerWidth` and `innerHeight` on every run.

- Viewports: 360 × 800, 390 × 844, 412 × 915, and 844 × 390 landscape, each in
  dark and light, on Raspberry Pi Zero 2 W, Pi 4 Model B, NUCLEO-H753ZI, and
  Pico (control). All 32 combinations passed; nothing was blocked.
- Values read off the screen: Zero 2 W UART 1; Pi 4 I2C 5, SPI 4, UART 4;
  H753ZI UART 7; Pico unchanged (I2C 2, SPI 2, UART 2, PWM 8, ADC 3, GPIO 8).
- Journey: the + button disables exactly at the maximum and a forced tap
  changes nothing; each maximum alone reports "Plan ready" with matching table
  rows and dashed rings (Pi 4 SPI 4 = 16 pins, H753ZI UART 7 = 14 pins); −
  and "Clear auto-assign" return to zero; claiming a pad by hand never raised
  a maximum and releasing it restored them.
- Overflow: page `scrollWidth` equalled `innerWidth` throughout.
- Touch targets: steppers 44 × 44, Clear auto-assign, Change board, export
  buttons, Claim pin, header links, and pad hit areas all at least 44 × 44.
- Focus visible on the steppers in both themes. Section navigation and Back
  worked. No console or page errors; only aborted prefetches on navigation.
- Picking the H753ZI runs one main-thread task of about 220 to 290 ms (the
  failed 8× UART proof). It did not show as a hang, and later claims on that
  board registered no long task.

Not covered: the header theme toggle was not tapped (themes were set
directly), no physical phone, no virtual keyboard, and only these four
boards. On the Pi 4, 4× UART with 4× SPI together does not fit and the planner
says so; each maximum is a promise for that peripheral alone, as before.

## Limits of this audit

- The in-app browser pane was hidden for the session, which pauses
  `requestAnimationFrame`. The catalog restores its URL state on that frame,
  so query-driven catalog pages could not be driven by URL there. Lookup
  behavior was read from the rendered page after a manual state restore, and
  the Playwright suite (a visible browser) covers those flows.
- Desktop browser checks ran at the pane's 800 px width, not a wide desktop
  layout.
- 41 of the 49 added pin maps were not re-compared with upstream files here.
- No physical hardware was tested.
