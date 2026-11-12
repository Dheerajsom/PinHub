# Code audit — 2026-11-11

Review and fix pass over branch `feature/code-pin-check` before it ships. The
fixes are uncommitted on that branch.

## Reviewed range

`3033eb1..2e9cdc1` (base `origin/main` at the PR #55 merge): two commits, 26
files, about 3,950 added lines.

| Commit | What it brought |
| --- | --- |
| `2ac4d63` | Price 31 boards instead of 11 (20 new curated listings) |
| `2e9cdc1` | Pin check (`/check`): paste code, pick a board, check its pin references |

The pass covered `src/lib/code-check/`, `src/components/check/`,
`src/app/check/page.tsx`, the `ChoiceMenu` extraction in `SortMenu.tsx`, the
pin-check CSS in `src/app/globals.css`, the price data and its tests,
`e2e/pin-check.spec.ts`, `README.md`, `docs/DESIGN.md` §20 and
`docs/pin-check-2026-11-10.md`.

## Baseline (before any edit in this pass)

`npm run lint` and `npm run typecheck` clean; `npm test` 89 files, 1,955
tests passing.

## Findings fixed — library (`src/lib/code-check/`)

Each item has a regression in `test/code-check-regressions.test.ts`,
`test/code-check-perf.test.ts` or `test/code-check-report-text.test.ts`.
Those three files were run against the scanner, checker and report writer of
`2e9cdc1`: 46 of the 63 regression and report cases and three of the four
list-constant cases failed there (the fourth, the self-referential list, took
53.8 s), for the reasons below.

- **Wrong-pin matches for bare Arduino numbers.** On Nordic boards an nRF port
  index was used as the Arduino number (`pinMode(2, …)` on a Nano 33 BLE matched
  `A5 / SCL` and `A0` instead of D2 and D4). Bare numbers on STM32 Nucleo
  records and on an UNO went unmatched or were guessed. Numbering now follows
  the record: recorded Arduino numbers, else `D<n>`/`A<n>` labels; GPIO
  numbering is assumed only on ESP32-family and RP2040/RP2350 boards, with a
  second-numbering note on the 15 whose labels carry other D-numbers.
- **Variables followed as constants.** Loop counters, parameters and
  reassigned variables (C and Python) resolved to their first value.
- **Overstated findings.** The flash/PSRAM finding said a pin "can crash the
  board" and was a Fix; it is now "Flash or PSRAM pin", a Check, worded as what
  the record lists. Other findings that stated consequences the record does
  not (upload trouble, serial monitor, bit-banging) were reworded the same
  way; renamed titles: "Shared with USB or serial", "ADC2 read with Wi-Fi on",
  "ADC2 pin and Wi-Fi". A header pin the record marks `reserved` for the
  module's flash (DevKitC CLK) is still a Fix through its reserved role.
- **Exponential blow-up and a bypassed cap on list constants.** A
  self-referential 100-entry list took 53.8 s on the old scanner and under
  1 ms now; a 5,000-entry list produced 5,000 references past the 400 cap.
- **Quadratic regexes.** On ten 100,000-character pathological inputs the old
  scanner took 0.5–9.2 s each; the new one takes 14 ms or less on each
  (measured side by side on this machine).
- **Scanner details.** A sketch's own `#define LED_BUILTIN` was ignored;
  MicroPython buses opened by id with other arguments (`I2C(0, freq=…)`) were
  dropped; `GPIO.setmode(GPIO.BOARD)` leaked physical numbering onto gpiozero
  and lgpio.
- **Masking gaps.** C++14 digit separators, raw strings, backslash-continued
  `//` comments, CR-only line endings and `#if 0` blocks.
- **Literal and constant edge cases.** Octal literals, `#undef`, multiple
  declarators, MicroPython `const()`, four-argument `Wire.begin`, import
  aliases, tuples, `#ifdef` alternatives, comma expressions.
- **Uncapped not-followed list.** Now at most 100 listed, the rest counted in
  `unfollowedDropped`.
- **Copied Markdown.** It left out the bare-number note and never said a
  paste was cut; `reportMarkdown` now takes `{ truncated }`.
- **Price coverage test.** It asserted at least 25 priced boards where the
  write-up states 31; it now asserts exactly 31, read from the listing file.

## Findings fixed — UI (`src/components/check/`)

- **False all-clear.** `pinMode(99, OUTPUT)` on an UNO read "All 0 pins match
  the record" in green. The verdict (`verdict.ts`) now reads clear only when
  every reference matched a clear pin and the whole input was checked;
  unmatched and not-followed references keep it at "check" and appear in the
  tally.
- **Silent truncation.** The textarea's `maxLength` dropped the tail of a long
  paste, so the "first 100,000 characters" notice could never show. The paste
  is now cut by the app, with a visible status notice.
- **Silent reference cap.** Past 400 references the scanner stopped recording
  (not-followed values included) and nothing said so: 400
  `digitalWrite(13, HIGH);` lines followed by `pinMode(34, OUTPUT);` on the
  ESP32-DevKitC read "The pin matches the record", with the input-only IO34
  never checked. `scanCode` now sets `refsCapped` (carried to
  `CheckReport.refsCapped`) when the cap cost a reference or not-followed
  value it would otherwise have recorded; exactly 400 references with nothing
  after them leave it false. The cap itself (exported as `maxRefs`) is
  unchanged. While it is set the verdict reads "Only part of the code was
  checked" unless a fix or check headline outranks it (the same rule as a
  cut paste), a status notice under the editor reads "Only the first 400 pin
  references were checked. The rest of the code was not.", the persistent
  status region announces the partial verdict, and the copied Markdown carries
  the notice line. Regressions in `test/code-check-regressions.test.ts`,
  `check-ui-verdict.test.ts`, `check-ui-report.test.tsx`,
  `check-ui-app.test.tsx`, `code-check-report-text.test.ts` and
  `e2e/pin-check.spec.ts`; the Vitest cases failed with the flag forced off.
