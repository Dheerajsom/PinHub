# Pin lookup — September 29, 2026

The catalog search now answers pin queries above its existing board results.
Examples exercised: `pico sda`, `rpi5 spi`, `esp32 gpio27`, `uno pwm`, and
`pico gp26`. Bare numbered labels such as `GP26`, `PA5`, and `D13` search
exact labels and whole aliases across boards. There is no substring matching
for bare labels and no inference of unrecorded alternate functions.

## Design and behavior

The answer is a connector schedule, left aligned within the results column:

```text
Search: pico sda
Pin lookup
Raspberry Pi Pico
  Pin 6   GP4    I2C   I2C0
  I2C0 SDA
  Pin 26  GP20   I2C   I2C0
  I2C0 SDA
Existing board results
```

The established tokens remain: graphite `#090b0f`, raised panel `#14161d`,
recessed well `#0e1015`, interaction cyan `#67e8f9`, caution orange `#fdba74`,
and text `#e4e4e7`. Geist carries UI text; Geist Mono carries pin names,
positions, aliases, and nets. Role badges reuse `board-visual/roles.ts`.
Both themes use the existing surface and color rules. Recorded pin notes and
flags appear beside matches. No new board data or electrical claims were added.

The final query token is a function or label; preceding tokens resolve boards
through the existing search index. Equally ranked board variants remain visible.
Results cap at eight boards and 64 pins with visible truncation feedback.
Queries cap at 256 characters and 32 tokens, matching board search limits.
Normal board search scoring and summaries are unchanged.

## Delivery and boundaries

`GET /api/pins` serves a static index with the catalog API method, query
rejection, and cache rules. The browser fetches it only for a recognized
pin-like query, reuses the download, validates its shape and capacity, and
offers retry after a loading failure. Pin-like detection recognizes numbered
GPIO/port/Arduino labels and board-qualified role or common signal tokens.
The index is not embedded in the initial catalog payload, and no runtime
`boards.ts` import was added to the client.

Measured from the production API response:

| Measure | Value |
| --- | ---: |
| Boards with mapped pins | 141 |
| Pins | 5,653 |
| JSON bytes (UTF-8) | 544,727 |
| Gzip bytes (Node gzip default) | 62,143 |

This is larger than the brief's minimal index because it also carries the
actual geometry key, connector group, derived net, pin note, and flags needed
to answer safely without another download. Notes, flags, and net derivation
come from the existing source-backed records.

`/pinout/<id>?role=i2c` restores the role chip; `?pin=g1%3A0` restores a
group-qualified geometry anchor. Parsing validates the key against the current
board's anchors and the role against its actual roles. Unknown, duplicate,
hostile, and overlong values are dropped. Serialization applies the same checks.
Role/pin actions push browser-history checkpoints; reload and Back restore them.
The client URL reader is under Suspense; production output still reports every
pinout route as SSG with `dynamicParams = false`. Catalog Full view links carry
the current role and pin selection.

The CLI accepts `ph pico sda` and `ph rpi5 --role spi`, including matching-row
JSON output and normal terminal formatting flags. The generator writes lookup
records for all mapped boards, including flagship boards, and mirrors the pure
matcher into the standalone package. `check:boards` verifies both generated
lookup artifacts. Terminal text is sanitized and wrapped through the existing
render helpers. Missing signals return an error instead of guessed pins.

## Verification

Baseline on the new branch: lint and typecheck passed; 459 unit/component
tests passed. Final checks passed:

- Web lint and typecheck.
- Web Vitest: 49 files, 466 tests.
- Production build, including board visual/source validation and static routes.
- Playwright against the production server: 81 browser tests.
- CLI generated catalog/lookup consistency, lint, 139 tests, and TypeScript build.
- Desktop screenshots at 1440 × 1000 in both themes; no page errors.
- Mobile-mojo subagent audited the final production build with touch Chrome
  emulation at 360 × 800, 390 × 844, 412 × 915, and 844 × 390.

New regressions cover alias/role matches, ambiguity, grouped keys with reused
positions, missing records, query caps, index boundaries, URL round-trips and
hostile values, CLI filtering/sanitization, lazy network behavior, and the
catalog answer → ringed pin → refresh → role link → browser Back journey.

The mobile audit found a 40-pixel role target. The fix adds a targeted
44-pixel minimum that takes precedence over the existing coarse-pointer CSS;
a Playwright touch regression asserts it. The final audit measured I2C at
47.31 × 44 px and lookup rows at least 56 px high. All tested states fit the
document width and showed a visible 2-pixel focus outline. No remaining
confirmed mobile regressions or page/console errors appeared.

Local screenshot evidence is in `test-results/lookup-desktop-{dark,light}.png`
and `test-results/pinout-desktop-{dark,light}.png`. The mobile audit's JSON and
screenshots are in `C:/Users/dheer/AppData/Local/Temp/pinhub-mobile/`.
These generated screenshots are intentionally excluded from Git.

## Limits

Answers reflect only recorded roles, labels, aliases, and derived nets; they
are not a complete silicon mux planner. Generic unnumbered labels outside the
recognized query grammar do not activate lazy lookup. Board-level catalog
filters continue to govern the normal results; pin answers describe the query
independently. Pinout explorer text/category filters remain local UI state.
Mobile coverage is Chrome emulation, not physical devices; Safari, real virtual
keyboards, and network outage recovery were not exercised by the mobile audit.

The unrelated `next-env.d.ts` and pin-plan snapshot modifications are excluded
from the feature commit. No PR was requested or opened; this work publishes
only `feature/pin-lookup`.
