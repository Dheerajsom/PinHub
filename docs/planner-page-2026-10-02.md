# Planner page — 2026-10-02

Branch `feature/planner-page`, from `main`. The pin planner is now its own
section at `/planner`, reached from the header nav next to Pin Maps. A user
searches for their board, picks it, and plans the pins they are using: by
claiming pins by hand on any board with a pin map, and by auto-assigning
peripherals on the boards with source-backed pin functions.

Design: `docs/superpowers/specs/2026-10-02-planner-page-design.md` (with an
"As built" section). Plan: `docs/superpowers/plans/2026-10-02-planner-page.md`.
Design language: `docs/DESIGN.md` section 18.

## What changed

**Navigation**
- `SectionNav`: Pin Maps · Planner · Compare · Prices. Below 400 px the icons
  are hidden so four links fit one row at 360 px. Links are 44 px tall at
  every width (they were 40 px from `sm` up, which includes a phone in
  landscape).
- `/planner` is in the sitemap.
- The inline planner is gone from `/boards/[id]` and `/pinout/[id]`. Those two
  and the catalog detail panel carry a "Plan pins on this board" link
  (`PlanPinsLink`) for any board with a pin map. Only boards with pin
  functions are told they can auto-assign.

**The page** (`src/app/planner/page.tsx`, static; `src/components/planner/`)
- `PlannerApp` reads `?board=` after hydration, loads the record through the
  existing board detail loader, and shows the picker or the workspace. Picking
  and changing board use `history.pushState`, so Back works.
- `PlannerBoardPicker`: a combobox over the catalog summaries (same search as
  the catalog), a capability tag per result, disabled rows for boards with no
  pin map, and the auto-assign boards as quick picks.
- `PlannerWorkspace`: board header, the sheet, "Your pins", auto-assign,
  export. Changing board with a plan asks first.
- `PlannerPinEditor`: claim, rename, or release the selected pin. It sticks to
  the bottom of the window and closes after Claim or Release.

**Manual claims** (`src/lib/planner-claims.ts`)
- A claim is an anchor key and a name. Names are 0–24 characters from
  `[A-Za-z0-9 _+\-./#]`; anything else is dropped as it is typed and again
  when read from a URL. At most 64 claims.
- Cautions for a claimed pin come only from the record: the pin's flags with
  the board's `flagNotes`, and the reserved role. Nothing is inferred.

**Solver** (`src/lib/pin-planner.ts`)
- `planPins` and `planCapabilities` take an optional set of excluded pins.
  Claimed pins are never assigned and do not count toward capacity, so the
  stepper maxima shrink as pins are claimed. With no exclusion the result is
  identical to before.

**URL state** (`src/lib/plan-params.ts`)
- `/planner?board=<id>&plan=<auto>&use=<key>~<name>,<key>~<name>`
- `board` must pass `isBoardId` and exist with a pin map; otherwise the picker
  is shown (with a line of explanation for a real board without a pin map).
- `use` is untrusted: at most 2 048 characters and 64 claims, the key must be
  shaped like an anchor key and exist on the loaded board, names are filtered
  and bounded, the first token per key wins. The same limits apply on write.

