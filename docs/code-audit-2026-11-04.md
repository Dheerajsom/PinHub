# Council UX corrections — 2026-11-04

## Scope

Follow-up to the independent product, code, and browser review of
`4f0250aa071a82c2723b189fe323adc42414f4ee`. Work is on
`fix/council-ux-quality`. The target is at least 9/10 from every applicable
council seat, with final mobile-mojo verification before publishing.

The dense catalog, static source-backed data, existing visual language,
lightweight summaries, and on-demand detail/pin-index requests are preserved.
No database, new routes, or production deployment is part of this change.

## Corrections

- Standalone references show board logic/tolerance guidance, every board
  caution, verification provenance, and official documentation. Catalog details
  no longer fold late voltage/strap/reserved/revision restrictions away.
- Shared pin-caution rendering carries notes and source-backed flag explanations
  through Static/Dynamic maps, readouts, tables, paper schedules, and exports.
  Pad accessible names identify recorded flags. Unpinned hover readouts do not
  issue live announcements.
- Capability filters and pin search consult recorded alternate functions and
  matrix routing, respecting input-only restrictions. Primary-role highlighting
  is labeled separately; missing metadata is not presented as proof of absence.
- Lookup ranks board identities before chip/family matches, puts recorded defaults
  before labelled pins and alternate routes, and previews two pins per board.
  Per-board disclosures and a bounded scroll region keep the answer compact;
  Show more boards exposes later matches with an explicit count. Only matched
  function text appears, and human-readable flag labels replace raw identifiers.
  Comparison lookup starts collapsed. A page-session fetch revalidates the
  stable index URL so older deployment caches cannot hide new metadata.
  Board lists use the board qualifier of a pin query, with an explanation,
  instead of contradicting successful pin answers with an empty state. Lookup
  also respects active facets/favorites and includes recorded alternate signals.
- Catalog and comparison share catalog-order defaults, board-query semantics,
  and platform/connector terminology. The narrower catalog category is
  explained and collapsed; connector filtering precedes saved-library content. Catalog rows expose compact
  caution counts and exceptional no-map status. Comparison facts precede a
  collapsed informational overlap panel.
- Mobile detail/result scroll margins follow the measured sticky controls;
  query-only searches no longer allocate a separate Reset row. Light-theme
  fallback interface chips have readable dark text on an opaque pale fill.
- Complete print schedules are independent of screen filters, collapsed tables,
  and scroll caps. Connector orientation/notes and a printed source URL are
  retained; connector names repeat on continued pages. Content-bearing Link wire controls remain printable. Copied
  wire lists retain endpoint cautions; pin/table exports retain recorded safety
  context and existing Markdown/CSV escaping.
- Favorites and collection creation/membership/deletion/Undo distinguish stored
  outcomes from changes kept for this visit only. Persistence notices do not
  disappear before they can be read. Capacity feedback remains visible and
  announced; Undo pauses while focused and returns focus to the collection rail.
- Large shared collections explicitly name their four-board comparison subset;
  card-specific Compare actions include their own board. Clipboard failures
  have live feedback, retry, and selectable-link recovery for collections.
  Copy completion is bound to its original pin/request, so delayed writes cannot
  claim the newly selected pin was copied.
- Interfaces and Source references have heading semantics; boards without a map
  have no empty presentation switches. Design/route documentation describes
  the final behavior. Vendor marks keep explicit dimensions; the tiny catalog
  logo uses eager loading without an unused preload.

The CLI pin index and matcher were regenerated from their website sources;
generated records were not edited manually. No CLI publication is included.

## Verification before independent revised review

- Baseline: lint, typecheck and 1,671 tests passed before edits.
- Application lint: pass.
- Typecheck (`tsc --noEmit --incremental false`): pass.
- Vitest: 73 files / 1,725 tests pass, including new real-board safety,
  capability, export, persistence, comparison-subset and clipboard regressions.
- Production build: pass, including 800 generated pages and the existing
  source/visual validation gates.
- Playwright against the production build: **127/127 pass with retries disabled**
  (`npm run test:e2e -- --workers=4 --retries=0 --reporter=line`, reusing the
  already-running production server). Coverage
  includes all four required phone viewports in both themes, existing planner,
  Link, comparison, catalog, collection and pinout journeys, plus new mobile
  clearance, contrast, lookup-coherence and print-content assertions.
