# PinHub Design Overhaul Proposal

A complete UI/UX direction for PinHub: a searchable, source-backed pinout
catalog for dev boards, SBCs, and microcontrollers. This document is the
reference for implementing the redesign; the "Roadmap" section at the end
orders the work. Phase 1 items are implemented in this repository.

---

## 1. Product Direction

PinHub should feel like a bench instrument, not a website: a dark, dense,
always-ready lookup surface where an engineer lands mid-task ("which pin is
SDA on the Pico?"), gets the answer in under ten seconds, and trusts it enough
to wire against. The redesign keeps the catalog as the first screen and makes
three things unmistakable at every level of the UI: **where the data came
from** (official vs third-party provenance on every link and pin map),
**what can damage hardware** (warnings surfaced at scan time, not buried in a
detail tab), and **that the pin map is the product** (the interactive
connector map is the visual and interactive center of the board view, with
static and dynamic presentations of the same source-backed data). Everything
decorative is subordinate to lookup speed: the blueprint backdrop stays behind
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
│ · Interface  │ · relevance-ranked    │ · Verify-before-wiring│
│ · (Voltage)  │                       │ · Pin map (tabs)      │
│ · (Sources)  │                       │ · Highlights/Warnings │
│ · Curation   │                       │ · Source references   │
└──────────────┴───────────────────────┴───────────────────────┘
  Footer: disclaimer + catalog stats
```

- **Header** — identity strip only: logo, one-line purpose statement, live
  catalog metrics (boards, interfaces, source links), GitHub. Never grows.
- **Command bar** — sticky. Search input (`/` shortcut), mobile Filters
  toggle with active-count badge, live result count, Favorites toggle,
  removable active-filter chips, Reset.
- **Filter rail** (left, 15rem) — Category and Interface panels with counts;
  planned: Logic-level and Has-pin-map facets. Curation note explains why
  some boards lack in-app maps.
- **Catalog** (center, fluid) — single-column list of compact result rows,
  relevance-ranked when a query is present.
- **Detail panel** (right, `clamp(21rem, 30vw, 32rem)`, sticky, scrolls
  independently) — identity, specs, verify affordance, pin map tabs,
  highlights, warnings, sources. Container-query driven: it adapts to its own width, never the
  viewport.
- **Full pinout page** (`/pinout/[id]`) — the pin map at full width for
  deep inspection, shareable/bookmarkable per board.
- **Favorites** — localStorage-backed, star on every row + global filter.
- **Mobile** — same DOM, single column: command bar stays sticky, filters
  collapse behind the toggle, detail panel stacks below results with a
  "Back to results" escape hatch and smooth scroll-into-view on select.

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
- **Result rows**: compact cards (~96px), left accent border for selection
  state. Row anatomy: vendor logo · board name · category chip ·
  green "Pin map" chip (in-app map exists) · orange shield chip with the
  count of wiring cautions · right-aligned mono `vendor · logic level` ·
  two-line description · up to 7 interface chips + overflow count · star.
  Warnings are therefore visible **at scan time**, before selection.
- **Selected board panel**: identity block (vendor mark, name, family),
  4-row spec sheet (Processor / Logic / Power / Format), then the
  **Verify before wiring** strip — an orange affordance linking directly to
  the highest-authority source (Pinout > Datasheet > Schematic > Manual >
  Docs) — then the pin map tabs, highlights, warnings, and the source list
  with per-link provenance badges.
- **Trust communication**: green = data present and vendor-official
  (Pin map chip, Official badge); orange = caution (warning chips, verify
  strip, "Check before wiring" block); neutral zinc = third-party or
  metadata. The footer repeats the disclaimer on every screen.

## 4. Visual Design System

**Palette** (roles, not decoration — dark-only, `color-scheme: dark`):

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
| text | white / zinc-200 / zinc-400 / zinc-500 | 4-step hierarchy |

Pin-role colors are a separate 13-hue scale (power red, ground zinc, GPIO
emerald, I2C cyan, SPI amber, UART sky, ADC violet, DAC rose, PWM fuchsia,
debug lime, system orange, alt teal, reserved stone) defined once in
`board-visual/roles.ts` and reused by chips, SVG pads, legend, and table so
every rendering of a pin agrees.

- **Background**: static graphite instrument plates with a masked micro-grid,
  brushed texture, and legible PCB traces (`CircuitBackground`) confined to the
  desktop gutters. All widgets
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
3. **Verify before wiring**: one orange strip linking the single
   highest-authority source. This is the panel's only imperative.
4. **Pin map tabs** (the centerpiece, above the fold on desktop).
5. **Why it matters** (highlights) and **Check before wiring** (warnings,
   orange-tinted panel) side-by-side where width allows.
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
- **Filters**: Category (with counts), Interface, Favorites; active filters
  render as removable chips in the command bar plus a Reset link. Planned
  facets: logic level (1.8/3.3/5V), has-pin-map, source-type availability,
  has-warnings.
- **Clear behavior**: chips remove one filter; Reset clears query + all
  filters + favorites-only in one tap.
- **Sorting**: relevance when a query exists, curated catalog order
  otherwise. Planned: explicit sort control (name, vendor, recently added).
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
- **Surfacing tiers**: count chip on the result row → orange "Check before
  wiring" panel in detail → per-pin notes in the map/inspector → connector
  notes under the map.
- **Verify affordance**: the orange strip makes "open the vendor doc" a
  one-click ritual rather than fine print.
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
  stacks), safe-area insets respected, hit targets ≥36px. Pin maps stay
  usable because both presentations are **container-query** driven: pads
  shrink (`size-9`→`size-11` by container), grouped grids re-flow by
  auto-fill, and the dual-row map keeps labels adjacent to pads at any
  panel width. The full `/pinout/[id]` page is the escape hatch for deep
  inspection on small screens.
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
- Hit targets ≥36px on touch (pads, stars, chips-as-buttons).
- The static pin map is the accessible table equivalent of the SVG diagram;
  keep both presentations data-identical (build-time validation enforces).

## 12. Frontend Implementation Guidance

Next.js App Router, TypeScript, Tailwind v4. Current structure is sound;
extend rather than replace:

```
src/app/page.tsx                 → renders <PinHubApp/> (client)
src/app/pinout/[id]/page.tsx     → SSG full-page pin map
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
