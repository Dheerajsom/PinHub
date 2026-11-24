# Simpler PinHub and the Board finder (2026-11-23)

Branch `feature/simpler-pinhub`. Goal: make PinHub easier for people who are
not already PinHub users, add one new feature that answers a question the
site could not answer before. Done in two parts, each audited with a full
code review before the next began. (A third part, a walkthrough video script
and its `npm run facts` helper, was later removed from the repository.)

## Part A: simplify

### Findings (before)

1. Three views of a board: the catalog panel, `/boards/[id]`, and
   `/pinout/[id]`, two of them full pages with the same cautions and a pin map.
2. Two near-identical rows of chips on the full pin map: "Show pins by
   capability" (recorded functions, filters the table) and "Highlight by
   primary role" (dims the drawing), with overlapping labels (GPIO, Power,
   Ground, I2C, SPI, UART) and different meanings.
3. Six equal header links; "Check" and "Link" do not say what they do.
4. Compare and Prices hand-rolled their own headers.
5. **Bug, since the first commit:** an unlayered `button, input { font:
   inherit }` in `globals.css` outranked every layered Tailwind text utility.
   An 11 px chip rendered at 16 px, a `font-mono` button in Geist, and a
   `text-sm` input at 16 px.
6. **Bug:** nav links used `hover:bg-white/[0.06]`, which the light theme's
   `[class*="bg-white/"]` rule paints at rest, so every inactive nav link had a
   grey fill in light mode.

### Changes

- `/boards/[id]` is the one board page: identity and specs, "Before you wire"
  (always before the map), price and revision notes, the full pin workbench
  (`BoardWorkbench`, the old full view minus its duplicate logic line and doc
  link), then why it matters, sources, and similar boards. The workbench is a
  Suspense boundary whose fallback is the same workbench with no URL state, so
  the prerendered HTML still carries the whole map and schedule.
- `next.config.ts` redirects `/pinout/:id` and `/pinout/:id/opengraph-image`
  with a 308; query strings pass through. All in-app links point at
  `/boards/[id]#pins`; the sitemap lists each board once.
- One **Show pins** row. `BoardStage` takes a `highlight` set, so the drawing
  dims exactly the pads the table leaves out. The active chips live in
  `?show=` (validated against `pinoutCategories`, one per category, display
  order). An old `?role=` seeds the matching chip; a role with no chip stays a
  highlight with "Stop highlighting". The role legend became `PinColorKey`, a
  passive key. The alternate-function caveat shows only while a chip is on.
- A `?pin=` arrival scrolls the selected-pin summary into view, because the
  board page puts specs and cautions first.
- Nav: Pin Maps · Compare · Prices · **Tools**. `ToolsMenu` is a disclosure
  (button + links) with a one-line summary per tool; it closes on Escape
  (focus returns), outside pointer, or tabbing out, and clamps its list 16 px
  inside the viewport. Each tool has one name in the menu, its heading, and
  its `<title>`: Board finder, Pin planner, Code check, Connect two boards.
- Compare and Prices use `SiteHeader`; Compare gained a visible h1 and intro.
  Its separate "Overview" and "Pinout" links collapsed into one "Pin map".
- The unlayered font reset is gone (Tailwind's preflight already resets in
  its base layer). Text fields keep 16 px on coarse pointers so iOS does not
  zoom on focus. Chips that relied on 16 px text for a 44 px width gained
  `min-w-11`.
- Nav and Tools hover fills are `.ph-nav-link` / `.ph-tools-item` rules with
  light counterparts.

### Review findings (fixed)

