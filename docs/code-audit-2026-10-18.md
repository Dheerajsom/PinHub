# Sort menu and card text — 2026-10-18

Branch: `fix/sort-menu-and-board-blurbs`

## Findings

1. **Sort control.** The catalog and discovery toolbars used a native
   `<select>`. Chrome gives a clicked `<select>` `:focus-visible`, so a mouse
   click drew the global cyan ring 2 px outside the control, with a dark gap
   between the ring and the control's own border. The ring did not look like
   it belonged to the button. The open list was drawn by the OS, so it ignored
   the theme and overlapped the control.
2. **Card descriptions.** Board descriptions ranged from 80 to 430
   characters (median 131). Cards clamp them to two lines, so the newer
   entries (Lattice, Digilent, Jetson AGX Orin, Nicla Sense ME, Milk-V Duo S,
   and others) were cut off mid-sentence. 105 of 147 were over 120
   characters.

## Changes

- New `SortMenu` (`src/components/catalog/SortMenu.tsx`), shared by
  `PinHubApp` and `DiscoveryApp`. It is a select-only combobox (WAI-ARIA APG):
  a button trigger showing the current sort, and an opaque `surface-panel`
  listbox with 44 px rows.
  - The highlighted row gets a neutral fill. The chosen sort is cyan with a
    check mark.
  - Keyboard: arrow keys, Home, End, Enter, Space, Escape, Tab, and
    first-letter typeahead.
  - It closes when you press outside it.
  - It flips to the trigger's right edge when it would run past the viewport.
  - A mouse click shows no ring. Keyboard focus draws the ring flush against
    the trigger's border.
  - The 120 ms fade-in is turned off under `prefers-reduced-motion`.
  - Every state has a light-theme counterpart in `globals.css`.
- Mobile-gate fixes:
  - On an 844x390 landscape phone the open list ran past the bottom of the
    screen. It is now capped to the space below the trigger, with a
    three-row floor, and scrolls inside itself.
  - An unlayered `button { font: inherit }` reset outranks Tailwind text
    sizes, so the trigger rendered at 16px. At 169px wide it pushed onto its
    own toolbar row at 390 and 412px, where the old 128px select fit. It is
    now 13px through `.ph-sort-trigger`, and its icon is hidden below `sm`.
  - With those changes, the command bar on `/` is back to its old 167px at
    390 and 412px. At 360px it wraps, as the old select did.
- If the URL carries a sort that a surface does not list (for example
  `/compare?sort=catalog`), the trigger shows that sort's real name, not the
  first option.
- Rewrote 105 descriptions to 120 characters or fewer, using only facts each
  record already stated. Regenerated the CLI catalog
  (`cli/src/boards/generated.ts`).

### Follow-up: card text

The owner flagged the cards again: the bottom-right processor line and the
logic level in the subtitle were as wordy as the old descriptions.
`processor` ran up to 153 characters (Jetson AGX Orin, Zybo Z7-20) and
`logicLevel` up to 144 (Zybo, Arty S7), so cards wrapped to five or six
lines.

- Descriptions: 100 characters or fewer (78 rewritten in this pass; 141 of
  147 now differ from `main`), so each card is
  one line at desktop width.
- `processor`: 36 characters or fewer, 53 shortened to the part name and its
  key cores or clock.
- `logicLevel`: 32 characters or fewer, 25 shortened.
- Nothing was dropped silently. Most removed detail was already in the
  record's highlights or warnings. Where it was not, it moved into a new
  highlight (11 boards: core clocks, slice counts, the SG2000 8051 core, the
  MachXO2 1.2 V core, radio versions).
- Hardware safety: the 5 V caution, the discovery logic and tolerance
  facets, and the compute class come from these fields. They were
  snapshotted for all 147 boards before the edit and compared after it.
  Nothing changed. Phrases these derivations depend on stayed in
  `logicLevel`: "not 5 V tolerant", "many pins 5 V tolerant", and the
  1.8 V/3.3 V/5 V mentions. Words such as "FPGA" and "Artix" stayed in
  `processor` for the same reason.

### Follow-up: compare overflow at 360px

The mobile gate found an older bug on `/compare`. At 360px the stacked
"Comparing N boards" list scrolled the page 25px sideways when a long board
name was listed, such as "NVIDIA Jetson AGX Orin Developer Kit". The grid
column sized itself to the content, so the name's `truncate` never took
effect. Fix: `grid-cols-[minmax(0,1fr)]` on the list and `min-w-0` on each
row.

The recheck also found two touch targets in the same rows below the 44px
rule. The remove button was 40px (now `size-11`). The Overview and Pinout
links were 16px tall (now `min-h-11`).

## Regression coverage

- `test/sort-menu.test.tsx`:
  - The control is not a native select.
  - "Best match" appears only once there is a query.
  - Choosing by click, keyboard, Escape, and outside press all work.
  - A sort the menu does not list keeps its real label.
- `test/catalog-integrity.test.ts`: description 100 characters or fewer,
  processor 36 or fewer, and logic level 32 or fewer, for every board.
- `e2e/mobile-workflows.spec.ts`: the old test measured the native select.
  It now opens the menu on phones and checks three things: the menu fits the
  viewport, every option is at least 44 px tall, and choosing an option
  updates the trigger. It also loads `/compare` with the Jetson AGX Orin and
  checks the page fits. That check failed at 385px against 360px before the
  fix. On phones it also checks that the list's links and remove buttons are
  at least 44px tall.

## Verification

- `npm run lint`, `npm run typecheck`, `npm test` (61 files, 588 tests),
  `npm run build`, and `npm run test:e2e` (85 tests) pass. The follow-up ran
  e2e at full parallelism against `next start` on port 3100, as CI does.
- The mobile-mojo gate ran at 360x800, 390x844, 412x915 and 844x390, in
  both themes. It found no defects. It flagged the landscape list height and
  the toolbar wrap described above, and both are fixed.
- The CLI checks pass: `check:boards`, `lint`, `test` (139), and `build`.
- Checked in the browser on `/` and `/compare` in both themes: mouse,
  keyboard, and URL state.

## Known limits

- The planner, link, and prices pages still use native selects. They were
  out of scope.
- At 360px a card can still clamp the last few words of a description.
- `npm run test:e2e` at full parallelism (4 workers) on a cold dev server can
  fail random pages with "Unexpected end of JSON input" from Turbopack. The
  failing tests change from run to run, and every test passes with 1 or 2
  workers. This happens in the dev server and is not caused by this change.
- A swipe that starts outside the open menu closes it, because outside
  presses close on `pointerdown`. A tap outside also closes it, as intended.
