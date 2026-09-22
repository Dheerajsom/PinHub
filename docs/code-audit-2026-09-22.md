# PinHub code audit — 2026-09-22

Reviewed the Next.js routes and API responses, catalog source validation and lazy detail loading, catalog URL and local-storage state, pinout and comparison paths, price snapshot fetching/publication, CLI command and generated-data paths, security headers, workflow configuration, and regression coverage. The static catalog remains the source of truth, with full board records loaded only when requested.

## Confirmed findings and changes

| Area | Finding | Change |
| --- | --- | --- |
| Favorites storage | A local-storage value could load an unbounded number of arbitrary strings, and writes had no matching capacity check. | Validate board-shaped IDs, bound stored input and accepted IDs, enforce the same 256-ID limit on writes, and show a visible capacity message on both catalog surfaces. |
| Catalog URL state | An edit made before the first URL restoration frame could be replaced by the older URL state. | Apply early edits to the parsed URL state and keep the pending restore frame from overwriting the edit. |
| Retailer checks | A retailer response body could be buffered without a size limit before JSON-LD parsing. | Stop reading beyond 4 MiB and preserve the prior listing when that check fails. |
| Comparison guide | The README said three boards while the app permits four. | Correct the documented limit. |
| Light-theme feedback | The new fixed capacity message inherited dark amber text on a dark background. | Give the message an explicit pale text color in both themes. |
| Dependency alerts | GitHub reported two moderate alerts (#24 and #25) for web Vitest 3.2.7 and @vitest/mocker 3.2.7. | Pin the web test runner to patched Vitest 5.0.0, which resolves @vitest/mocker 5.0.0. |
| Linux CI compatibility | Vitest 5 loaded the TypeScript config through CommonJS on the Node 20.17 CI runner, which failed to require an ESM-only package. | Use a .mts config and update TypeScript and CI path references so the config loads as ESM. |
| Browser CI reliability | A live-price browser assertion sometimes ran before the mocked feed request under Linux CI load. | Wait for the mocked request before checking the rendered price, with a bounded timeout. |

Regression coverage was added for stored favorites at capacity, invalid/oversized favorite input, early catalog URL edits, oversized retailer bodies, and browser-visible favorite capacity feedback.

## Verification

- Web lint and typecheck passed.
- Web unit/component suite passed (274 tests after the URL-state regression was added).
- CLI generated-board check passed for 142 generated records; CLI lint, 136 tests, and build passed.
- Production Next.js build passed and generated 306 static pages.
- The targeted Playwright capacity test passed on touch Chrome emulation.
- The required mobile-mojo subagent rechecked catalog, discovery, and pinout at 360×800, 390×844, 412×915, and 844×390. It exercised favorite capacity feedback, search persistence, focus, touch controls, navigation, pin selection, and overflow, and inspected screenshots. No page errors or final mobile regressions were found.
- The full Playwright suite passed (64 browser tests) with two workers.

## Limits

This was a code and consistency audit, not an independent electrical verification of every physical board pin against current datasheets or hardware. Mobile coverage used Chrome emulation; physical devices and software keyboards were not available. Network restrictions required Google Font fallbacks during browser review.

An explicit npm audit query was blocked by automatic approval review because it would send dependency manifest and lockfile metadata to the external npm service. The dependency install performed its standard advisory check and reported zero vulnerabilities after the upgrade; GitHub Dependabot alerts may take time to refresh. The existing GitHub workflows also run npm audit.