- **Draft bounds.** Writing bounded the code length but reading bounded the
  stored JSON at that length plus 256, so a long draft whose JSON escaping grew
  past that was written and then refused on reload. Both now bound the code length; the
  draft holds code and language only.
- **Editing.** Tab replaced a selection and broke undo; mirror and gutter
  line heights drifted from the textarea on hinted lines; marks blanked on
  every keystroke and every keystroke wrote storage (now debounced, flushed on
  `pagehide`).
- **Rendering.** Duplicate React keys; the language menu was clipped by its
  panel; status told by colour alone (each status now has a shape and glyph);
  unreliable live regions (now one persistent status region that follows the
  deferred scan).
- **Feedback and focus.** Focus fell to the page after picking or changing a
  board; no feedback for a record that failed to load, an unsupported
  `?board=` id, or the planner's claim cap.
- **Smaller.** A stale hover key across boards, an uncleared copy timer, and
  no horizontal reveal of a selected reference.
- **Tests.** Vacuous e2e assertions were tightened; pin-check assertions are
  scoped to the report region, where the editor's hints carry the same words.

## Integration changes in this pass

- `CheckApp.tsx`: Copy report passes the cut flag, so the Markdown states that
  only the first 100,000 characters were checked
  (`test/check-ui-app.test.tsx`).
- `CheckReport.tsx` shows "and N more not listed" under the not-followed list;
  `verdict.ts` counts `unfollowedDropped` in the headline and tally
  (`test/check-ui-report.test.tsx`, `test/check-ui-verdict.test.ts`).
- Copy for unmatched references: "Not matched to this board's record"
  (aside), "N references not matched to this board's record" (headline),
  "N not matched" (tally), "· not matched to the record" (editor hint). The
  old "not on this board" wording claimed an absence the record does not
  state.
- `test/check-ui-examples.test.tsx` (new): each built-in example, rendered on
  its board, must agree with the library's report in headline, tone, tally,
  strip order and editor hints, and must show the finding its teaser names.
  Two teasers were reworded to the findings' own wording ("an ADC2 read with
  Wi-Fi on", "a pin with no PWM recorded").