- CLI: generated catalog check, lint, 139 tests, and TypeScript build pass.

The first browser runs identified an actual print override problem and loss of
the collection-capacity live status; both were corrected. Tests were also
updated for intentional collapsed comparison analysis, catalog-order defaults,
correct PWM results, and precise board-title selection. The final full run is
green; earlier failures are not counted as passes. Post-round-3 validation also
caught a misplaced client directive and test-harness assumptions about pin names
and duplicate status text; these were corrected before the recorded passes.

## Council and mobile gate

The initial scores were product 7, code 6.5, and UI 8. The second product/code
review found lookup flooding, analog-only GPIO false positives, GPIO lookup
inconsistency, missing printed orientation notes, and a stale clipboard race.
These were corrected with real-record regressions before the final review.
The second browser pass was stopped when its snapshot was superseded; it is
not counted as a final mobile gate or passing score.

All seats in each round assess the same frozen uncommitted snapshot. Reports,
SHA-256 manifests, browser screenshots and paper PDF evidence are retained in
`%TEMP%/pinhub-council-20261104/`, with the third-round reports under `round3/` and post-review correction
evidence under `correction-drafts/`.
Round 3 scored product 8.5, code 8, UI/mobile 9.3. The UI/mobile seat passed
all required viewport/theme coverage, while code/product identified banked GPIO
names, alias-only capabilities, comparison voltage evidence and selected-pin
arrival as remaining material gaps. These were corrected and verified in
subsequent snapshots. The user explicitly extended the default three-round limit by one focused
council round, including a final mobile recheck, before committing and pushing.
Round 4 passed product at 9.2 and UI/mobile at 9.3; code scored 8.5 after
finding numbered-net/TWI omissions and punctuation-token identity rejection.
Those two code findings are corrected after the frozen review: numbered net
families are preserved, explicit TWI clock context is recognized, and qualifier
normalization handles decimal versions while keeping + variants distinct.
A displayed-name sweep covers all 190 mapped boards, and an independent comparison
with the existing Link signal parser found no I2C/UART omissions. These recall
checks supplement cross-surface parity, which alone cannot prove completeness.
The user approved up to two further focused verification rounds, stopping
as soon as every applicable seat reaches 9/10, then committing and pushing.
Round 5 passed code at 9.2 but product scored 8.5 after reproducing compact
decimal/revision shorthand failures and missing readable function explanations.
Its unfinished mobile review was superseded when those fixes became necessary;
it does not count as a pass. Whole compact identities are now checked before
splitting punctuation, with meaningful + and numeric boundaries retained.
R3 can identify Rev3 without rewriting literal R4 names. Processor core counts
and dot/dash/slash-only qualifiers cannot create board identities. The lazy index
keeps each peripheral attached to its instance and signal, so matched I2C lines
and PWM timer channels remain readable. Numbered nets retain recorded line
aliases. Regression sweeps require every mapped board's spaced and glued display
name to rank that board first and every matched family row to have an explanation.
Round 6 assessed that revised snapshot before publication.
Round 6 passed code at 9.6; product scored 8.8 after reproducing a remaining
decimal-family/spaced-revision regression. Its unfinished mobile run was stopped
as superseded, so it is not a passing final gate. The subsequent correction keeps
decimal boundaries as well as compact names, joins adjacent rev/R (including
the conventional trailing period) and number tokens, and rejects standalone
plus-only qualifiers. Display labels omit a
repeated peripheral prefix when the instance already names it. Real-record tests
cover Teensy4/Teensy3, spaced revision forms across the mapped catalog, plus-only
input, and the existing exact-version/plus/numeric safeguards. This post-round-6
correction passed the full local checks before renewed independent signoff.
The user subsequently resumed the task and explicitly instructed the coordinator
to continue until the review is finished, then commit and push the changes. This
extends the earlier review-round limit. The saved application snapshot and all
344 manifest hashes were verified unchanged on resumption; only this audit's
authorization/status text changed before the round-7 frozen review.

Round 7 independently passed every applicable seat:

| Seat | Exact model | Explicit effort | Score | Verdict |
| --- | --- | --- | --- | --- |
| Product UX/coherence | claude-opus-5-5 | high | 9.1/10 | Pass |
| Code UX correctness | gpt-6.1-sol | xhigh | 10/10 | Pass |
| UI/browser and final mobile-mojo | gpt-6.1-sol | xhigh | 9.4/10 | Pass |