The Part A review (high effort) found six issues, all fixed before Part B:
inputs under 16 px would trigger iOS focus zoom once the font reset went; a
light-theme e2e test checked Tools on its own active page; the Show pins
memo rebuilt on every hover; boards without a drawing showed their connector
name twice; Sources sat in half a row when a board has no highlights; and a
click on the Tools list's padding closed it. The first browser run then
found the Tools list opening 40 px off-screen on the catalog (its nav is not
the row's last item), deep-linked pins landing below the fold, and chips
under 44 px wide; all fixed.

## Part B: Board finder (`/find`)

"Which boards can take everything my project needs, at once?" A feature
checklist cannot answer it, because buses compete for pins; the pin planner
can. `findBoards` runs `planPins`, with the planner's own step budget, on
every board with source-backed pin functions (126), on the server. Fits list
clean first, then fits that need cautioned pins, each in catalog order, with
up to four assignment lines and an "Open this plan" link to
`/planner?board=…&plan=…`. Misses give the planner's reason; a search that
runs out of steps is reported as **undecided** (`planPins` now marks it
`exhausted`), never as a fit or a miss; boards without pin-function data are
counted and not guessed. Filters (platform, logic level, wireless) read the
discovery profile. `?plan=` reuses `parsePlanParam`; other keys accept only
listed values, repeats are ignored, and a query over 256 characters is
rejected whole.

Measured: 5–200 ms per request across the catalog. Verified over 3,592 fits
in 67 requirement sets that the planner never lowers a count the finder
promised (`planCapabilities` proves single maxima with a smaller budget); a
unit test keeps that invariant.

### Review findings (fixed)

Undecided boards were counted under "Doesn't fit", and with zero fits the
page said nothing could take the request (copy claiming more than the data);
they now have their own "Couldn't settle" list and the zero-fit heading
softens. The planner-clamp risk above became a test. In-text links used a
44 px `inline-flex` box that broke the paragraph's line height; they now
widen their tap area with vertical padding instead.

## Verification

- Baseline before any edit: lint, typecheck, and `npm test` (92 files, 1,990
  tests) all green.
- Each part was reviewed with `/code-review high` before the next began:
  Part A 6 findings, Part B 3 findings; all fixed, with tests.
- Final run on this branch: `npm run lint`, `npm run typecheck`, `npm test`
  (96 files, 2,032 tests), `npm run build` (410 static pages, board-visual
  and source-link gates included), and the whole browser suite against that
  build, `CI=1 npx playwright test --retries=0`: 168 passed.
- The first full browser run found 36 failures: 34 in
  `e2e/raspberry-pi-redesign.spec.ts`, which drove the Raspberry Pi workbench
  on board pages (it now runs in the catalog panel, every assertion kept but
  one; see Known limits), and 2 in `e2e/pin-check.spec.ts` that pressed
  `Control+V`/`Control+Z`. Chromium on macOS pastes and undoes with Meta, so
  those two fail on a Mac whatever the branch (CI runs on Linux); a copy using
  `ControlOrMeta` passed, and the spec now uses it.
- Mobile gate (subagent, Chromium phone emulation with touch, 360 × 800,
  390 × 844, 412 × 915, and 844 × 390, both themes): every journey passed with
  no console errors and no horizontal overflow. It confirmed five issues: the
  Tools list ran 21 px past the bottom of a landscape phone on the sticky
  catalog bar; the catalog "Reset" button was 24 px tall once its text
  returned to 12 px; the board-link selects were 12 px on touch at 640 px and
  wider (iOS zoom); the Show pins scroller clipped chip focus rings; and a
  pre-existing 24 px link on /prices. All five are fixed, with browser tests
  in `e2e/simpler-nav.spec.ts` and a stylesheet test.
- Mobile gate recheck on the rebuilt production build: all five fixes passed
  at every viewport in both themes, and a regression sweep (13 pages × 4
  viewports × 2 themes) found no overflow, no errors, and no new undersized
  controls. Every text field computes to 16 px on touch.

## Known limits

- The mobile-mojo skill file (`~/.codex/skills/mobile-mojo/SKILL.md`) does
  not exist on this machine. The mobile gate ran as a subagent with the
  criteria from `AGENTS.md` and `CLAUDE.md` instead; see Verification.
- The Raspberry Pi connector workbench (`RaspberryPiPinout`, with its Static
  and Dynamic tabs) now appears only in the catalog's detail panel; Pi board
  pages use the same full workbench as every other board (the one the old
  "Full view" page used). Its wide-screen layout, readout beside the board, no
  longer appears anywhere, because the panel is narrow; the spec's assertion
  for that layout was dropped.
- Not fixed (pre-existing): following the /prices "Reference prices" link
  scrolls to the price notes but leaves that disclosure closed.
- Not fixed (pre-existing, inline): the "Explore the full pinout catalog" link
  in a /prices sentence is 24 px tall; inline links in running text are exempt
  from the 44 px rule.
- The Code check editor's textarea keeps its own font size on touch screens:
  forcing 16 px there would misalign it from the highlight layer drawn under
  it.
- Finder results are planned per request and not cached; at the measured
  cost this is fine, but a much larger catalog would want caching by query.
- The CLI was not regenerated: no input to its generated files changed
  (`src/lib/boards.ts`, `src/lib/pin-match.ts`, the pin index and its
  imports).
