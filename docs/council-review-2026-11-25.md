# Council review, 2026-11-25: the P2 findings

This branch (`fix/council-p2`, from `main` at `b786c8d`) fixes the P2 findings
of the [2026-11-24 council review](council-review-2026-11-24.md). Each fix has
a regression test that fails without it. The P3 list there is unchanged.

## Findings and changes

### 1. Light theme: hover states at rest, red text

`[class*="bg-white/"]`-style selectors also matched `hover:bg-white/…`, so
hover fills and borders were painted at rest (the catalog star among them).
They also beat Tailwind's layered hover rules, so hover never changed anything.
Several pale reds had no light ink.

- `src/app/globals.css` now names every alpha-suffixed and state-variant
  colour class exactly. Each `hover:` rule is gated on `:hover` inside
  `@media (hover: hover)`, `group-hover:` on `.group:hover`, and `focus:`,
  `focus-visible:` and `disabled:` on their pseudo-classes. Every
  `[class*=…]` colour selector is gone.
- Red text, borders and fills get dark-red inks: `text-red-300` `#b91c1c`
  (about 6.5:1 on white), `text-red-100` and `hover:text-red-200` `#991b1b`.
- Three omissions came to light while doing this:
  - `border-amber-300/30` never matched `[class*="border-amber-300/25"]`;
  - `divide-white/10` had no rule;
  - `text-orange-300`, `text-emerald-300` and `text-cyan-300` had no light
    ink. The mobile gate measured the pin-lookup notes at 1.44:1.

Tests:

- `test/global-css.test.ts` checks the stylesheet rules.
- `e2e/council-p2.spec.ts` checks the star's computed colours at rest and on
  hover.

### 2. Light-theme test coverage

`test/global-css.test.ts` scans `src/**/*.tsx` and fails for any class in
these groups that has no state-gated light rule:

- alpha-suffixed colour classes in any variant, including arbitrary alphas
  such as `/[0.03]`. There are over 50 today.
- red text classes.
- `hover:` and `group-hover:` pale text classes.
- plain pale and mid-tone text classes (shades 50–300).

It also fails on any substring colour selector, or a `hover:` rule that is
not gated on `:hover`. Without the fix, three of its cases fail.

### 3. Error boundaries

Next 16.4 documents `retry()`, which re-fetches and re-renders the segment.
`reset()` only re-renders. Both boundaries now call `retry()`.

`global-error.tsx` replaces the root layout, so globals.css, the fonts and the
theme script never reach it. Next's own docs say so. It now carries its own
small stylesheet:

- the same tokens in both themes;
- `prefers-color-scheme` before hydration;
- a 44 px action with a visible focus ring.

It applies the stored theme with `useLayoutEffect`, through the new
`src/lib/theme.ts`, which `ThemeToggle` now shares.

Tests: `test/error-boundaries.test.tsx` and `test/global-error.test.tsx`.

### 4. Price cron (`/api/cron/prices`)

- **HEAD.** Next answers HEAD by running GET when no HEAD handler exists, so
  an authenticated HEAD dispatched a run. `HEAD` is now exported as a 405.
- **OPTIONS.** Next's automatic OPTIONS listed POST, PUT, PATCH and DELETE,
  which all return 405. The route now exports its own OPTIONS. Every 405 and
  the OPTIONS response say `Allow: GET, OPTIONS`.
- **Atomic cooldown.** The trigger checked GitHub's run list and then
  dispatched. GitHub's list lags a fresh dispatch, so two scheduler calls
  landing together both dispatched. `src/lib/server/dispatch-lease.ts` adds
  a lease, claimed just before dispatching:
  - The lease is a compare-and-swap on a small Blob object: `ifMatch` on its
    ETag, or `allowOverwrite: false` when it does not exist yet.
  - Exactly one concurrent caller wins per 40-minute window.
  - Only a definite refusal (any 4xx but 408) releases the lease. A 5xx,
    a 408, a throw or a timeout keeps it, because GitHub may have queued the
    run before the gateway gave up (council round 1).
  - The trigger fails closed (503) if the lease store errors or Blob is not
    configured.

Tests:

- `test/price-dispatch.test.ts`: three concurrent calls make one dispatch,
  plus the interval, release and fail-closed cases and the route methods.
- `test/dispatch-lease.test.ts`: a fake Blob with real CAS semantics.
- `e2e/council-p2.spec.ts`: HEAD and OPTIONS through Next's router.

### 5. Price snapshot `generatedAt`

The API merged a stored snapshot onto curated listings but kept the stored
`generatedAt`. A deploy that re-checks a curated listing after the last
publish leaves a `checkedAt` later than `generatedAt`, and the browser's
`parsePriceSnapshot` then rejected the whole response.

