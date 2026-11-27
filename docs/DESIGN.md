# PinHub Design Overhaul Proposal

A complete UI/UX direction for PinHub: a searchable, source-backed pinout
catalog for dev boards, SBCs, and microcontrollers. This document is the
reference for implementing the redesign; the "Roadmap" section at the end
orders the work. Phase 1 items are implemented in this repository.

---

## 1. Product Direction

PinHub should feel like a bench instrument, not a website: a dense,
always-ready lookup surface where an engineer lands mid-task ("which pin is
SDA on the Pico?"), gets the answer in under ten seconds, and trusts it enough
to wire against. The redesign keeps the catalog as the first screen and makes
three things unmistakable at every level of the UI: **where the data came
from** (official vs third-party provenance on every link and pin map),
**what can damage hardware** (warnings surfaced at scan time, not buried in a
detail tab), and **that the pin map is the product** (the interactive
connector map is the visual and interactive center of the board view, with
static and dynamic presentations of the same source-backed data). Everything
decorative is subordinate to lookup speed: the vendor-mark backdrop stays behind
opaque panels, motion is enhancement-only, and every chip, badge, and color
encodes a real electrical or provenance fact.

## 2. Information Architecture

```
┌ Header ──────────────────────────────────────────────────────┐
│ Logo · tagline           Boards/Interfaces/Sources · GitHub  │
├ Sticky command bar ──────────────────────────────────────────┤
│ [ / Search ]  Filters · result count · Favorites · chips     │
├──────────────┬───────────────────────┬───────────────────────┤
│ Filter rail  │ Board catalog (list)  │ Board detail panel    │
│ · Category   │ · dense result rows   │ · identity + specs    │
│ · Interface  │ · relevance-ranked    │ · Before you wire     │
│ · (Voltage)  │                       │ · Pin map (tabs)      │
│ · (Sources)  │                       │ · Highlights          │
│ · Curation   │                       │ · Source references   │
└──────────────┴───────────────────────┴───────────────────────┘
  Footer: disclaimer + catalog stats
```

- **Header** — identity strip only: logo, one-line purpose statement, live
  catalog metrics (boards, interfaces, source links), GitHub. Never grows.
- **Command bar** — sticky. Search input (`/` shortcut), mobile Filters
  toggle with active-count badge, live result count, Favorites toggle,
  removable active-filter chips, Reset.
- **Filter rail** (left, 15rem) — every facet with per-option counts; see
  §7 for the menu and token controls. Curation note explains why
  some boards lack in-app maps.
- **Catalog** (center, fluid) — single-column list of compact result rows,
  relevance-ranked when a query is present.
- **Detail panel** (right, `clamp(21rem, 30vw, 32rem)`, sticky, scrolls
  independently) — identity, specs, "Before you wire" cautions with the
  verify link, pin map tabs, highlights, sources. Container-query driven: it adapts to its own width, never the
  viewport.
- **Board page** (`/boards/[id]`) — one page per board: identity and specs,
  "Before you wire" cautions (always before the map), price and revision
  notes, then the full-width pin workbench for deep inspection, then why it
  matters, sources, and similar boards. The workbench has one filter row,
  **Show pins** (recorded functions, alternates included), which narrows the
  table and dims the drawing's other pads together; the role colours appear
  as a passive key under the drawing. `/pinout/[id]` permanently redirects
  here (see section 21).
- **Favorites** — localStorage-backed, star on every row + global filter.
- **Mobile** — same DOM, single column: command bar stays sticky, filters
  collapse behind the toggle, detail panel stacks below results with a
  "Back to results" escape hatch and reduced-motion-aware scroll on select.
  Scroll clearance follows the measured sticky command bar, including wrapped
  controls and active facets, so identity and return navigation stay visible.

## 3. Homepage Layout

The first screen **is** the catalog. No hero, no marketing copy.

- **Top bar**: 56px logo, Audiowide "PinHub" wordmark with a subtle
  white→cyan→amber gradient, one-line descriptor. Right: three mono-digit
  metrics (Boards / Interfaces / Sources) that double as a trust signal —
  the catalog advertises its own source coverage — and the GitHub button.
- **Search**: full-width input in the sticky command bar. Placeholder names
  the searchable fields ("Search boards, vendors, interfaces, warnings…").
  Token-scored ranking: word-boundary name hits > name substring > vendor/
  family/processor > category/tags/interfaces > description/warnings, so
  "pi" ranks Raspberry Pi above boards that merely list SPI. `Enter` selects
  the top result; `↑/↓` walk the selection without leaving the field;
  `Esc` clears.
- **Result rows**: compact cards, left accent border for selection
  state. Row anatomy: vendor logo · board name · compact wiring-caution count ·
  "No in-app map" only when a map is absent · mono `vendor · category · logic level` ·
  two-line description · up to 7 interface chips + overflow count · star.
  Warnings are therefore visible **at scan time**, before selection.
- **Selected board panel**: identity block (vendor mark, name, family),
  4-row spec sheet (Processor / Logic / Power / Format), then the
  **Before you wire** panel — the board's cautions with, as its footer, a
  link to the highest-authority source (Pinout > Schematic > Datasheet >
  Manual > Docs); all recorded cautions stay visible — then the pin map
  tabs, highlights, and the source list with per-link provenance badges.
- **Trust communication**: green = data present and vendor-official
  (Official badge); orange = caution (warning counts, the
  "Before you wire" panel); neutral zinc = third-party or metadata. The footer repeats the disclaimer on every screen.

## 4. Visual Design System

**Palette** (roles, not decoration — dark and light themes with a system default):

The table gives the dark-theme foundations. Light mode uses opaque white and
cool-gray surfaces, dark text, and the same semantic color families. Every
interface tone, including neutral fallback labels such as CSI/PCIe, must have
readable text against its actual surface in both themes.

| Token | Value | Role |
| --- | --- | --- |
| `--background` | `#090b0f` | page base |
| panel | `#14161d` | raised opaque card (`.surface-panel`) |
| well | `#0e1015` | recessed nested surface (`.surface-well`) |
| header/bar | `#0a0d12` / `#0c0e13` | chrome strips |
| accent | cyan-300 `#67e8f9` | interaction: focus, selection, links |
| trust | emerald-400 | data present / official provenance |
| caution | orange-300 | warnings, verify affordances |
| favorite | amber-300 | the one deliberately loud control |
| price | green-300 `#86efac` | board cost (`.ph-price-*`), kept apart from emerald |
| text | white / zinc-200 / zinc-400 / zinc-500 | 4-step hierarchy |

Pin-role colors are a separate 13-hue scale (power red, ground zinc, GPIO
emerald, I2C blue, SPI amber, UART sky, ADC violet, DAC rose, PWM fuchsia,
debug lime, system orange, alt teal, reserved stone) defined once in
`board-visual/roles.ts` and reused by chips, SVG pads, legend, and table so
every rendering of a pin agrees.

- **Background**: the catalog's vendor marks (`CircuitBackground`, layout in
  `background-field.ts`) scattered through the desktop gutters in quiet
  monochrome, plus a cursor probe. Where a mouse rests on bare background (no
  panel under it), a soft cyan light follows it. Inside it the nearby marks
  return to color and a field of bus bytes shows through: I2C writes to common
  parts, address bytes in the I2C role ink, and a hidden ASCII message. Marks
  load from Google's favicon service like `VendorLogo`, so no logo files ship.
  Hidden below 1024px, and the probe needs a fine hovering pointer. All widgets
  are opaque — no glass/blur.