**Render** (`board-visual-geometry.ts`, `BoardArtwork.tsx`, `BoardStage.tsx`)
- `buildBoardGeometry(board, { sheet: true })` builds the planner's drawing: a
  connector chart for `header2x` and `edge-dual` boards (a header's rows
  together, a module's two edges apart), and the usual pad positions on a flat
  outline for other layouts. No Raspberry Pi artwork, components, copper, or
  connectors. Anchor keys match the board drawings.
- `BoardStage` takes `claimed`: a solid neutral ring. Free pads recede to 0.5
  opacity while a plan exists (a role filter still dims to 0.28).
- Label leaders now start at the pad's edge instead of its centre. On a dimmed
  pad the old leader showed through and read as the pin number struck out.
  This applies to every drawing.

**Exports** (`src/lib/pin-plan-export.ts`, `src/lib/csv.ts`)
- Every board gets JSON and CSV, so a plan made only of claimed pins exports.
  CSV cells use `csvCell`, moved out of `CopyPinTable.tsx`; a claim named
  `+5V rail` is written as text, not a formula.
- C header, MicroPython, and Arduino exports (boards with pin functions) add
  claimed pins as `PINHUB_USER_…` / `user_…` constants where the pin has an
  MCU identity, and as a comment otherwise. Repeated names get `_2`, `_3`.
  A claimed pin's cautions are written above it.
- Existing export snapshots are unchanged.

## Bugs found and fixed during the work

| Bug | Fix | Regression test |
| --- | --- | --- |
| On touch, the readout above the sheet went from two lines to one when a pad was touched, moving every pad 20 px between touch-down and touch-up. First taps opened no editor, or the neighbouring pin's (found by the mobile gate) | The readout always reserves two lines | `e2e/pin-planner.spec.ts` "touching a pad never moves the sheet…" (fails on the earlier build: pin 17 opens instead of 15) |
| The pin editor rendered under a sheet taller than the window, off screen | Editor sticks to the bottom of the window | covered by the same e2e tap test and the mobile gate |
| Leaders drawn through translucent pads struck out the pin numbers | Leaders start at the pad edge | visual; checked in both themes |
| Section nav links were 40 px tall on a landscape phone | 44 px at every width | `e2e/pin-planner.spec.ts` nav test (360 px); mobile gate (844 × 390) |

## Verification

Desktop, on the final tree:

- `npm run lint`, `npm run typecheck`: clean.
- `npm test`: 501 tests in 53 files. New files: `planner-claims`,
  `planner-render`, `planner-ui`, `plan-pins-link`, `section-nav`; new cases in
  `plan-params`, `pin-planner`, `pin-plan-export`, `board-detail-panel`,
  `metadata-routes`. `pin-planner-ui.test.tsx` was replaced by
  `planner-ui.test.tsx`.
- `npm run build`: passes; `/planner` is prerendered static.
- `CI=1 npx playwright test` (against `next start`): 83 passed.
  `e2e/pin-planner.spec.ts` was rewritten for the page: nav → search → pick →
  claim → auto-assign around the claims → reload → export → change board; the
  unsatisfiable state in both themes; a manual-only Raspberry Pi drawn as a
  sheet; hostile `board` and `use` values; the three "Plan pins" links on a
  phone; first tap on a touch screen; four nav links on one row at 360 px.
- Screenshots reviewed at 1440 px in both themes: picker, picker with results,
  Pico, ESP32 (cautions), UNO (unsatisfiable), Pi 5, Pi 4 (manual only), board
  page.
- `cli/` checks were not run: no board data changed, and the CLI does not
  import the files touched here.

## Mobile gate

The `mobile-mojo` subagent tested the production build (`next start`) with
Playwright and Chrome in touch contexts (`isMobile`, `hasTouch`) at
360 × 800, 390 × 844, 412 × 915, and 844 × 390 landscape, in both themes. The
`mobile-mojo` skill was not registered in that session ("Unknown skill"), so
it worked from the written brief.

First pass: **failed** on one blocker (the first-tap bug in the table above)
and two minor target sizes (nav links 40 px tall in landscape; "Show pin N"
row buttons 26–41 px wide). All three were fixed and rechecked.

Recheck, all four sizes:

| Journey | Result |
| --- | --- |
| First tap, one real touch tap per pad on a fresh load: Pico pins 1, 6, 7, 12, 20, 21, 30, 40; Pi 5 pins 3, 5, 8, 15, 22, 40; UNO D13 and A0; ESP32 IO23 and IO4 | Pass: 56 of 56 opened the tapped pin; pad position identical at touch-down and click; readout 40 px idle and active |
| Pico plan with single taps: claim GP4 and GP5, 1× I2C and 2× PWM, "Plan ready: 4 pins assigned.", auto rows on GP0–GP3, reload restores it, four export formats, probe from a row | Pass, both themes |
| Section nav on `/`, `/planner`, `/compare`, `/prices`, a board page | Pass: four links, one row, 44 px tall, no overflow |
| ESP32 plan with cautions | Pass: row buttons at least 44 × 44, table inside its wrapper, caution rows readable in both themes |
| UNO unsatisfiable plan; Pi 4 manual-only board; change-board confirmation and Back; "Plan pins" links on the board page, full view, and catalog panel (first pass) | Pass |
| Picker: search, tags, disabled no-pin-map row, quick picks, arrow keys, Enter, Escape (first pass) | Pass |
| Keyboard focus | Pass: visible outline on every control; the sheet is one tab stop with arrow keys between pads |
| Console errors and failed requests | None |

Measured pad sizes (drawn): Pico 27 / 30 / 32 / 25 px, Pi 5 28 / 30 / 33 / 25 px,
ESP32 28 / 30 / 32 / 26 px, UNO 16 / 17 / 19 / 20 px at the four sizes.

Not covered: physical phones (desktop Chrome emulation only), clicking
Download or Copy on a phone (covered on desktop by e2e), the theme toggle
button (themes were set through `data-theme`), and mis-taps between the UNO's
small pads.

Left open: opening the pin editor from the keyboard (Enter on a pad) does not
move focus into it; the user tabs to it. Moving focus on every open would also
raise the on-screen keyboard on every tap, so it needs a keyboard-only path.

## Known limits

- Old shared links of the form `/boards/<id>?plan=…` no longer restore a plan.
  The board page offers the "Plan pins" link instead.
- Auto-assign still covers only the four boards with `pinFunctions`.
- A plan lives only in the URL; nothing is saved.
- The planner reads the URL on the first animation frame, like the old one, so
  a link opened in a background tab shows the picker until the tab is shown.
- On layouts other than `header2x` and `edge-dual` (the UNO's shield headers,
  for example) the sheet keeps the board's pad positions, so pads are small on
  a phone (16–20 px drawn, with a larger hit area).
- In landscape on a phone the pin editor covers about a third of the height
  while it is open.
- `main` does not contain the wiring sheet yet. Merging
  `feature/wiring-sheet` will conflict in `src/app/boards/[id]/page.tsx`,
  where the planner section used to sit beside it.
- Flagged, not fixed (both predate this work): the brand link and theme
  toggle are 40 px tall, and the WeAct vendor favicon returns 404 through
  `/_next/image`.
