# PinHub code audit — 2026-09-04

Reviewed the web application, shared catalog utilities, board-detail API, pinout rendering and exports, search and URL state, personal library, price snapshot validation/refresh, CLI command/rendering paths, and verification configuration. Existing catalog summaries, detail-request deduplication, source validation, bounded search, and static page generation already provide useful performance and correctness safeguards.

## Fixed findings

| Area | Finding | Change and evidence |
| --- | --- | --- |
| Saved collections | Creation could exceed the 24 collections accepted on reload. Undo at capacity could silently evict a different collection. | Enforce the same limit at creation/restoration, explain capacity in both collection entry points, and preserve other collections during undo. Unit tests cover reload and replacement/undo; mobile tests cover capacity feedback. |
| Library normalization | All records were normalized before slicing to capacity; duplicate normalized collection IDs remained ambiguous. | Stop collecting after capacity, stop collecting board IDs at their limit, and deduplicate collection IDs. |
| Library updates | Reopening the most recent board and redundant mutations rewrote local storage and notified all subscribers. | Return without writes or snapshot changes for no-op mutations; regression verifies subscriber and storage calls. |
| URL/source lookup | Plain object lookup accepted inherited keys. `sort=constructor` escaped the sort whitelist; unknown vendors named like object properties could crash source classification. | Require own properties, with regression coverage for `constructor`, `__proto__`, and `toString`. |
| Detail requests | A stalled fetch or response body could leave a board indefinitely loading, sharing that pending request with every retry attempt. | Abort after 15 seconds, clear the timer/pending entry, retain the existing retry flow. A fake-timer regression covers a stalled response body followed by successful retry. |
| Pinout scrolling | Each scroll event allocated new edge-hint state, rerendering the inspector even when its hints had not changed. | Preserve the state snapshot while the scroll region is unchanged. Mobile panning and Fit width were rechecked. |
| Discovery search | Search ranking ran before cheap facet filtering. | Apply facets first, avoiding scoring boards that cannot be shown. |
| Price rendering | Price/date cells constructed identical Intl formatters repeatedly. | Reuse module-level USD/date formatters. Existing formatting and freshness tests pass. |
| Copy feedback | Earlier copy timers could clear feedback for a later copy and were not cleaned up on unmount. | Track, replace, and clean up the copy timer. |
| Compact catalog | At 360px, result cards extended 28px past the viewport and clipped an action. | Use an explicit single grid column with a zero minimum. Browser overflow assertion and screenshots confirm the fix. |
| Light theme | Prices navigation used an opacity-suffixed color class that bypassed the theme override. | Use the existing amber theme token; browser color regression added. |
| Verification | TypeScript excluded React test files; Web CI did not trigger for or run browser tests. | Include TSX tests and Playwright configuration/specs; fix five exposed type errors; install Chrome and run e2e in Web CI. Ignore generated browser artifacts in ESLint. |

## Verification

- Web: 239 unit/component tests pass, including catalog integrity, source trust, pin geometry, price snapshots, API methods/cache headers, exports, and UI state.
- CLI: 136 tests pass; lint and build pass; 142 generated board entries match the source catalog.
- Browser: 27 tests pass, including 20 mobile workflow cases across 360×800, 390×844, 412×915, and 844×390 with touch and a mobile user agent.
- Mobile-mojo subagent exercised catalog search/empty states, filters, favorites persistence, inline details, collections and capacity/reload, pin selection/search/inspector dismissal, comparison removal, and price filter persistence. Additional checks covered API failure/retry, diagram panning/Fit width, reduced motion, and dark/light themes.
- Web lint, expanded TypeScript checking, and the production build pass; the build generated 306 static pages. Both npm dependency audits reported zero vulnerabilities at audit time.
- A local Node microbenchmark of 10,000 currency formatting calls measured approximately 170 ms constructing a formatter each call versus 3 ms reusing one. This isolates formatting cost; it is not an end-to-end page-speed measurement.

Browser screenshots and exploratory evidence are retained locally in the ignored `test-results/` directory. The permanent regressions live in `test/` and `e2e/`.

## Workflow and limits

`AGENTS.md` now requires a mobile-mojo subagent for every UI/UX change before a push to any branch, including `main`, with fixes rechecked and blockers explicitly reported. It also documents the web and CLI verification commands and capacity/payload constraints.

This audit does not certify every electrical mapping against a newly downloaded datasheet or physical hardware. Hardware records and dated retailer snapshots were not changed. Mobile testing used Chromium emulation, not physical devices or Safari/WebKit; real virtual keyboards, OS sharing/printing, retailer checkout, and assistive technology were not tested. Passing checks establish the covered behavior, not an absence of every possible defect.
