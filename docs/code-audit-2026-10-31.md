# Pre-shipping review — 2026-10-31

Follow-up to `4566b1a` and `docs/board-additions-2026-10-31.md`.

## Hardware provenance

The three Nucleo-32 maps (L432KC, G431KB, F303K8), three Libre Computer maps
(Alta, Solitude, Tritium H5), and three Orange Pi maps (Zero 2W, 3B, 5 Plus)
still lack a complete independent second-source comparison. The ST UM2397
manual request exceeded the web reader's size limit; Orange Pi wiki requests
timed out. Successful access to a product page would not establish the
correctness of every header position.

The accepted resolution is explicit labeling. Every affected record now starts
with an **Unverified pinout** warning explaining the single checked vendor
source and requiring comparison against the exact board revision's schematic
or manual before wiring. The connector notes carry the same disclosure so it
travels with copied pin tables. The warning is first so a folded caution list
cannot conceal it. The generated terminal catalog was regenerated from the
shared records rather than edited by hand.

Direct planner links now show the existing wiring-cautions component. Board
link notes include each board's recorded warnings, attributed by board name,
including blocked results and copied wire lists. CSV plan exports retain board
cautions; code and JSON exports carry the revision-specific disclosure.
Regression coverage checks the nine records, connector notes, link results,
and every offered plan export format.

The disclosure is a provenance limit, not a claim that the maps have been
verified against a second source. Physical hardware and electrical behavior
have not been tested.

## UI review

The required mobile-mojo subagent read the installed skill at
`C:/Users/dheer/.codex/skills/mobile-mojo/SKILL.md`. It also read frontend-design
and applied the React best-practices review for its component changes. The
original skill-not-loaded mobile check is superseded by this review.

Confirmed issues fixed:

- Pin-table selectors were 20 px tall; footer and planner/comparison source
  links also fell below the required target size. These now have minimum
  44 × 44 CSS px targets.
- Discovery's wireless/documentation selects lacked accessible names and were
  40 px tall. Both are named, 44 px tall, and use 16 px phone text. The related
  filter, favorites, clear-search, and clear-all buttons meet the same size
  requirement.
- The adjacent control scan found small comparison cards/tray actions, facet
  summaries, catalog favorite stars and GitHub action, pin-search matches,
  search-clear/filter-clear actions, compact-map source/table actions, and
  desktop variants of those controls. The last scan also covered theme,
  sidebar token, recent-board, back-to-results, and physical-pin schedule
  actions. Their actual hit regions now meet the same minimum. Catalog titles
  use a stretched whole-card overlay and were
  assessed by that actual hit area rather than the title text's bounding box.
- Interactive SVG targets shrank below 44 px. A shared sizing helper keeps
  invisible hit areas within the connector pitch and grows the drawing to a
  usable scale. Overflow stays inside the diagram rather than widening the
  page. The rule covers planner/link sheets, full inspectors, generic compact
  diagrams, and Raspberry Pi compact artwork, including keyboard models.
- The inspector's fit-to-width action reduced labels to a few pixels. It now
  offers **Zoom labels** / **Working size**, retaining readable, tappable
  diagrams and the complete pin table in both modes.
- Escape did not close the planner pin editor. It now closes the editor and
  returns focus to the selected pad.
- Review caught the new inline minimum width overriding compact Pi zoom's
  CSS width. Zoom now grows the physical drawing and resets to working size;
  the default scroll area is keyboard focusable and named. Browser coverage
  measures the frame before/after zoom and checks keyboard panning.
- Long Nucleo pin-function source labels wrap inside a bounded link with a
  shrinking text span, preserving the 44 px target without page overflow.

The design retains opaque panels, existing typefaces and semantic colors,
visible focus, and the catalog-first layout. README route descriptions and
the design guide describe the resulting behavior.

The final skill-loaded gate **passed** against the same frozen production build
as the full browser suite. No waiver was used.

- **64 mobile visual/interaction cases:** eight layouts at 360 × 800,
  390 × 844, 412 × 915, and 844 × 390, each in dark and light themes.
  Layouts covered Nucleo-G431KB, Teensy 4.1, ItsyBitsy M4, ESP32-S3 Feather,
  and Raspberry Pi 4 planners; Pi 500+ and Pico compact artwork; and a generic
  ItsyBitsy compact diagram. Exact `window.innerWidth` and theme were asserted.
- **20 desktop cases:** those eight layouts at 1280 × 900 in both themes,
  plus board-link and expanded-inspector views in both themes.
- **32 supplementary HTML-control scans:** scanned catalog, planner, link,
  pinout, board-detail, and comparison states, including desktop variants and
  populated/filtered controls. No undersized controls remained in the scanned
  screens. Stretched link overlays were assessed by their real hit regions.
- The eight release journeys also exercised long picker/link names, claiming,
  auto-assignment, refresh persistence, Escape/focus return, source expansion,
  wire selection, pin-search matches, empty-filter recovery, compact zoom
  growth/reset, keyboard scrolling, and comparison selection/removal.
- The subagent inspected eight layout contact sheets (80 captures), the four
  desktop link/inspector captures, and four release-gate contact sheets
  (32 captures). Root also inspected final Nucleo and light inspector evidence.
  Zero page overflow, console errors, or uncaught page exceptions were recorded
  in the additional audit. No confirmed UI regressions remain in these flows.

Local evidence and the reproduction script are under
`C:/Users/dheer/.codex/visualizations/2026/10/31/01a1943d-a23f-7373-a0c6-c00f2323bb1e/`:
`mobile-mojo-results.json` (84 cases), `html-control-scan.json` (32 screens),
`mobile-mojo-audit.cjs`, individual screenshots, and `*-contact.png` sheets.

## Repository state

The existing expansion commit was fast-forwarded onto local `main`, following
the repository's main-branch rule. The Next.js-generated AGENTS heading change
is retained with this work; the generator recreates it during development.

## Verification

- Baseline: lint and typecheck passed; all 1,632 unit/component tests passed.
- CLI after regenerating the cautions: `check:boards` verified 191 generated
  records, lint passed, all 139 tests passed, and its TypeScript build passed.
- Final application lint and typecheck passed; all **1,644 tests** across
  68 files passed after the final control cleanup.
- `npm run build` passed after the final cleanup, generating all 800 static
  pages.
- `CI=1 npm run test:e2e -- --workers=4 --retries=0 --reporter=list` passed
  **104/104 cases in 52.5 seconds** against the production build. This includes
  the eight new viewport/theme release-gate cases. Target-size assertions wait
  for entrance animations to settle and round SVG floating-point geometry to
  0.001 px; the 44 px requirement is retained. Keyboard panning is required
  when content overflows, while landscape layouts that fit are checked for
  focusability and complete content instead.
- The final mobile-mojo screenshot/control-size recheck passed: **84 cases**
  plus **32 control scans**, with no remaining confirmed findings.

Catalog totals were independently re-derived: 196 boards, 190 pin maps,
126 planner-capable boards, 178 UART link boards, and 181 I2C link boards.

The build validates local application/catalog constraints. It does not prove
remote documentation availability or electrical correctness. Mobile coverage
uses Chrome emulation, not physical phones or iOS Safari; virtual-keyboard and
safe-area behavior on those devices remains untested.