The new `mergePriceSnapshot` advances `generatedAt` to the latest
observation, and never moves it backwards.

Tests: `test/price-store.test.ts`.

### 6. Pin lookup fetch and board-detail loader

`src/lib/bounded-read.ts` reads a response body in chunks and cancels the
stream as soon as it passes the limit. It also refuses an oversized declared
`Content-Length` before reading. The price reader now uses it too.

- **Pin index** (`src/lib/pin-index-client.ts`). It is about 1.2 MB, capped
  at 2 MB, with a 20 s `AbortSignal.timeout` that covers the body. A failure
  clears the cache, so "Try again" refetches.
- **Board detail.** The largest record is about 26 KB. The loader now caps it
  at 256 KB while streaming.

Tests: `test/bounded-read.test.ts`, using an endless stream.

### 7. Board defaults

- **Raspberry Pi primary UART: fixed, because the record backs it.** The
  "Primary UART" table in Raspberry Pi's serial documentation, already a
  source of these records (`interfaces.adoc` @ `34dfb87309ab`), says:
  - for the "Zero W and Zero 2 W" and the "Raspberry Pi 3 and 4", the
    primary UART is `UART1`, and `UART0` is the secondary UART used for
    Bluetooth;
  - with the mini UART primary, `enable_uart` defaults to 0.

  GPIO14 and GPIO15 now default to UART1 on the Zero W, Zero 2 W, 3A+, 3B,
  3B+, 4B and 400. The mux note says to set `enable_uart=1`. The Pi 400 is a
  BCM2711 Pi 4 with Bluetooth and follows the "Raspberry Pi 4" row. That is
  the one judgement call here.

  The Zero, 1 and 2 keep UART0. The Pi 5 is unchanged: on RP1, Bluetooth has
  a dedicated UART.
- **Lookup badge.** The pin index's `defaultSignals` now include the bus
  instance. Before, a query for UART0 on a Pi 4 could not be told apart from
  UART1.
- **Libre Computer `I2C_AO_M0` and `I2C_AO_S0`: caveat only.** The record
  (libretech-wiring-tool `gpio.map`) lists both names on GPIOAO_2 and
  GPIOAO_3 and says nothing about what each controller supports. Saying that
  "S" is a target-only block would be an inference. The pins on Alta and
  Solitude now carry a note: they are two separate controllers, not two names
  for one bus, and the reader should check the overlay and SoC documentation.

- **Lookup wording (council round 1).** The signal line now marks the
  recorded default and lists it first. A Pi 4's GPIO14 used to read
  "UART0 TX · UART1 TX" under the "Recorded default" badge; it now reads
  "UART1 TX (default) · UART0 TX".

Tests: `test/board-defaults.test.ts`.

### 8. ESP32 input-only pins in Code check

- **`gpio_config`.** `pin_bit_mask` bits were always read as plain
  "Digital I/O". The scan now replays the source in order:
  - a `gpio_config_t name = {...}` declaration resets the struct;
  - `name.field =` and `name->field =` update it;
  - each `gpio_config(&name)` applies the mask and the mode the struct holds
    at that call.

  This handles a mode in the initializer with the mask assigned later, a
  struct reused for another pin, and the same name in two functions (council
  round 1). A mask that is never applied falls back to its struct's final
  state, or to its own compound-literal initializer. `GPIO_MODE_OUTPUT`,
  `GPIO_MODE_INPUT_OUTPUT` and the `_OD` modes count as output.
- **1-Wire and DHT.** These data lines are now `hostDriven`: the board pulls
  them low as part of the protocol (1-Wire reset and write slots, the DHT
  start signal). On an input-only pin they get the "Input-only pin" finding.

Tests: `test/code-check-regressions.test.ts` covers:

- both struct forms, the mixed form, reuse, the same name in two functions,
  and a compound literal;
- input mode still clearing;
- `OneWire(Pin(34))`, Arduino `OneWire ds(34)` and `dht.DHT22(Pin(34))`.

### 9. CLI lookup positions and parity

The lookup printed the website's whole-board numbering, while `ph uno` numbers
each header from 1. `ph uno sda` said "Pin 18 … (Analog / Power)", and D13 and
A0 both said "Pin 14".

`cli/src/lookup-location.ts` maps every lookup hit to a pin in the diagram
`ph <board>` draws:

- by number and name;
- for the UNO, from an explicit `lookupLocations` table;
- where two rows share a number, by the index group or key side.

Lookups print that header and number (`Pin 5 A4 / SDA … (Analog input
header)`). `--json` adds `diagram: { header, pin }`.

