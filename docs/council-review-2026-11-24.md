# Council review, 2026-11-24

A whole-codebase council review of `main` at `f8bccdd`. Three seats reviewed
the codebase independently, then cross-checked each other's findings against
the code:

- Claude Opus 5.5, medium effort (primary)
- GPT-6.2 Sol, high effort (primary)
- Gemini 4 Hydrogen, high effort (advisory)

No aspect scored 9/10 or higher from every seat. Overall scores after the
cross-check were Claude 6, GPT 6, and Gemini 7. This branch fixes the three
P1 findings. The remaining findings are listed below and are not fixed.

## Fixed on this branch

### 1. Link put both I2C signals on one pad (P1)

`linkPorts` called a port complete as soon as each signal had any candidate
pin, and `end` took each signal's first candidate on its own. On the
STM32 Nucleo-H503RB, PB3 (D3) lists both `I2C2.SDA` and `I2C2.SCL`. Choosing
I2C2 against a Pico therefore produced a "ready" plan with SDA and SCL both on
D3, tying the Pico's two lines together.

The fix is in `src/lib/board-link.ts`:

- A complete port now needs a pair of distinct pads, chosen jointly by the
  lowest combined rank.
- The pad is the chip pin (`mcu.name`) when the record states one.
- A port named only on one shared pad is incomplete (`sharedPad`), and the
  link is blocked with a message that says why.
- Alternatives exclude the pad the other wire uses.

Tests in `test/board-link.test.ts`:

- an H503RB regression;
- a synthetic one-pad bus;
- a catalog-wide invariant that every complete UART and I2C port wires to
  distinct pads with no shared alternative.

### 2. Code check misread RPi.GPIO numbering through an import alias (P1)

The BOARD check matched only the literal `GPIO.setmode(GPIO.BOARD)`. With
`import RPi.GPIO as IO`, a physical pin 6 (GND) was read as BCM GPIO6 and
cleared. A script that switched between BCM and BOARD was read entirely as
BOARD, and `GPIO.setmode(mode)` was read as BCM.

`rpiNumberingMode` in `src/lib/code-check/scan.ts` now resolves import
aliases on both the receiver and the argument of every `setmode` call:

- One scheme across the script settles the numbering.
- Mixed schemes, or a mode PinHub cannot read, leave every RPi.GPIO number
  unfollowed rather than guessed, because call order inside functions is not
  source order.
- A script with no `setmode` keeps the BCM reading.

Tests in `test/code-check.test.ts`.

### 3. The /privacy disclaimer was unreadable in the light theme (P1)

The "reference only, no warranty" card uses `text-orange-50/80`. The light
theme turns the card cream (`#fff7ed`) but covered only `text-orange-50/70`,
so the text sat at roughly 1:1 contrast.

`[class*="text-orange-50/"]` now joins the alpha-suffixed orange override in
`src/app/globals.css`. Tests:

- `test/global-css.test.ts` asserts that every alpha-suffixed pale orange
  text class used in `src/**/*.tsx` has a light-theme rule.
- `e2e/ui-regressions.spec.ts` checks the rendered colour,
  `rgb(154, 52, 18)`.

## Verification

- `npm run lint`: clean.
- `npm run typecheck`: clean.
- `npm test`: 99 files and 2,533 tests pass, including the 6 new tests.
  Each new test failed before its fix.
- `npm run build`: passes.
- `CI=1 npx playwright test --retries=0`: 176 of 176 pass. The new privacy
  test also passes.
- Mobile gate (mobile-mojo, production build) passed at 360×800, 390×844,
  412×915, and 844×390, in both themes:
  - `/privacy` light text measured `rgb(154, 52, 18)` on `rgb(255, 247, 237)`.
  - On `/link?a=stm32-nucleo-h503rb&b=raspberry-pi-pico&bus=i2c&pa=I2C2`, SDA
    runs D3↔GP4 and SCL runs D4↔GP5.
  - The `/check` aliased BOARD sample flags pin 6 GND.
  - No overflow and no console errors.
- The CLI was not regenerated. The change touches neither `boards.ts`,
  `pin-match.ts`, nor the pin index.

## Open findings (not fixed here)

### P2

- **Light theme.** Hover fills and borders show at rest: `[class*="bg-white/"]`
  and `[class*="border-white/"]` also match `hover:` utilities, across 15
  sites, including the catalog star. Red error and hover text has no
  light-theme override.
- **Missing light-theme test.** Nothing checks colour classes beyond orange.
- **Error boundaries.** Both call `reset` instead of `retry()`.
  `global-error.tsx` has no styles or theme.
- **Price cron.** `/api/cron/prices` lets an authenticated `HEAD` dispatch,
  and the automatic `OPTIONS` lists methods that return 405. The cooldown is
  not atomic.
- **Price snapshot.** A merged snapshot can carry a price observed after its
  own `generatedAt`, so the client rejects it.
- **Pin lookup fetch.** It has no timeout and is size-checked only after
  buffering, and the board-detail loader has no byte cap.
- **Board defaults.** Raspberry Pis with Bluetooth default to UART0. Libre
  Computer `I2C_AOM0` and `I2C_AOS0` appear interchangeable. Both are known
  limits since the 2026-11-01 audit.
- **ESP32 input-only pins.** Code check clears output use of IO34 through
  `gpio_config` bit masks, and `OneWire(Pin(34))`.
- **CLI.** Lookup positions disagree with the CLI's own UNO and Pico diagrams,
  and nothing tests parity for the five hand-written boards.
- **Probe colour.** The I2C role edge is the probe cyan `#22d3ee`.
- **Duplicated pickers.** The board picker, URL sync, and loader state are
  duplicated across Check, Link, and Planner.
- **/find.** It renders every folded result, about 335 KB of RSC per step. It
  also loses focus after an example or Start over.
- **Category facet.** The facet collapses when its filter is cleared.
- **Inspector.** The inspector dialog leaves the header and footer outside
  `inert`.

### P3

- **Touch targets.** These are under 44 px:
  - the `/prices` catalog link;
  - the `/collections` "Browse boards" link;
  - the shelf board links;
  - the detail retry button.
- **Reduced motion.** The `loading.tsx` spinner ignores reduced motion.
- **/prices.** The `#price-notes` link lands on a closed disclosure, and the
  stock column lacks `PriceStockStatus`.
- **/compare.** It uses native `<select>` filters in the rail.
- **Privacy page.** Its storage list is incomplete, and `/privacy` is missing
  from `sitemap.ts` and the README route table.
- **Social metadata.** Tool pages inherit the homepage Open Graph URL and
  Twitter title.
- **Repo and CI.**
  - `next-env.d.ts` is tracked.
  - `vercel.json` is not in the Web CI path filters.
  - The hourly price job runs the full build.
  - CLAUDE.md's note on CLI CI is stale.
- **Maintainability.** `PinHubApp` and `boards.ts` are oversized.
- **Code check.** `from RPi import GPIO` is not detected as RPi Python.
- **Browser coverage.** Playwright covers Chromium only.

### Overruled

These were judged not to be defects:

- **Pin-role colours.** Orange for system and red for power are documented
  as pin-role hues.
- **Inspector focus trap.** It does not let Tab escape.
- **CLI.** Its generated files, role mapping, and toolchain versions are
  deliberate.
- **robots.txt.** `/api/` is a published API.
- **Preferences.** Small text and a docs index were matters of preference.
