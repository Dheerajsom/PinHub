# Sort menu and card descriptions — 2026-10-18

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

## Regression coverage

- `test/sort-menu.test.tsx`:
  - The control is not a native select.
  - "Best match" appears only once there is a query.
  - Choosing by click, keyboard, Escape, and outside press all work.
  - A sort the menu does not list keeps its real label.
- `test/catalog-integrity.test.ts`: every description is 120 characters or
  fewer.
- `e2e/mobile-workflows.spec.ts`: the old test measured the native select.
  It now opens the menu on phones and checks three things: the menu fits the
  viewport, every option is at least 44 px tall, and choosing an option
  updates the trigger.

## Verification

- `npm run lint`, `npm run typecheck`, `npm test` (61 files, 588 tests),
  `npm run build`, and `npm run test:e2e` (85 tests, `--workers=2`) pass.
- The mobile-mojo gate ran at 360x800, 390x844, 412x915 and 844x390, in
  both themes. It found no defects. It flagged the landscape list height and
  the toolbar wrap described above, and both are fixed.
- The CLI checks pass: `check:boards`, `lint`, `test` (139), and `build`.
- Checked in the browser on `/` and `/compare` in both themes: mouse,
  keyboard, and URL state.

## Known limits

- The planner, link, and prices pages still use native selects. They were
  out of scope.
- Descriptions of 120 characters or fewer were left as written. At 360px a
  card can still clamp the last few words of a description.
- `npm run test:e2e` at full parallelism (4 workers) on a cold dev server can
  fail random pages with "Unexpected end of JSON input" from Turbopack. The
  failing tests change from run to run, and every test passes with 1 or 2
  workers. This happens in the dev server and is not caused by this change.
- A swipe that starts outside the open menu closes it, because outside
  presses close on `pointerdown`. A tap outside also closes it, as intended.