Parity tests in `cli/test/pin-lookup.test.ts`:

- all five hand-written boards, in both directions where the diagram has one
  main header;
- every one of the 7,075 indexed pins on the 190 indexed boards resolves to a
  same-named diagram pin.

The CLI was regenerated (`generate:boards`), and `check:boards`, lint, test
(151) and build all pass.

Pico (no change needed): the council's Pico concern did not reproduce. Every
Pico and Pico W pin already matched by number. The only gap is that the SWD
header is in the diagram but not in the website index. That is listed under
known limits.

### 10. Probe colour

The I2C role `edge` was `#22d3ee`, the probe's colour. I2C is now blue:

| Step | Colour |
|---|---|
| ink | `#c7d7fe` |
| edge | `#8aa8fb` |
| fill | `#2c4188` |
| wash | `#151e37` |

That is OKLCH hue 268° at the palette's lightness, 35° from UART and 26°
from ADC. The board-link I2C wire, defined as role ink, follows: dark
`#c7d7fe`, light `#2f47a3`.

Interface chips are tags, not pins, and are unchanged; blue there is already
USB's.

DESIGN.md §16 is updated.

Tests: `test/role-colors.test.ts` checks that no role step equals the probe
and that the I2C hue is more than 40° from it.

### 11. Duplicated pickers

Check, Link and the planner each carried their own copy of:

- the search ranking;
- the combobox keys and ARIA wiring;
- a ticketed detail loader;
- the rAF and `popstate` URL sync.

These are now three shared hooks in `src/components/catalog/`:

- `useBoardCombobox`: `rankBoards`, keys that skip boards that can't be
  picked, Enter, Escape, input and option props;
- `useBoardDetail` and `useBoardDetails`: a newer request always wins, with
  retry;
- `useLocationSync` and `pushSearchParam`.

Markup and styling stay per page. One behaviour change: Link's arrow keys now
skip "No pin map" boards, as the planner's already did.

Tests:

- `test/board-picker-hooks.test.tsx` covers the hooks' behaviour.
- A source guard fails if a page reintroduces its own combobox, `popstate`
  listener or ticket.

### 12. /find

- **Payload.** Every fit was server-rendered, the folded ones inside a closed
  `<details>`. That was about 320 KB of markup for `plan=i2c1` on each
  counter step. Fits now render one page of 24. "Show 24 more of N boards
  that fit" is a URL step (`show=48`, in multiples of 24, at most 480). Any
  change to the requirements starts again from page 1.
- **Focus.**
  - A client `FindMoreLink` moves focus to the first newly shown board.
  - An example and "Start over" both remove their own button. Focus now
    moves to the "What does your project need?" heading, so it no longer
    falls to `<body>`.

Tests: `test/find-page.test.tsx`, plus `e2e/council-p2.spec.ts` for focus and
paging.

### 13. Category facet

