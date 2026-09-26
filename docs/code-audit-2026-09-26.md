# Report a pin error — 2026-09-26

Branch `feature/pin-error-reports`. Adds a way for an engineer who spots a
wrong pin to open a pre-filled GitHub issue in two clicks: pin the pin, then
choose **Report**. PinHub sends nothing itself; the link opens GitHub's issue
form, which the engineer reviews and submits under their own account.

Reviewed before changing: the three pin readouts (`PinDetails` inside the
generic `BoardPinoutVisualization`, the Inspect modal / `/pinout/[id]`
`InspectorBody`, and the Raspberry Pi `RaspberryPiPinout` workbench), the
"Before you wire" panel (`WiringCautions`) on the board page and the catalog
detail panel, `source-trust.ts`, `board-id.ts`, the light-theme overrides in
`globals.css`, the privacy page, and CONTRIBUTING.

## What shipped

| Piece | Detail |
| --- | --- |
| Issue form | `.github/ISSUE_TEMPLATE/pin-data-error.yml`, label `data-error`. Fields (ids are the prefill contract): `board` (required), `pin`, `connector`, `problem` (required dropdown: wrong label, role, position, alias, hardware warning, source link, revision/variant difference, other), `expected` (required), `evidence` (required; third-party sources must be labeled, and a hardware measurement is accepted when there is no document), `revision`, `pinhub_source`. |
| Blank issues | No `config.yml`. The repo had no issue templates, and GitHub keeps blank issues enabled by default, so adding a config would change nothing. |
| URL builder | `src/lib/pin-report.ts`: `pinReportUrl({ board, pin?, connector?, source? })` and `pinReportContextFor(board)`. Pure, built on `repoUrl` and `URLSearchParams`. Title `Pin data: <board> pin <n> (<label>)` or `Board data: <board>`. |
| Pin entry point | `PinDetails` shows **Report** (flag icon + text) beside the copy button, only while a pin is pinned. Accessible name `Report an error in pin 12 GPIO18 (opens GitHub in a new tab)`. Wired in all three readouts, so it works for dual-row boards, the 58 `grouped` boards, and the Raspberry Pi workbench. |
| Board entry point | "Report a data error" is the last row of "Before you wire", under the verify link, on both the board page and the catalog detail panel. |
| Privacy | New "Reporting a data error" section: the link opens GitHub, carries only catalog details, needs a GitHub account, and PinHub stores and sends nothing. |
| CONTRIBUTING | "Reporting a pinout error" points to the in-app links and the form. |

## Boundaries

- Only catalog data goes into the URL. No text a visitor typed is used.
- The board id must pass `isBoardId`, or the builder returns null and no link
  renders. A pin position must be a non-negative safe integer.
- Every value has C0/C1 controls (so newlines and tabs), zero-width, bidi
  override/isolate, and line/paragraph separators replaced, whitespace
  collapsed, and a 200-character cap counted in code points so a cut never
  splits a surrogate pair.
- The cited source must pass `isSafeExternalUrl`, fit in 200 characters, and
  need no cleaning. Otherwise it is dropped whole rather than trimmed into a
  different address.
- The URL must stay under 2,000 characters. Optional context is dropped
  (source first, then connector) until it fits; if the required fields alone
  cannot fit, the builder returns null. A catalog-wide test checks every pin
  of every board produces a full-context URL under the limit (the longest,
  `lattice-machxo3l-starter` pin 1, is 564 characters).
- Spaces are written as `%20`, and `·`, `+`, `/`, `&` are percent-encoded, so no
  value can spill into another parameter.
- Links use HTTPS, `target="_blank"`, and `rel="noopener noreferrer"`.
- Payload: no board data or summary module changed, and `pin-report.ts`
  imports only types from `boards.ts`, so the catalog payload and the
  `/api/boards` index are unchanged.

## Bugs fixed

| Area | Finding | Change |
| --- | --- | --- |
| Cited source | The pin readout labeled "Mapped source" and the Pi workbench's "Verify in … documentation" link used the first `Pinout`-type link (or the first link), while "Before you wire" used `verificationSourceFor`. On 25 boards with a drawing they named different documents on the same page (for example, Pi Zero's readout cited its product page while "Before you wire" cited the GPIO documentation). The data does not record which document a map was drawn from, so "Mapped source" also claimed more than the record backs. A report would have cited whichever one the view happened to show. | Every readout, the workbench link, and the report's `pinhub_source` use `verificationSourceFor`. The readout says "Verify against". Regression tests in `test/pin-report-links.test.tsx` fail on the old selection. |
| Pi workbench touch (landscape) | In the side-by-side workbench layout (container ≥ 650 px, e.g. an 844 × 390 phone), the board was vertically centred in a row whose height is set by the readout. A tap's pointerdown switches the readout to that pin, the readout changes height, and the centred board slid under the finger (54 px between an empty and a pinned readout on the Pi 5) before the synthesized click, which then landed on another element: the pad never pinned. The same shift happens on `main` (instrumented: the page shrinks 26 px between `mousedown` and `mouseup`), but there the page was scrolled to its end, and the browser's scroll clamp happened to cancel the shift. The taller "Before you wire" panel removed that accident, and the existing landscape e2e case for the Pi 4 and Pi 5 failed every time. | The board is anchored to the top of its canvas, so pad positions no longer depend on readout content. New e2e case "pads stay put while the readout changes" measures the pad's page position across empty, pinned, and cleared states; it fails by 54 px with the old CSS. |