- **Typography**: Geist (UI), Geist Mono (pin labels, numbers, metrics —
  anything an engineer might transcribe), Audiowide (wordmark only).
  Scale: 24/18/16/14/12/11/10px; uppercase + `tracking-[0.14–0.18em]` for
  section labels.
- **Spacing**: Tailwind 4px base; rows `p-4`, panels `p-4`–`p-5`, chip gaps
  `1.5`, column gap `5`.
- **Radius**: `rounded` (chips) → `rounded-md` (inputs, wells) →
  `rounded-lg` (panels). Nothing pill-shaped except pin pads (circles).
- **Buttons**: quiet borders (`border-white/10`) that gain the cyan accent
  on hover/active; the Favorites control is the single high-emphasis button.
- **Chips**: 11px, bordered, tinted at ~10–15% alpha; every color maps to a
  meaning listed above.
- **Icons**: lucide, 12–16px, functional only (search, filter, star, shield,
  copy, external-link, cpu). No decorative filler.
- **States**: empty = dashed-border panel + reset action; queued pin map =
  dashed panel explaining the source-backed import policy; loading = static
  SSG (no spinners on the catalog); errors surface inline in the panel that
  failed.

## 5. Pin Map UX

Two presentations of one dataset, behind a persisted segmented control:

- **Static** — the dense scannable map. Dual-row connectors render as a
  physical two-column header with numbered role-colored pads and flanking
  labels/aliases; grouped connectors render as labeled auto-fill grids.
  Legend shows only roles present. Connector notes (strap pins, tolerances)
  sit under the map. A **Copy table** action exports the connector as a
  Markdown table including aliases and notes.
- **Dynamic** — the interactive board diagram (`board-visual/`): SVG board
  artwork with pads anchored from the same pinout data (build-time
  validation keeps anchors and data in sync). Hover/focus raises the pad,
  draws a leader line, and shows the label; click/Enter pins the selection
  and fills the inspector with role, aliases, and note. Pads are real
  buttons: `Tab`/arrow navigable with visible focus rings.
- **Dynamic maps.** The catalog panel, inspector and full board page open with
  the complete board fitted to the available space. **Zoom to touch size**
  reveals the selected pin, or the first pin when none is selected. The
  enlarged drawing keeps its full height and pans sideways inside its own
  viewport, so a vertical swipe on it always scrolls the page; there is never
  a second vertical scroller to get trapped in. **Fit whole board**
  restores the overview and preserves the selection. The pin picker and
  Raspberry Pi connector list also support selection from the overview.
- **Connector diagrams pan and zoom.** A board whose pins are drawn on a
  separate connector diagram keeps its product illustration above, and the
  diagram sits on its own canvas (`ConnectorDiagramCanvas`). The mouse wheel
  zooms about the pointer; a drag with the left, middle or right button pans,
  as in a PCB editor. A drag never selects a pad; a click still does. At the
  whole-diagram view, zooming out with the wheel scrolls the page instead,
  and a finger scrolls the page. Once zoomed in, one finger pans and two
  fingers pinch. **−**, **+**, **Zoom to touch size** and **Fit diagram**
  cover the same moves, and the focused canvas takes `+`, `−`, `0` and the
  arrow keys. A pad picked from the list or focused by keyboard is brought
  into view.
- **Every zoomable label reads left to right.** Nothing a reader zooms into
  turns its text on its side. A board drawing that can only fit its labels
  sideways (a 2×N header along the top edge, shield headers along the long
  edges, edge fingers) hands zooming to a level connector chart
  (`readableDiagramFor`): 40-pin headers become the familiar odd/even pin
  chart, and shield headers and edge fingers become one titled column per
  connector, wrapped at 18 pins so a Mega's 54-pin header is three short
  columns. Raspberry Pi and Orange Pi boards keep their clickable picture
  above the chart. `test/readable-pin-diagram.test.ts` checks every board.
- **November 24 fit and zoom review.** The Chrome review checked every illustration
  at 390 × 844. After zooming, all 7,075 interactive pin targets across 190
  boards measured at least 44 CSS pixels in both dimensions. Eighty journeys
  covered the catalog, inspector and full board pages at 360 × 800, 390 × 844,
  412 × 915 and 844 × 390 in both themes. All 16 swipe checks and eight XIAO
  board-switch checks passed. The reviewer used Chrome touch emulation and
  the criteria in `AGENTS.md` because the mobile-mojo skill file was unavailable.