All seats reviewed the same 62 staged paths, candidate tree
`38e7c948656602e8a1e81bac4747bd9e75ecf428`, exact 344-file manifest SHA256
`68889524d81e5dd1c3758a663a74d5d9f0115b9fa05a5aed53f9d36f06bd6b42`,
and production BUILD_ID `Vixqs_7-lrTnwnzrVzg1x`. Each verified all hashes, the
exact file set and Git/build state before and after review, with no drift.
Models and effort settings were explicitly dispatched from resolved capabilities;
no substitutes were used. Current-round conclusions were not shared before
initial reports. Read-only behavior was instructed rather than technically
enforced. No P0-P2 defect or required correction remained in the final scope.

The UI seat read and applied mobile-mojo, freshly exercised desktop and exact
360x800, 390x844, 412x915 and 844x390 in both themes, and inspected screenshots,
overflow, sticky controls, focus/keyboard/navigation, pin arrival/reveal/panning,
line explanations, loading/error/retry and adjacent capability/safety states.
All 20 instrumented interaction-phase records contained zero captured application
errors; instrumentation starts after initial paint, so this is not a full startup
log guarantee. Its environment used CSS resizing with a desktop UA and no touch
emulation. The product seat independently supplemented this with the same four
phone sizes in both themes using mobile UA/touch emulation, reporting no console
errors or document overflow. Broad unchanged journeys and paper references reuse
the explicitly attributed earlier independent coverage.

Acceptance is at least 9/10 from every applicable seat, with the final required
mobile gate complete. After review, only factual audit status/score text changed;
application sources remain identical to the reviewed snapshot. Publication targets
`fix/council-ux-quality`; the delivery record identifies the commit and remote SHA
verification. Seven council rounds were used with the user's explicit extensions.

Digital GPIO classification is shared by the capability explorer and lazy pin
lookup. Explicit analog-only notes override MCU identities; an ADC-only name is
insufficient to imply digital I/O. Input-only digital GPIO remains eligible.
The relevant Nano/Pro Mini, ESP8266, Cmod A7, UNO, and ESP32 cases are covered.
Banked forms such as GPIO1_B7, GPIO0_23, GPIOA.14 and GPIOAO_8 are recognized.
Filters and lookup share recorded-alias matching without inventing planner
instances. Orange Pi 5 retains 17 GPIO and 9 PWM candidates. An exhaustive
1,140-category check across 190 mapped boards found no lookup/filter differences.
Explicit power/ground/reserved roles and input-only output restrictions take
precedence over capability-name tokens.

Comparison tolerance uses the same explicit warnings and connector-note evidence
as the logic caution. Undocumented 3.3 V behavior remains Unknown in comparison;
partial tolerance remains Mixed. An explicit never-apply-5-V-to-IO instruction
is treated as recorded non-tolerance, rather than an inferred 3.3 V restriction.

A valid per-pin link shows its pin identity, physical position, aliases and
recorded cautions near the heading. Its diagram action pans and focuses the
selected pad, including right-header pins on phones. Invalid keys produce no
fabricated selection. The summary is excluded from the complete paper schedule.

Long print labels may wrap within their fixed-width signal column; the Lattice
160-pin and Cmod 60-pin A4 samples have no measured signal-column overflow.

Actual A4 PDFs were checked for complete rows, connector orientation, source
URLs and repeated connector headers, including ESP32 and the long Milk-V map.
They are evidence of paper layout, not physical wiring validation.

## Remaining nonblocking findings and polish

The final product seat documented a minor false-empty lookup for uncommon
separator spellings such as `uno r4 - sda` and `pi 3 model b + gpio2`. Ordinary
supported names/variants work and no wrong pin is shown; the correct catalog
cards remain available. A future correction should attach a separated plus to
the preceding identity token and ignore other separator-only tokens while
preserving the all-punctuation empty case. This predates the final correction
and was explicitly nonblocking at 9.1/10.

`pico gpio2` remains unsupported where the record uses `GP2`; `pico gp2` works.
The final product seat identifies this as pre-existing on main and optional,
not a new regression or an electrical capability claim. A future naming-equivalence
change should be limited to source-supported RP2xxx namespaces and retain exact
label/numeric-boundary regressions.

