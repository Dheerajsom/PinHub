# Planner page — design (2026-10-02)

Branch `feature/planner-page`, from `main`.

## Goal

The pin planner becomes its own section, reached from the header next to
"Pin Maps", instead of a block under the board info on `/boards/[id]` and
`/pinout/[id]`. On it a user searches for their board, picks it, and plans the
pins they are using: by claiming pins by hand on any board with a pin map, and
by auto-assigning peripherals on the boards that have source-backed pin
functions.

## Decisions (approved)

- Dedicated route `/planner`. Not a catalog mode, not a board-page section.
- Planning is **both** manual and automatic.
- **One board at a time.** All state is in the URL; nothing is stored locally.
- The planner draws a flat schematic render for every board, not the
  realistic Raspberry Pi artwork.

## Navigation

- `SectionNav` gains `{ href: "/planner", label: "Planner", icon: Route }`
  between Pin Maps and Compare. It is used by `SiteHeader`, `PinHubApp`,
  `DiscoveryApp`, and `/prices`, so all four pick it up.
- Four items must still fit one row at 360 px (the nav takes its own
  full-width row below `sm`). If they do not fit with labels, tighten padding
  and gap before considering anything else; every item stays ≥ 44 px tall on
  touch layouts.
- `PinPlannerSection` is removed from `/boards/[id]` and `PinoutFullView`.
  In its place, `BoardActions` (board page) and the full-view toolbar get a
  "Plan pins" link to `/planner?board=<id>`, shown only when the board has a
  pin map.
- `BoardDetailPanel`'s "Open full board page" link stops pointing at `#plan`
  and stops promising the planner; a separate "Plan pins" link goes to
  `/planner?board=<id>` for boards with a pin map.

## Page flow

### 1. Pick a board (no valid `board` in the URL)

- One search combobox (`role="combobox"` + listbox, arrow keys, Enter,
  Escape, `/` focuses it via `useSlashToFocus`), searching the same board
  summaries the catalog uses (`board-summary.ts`, `board-search.ts`), so the
  page does not ship full pin maps.
- Each result row: vendor logo, name, vendor/family in mono, and one
  capability tag:
  - **Auto-assign** (emerald, "present"): board has `pinFunctions`.
  - **Manual** (neutral): board has a pin map only.
  - **No pin map** (disabled row, not selectable): nothing to plan.
- Under the box, "Boards with auto-assign" lists the boards that have
  `pinFunctions` as quick picks. This is a factual list from the data, not a
  ranking.
- The summary already carries `hasPinout`. Add `hasPinFunctions` beside it
  (a few bytes per board; the `/api/boards` index grows by that much).

### 2. Plan (valid `board`)

Board detail loads on demand through the existing `board-detail-loader`
(`/api/boards/[id]`), with loading and error states. Layout is one
`@container`; from `@3xl` it is two columns, below that it stacks in this
order: board bar, drawing, pin editor, your pins, auto-assign, export.

- **Board bar.** Vendor logo, board name, logic level, links to the board
  page and full pinout, and "Change board". Changing board when the plan is
  non-empty asks for confirmation in an inline prompt (not `window.confirm`).
- **Drawing.** `BoardStage` with `showAllLabels`, schematic artwork (below),
  sticky beside the lists on wide containers, capped in height as today so a
  tall board shrinks rather than scrolls.
- **Pin editor.** Selecting a pad (tap, click, or keyboard) opens an inline
  editor under the drawing for that pin: position, label, role, the pin's
  source cautions, a "Used for" text input, and Claim / Release. The editor
  is a labelled region and receives focus when opened from the keyboard.
- **Your pins.** One table of everything in the plan, in physical order:
  manual claims (name, pin, label) and auto-assigned pins (function, signal,
  pin, label, default/routed chips), each row a button that probes its pad.
  Caution rows as today. Empty state: one line telling the user to select a
  pin on the board, or use auto-assign when the board supports it.
- **Auto-assign.** Today's steppers, only for boards with `pinFunctions`.
  Boards without them get one line: auto-assign needs source-backed pin
  functions that PinHub does not have for this board yet, plus the existing
  data-report link. Never a guessed plan.
- **Export.** See below.

## Manual claims

- A claim is `{ pin anchor key, name }`. The key is the geometry anchor key,
  which is already unique across grouped layouts where positions repeat.
- Any pad can be claimed, including power and ground (people do wire them).
- Name: trimmed, 1–24 characters, from `[A-Za-z0-9 _+\-./#]`. Anything else
  is stripped on input and on URL read. Empty name is allowed and shown as
  "In use".
- At most 64 claims. Hitting the cap disables Claim with a visible reason.
- Cautions shown for a claimed pin come only from the record: the pin's
  `flags` with the board's `flagNotes`, the pin's own `note` if it has one,
  and role `reserved`. No electrical fact is inferred from the role or label.
- Manual claims are **excluded from the solver**: `planPins` gains an
  optional `exclude: ReadonlySet<Pin>` and treats those pins as taken in
  `candidatesOf`, `capacity`, and the search. Stepper maxima are computed
  with the exclusion, so they shrink as pins are claimed. If a manual claim
  makes the current requirements unsatisfiable, the existing orange
  explanation says so.
- Claiming a pin the solver had assigned simply re-runs the solver around it.

## Render

- `BoardStage`/`BoardArtwork` gain a `schematic` flag. With it set the
  realistic Raspberry Pi artwork and the realistic pad style are skipped and
  the board draws as the flat sheet every other board uses. If Pi geometry
  from `raspberryPiGeometry` positions pads for the artwork, the planner
  builds geometry without that step (a `buildBoardGeometry(board, { artwork:
  false })` option) so anchors come from the plain header builder.