The catalog's category `<details>` used `open={category.length > 0 ||
undefined}`. Clearing the filter from its own "All" button collapsed the panel
under the reader's focus.

It is now reader-controlled. It opens when a category becomes active, for
example from a URL, and never closes by itself.

On phones (council round 1), any facet choice also closed the whole filter
panel and dropped focus on `<body>`:

- Clearing a facet ("All") now keeps the panel open.
- A choice that closes the panel returns focus to the Filters toggle.

Tests: `test/pinhub-app.test.tsx` and `e2e/council-p2.spec.ts`.

### 14. Inspector `inert`

The inspector dialog made only `<main>` inert, so the header and footer stayed
reachable. `inertOutside` (`src/components/board-visual/inert-outside.ts`) now
makes every body child outside the dialog's portal inert, and restores each
element's previous value.

Tests: `test/inspector-inert.test.tsx`, plus a 30-Tab walk in
`e2e/council-p2.spec.ts`.

## Verification

| Check | Result |
|---|---|
| Baseline before edits | lint, typecheck, 99 files / 2,533 tests: all green |
| `npm run lint`, `npm run typecheck` | pass |
| `npm test` | 107 files, 2,611 tests pass |
| `npm run build` | pass (board-visual and source-link gate included) |
| `CI=1 npx playwright test --retries=0` | 183 passed (round-1 run); the 7 tests in `e2e/council-p2.spec.ts`, including the round-1 phone-facet test, pass |
| CLI, after `npm --prefix cli run generate:boards` | `check:boards`, lint, 12 files / 151 tests, build: all pass |

Each new regression test was run against the pre-fix code, by stashing the
fix, and failed.

### Mobile gate (mobile-mojo)

Chrome with touch and mobile emulation, against the production build, at
360×800, 390×844, 412×915 and 844×390, in both themes.

Results:

- Every affected journey passed: the light-theme star and pages, I2C blue on
  the Pico and Pi 5 maps, the `/link` I2C wire, the three pickers, `/find`
  paging and focus, the category facet, and the inspector's fit, `inert` and
  focus return.
- There was no horizontal overflow, and no console or page errors.

Defect found and fixed:

- In light theme, the pin-lookup note (`text-orange-300`) measured 1.44:1.
  Light inks were added for `text-orange-300`, `text-emerald-300` and
  `text-cyan-300`, and the coverage test was widened.
- The recheck on the rebuilt production build measured the note at 6.18:1
  in light theme (11.16:1 dark) at all four viewports.
- A light-theme sweep of every visible text node found nothing under AA:
  - `/`, `/prices`, `/find?plan=i2c1` and `/check?board=raspberry-pi-pico`
    at 390×844 found 0;
  - the board detail panel flagged 3 false positives, toolbar text on the
    dark board canvas.
- The `/find` and inspector smoke checks passed again.

## Known limits

- The error boundaries could not be triggered in the browser gate. They are
  covered by unit tests only.
- On a touch device, the red hover inks cannot be seen, so the gate did not
  exercise them.
- `pi 4 uart1` does not start a pin lookup: `isPinLikeQuery` recognises a
  role (`uart`) but not an instance (`uart1`). The UART1 default shows on
  `pi 4 uart`, and is asserted in the data tests.
- On `/link` and `/planner`, "Change" does not move focus to the search box.
  `/check` does. This predates this branch and is not fixed here.
- The Pico's SWD header is in the CLI diagram but not in the website pin
  index, so `ph pico swclk` finds nothing.
- `/find` still renders every "Doesn't fit" row. That is about 30 KB at
  worst, against about 300 KB for the fits before this change.
- The blob lease adds one Blob read and one Blob write per dispatch that gets
  past GitHub's checks. Without Blob credentials, the trigger now refuses
  (503) rather than dispatching without a cross-instance cooldown.

## Council rounds

The seats were:

- Claude Opus 5.5, medium: the coordinator, holding the Claude seat as the
  user asked;
- GPT-6.2 Sol, high: primary;
- Gemini 4 Hydrogen, high: advisory.

### Round 1 (snapshot `48f0af33`)

| Seat | Overall | Correctness | UI/UX | A11y & responsive | Tests | Maintainability | Verdict |
|---|---|---|---|---|---|---|---|
| Claude | 8 | 8 | 9 | 8 | 9 | 9 | changes requested |
| GPT | 7 | 7 | 8 | 8 | 8 | 8 | changes requested |
| Gemini | 9 | 9 | 9 | 9 | 10 | 9 | pass |

On items 1–14:

- Gemini agreed with all 14.
- GPT agreed with 10 and disagreed with 4, 7, 8 and 13.

The coordinator reproduced every point GPT raised and accepted each as
confirmed (P2):

1. **Item 8.** A mode set in the initializer with the mask assigned later
   was cleared, and a reused struct falsely flagged an IO34 input. Gemini's
   P3 (the same name in two functions) is the same root cause. Fixed by
   replaying the struct state at each call.
2. **Item 4.** A 504 released the lease, so a second call could dispatch
   again. Now only a definite refusal releases it.
3. **Item 7.** The lookup listed "UART0 TX · UART1 TX" under the default
   badge. The default is now marked and listed first.
4. **Item 13.** On phones, clearing the category hid the filter panel and
   lost focus. Fixed as described under item 13.

P3s, also fixed:

- The CSS guard missed the `border-t-…/NN` and `bg-[#hex]/NN` forms; a
  matcher test now pins every form.
- DESIGN.md (I2C colour, the light-theme rule, the finder "disclosure",
  example focus) and the comment in `roles.ts` were stale.

Every fix has a regression test that failed without it. Re-verified with
lint, typecheck, 2,611 unit tests, build, 183 Playwright tests plus the new
phone test, and the CLI checks.

### Round 2 (single-reviewer close-out)

At the user's request, the three-seat council was not re-run. The
coordinator re-reviewed the round-1 fixes alone: the `gpio_config` replay
(scope, reuse, compound literals), the lease release rule, the lookup's
default marking and the `defaultSignals` instance, the category facet and
filter-toggle focus, and the bounded readers. No correctness issues were
found. One nit was fixed: the doc comment for `matchedPinSignals` had been
left above the new `isDefaultSignal` helper.

Re-verified after that change with lint, typecheck, 2,611 unit tests, the
production build, and `check:boards`. The change is comment-only, so the
Playwright suite and the mobile gate from round 1 were not re-run.