Accepted earlier polish includes nuanced conservative Unknown tolerance summaries
on two records, match-tier/primary-role terminology and preview ordering,
restating alternate timer functions in selected-pin summaries, sparse ESP32 paper
pagination, and long source labels visually shortened despite full accessible
names. These are not represented as fixed or used to claim a perfect product.

## Limits

Browser regressions use Chrome desktop/mobile emulation; this is not physical
device, mobile Safari, virtual-keyboard, screen-reader, or electrical validation.
Viewport-specific screenshot/focus/overflow evidence is required from the
independent mobile reviewer. External vendor data was not re-audited against
current silicon/datasheets. This change preserves and presents existing recorded
restrictions and sources; it cannot establish electrical compatibility or
completeness of undocumented pin capabilities. No performance benchmark is
claimed, and the existing summary/detail loading boundary remains a gate.

## Corrective follow-up: embedded Raspberry Pi map usability

The user's screenshot demonstrated a usability failure that the council's
passing scores did not catch. A desktop catalog detail panel measured 334 px
inside the map, while the SVG's touch-size calculation forced the entire board
to 1,552 px wide and about 1,088 px high. Only numbered pads and a cropped part
of the board were initially visible; the physical-pin picker and readout sat
below the oversized artwork (the readout began around page y=1,608).

The earlier review accepted internal diagram panning and verified the larger
inspector, but did not establish that an engineer could identify and select a
named pin in this narrow embedded state. A lack of document-wide overflow and
44 px SVG hit regions were insufficient acceptance criteria. The prior council
scores must not be used as evidence that this state was usable.

`RaspberryPiPinout` now puts labelled physical pin pairs first. It preserves
the source pairing (GPIO 1/2, Pico 1/40), numbers, aliases, notes and warnings.
The connector is a bounded vertical list with buttons at least 48 px high;
selection details follow it, or sit beside it in a wide container. The
physical-pin selector is above the list and reveals its selection within that
list. Arrow keys, Home/End, Enter and Escape support keyboard use.

Board artwork is available under **Board overview and orientation**, fitted to
the container and noninteractive. **Inspect** and **Full view** retain the full
interactive drawing. Role highlighting is optional so it no longer pushes the
named pins down the initial panel. Source data, loading boundaries and electrical
claims are unchanged. The design notes now distinguish interactive inspector
touch targets from the fitted embedded overview.

Three component regressions cover source pair ordering, named selection,
keyboard movement, picker selection and clearing. Five new browser regressions
cover the embedded catalog at 360, 390, 412, 844 and 1280 px, including the
narrow desktop detail panel. Existing Pi and mobile release gates now check the
new interaction rather than the removed artwork zoom controls.

The independent mobile check also caught a misleading shared empty-state hint:
the new connector requires Enter to select a focused pin, whereas the hint
promised that arrowing alone inspected it. The readout now says to select a
pin, and the embedded connector explicitly explains arrows followed by Enter.

Final automated verification: lint and typecheck passed; all 1,728 unit tests
in 74 files passed; the production build passed (BUILD_ID
`zNMDuUbJVjYWCHQPddeD5`); all 132 Chrome browser regressions passed without
retries against that production server. The first broad browser run had eight
failures because the older release-gate test still required the removed zoom
controls; it was updated to verify named-pin selection, source pairing,
keyboard access and fitted overview. Those failed attempts are not counted as
passes. Browser logs and screenshots are in the local temporary evidence folder
`pinhub-compact-map-fix`.

The independent mobile-mojo subagent passed the final affected flows at
360×800, 390×844, 412×915, 844×390 and the 1280×800 narrow desktop catalog,
in both themes. It inspected screenshots and exercised named pins 3/40,
the picker, copy/readout, cautions/source links, keyboard navigation,
role highlighting, fitted overview, Inspect/focus return and Full view.
Pi 4, Zero 2 W and Pico 2 W source pairing and endpoint readouts were also
checked at 390 px. No remaining correction was identified in that scope.
The final report and screenshot evidence are in the local temporary
`pinhub-compact-map-fix/mobile` directory.

The shared T3 preview became inconsistent after the production restart,
reporting mismatched viewport sizes and stale frames. Those attempts were
not counted as final coverage. The reviewer finished in an isolated Chrome
Playwright browser with exact viewport and touch/mobile emulation. This is
focused verification of the reported embedded-map failure, not a new full
council score or physical-device, Safari, screen-reader or hardware validation.