- Marks, all with light-theme counterparts:
  - Manual claim: solid ring in a neutral white/zinc ink, plus the claim name
    as the pad's label in place of the pin label when labels are shown.
  - Auto-assigned: the existing dashed ring in the role's `ink` step.
  - Probe: cyan `#22d3ee`, unchanged and used for nothing else.
  - Unused pads recede once the plan is non-empty, as today.
- Nothing is drawn that the catalog cannot back; the claim name is user text
  and is visually distinct (ring + table) from catalog labels.

## URL state

`/planner?board=<id>&plan=<auto>&use=<claims>`

- `board`: must pass `isBoardId` and exist; otherwise the picker is shown.
- `plan`: unchanged format and parser (`plan-params.ts`).
- `use`: new, in `plan-params.ts`. Tokens joined by `.`; each token is
  `<anchorKey>~<name>` with both parts `encodeURIComponent`-encoded.
  Untrusted input: raw value ≤ 2 048 characters, ≤ 64 tokens, key must match
  a real anchor on the loaded board (unknown keys dropped), name bounded and
  filtered as above, first token for a key wins. The same limits apply when
  writing.
- Written with `history.replaceState` after hydration, as today, so the page
  stays static. Read once after the board loads.

## Export

`pin-plan-export.ts`:

- All boards: **CSV** and **JSON**, covering manual claims and auto
  assignments. The formula-safe cell escaping now inside `CopyPinTable.tsx`
  moves to `src/lib/csv.ts` and both use it.
- Boards with `pinFunctions`: the existing C header, MicroPython, and Arduino
  exports. Manual claims are added as named constants only where the pin has
  an `mcu` identity; other manual claims are listed in the header comment.
  Claim names become identifiers through the module's existing
  `identifier()` and pass through `oneLine()` before entering any comment.
- Existing snapshot tests keep passing unchanged for plans with no manual
  claims.

## Components

`src/app/planner/page.tsx` (metadata, `SiteHeader current="/planner"`,
`CircuitBackground`) renders `PlannerApp`, split into:

| File (`src/components/planner/`) | Purpose |
| --- | --- |
| `PlannerApp.tsx` | URL state, board loading, picker vs workspace |
| `PlannerBoardPicker.tsx` | search combobox, capability tags, quick picks |
| `PlannerWorkspace.tsx` | layout, selection/probe state, solver call |
| `PlannerPinEditor.tsx` | claim / rename / release one pin |
| `PlannerPinsTable.tsx` | "Your pins" (replaces `PlanTable`) |
| `PlannerAutoAssign.tsx` | steppers and status (from `PinPlanner`) |
| `PlannerExports.tsx` | export picker (from `PlanExports`) |

`PinPlanner.tsx` and `PinPlannerSection.tsx` are deleted once their parts
have moved. `src/lib/planner-claims.ts` holds the claim type, limits, name
filter, and caution lookup.

## Error handling

- Unknown or malformed `board`: picker, no error noise.
- Board detail fetch fails: message with Retry and a link back to the picker.
- Board has no pin map (reached by URL): one line saying so, link to the
  board page, and the picker.
- Clipboard failure: existing message.

## Testing

- Vitest: `use=` parsing and serialising (bounds, bad keys, bad names,
  duplicates, round trip); `planPins` with `exclude` (excluded pins never
  assigned, capacity shrinks, unsatisfiable reason); claim name filter and
  caution lookup; CSV formula safety; exports with manual claims; picker
  (filtering, capability tags, disabled rows, keyboard); nav shows Planner
  and marks it current; board page and full view no longer render the
  planner and link to `/planner?board=`.
- Playwright (`e2e/pin-planner.spec.ts`, rewritten): nav → Planner → search
  "pico" → select → claim two pins by hand → auto-assign 1× I2C avoids them →
  reload restores everything → exports; manual-only board; no-pin-map board;
  change-board confirmation; both themes for the unsatisfiable state.
- Then CLAUDE.md steps 6–8: lint, typecheck, unit, build, e2e, desktop check
  in both themes, the mobile-mojo gate at 360 × 800, 390 × 844, 412 × 915 and
  844 × 390, and `docs/planner-page-2026-10-02.md`.

## Known limits

- Old shared links of the form `/boards/<id>?plan=…` no longer restore a
  plan; the board page offers the "Plan pins" link instead.
- Auto-assign still covers only the boards with `pinFunctions`.
- Plans are not saved anywhere but the URL.
- `main` does not yet contain the wiring sheet; merging that branch later
  will conflict in `/boards/[id]/page.tsx` where the planner section was.

## As built (2026-10-02)

Where the build differs from the text above:

- **Render.** Instead of a `schematic` flag on the board drawing, the planner
  has its own geometry (`buildBoardGeometry(board, { sheet: true })`): a
  connector chart for two-row connectors, and the usual pad positions on a
  flat outline for other layouts. The first attempt, the generic board
  drawing without Pi artwork, still drew invented components and left 40-pin
  headers too small to pick a pad from.
- **Claim names on the drawing.** A claimed pad keeps its catalog label. The
  claim name shows in the readout, the table, and the exports.
- **`use=` format.** Tokens are `<anchorKey>~<name>` joined by `,` (anchor
  keys contain `:`, and names can contain `.`), with no extra encoding beyond
  `URLSearchParams`.
- **Picker data.** The page passes the ids of boards with pin functions
  (`autoAssignIds`) beside the catalog summaries; `BoardSummary` and the
  `/api/boards` index are unchanged.
- **Editor.** Sticks to the bottom of the window rather than sitting under the
  drawing, and closes after Claim or Release.
- **Links.** "Plan pins on this board" is its own link under the board
  actions, in the full view, and in the catalog panel.