- `test/code-check.test.ts`: the flash case accepted either outcome; it now
  states that GPIO6 on the DevKitC is a Fix through its reserved role.
- `README.md`, `docs/pin-check-2026-11-10.md`, `docs/DESIGN.md` §20: no longer
  claim the check covers "every pin it uses"; numbering, constants, limits and
  findings match the code.

## Checked and found sound

- `?board=` goes through `boardFromSearch`, which accepts only `isBoardId`
  shapes; an unknown well-formed id gets a notice and is dropped from the URL.
- No full pin maps in the client bundle: the page passes `summarizeBoard`
  summaries; the record loads on demand through the board detail loader with a
  ticket guard against out-of-order responses. None of the check's client
  modules imports `@/lib/boards` as a value.
- New colours have light-theme counterparts; no `backdrop-blur` in the
  pin-check CSS.
- Prices: 31 listings for 31 distinct catalog boards, one primary each, all
  HTTPS, USD integer amounts, valid `checkedAt` dates from 2026-09-07 to
  2026-11-10 22:07 UTC, none in the future.

## Flagged, not fixed

- **Duplication.** The board-search combobox and the `pushState`/`popstate`
  board URL sync now exist a third time (`PlannerBoardPicker`, `LinkBoardSlot`,
  `PlannerApp`, `LinkApp`, and `CheckApp`); not extracted into shared hooks.
- **Reference cap.** References past the 400th are still not read (the cap
  now has a notice and a partial verdict; see the UI findings). Repeated
  references to one pin on different lines each count toward the cap.
- **Editor cost.** The editor is not virtualised. In headless Chrome on this
  machine a 6,000-line paste ran one 120–140 ms main-thread task, a keystroke
  at the end stayed under the 50 ms long-task threshold, and a 100,000-character
  paste took 330–420 ms from paste to verdict. Scanning runs on the main thread
  (no Worker), bounded by the linear-time passes and the perf tests.
- **Hints past long lines.** A hint after a line that nearly fills the editor
  sits beyond the textarea's horizontal scroll range and is clipped (the
  textarea scrolls only as far as its own text). Padding the layers did not
  extend that range in Chrome. The unmatched hint is now 8 characters longer.
- **Draft before the first frame.** An edit made before the page's first
  animation frame after load (when the draft is restored) is not saved until
  the next edit. Reachable by automation, not plausibly by hand.
- **Test gaps.** The mirror-alignment Playwright test was not shown to fail
  against the old CSS; the horizontal reveal of a selected reference has no
  test.
- **PWM and Servo on one pin.** The duplicate-finding report did not reproduce
  in the library, which already deduplicated it; the React key was hardened
  anyway.

## Verification

Run after the last change:

| Command | Result |
| --- | --- |
| `npm run lint` | exit 0, no warnings |
| `npm run typecheck` | exit 0 |
| `npm test` | 90 files, 1,980 tests passed |
| `npm run build` | exit 0 (board-visual and source-link gate) |
| `CI=1 npx playwright test --retries=0` | 147 passed, 0 failed, 0 skipped, 0 flaky, against `next start` |

The reference-cap fix's first full Playwright run had 146 of 147 pass: the
unchanged `mobile-workflows.spec.ts` "explains a full favorites store on both
catalog surfaces" failed once, then passed three of three in isolation and in
the full rerun recorded above.

`src/lib/boards.ts`, `src/lib/pin-match.ts` and `src/lib/server/pin-index.ts`
are unchanged on the branch and in the working tree, so the CLI catalog was
not regenerated.

Desktop look at 1,440 px in Chrome against the production build, dark and
light: each built-in example on its board, a sketch with every status (fix,
check, clear, not matched, not followed), the language menu, 120 not-followed
values ("and 20 more not listed"), and a 100,000-character cut. Headlines,
tallies, hints and copied Markdown matched the report in both themes; no
horizontal page overflow and no console errors.

## Mobile gate

Not run for this change. The owner waived it explicitly for this round, so
phone-viewport behaviour of the new UI is unverified beyond the Playwright
phone specs (360 px fit with 44 px controls, sheet scroll to a selected pin,
language menu at 390 px).