## Design pass (frontend-design)

The brief is PinHub's documented language, so the pass was about restraint:
reporting is a utility action, so it is neither the caution orange nor the probe cyan.

- **Pin readout:** `Report` sits beside the copy icon in 11 px zinc ink with a
  flag icon. It underlines on hover, and hover ink uses `hover:text-white`,
  which the light theme already remaps. No hover background, because
  `hover:bg-white/…` matches the light theme's `bg-white/` substring rule and
  would tint the link at rest. It is 44 px tall (`min-h-11`).
- **Before you wire:** the report row closes the panel. It shares the caution
  surface and rule (`.ph-cautions-report`, with a light-theme counterpart) but
  uses neutral zinc ink, a flag icon, and a mono `GitHub` tag saying where the
  link goes. The verify link above it only rounds its bottom corners when it is
  the last row.
- Checked in both themes on desktop from production-build screenshots: pin
  readout (rest and hover), grouped Uno readout, the cautions panel, the Pi
  workbench, and the privacy section.

## Verification

- `npm run lint`, `npm run typecheck`: clean.
- `npm test`: 39 files, 324 tests (baseline 37 / 304). New:
  `test/pin-report.test.ts` (13: template ids read from the YAML as text,
  encoding, control/bidi stripping, caps, URL limit and fallback, bad ids,
  unsafe sources, grouped layouts, every catalog pin) and
  `test/pin-report-links.test.tsx` (7: link only when pinned, href, grouped
  connector, cited-source consistency in the inspector and Pi workbench,
  cautions row).
- `npm run build`: passes (includes the board-visual and source-link gates).
- `npm run test:e2e`: 74 passed. New `e2e/pin-reports.spec.ts` (pin 12 on
  `/pinout/raspberry-pi-5` decoded field by field, the Pi workbench, the board
  page, and the catalog detail panel, in both themes; colours asserted with
  `toHaveCSS`) and the landscape layout case.
- CLI checks: not run. No shared board type or data changed.
- Mobile gate (mobile-mojo subagent, production build, real Playwright
  viewports with touch): 360 × 800, 390 × 844, and 412 × 915 in dark; 390 × 844
  and 844 × 390 in both themes. Journeys: pin 12 on `/pinout/raspberry-pi-5`
  (table row and pad), the Pi 5 workbench (picker and pad taps), the grouped
  Uno Rev3 (A0 pad, connector carries the group), hover-only shows no link,
  the board-level row on the board page and the catalog detail panel, the
  landscape pad-anchoring fix on the Pi 5, Pi 4 Model B, and Pi 500, and
  `/privacy`. Result: pass, no defects. Every report link measured 44 px tall,
  keyboard Tab reached each with a visible focus ring, neutral ink in both
  themes, no horizontal overflow, and no console or page errors. Pads pinned
  on the first tap, and their page position held within 0.2 px across empty,
  pinned, and cleared readouts. 88 screenshots were reviewed; I spot-checked
  the 360 px grouped readout, the 844 × 390 light Pi 5, and the 360 px detail
  panel. Not covered: a real screen reader and a physical device.

## Limits

- The `data-error` label does not exist in the GitHub repo yet. GitHub only
  applies template labels that already exist, so it must be created once
  (`gh label create data-error`) for reports to be labeled.
- GitHub's issue-form prefill is a documented URL convention, not something
  this repo can test end to end. The tests pin the contract on PinHub's side
  (field ids match the template and values decode exactly).
- The pin-level link follows the readout, which (existing behaviour) shows a
  hovered pad while another is pinned. The link always matches the pin the
  readout names, but moving the pointer to the link returns the readout to the
  pinned pin.
- The static list tab has no pinning, so it has no per-pin Report link; the
  board-level link covers it.
- `next dev` intermittently throws `Unexpected end of JSON input` (a Next.js
  internal `JSON.parse`, no PinHub frame) on cold compiles under parallel e2e
  load. It surfaced as one failed e2e case on the first run of two suites and
  never on a warm server. Not changed here.