- **Board renders.** All 196 catalog models have an identification drawing.
  Selectable pins appear on 18 Raspberry Pi models, 69 dual-edge modules and
  four Orange Pi boards with documented header positions. On the Orange Pi 5
  the drawing locates all 26 contacts on the V1.3.2 component side. For 99
  boards with rear headers or signals listed in catalog or function order, a
  separate selectable connector diagram follows the product illustration.
  Six boards awaiting pin maps show the product and its reference links.
  `renderCoverage` checks these counts. [Orange Pi 5 user manual, §§1.5 and 3.16](https://orangepi.vn/wp-content/uploads/2023/03/OrangePi_5_RK3588S_User-Manual_v0.7.pdf).
- **STM32 boards follow ST's drawings.** The NUCLEO-H753ZI (MB1364) is
  measured from the UM2407 mechanical drawing: two-row Zio sockets at their
  own heights (CN7 above CN8), 2 × 35 morpho headers, and along the bottom
  edge the blue USER switch, user USB, RJ45 jack and black RESET switch. Its
  Zio connector diagram uses the same measured row heights
  (`firstRowMm` in `board-visuals.ts`). Nucleo-64 boards share the UM1724
  header frame, with per-board ST-LINK sections. A dashed perforation is
  drawn only where the ST-LINK section breaks off.
- **Hardware landmarks.** Each non-Pi model has an explicit entry in
  `src/lib/board-portraits.ts`. Shared footprints use the same drawing when
  their visible landmarks coincide. Port shells, radio cans, screens, buttons
  and heat sinks are simplified. The linked model documentation remains the
  reference for physical revisions and wiring. The illustration carries no nets.
  References for distinctive landmarks include the Pi 4/5 port order, the
  Feather's asymmetric headers, the Basys 3 controls, and the Wio Terminal's
  screen and case. [Raspberry Pi 5 introduction](https://www.raspberrypi.com/news/introducing-raspberry-pi-5/),
  [Feather RP2040 pinouts](https://learn.adafruit.com/adafruit-feather-rp2040-pico/pinouts),
  [Basys 3 reference manual](https://digilent.com/reference/programmable-logic/basys-3/reference-manual),
  [Wio Terminal hardware overview](https://wiki.seeedstudio.com/Wio-Terminal-Getting-Started/).
- **November 2026 illustration review.** The independent reviewer opened all
  196 boards at 390 × 844 and compared the pin picker and diagram counts on
  every mapped board. Forty journeys covered five representative boards in both
  themes at 360 × 800, 390 × 844, 412 × 915 and 844 × 390. After correcting
  the Freedom KL25Z touch slider, 16 additional journeys checked the Freedom
  and micro:bit at those sizes. Keyboard, touch, full-view selection, overflow
  and browser-error checks passed in Chrome touch emulation. The reviewer used
  the mobile criteria in AGENTS.md because the standalone mobile-mojo skill
  file was unavailable. Physical-device and mechanical validation were outside
  this browser review.
- **Distinguishing roles**: color + on-pad number + text role label +
  legend — never color alone. Reserved and strap pins additionally carry
  notes explaining *why* they're risky.
- **Alternate functions**: aliases render under the primary label
  (`GPIO2 · SDA1`); the inspector and copy export include them.
- **Multiple connectors**: grouped layout today; planned: connector
  selector tabs when a board gains >1 mapped header.
- **Planned interactions**: pin search/filter box (highlight matching pads,
  dim the rest), role-legend click-to-highlight, zoom/pan on the full
  `/pinout/[id]` page for high-density boards, and a per-pinout source
  reference ("mapped from <source>") displayed under the map.

## 6. Board Detail UX

Ordered by decision priority — identity → safety → pin map → context:

1. **Identity**: vendor mark, name, vendor/family, category.
2. **Spec sheet**: Processor, Logic level, Power, Format — four rows, no
   more; everything else lives in description/tags.
3. **Before you wire**: the warnings and the one source to verify them
   against, as a single orange-ruled panel. This is the panel's only
   imperative, and it comes before the map it applies to.
4. **Pin map tabs** (the centerpiece, above the fold on desktop).
5. **Why it matters** (highlights).
6. **Source references**: every link typed (Docs/Pinout/Datasheet/
   Schematic/Manual) and badged **Official** (host or GitHub org belongs to
   the board vendor) or **3rd-party** (anything else — including
   authoritative-but-external sources like CircuitPython `pins.c`).
7. Planned: revision-notes block for boards whose warnings are
   revision-specific; "Similar boards" (same category + shared interfaces);
   copy-summary action; last-verified date once data carries it.

Overwhelm control: fixed section order, one screen-width of content per
section, warnings capped to genuinely hardware-critical items (everything
else is a note on the specific pin).

## 7. Search and Filter UX

- **Fields searched**: name, vendor, family, processor, category, tags,
  interfaces, description, warnings — so "strap", "5V tolerant", or
  "RP2040" all work today.
- **Ranking**: per-token scoring, all tokens must match, word-boundary name
  matches dominate.
- **Filters**: the rail carries Category, Manufacturer, Processor family,
  Interface, Logic level, Power input, Form factor, Wireless, Documentation,
  and Has-pin-map. Every option shows how many catalog boards it holds
  (counted with the filter predicate itself). Active filters render as
  removable chips in the command bar plus a Reset link.
  - Long facets (Manufacturer, Processor family) use `FacetMenu`
    (`src/components/catalog/FacetMenu.tsx`): a themed list that opens in
    place inside its panel (the rail scrolls, so a floating popup would be
    clipped), with a type-to-narrow field, counts in Geist Mono, a cyan check
    on the chosen value, and vendor marks beside manufacturers. No native
    `<select>` in the rail.
  - Short machine-name facets (Interface, Logic level) are a wrapping grid of
    mono tokens (`.ph-token`); prose-label facets stay as stacked lists.
  - Option hover fills are CSS classes (`.ph-token`, `.ph-filter-option`), not
    `hover:bg-white/…` utilities, which the light theme would paint at rest.
- **Match reason badge**: a result row names the field that matched only when
  the reader cannot see it already. Name and spec hits get no badge; vendor,
  interface, warning, and description hits do (`shownMatchReason`).
- **Clear behavior**: chips remove one filter; Reset clears query + all
  filters + favorites-only in one tap.
- **Sorting**: relevance when a query exists, curated catalog order
  otherwise. The shared `SortMenu` (`src/components/catalog/SortMenu.tsx`)
  offers name, vendor, recently added, and most interfaces in both the
  catalog and discovery toolbars: an opaque raised list, a neutral fill for
  the highlighted row, cyan for the chosen sort. No native `<select>` here.
- **Card text**: one-sentence description (at most 100 characters), processor
  at most 36, logic level at most 32 (enforced in
  `test/catalog-integrity.test.ts`). Lead with what the board is and the one
  or two things that set it apart; details go in highlights and warnings.
- **No results**: dashed panel, plain-language suggestion, single Reset
  action. Never an empty void.
- **Planned**: query suggestions (top vendors/interfaces as one-tap tokens
  under a focused empty search), `voltage:3.3` style field prefixes.

## 8. Trust and Safety UX

Pinout data can destroy hardware; provenance is a first-class UI concern.

- **Provenance badges**: derived in `src/lib/source-trust.ts` from the
  link's host (and GitHub org) against a per-vendor domain registry — no
  hand-annotation to drift out of date. Official = emerald + BadgeCheck;
  3rd-party = neutral chip whose tooltip says to cross-check.
- **Typed source links**: every board carries ≥1 typed link (content rule);
  the type chip tells users what they'll open before they click.
- **Warning taxonomy** (data lives in `warnings[]` + per-pin `note`s):
  voltage tolerance ("GPIO is 3.3V, not 5V tolerant"), boot-strap pins,
  reserved pins (HAT EEPROM, flash lines), alternate-function caveats,
  revision risk ("Rev 1.x swaps I2C pins — check your silkscreen").
- **Surfacing tiers**: count chip on the result row → orange "Before you
  wire" panel in detail → per-pin notes in the map/inspector → connector
  notes under the map.
- **Verify affordance**: the "Before you wire" panel ends in the verify
  link, so opening the vendor doc is part of reading the cautions rather
  than a separate strip.
- **Disclaimer**: one calm footer line on every screen; not repeated
  per-component.
- **Planned**: `lastVerified` date on boards and per-pinout `source` refs
  ("mapped from Raspberry Pi datasheet §5.2"), rendered as small mono
  captions under the map.

## 9. Responsive Design

- **Desktop (≥1024px)**: three-column workspace (15rem rail / fluid list /
  clamped detail), rail and detail independently sticky+scrollable under
  the command bar. Max content width 1560px.
- **Tablet / narrow (<1024px)**: single column. Filters collapse behind the
  command-bar toggle (badge shows active count, choosing a filter closes
  the sheet); detail stacks below results; selecting a board smooth-scrolls
  to it; "Back to results" returns.
- **Mobile**: command bar controls scroll horizontally in one row (no tall
  stacks), safe-area insets respected, hit targets ≥44px. Pin maps stay
  usable because both presentations are **container-query** driven: pads
  shrink (`size-9`→`size-11` by container), grouped grids re-flow by
  auto-fill, and the dual-row map keeps labels adjacent to pads at any
  panel width. The board page's pin workbench (`/boards/[id]#pins`) is the
  escape hatch for deep inspection on small screens.
- Planned refinement: bottom-sheet detail on phones (drag to expand map).

## 10. Interaction Details

- `/` focuses search from anywhere (unless typing in a field); `Esc`
  clears+blurs; `Enter` selects top result; `↑/↓` walk results.
- Row hover: border lightens, background lifts one step. Selection: cyan
  left accent + tinted background + soft glow — unmissable, not loud.
- Favorite: star toggles instantly (optimistic localStorage write), syncs
  across tabs via the storage event; the filter button breathes amber and
  the star does a spin-pop on hover (removed under reduced motion).
- Pin pads: hover ring + leader-line draw (transform/opacity only);
  focus-visible gets a glow ring; selection persists in the inspector.
- Copy table: button flips to a green "Copied" check for 2s; clipboard
  failure degrades silently to idle.
- Filter chips animate nothing — they appear/disappear instantly; speed is
  the microinteraction.
- Source links open in new tabs (`noopener noreferrer`), arrow icon
  signals external navigation, hover tints toward the accent.
- Planned: toast on favorite add ("Saved — filter with ★"), copyable pin
  inspector rows, resizable detail column.

## 11. Accessibility

- Full keyboard operability: search shortcuts, arrow-key result walking,
  tabbable pin pads, real `<button>`/`<a>` semantics everywhere.
- Visible focus: global 2px cyan `:focus-visible` outline; SVG pads get a
  drop-shadow ring.
- Screen readers: `aria-pressed` on toggles/rows, `aria-live` result count
  and copy confirmation, `role=tablist/tab/tabpanel` on pin-map tabs,
  `pinAccessibleLabel()` speaks position, label, role, aliases, and note
  for every pad; decorative art is `aria-hidden` + `pointer-events:none`.
- Pin classification is never color-only: number + text label + legend +
  spoken label accompany every hue.
- Contrast: body text zinc-200/400 on near-black passes AA; chip text is
  the 100-weight tint on a 10–15% alpha fill — verify AA per role hue.
- Reduced motion: every animation (background drift, star pop, pad rings)
  is removed under `prefers-reduced-motion`, composition unchanged.
- Hit targets ≥44px on touch (pads, stars, chips-as-buttons).
- The static pin map is the accessible table equivalent of the SVG diagram;
  keep both presentations data-identical (build-time validation enforces).

## 12. Frontend Implementation Guidance

Next.js App Router, TypeScript, Tailwind v4. Current structure is sound;
extend rather than replace:

```
src/app/page.tsx                 → renders <PinHubApp/> (client)
src/app/boards/[id]/page.tsx     → SSG board page with the pin workbench
src/components/PinHubApp.tsx     → shell: header, command bar, 3 columns
src/components/PinoutTabs.tsx    → static/dynamic segmented control
src/components/PinoutDiagram.tsx → static map (dual-row + grouped)
src/components/CopyPinTable.tsx  → clipboard export (client)
src/components/board-visual/*    → SVG diagram, inspector, legend, table
src/lib/boards.ts                → typed static catalog (source of truth)
src/lib/source-trust.ts          → provenance classification
src/lib/board-visuals*.ts        → geometry + build-time validation
```

- **Data model**: keep the static typed array until user submissions demand
  a DB. Next additions: `lastVerified?: string`, `revisionNotes?: string[]`,
  `Pinout.source?: SourceLink`, optional `Pin.voltageNote`.
- **State**: local component state + `useSyncExternalStore` for
  localStorage-backed prefs (favorites, tab choice) — no state library.
  Search entries and counts precomputed at module scope.
- **Responsive strategy**: viewport breakpoints for the page grid only;
  **container queries** (`@container`) for anything inside the detail
  panel, per the panel's 21–32rem clamp.
- **Performance**: catalog is fully static (SSG); memoized filtering is
  O(n) over precomputed lowercase search entries — fine to ~1k boards.
  Beyond that: virtualize the result list (`content-visibility:auto`
  first, then a windowing lib) and move scoring to a worker only if
  profiling demands. Keep `boards.ts` tree-shakeable per-page if bundle
  size grows (split pinouts into per-board modules loaded on selection).
- **Icons**: lucide-react, named imports only.
- **Validation gate**: the board-visual build-time validation must stay
  green; any new pinout data must pass anchor/data sync checks.

## 13. Deliverables & Roadmap

**Concept summary**: bench-instrument catalog; pin map as centerpiece;
provenance and hardware safety encoded in a strict color language; density
and keyboard speed over decoration. Sections 2–4 are the layout spec,
5–8 the interaction spec, 12 the component inventory.

**Roadmap**:

- **Phase 1 — trust & scan speed (implemented in this change)**:
  warning-count chips on result rows; Official/3rd-party provenance badges
  on source links (derived, host-based); Verify-before-wiring strip;
  arrow-key result navigation; Copy-table export of pin maps.
- **Phase 2 — data depth**: `lastVerified` + per-pinout source refs;
  revision-notes block; voltage + has-pin-map filter facets; pin search
  within the map.
- **Phase 3 — pin map power**: legend click-to-highlight; zoom/pan on the
  full pinout page; connector selector for multi-header boards; similar
  boards.
- **Phase 4 — scale**: result virtualization past ~200 boards; per-board
  pinout code-splitting; query field prefixes (`voltage:`, `vendor:`);
  mobile bottom-sheet detail.

## 14. Board page and shared header (2026-09-24)

- **Shared header**: board, pinout, comparison, collection, privacy, and 404
  pages share `SiteHeader`: the wordmark (home), the three section links, and
  the theme toggle. Below 640 px the section links take their own row.
- **Board page** (`/boards/[id]`): a title block (identity, description,
  protocol-tinted interface chips, actions) beside a ruled key/value spec
  table like a datasheet's front page. The pin map then leads the page, with
  the "Before you wire" panel beside it (before it on phones, by DOM order).
  Price, revision notes, and sources follow in the side column.
- **Home first screen**: "Common boards" lists four widely used reference
  boards with vendor mark and logic level. It does not rank them or claim
  popularity, because PinHub has no usage data.
- **Logic caption**: under a 3.3 V logic level the UI quotes an explicit
  "Not 5 V tolerant" from the record (logic level, warnings, or connector
  notes), says "Treat as not 5 V tolerant" when the record is silent, and
  shows nothing when the record describes any 5 V tolerance itself
  (`fiveVoltCaution`).

## 15. Pin readout (2026-09-26)

- One card for the pin under the probe (`PinDetails`, shared by every
  readout): a "Pin" eyebrow and the role chip, the physical position in large
  light mono beside the signal label and aliases, then the net line and any
  orange pin note. The card's left rule uses the role hue.
- Actions (Copy, Report, Clear) appear only for a pinned pin, in one ruled
  row. Narrow cards (below 280 px, such as the Pi workbench sidebar) show a
  three-up icon-over-label tray instead.
- The Raspberry Pi workbench's logic line quotes `fiveVoltCaution`, like the
  board page, rather than fixed copy.

## 16. Pin planner (2026-09-26)

- A full-width "Plan pins" section on the board page and under the full
  pinout sheet, never in the catalog detail panel: the panel is too narrow
  for a stepper grid, results table, and export preview without pushing the
  pin map out of view.
- Planned pads get a dashed ring in the function's role hue, drawn with the
  role's lighter `ink` step, and the rest of the board recedes. The probe
  keeps its solid cyan ring, so "planned" and "probed" never look alike.
  Since 2026-11-25 no role colour shares the probe's `#22d3ee`: I2C moved to
  blue (`edge` `#8aa8fb`, OKLCH hue 268°), and `test/role-colors.test.ts`
  keeps every role step away from the probe.
- Results are a Geist Mono table. "default" (the source's default pin) and
  "routed" (placed through a GPIO matrix) are neutral zinc chips. Every
  caution is an orange row quoting the source.
- A board without source-backed pin functions shows one neutral line and the
  data-error report link, never a guessed plan.

## 17. Cautions, prices, and finish (2026-09-30)

- **Before you wire** drops its orange leading-edge rule. The panel is a
  neutral opaque surface with zinc-200 body text at 14 px; orange marks only
  the hazard parts: a warm header band, a diamond bullet per caution, the
  count chip, and the border.
- **Board price** is green, the colour of what a board costs, distinct from
  the bluer emerald of official sources. The card reads like a shelf tag: a
  "Board price" eyebrow and the retailer on one line, the amount in large
  Geist Mono beside the variant, and a perforated (dashed) rule above a single
  "Last checked" line (USD and tax terms live on the Prices page). The Prices nav link, price amounts, and "View store"
  buttons use the same green.
- **Stock before click-out** (2026-10-04): the price card footer and the
  compare price cell carry the same stock line as the Prices page, from one
  helper (`stockStatus`). A flat 6 px indicator LED leads the label: filled
  emerald "In stock at check", solid ring "Out of stock at check", dashed ring
  "Check with seller" when the check is over two hours old, unknown, or the
  clock is not yet known. The label always carries the meaning; the LED never
  glows.
- **Finish**: no gradient-filled wordmarks, no glowing dots or coloured
  bloom shadows, no hover lifts on rows and chips, and an opaque command bar
  (no backdrop blur). Selection is a flat tint plus the cyan border.

## 18. Planner page (2026-10-02)

Supersedes the placement in section 16: the planner is its own section,
`/planner`, in the header nav beside Pin Maps. Board pages, the full pinout
view, and the catalog panel link to it ("Plan pins on this board") instead of
embedding it.

- **Two steps.** Pick a board (search, with a tag per result: emerald
  "Auto-assign" where pin functions are source-backed, neutral "Manual" for a
  pin map only, a disabled "No pin map" row otherwise), then plan it.
- **The sheet, not the board.** The planner draws a connector chart: a 2×N
  header's two rows side by side, a module's two edges apart, large pads,
  labels out to either side, and no illustrated components, copper, or
  Raspberry Pi artwork. It claims nothing about the board around the pins.
  Other layouts use their usual pad positions on a flat outline.
- **Touch scale.** Planner and link sheets use a 44 × 44 CSS px hit region
  on touch devices. Targets stay within the connector pitch and the sheet
  scrolls inside its panel. Dynamic board views open fitted and provide
  this scale through **Zoom to touch size**. The inspector also offers
  **Zoom labels** and **Working size** while zoomed. Scroll instructions
  and keyboard access accompany drawings that overflow their viewport.
- **Link sheets show the linked connector.** On `/link` each sheet is framed
  on the connectors (pin groups) its wires use, whole, with their labels, and
  a **Whole board** toggle opens it out. A two-row header is one connector and
  is never cut in half. A sheet still wider than its panel opens scrolled to
  the linked pins. With only a precise pointer (`(hover: hover) and (pointer:
  fine)`, and no `any-pointer: coarse`) a link sheet may shrink to its legible
  minimum (0.7 px per unit) instead of touch scale, and when a sheet cannot
  legibly fit half the row the pair stacks so both ends of each wire stay on
  screen. Touch devices keep the 44 px rule above.
- **Three marks, never alike.** Solid neutral ring = claimed by hand. Dashed
  ring in the role's `ink` = auto-assigned. Solid cyan = the probe, and
  nothing else. Free pads recede to half strength once a plan exists; they
  must stay readable, because they are what gets claimed next.
- **Claiming.** Selecting a pad opens the pin editor, which rides the bottom
  of the window so it is on screen whichever pad was picked. A claim's name is
  the user's text: it appears in the readout, the "Your pins" table, and the
  exports, never as a label on the drawing, where it could be mistaken for
  catalog data.
- **Nothing moves under a finger.** The readout above the sheet reserves its
  full height: a line that collapsed on touch would shift the pads between
  touch-down and touch-up.
- **Cautions** for a claimed pin come only from the record (the pin's flags
  with the board's notes, and the reserved role), in the same orange rows as
  auto-assigned pins. Board-level cautions appear before the planner drawing;
  every caution is listed, none folded behind a button, and a single-source
  map's unverified disclosure stays first in that list.
- **Section nav** holds four links on one row down to 360 px: below 400 px
  the icons give way to the labels. Links are 44 px tall at every width.

## 19. Board link (2026-10-04)

`/link`, in the header nav between Planner and Compare. Two boards and a bus
in, the wire list out, with each board's cautions in the notes. Updates the section-nav note in section 18: five links
now share the row, so the icons give way to the labels below 480 px and the
padding tightens below 400 px.

- **The harness is the signature.** Each wire is a row: a ferrule for the pin
  on board A (position cell and Geist Mono label, outlined in the wire's hue),
  the run, and the ferrule on board B. The run's arrowhead says which way the
  signal travels (none on ground). Wire hues are the role `ink` steps for UART
  and I2C and the ground grey; never the probe's cyan.
- **The shifter is drawn where it goes.** When the records call for a level
  shifter, an orange "LS" block is spliced into every signal run, and the
  verdict strip above turns orange. Orange stays hardware caution only.
- **Verdict before wires.** Matching levels get a neutral strip; a mismatch,
  an unsettled level, or a blocked link gets the orange one, worded from the
  records (`logicLevel`, `fiveVoltCaution`).
- **Cautions once.** A ferrule with a recorded caution carries an orange
  mark; the notes themselves are quoted once under the harness, with every
  pin that shares a note listed together.
- **Sheets, not boards.** Both boards are drawn as the planner's connector
  sheet with the linked pads ringed (dashed, role ink). Tapping a row or a
  ringed pad selects that wire on both. A sheet much wider than tall takes
  the full row so its labels stay readable.
- **Scope.** UART and I2C only. SPI is named as absent, with the reason, next
  to the bus switch.

## 20. Pin check (2026-11-10)

`/check`, in the header nav between Planner and Link. Code and a board in; each
pin the code uses, checked against the record, out. Six sections now share the
nav row: below 560 px the icons give way to the labels, and the padding
tightens below 440 px and again below 380 px (measured to fit from 360 px).

- **The editor is the signature.** A plain textarea over a mirrored `<pre>`:
  the textarea keeps caret, selection, IME and undo with its text made
  transparent; the mirror draws the same text with each pin reference
  underlined in its status color and, after each line, a hint naming the pins
  it touches (`IO34 · pin 5 · Input-only pin`). Hints are set in Geist Mono
  (they carry pin names an engineer transcribes) and top-aligned inside a
  mirror line that is exactly one `--check-line` tall, so hints can never
  push the mirror or gutter out of step with the textarea. Lines never wrap,
  so the layers share geometry and only scroll is synced. Comments are
  dimmed and strings tinted (`.ph-check-tok-comment`, `.ph-check-tok-string`);
  nothing else is syntax-colored. The gutter carries an orange rule on lines
  with a finding. Touch screens get a 16 px code face so iOS does not zoom.
  While a scan of new text is pending, the last scan's marks stay drawn,
  moved past the edit, so underlines never blink out while typing.
- **Editing keeps undo.** Tab indents every line the selection touches (two
  spaces at a bare caret), Shift+Tab outdents, and Clear empties the editor;
  all three go through the browser's own editing command, so Ctrl+Z undoes
  them. Escape, then Tab, moves focus out of the editor; the footer says so.
  A paste past 100,000 characters keeps the first 100,000, says so under the
  editor, and the verdict cannot read as clear while that notice shows. Code
  with more than 400 pin references gets the same treatment: a notice in the
  same style ("Only the first 400 pin references were checked. The rest of
  the code was not.") and a verdict that cannot read as clear.
- **Status shapes.** Each status has its own shape and glyph, used alike in
  the summary strip, the tally, the editor hints and the card badges, so none
  is told by color alone (the light theme draws fix and check in the same
  orange): fix = a filled orange square with `✕`, check = an orange ring with
  `!`, clear = emerald with `✓`, not matched to the board's record = a grey
  `?` (and a grey wavy underline in the editor). Cyan is interaction and selection: the
  caret, focus ring, hover borders, links, line chips, and the selected pin's
  marks, card, strip pad and sheet probe.
- **The summary is a header.** A one-line verdict (`2 pins to fix`), the
  tally, and the code's pins as pads on a rail in report order. The verdict
  reads as all clear only when every reference was matched to a clear pin and
  the whole input was checked; references not matched to the board's record
  and values the scanner could not follow (including any past the 100 it
  lists) count in the tally and keep the verdict at "check". Each pad is a
  44 px button that selects its pin.
- **Cards, worst first.** Pad in the pin's role colors with its position,
  silkscreen name, SDK name, place on the connector, the code's uses, and
  line links that scroll the editor without focusing it (no keyboard on a
  phone). Findings quote the source note under a quiet rule.
- **Nothing inferred.** Findings come from the pin's flags with the board's
  notes, its role, and the presence of a recorded function. Values the
  scanner cannot follow are listed for a hand check rather than guessed, and
  how bare numbers were matched (Arduino numbers, GPIO numbers, or physical
  pins) is stated under the report.
- **Layout.** One column (board, editor, report, sheet) below a 60 rem
  container; above it, the editor and sheet on the left and the board and
  report on the right.

## 21. One board page, one filter row, a Tools menu (2026-11-23)

PinHub had grown three views of a board (the catalog panel, `/boards/[id]`,
and `/pinout/[id]`) and, on the pin map, two near-identical rows of chips
("Show pins by capability" and "Highlight by primary role") with different
meanings. The header held six equal links whose names ("Check", "Link") did
not say what they did. This pass makes PinHub easier to read for someone who
is not already a PinHub user, without dropping any hardware fact.

- **One board page.** `/boards/[id]` carries the full workbench that used to
  live on `/pinout/[id]`. `next.config.ts` redirects `/pinout/:id` (and its
  preview image) with a 308, and the query string passes through, so a
  shared `?pin=` still selects its pin. The catalog panel stays the quick
  look; its "Full view" link opens `/boards/[id]#pins`.
- **One filter row.** "Show pins" chips filter the table *and* dim the pads
  the table leaves out, through `BoardStage`'s `highlight` set; the same
  0.28 opacity a role highlight uses, so the drawing reads one rule. The
  active chips live in `?show=` (validated, at most one per category, in
  display order). An old `?role=` seeds the matching chip; a role with no
  chip (debug, system, alternate) stays a highlight with a "Stop
  highlighting" control. The role legend becomes `PinColorKey`, a passive
  key: colour is read, not pressed. The alternate-function caveat shows only
  while a chip is on, which is when it applies.
- **Tools menu.** The nav is Pin Maps · Compare · Prices · Tools. Tools is a
  disclosure (button + links, not an ARIA menu) listing Pin planner, Code
  check, and Connect two boards, each with one sentence on what it does.
  It sits last so the list opens leftward from the row's end and fits a
  360 px screen. Each tool keeps one name in the menu, its page heading, and
  its `<title>`.
- **One header.** Compare and Prices now wear `SiteHeader` like every other
  secondary page; only the catalog keeps its larger brand header with the
  catalog readout.
- **Button text sizes.** An unlayered `button, input { font: inherit }` reset
  in `globals.css` outranked every layered Tailwind text utility, so an
  11 px chip rendered at 16 px and a mono label in the UI font. Tailwind's
  preflight already applies the reset inside its base layer, so the copy was
  removed; `test/global-css.test.ts` keeps it out.
- **Light theme.** Nav and Tools hover fills are `.ph-nav-link` and
  `.ph-tools-item` rules with light counterparts. Since 2026-11-25 the light
  theme names every alpha-suffixed and state-variant colour class exactly,
  with each `hover:`, `focus:` and `disabled:` rule gated on its state; the
  old `[class*="bg-white/"]` substring rules also caught `hover:` classes and
  painted hover fills at rest. `test/global-css.test.ts` fails on a class
  with no rule and on any substring colour selector.

## 22. Board finder (2026-11-23)

`/find`, first in the Tools menu. The question it answers is the one people
ask before they own a board: "which boards can take everything my project
needs, at once?" A catalog filter that lists "has I2C, has SPI" cannot answer
it, because buses compete for the same pins; the pin planner can.

- **Same engine, same budget.** `findBoards` (`src/lib/board-finder.ts`) runs
  `planPins` with the planner's `defaultPlanStepBudget` on every board with
  source-backed pin functions, so a board listed as a fit opens in the
  planner (`/planner?board=…&plan=…`) as exactly that plan. A search that runs
  out of steps returns `exhausted: true` and is listed as undecided, never as
  a fit or a miss. Boards without pin-function data are counted and named as
  unchecked; nothing is inferred from labels.
- **Server-side.** The page plans on the server from `searchParams`, so full
  pin maps stay out of the browser. The worst catalog-wide request measured
  ~200 ms. `FindControls` writes every change to the URL with
  `router.replace` inside a transition; counts update optimistically and the
  results dim (`aria-busy`) until the new plan arrives.
- **URL boundary.** `?plan=` reuses `parsePlanParam` (64 characters, counts
  0–8). `platform`, `logic`, and `wireless` accept only their listed values,
  a repeated key is ignored, and a query over 256 characters is read as
  empty rather than cut down into a different request.
- **Filters** come from the discovery profile: platform (`computeClass`),
  logic level (`logicProfile`, never inferred tolerance), and wireless.
- **Results.** Clean fits first, then fits that need pins with recorded
  cautions (orange note: read them in the plan), each group in catalog order;
  no ranking beyond that. Each card shows up to four assignment lines in
  Geist Mono ("I2C0 · SDA GP4 · SCL GP5"), the board's caution count, an
  "Open this plan" primary action (`.ph-find-open`, solid cyan with a light
  counterpart), and a Pin map link. The first 24 fits show. "Show 24 more of
  N boards that fit" asks the server for the next page (`?show=48`), and
  focus moves to the first new board; fits are never rendered hidden.
  Misses list the planner's own reason and open by default when
  nothing fits.
- **Examples** are named by what they connect ("SPI display + I2C sensor"),
  never by a product, and disappear once anything is asked for. Focus then
  moves to the form's heading, as it does after "Start over".


## 23. Settings (2026-11-27)

A gear button beside the theme toggle, in both headers, opens the settings
dialog: a modal (`role="dialog"`, focus moved in and trapped; Escape, the
scrim, or Close shuts it and focus returns to the gear), portalled to
`<body>` so no header can clip it, up to 48rem wide and scrolling inside
itself on a phone. Every choice applies at once, so the page behind the scrim
previews a colorway; there is no Save step.

- **Colorway.** Five skins for the chrome, each with a dark and a light
  variant, so Light/Dark/System still applies on top. Stored as
  `pinhub.colorway` and set as `data-colorway` on the root before first
  paint (the layout script reads `colorwayBootScript` from
  `src/lib/colorway-options.ts`, which accepts only known ids). Workbench,
  the default, sets no attribute, so the stock styles are untouched.
  - *Workbench*: the original graphite and cyan.
  - *Fab Purple*: hobby-fab purple solder mask, orchid accent, softer corners.
  - *Blueprint*: cyanotype blue, chalk-white accent, square corners, a
    drafting grid behind the panels (whiteprint in light mode).
  - *Silkscreen*: black mask and white legend. The high-contrast option:
    pure ground, brighter secondary text, firmer borders, 3 px focus.
  - *Anodized*: brushed-aluminum backdrop, indigo accent, milled corners.

  A colorway retints through variables only: `--background`, `--panel`,
  `--well`, `--panel-border`, the Tailwind cyan ramp (the interaction color,
  wherever a utility uses it), the zinc text ramp, `--radius-*`, and the
  `--ph-accent-*`/`--ph-ink-*`/`--ph-line-rgb` inks that the light-theme
  rules now use instead of literal hex. **What never changes:** the meaning
  colors (orange caution, emerald official, green prices, amber favorites)
  and the pin map (role hues, the probe, the board stage), so a board reads
  the same in every skin. Each accent stays clear of those hues, which is why
  there is no green, orange, or gold colorway. The picker tiles draw a strip
  of header pads in each colorway's own colors, pin 1 square, for whichever
  of light or dark is showing.
- **Light or dark: System / Light / Dark.** The one-tap toggle always sets an
  explicit theme, which used to leave no way back to the operating-system
  setting. "System" removes `pinhub.theme`; while it is chosen, a change in
  the OS setting repaints the page live. The toggle and the panel read one
  store (`src/lib/theme.ts`).
- **Motion: Match system / Reduce.** "Reduce" stores `pinhub.motion` and sets
  `data-motion="reduce"` on the root before first paint (layout script). One
  CSS rule then zeroes every transition, animation, and smooth scroll, and
  every JS-initiated scroll goes through `prefersReducedMotion()` /
  `scrollBehavior()` in `src/lib/motion.ts`. There is no "force motion on":
  a system request for less motion is always honored.
- **Pin maps open in: Static / Dynamic.** The same `pinhub.pinoutTab` value
  the board's tab control writes; both read `src/lib/pinout-tab.ts`.
- **Saved in this browser.** Favorite and library counts, "Clear" for
  favorites, and "Clear everything PinHub saved", each asking once with a
  Cancel. Clearing everything removes exactly the keys the privacy page lists
  (`storedItems`) and sends one null-key `storage` event so every open store
  re-reads without a reload. A refused removal is reported, never claimed.
- **Look.** Each setting is a native radio group drawn as a segmented
  control (`.ph-settings-segment`/`.ph-settings-option`); the checked option
  takes the pin map tabs' cyan selection fill. Destructive buttons stay
  neutral: no colour here means "danger", since orange is reserved for
  hardware caution. Every colour has a light-theme rule.
