# Mobile price updates audit

Tested 2026-09-09 (America/Chicago) against `http://localhost:3100` using the mobile-mojo skill. The tested price journeys passed after the stock-filter explanation was corrected to the new two-hour window. No unresolved mobile regression was found in the changed price UI.

## Coverage

Chrome with Pixel 5 mobile user agent, touch input, and device scale factor 2.75:

| CSS viewport | Real shared prices and navigation | Update, failure, recovery | Comparison and pinout | Screenshot review |
| --- | --- | --- | --- | --- |
| 360 × 800 | Pass | Pass | Pass | Pass |
| 390 × 844 | Pass | Pass | Pass | Pass |
| 412 × 915 | Pass | Pass | Pass | Pass |
| 844 × 390 | Pass | Pass | Pass | Pass |

- `/prices`: actual shared snapshot, search and empty results, category selection, sort selection, stock filter, reload persistence, board-scoped query and listing anchor, retailer-link targets, and navigation to board details and pinouts.
- `/boards/raspberry-pi-5`: visible dated price link, atomic amount/date update, and navigation to `/prices?board=raspberry-pi-5#adafruit-5812`.
- `/compare?boards=raspberry-pi-5,raspberry-pi-pico`: stacked phone price cards and landscape table, one shared initial browser price request, atomic amount/date update, retained “Show identical” selection, and board removal. The landscape table remained inside its own horizontal scroll region (794 px viewport, 920 px content) and responded to keyboard horizontal navigation.
- `/pinout/raspberry-pi-5` and `/pinout/raspberry-pi-pico`: fully loaded layouts, price-to-pinout navigation, pin search, GP28 selection and visible detail/copy action, and clearing search.
- Controlled browser network fixtures: minute polling, changed amounts and matching `time[datetime]`, retained search focus/query/board/sort, HTTP 503 with visible unavailable status and retained prior price/date, and subsequent recovery.
- Extra 390 × 844 dark-theme checks: stock stops matching the recent-stock filter after two hours, seller-confirmation text replaces expired stock claims, prices show “Older check” after three hours and “Needs new check” after 24 hours, and malformed snapshots retain the prior dated observation.

Every measured page width equaled its viewport width; no unintended document overflow was found. The changed store actions, detail price link, and comparison retailer links have at least 44 px height. The 16 px checkbox has a larger, 44 px-high clickable label. Search focus remained visible after an update. No uncaught page errors, hydration errors, or unexpected console errors occurred; the injected 503 produced the expected browser failed-resource console entry.

## Findings and recheck

**Fixed: outdated stock-filter explanation.** The original helper said “less than seven days ago,” conflicting with the new two-hour stock limit. The implementation now says “less than two hours ago.” The final complete four-viewport run explicitly asserted this text and repeated the update/failure/recovery journeys after the fix.

**Low-priority existing touch-size observation:** comparison “Overview” and “Pinout” navigation links are about 16 px high, with some existing board-name links about 20 px high. These are outside the changed retailer price controls. Enlarging their hit areas would make the existing comparison navigation easier to tap. This did not block the tested paths.

Local evidence is in the ignored `.vercel/mobile-prices/` directory: `audit.cjs`, `results.json`, `extra.cjs`, `extra-results.json`, and viewport-prefixed screenshots. Reviewed captures include the price listing and update/failure states, empty/stock-filter states, board price link, comparison cards/table, loaded pinout views, and dark aging/invalid-feed states.

## Limits

This is Chrome device emulation, not a physical-device or Safari test. Native virtual keyboards, notches/safe-area behavior, screen-reader announcements, 200% text scaling, real touch swipes, and background-tab suspension were not verified. Horizontal comparison navigation was tested with keyboard input. Supplier checkout and external retailer pages were not opened. The browser audit read the real shared feed but used fixtures and a controlled clock for updates and failures; it does not certify an actual hourly scheduler run, supplier outage behavior, or production deployment. The primary agent handles the backend, regression suite, build, and deployment checks separately.
