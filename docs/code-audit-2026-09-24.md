# PinHub cleanup and audit — 2026-09-24

Branch `opus/cleanup`. Reviewed the web app routes and API handlers, the
price snapshot pipeline (server store, client feed, hourly publisher),
catalog state, search and favorites, local-storage boundaries, the board
detail and standalone board pages, shared page chrome, and the CSS theme
layer. The CLI and board data were read but not changed.

## Bugs fixed

| Area | Finding | Change |
| --- | --- | --- |
| Live prices | `mergePriceObservations` threw when a stored observation's identity (URL, SKU, variant, retailer) no longer matched its curated listing. After any deploy that corrected a listing, `/api/prices` fell back to bundled prices for the whole catalog, and the hourly publisher failed on every run because it merges the same stale snapshot before refreshing. Recovery required deleting the blob by hand. | Skip the mismatched observation (the curated listing keeps its own dated price) and keep every other observation. The next publisher run re-observes the listing under its curated identity. Regression tests cover the API path and publisher recovery. |
| Price API availability | `/api/prices` is dynamic and only CDN-cached on success, so a slow or failing Blob store held every uncached request open for up to 8 s. | One storage read per server instance serves concurrent requests, and its result is reused for 30 s (success or fallback). |
| Hardware-safety caption | The detail panel inferred "3V3 · not 5V tolerant" from a text heuristic. It could contradict a record (Teensy LC says 5 V tolerance "is limited"), and it hedged on 43 boards whose connector notes state "not 5 V tolerant" explicitly. | `fiveVoltCaution()` quotes an explicit statement from the logic level, warnings, or connector notes. It says "Treat as not 5 V tolerant" when the record is silent and shows nothing when the record describes any tolerance itself. A catalog-wide test ensures it never contradicts a record. |
| Light theme | That caption used `text-amber-200/90`, which escapes the light theme's class-name overrides: pale yellow on a light well, about 1.2:1 contrast. | Use the overridden class (6.9:1 measured). |
| Hidden filters | Discovery-only facets (`connector`, `platform`, `wireless`) in a shared `/` URL filtered the catalog with no chip, so only Reset could clear them. | Chips are generated for every list facet, plus a Favorites chip. |
| Search Enter key | On phones, Enter in the search box toggled the selected row, so a second Enter closed the details it had just opened. | Enter always opens. |
| Favorite limit toast | The capacity message never dismissed, so it stayed fixed over the bottom of the results until the next successful toggle. | Dismisses after 5 s. The live region stays mounted so screen readers announce it. |
| `/compare` discovery | Rendered its own footer in addition to the layout footer. | Removed the duplicate. |
| Footer | The `ph rpi5` CLI chip linked to `/compare`, and the `/api/boards/[id]` chip was an inert label. | The CLI chip opens the CLI install guide. The API chip links to the `/api/boards` index. |
| Shared collection | With a full library, the disabled "Save this collection" button used the green saved styling. | Only a completed save looks successful. A full library shows a neutral disabled button. |
| Compare tray | Remove chips were announced only by board name, and the disabled Compare link stayed in the tab order. | Added "Remove X from comparison" names and `tabIndex=-1` while disabled. |
| Navigation copy | Board, privacy, and 404 pages said "Back to discovery" but linked to the catalog. The 404 page claimed every pin map is "checked against official vendor documentation first", which earlier audits say is not independently verified. | Replaced by the shared header. The 404 page now uses accurate copy. |

## Security

Fixed:

- **Local-storage boundary.** The personal library had no size bound on read
  and accepted any string of up to 128 characters as a board id, unlike
  favorites. Both now share `isBoardId()` (kebab-case, up to 128 characters)
  on read and write, and the library ignores stored values over 128 KB.
  Regression test added.
- **Server/client boundary.** The collection name limit moved to a
  server-safe module. Importing a constant from a `"use client"` module into a
  server component yields a client reference, not the value.

Checked, no change needed: CSV exports stay formula-safe; external links are
HTTPS-only, credential-free, and `noopener noreferrer`; API routes reject
query strings and non-read methods; the price publisher's errors are
credential-free. `npm audit` reports 0 vulnerabilities for both the web and
CLI packages. No secrets are tracked (`.env*` and `.vercel` are ignored, and
a pattern scan of tracked files found nothing).

Flagged, not changed:

- **CSP allows `'unsafe-inline'` scripts.** Next's inline bootstrap needs
  either this or per-request nonces. Nonces force dynamic rendering of every
  page and would give up the 300+ statically generated routes. An injected
  inline script would therefore not be blocked by CSP. The other controls
  (React escaping, no `dangerouslySetInnerHTML` of user input) are what
  prevent injection. Revisit if the app ever renders user-submitted content.
- **Content spoofing on `/collections`.** The `name` query parameter is shown
  as the page heading. It is escaped text, trimmed to 60 characters, and the
  route is `noindex`, but a crafted link can still title a page on PinHub's
  domain. Acceptable for now; a "Shared link" label near the title would make
  the provenance clearer.
- **HSTS** has no `preload` directive. That is only worth adding with the
  domain on the preload list.

## Refactors

- `PinHubApp`: seven near-identical facet handlers became a config table with
  one `selectFacet`/`updateFilters` path. The arrow-key and row-navigation
  paging logic was duplicated and is now `stepSelection` plus
  `pageForIndex`.
- The catalog and discovery screens share `useCatalogResults` (filter, score,
  sort), `useFavoriteToggle` with `FavoriteLimitToast`, and `useSlashToFocus`.
  The `/` shortcut now also ignores `<select>`, modifier chords, and
  contenteditable targets.
- The API routes share `src/lib/server/read-only-route.ts` for query
  rejection, cache headers, 405 responses, and `OPTIONS`.
- The repo and CLI URLs live in `src/lib/site.ts`. `InterfaceChip` is its own
  module so server pages can use it without importing catalog client code.

## Design changes (frontend-design pass)

- **Shared `SiteHeader`** on board, pinout, comparison, collection, privacy,
  and 404 pages: wordmark (home), Pin Maps / Compare / Prices, and the theme
  toggle. Previously none of these pages linked to Compare or Prices. Below
  640 px the section links take their own row.
- **Board page is pin-map-first.** A title block pairs identity and
  protocol-tinted interface chips with a ruled key/value spec table. The pin
  map leads the main column, and the new **"Before you wire"** panel sits
  beside it (before it on phones). The standalone interfaces card and the
  decorative blur glow were removed, along with a second "Pin map" header
  that duplicated the widget's own label and Full view link.
- **"Before you wire"** (`WiringCautions`) merges the orange verify strip and
  the separate warnings block into one orange-ruled panel. The verify link
  with its Official or 3rd-party badge is the panel's footer. In the
  catalog's side panel, lists longer than four fold after three so the map
  stays near the top.
- **"Common boards"** replaces "Trending Boards", which was a hardcoded list
  with fake 01–04 rankings. It shows vendor marks instead of numbers and
  makes no popularity claim. Quick-search chips gained 36 px tap targets.

## Verification

- Lint, typecheck, and 304 unit/component tests pass (288 before; new
  regressions cover the price merge and publisher recovery, price-read reuse,
  the 5 V caption, library storage bounds, facet chips, Enter behavior, Common
  boards, the caution panel, and the shared-collection state).
- All 64 Playwright browser tests pass. The first run caught a real
  regression: 8–94 px of horizontal overflow on board pages at 360 px. There
  were two causes: new grids without a base `grid-cols-1`, and a visually
  hidden "(opens in a new tab)" suffix positioned past a truncated label.
  Both were fixed and confirmed by a per-element overflow probe on six routes.
- The production build passes and generates all 307 static pages, including
  the board-visual and source-link validation gates.
- Desktop review in both themes. Light-theme contrast of the new panel was
  measured at 6.4–15.5:1.
- **Mobile gate: passed.** The mobile-mojo subagent tested the production
  build at 360×800, 390×844, 412×915, and 844×390 landscape. It covered the
  shared header wrap on six routes, board-page order and the 5 V caption
  (present on Pi 5, ESP32 DevKit, and Pico; absent on Blue Pill), the verify
  link's truncation, Common boards, Enter-to-open, folding cautions, facet and
  Favorites chips, the footer chips, the single footer on `/compare`, the
  compare tray, light theme, keyboard focus, and console errors. It found no
  regressions.
- Follow-up found by the mobile pass, fixed on `fix/compare-toolbar-wrap`
  (this issue predates the cleanup). On bare `/compare` below 640 px, the
  discovery toolbar was one horizontally scrolling row, so Filters was
  clipped and Favorites sat past the right edge (right edges at about 399 px
  and 525 px on a 360 px screen). The toolbar now wraps like the catalog
  command bar: search; the section links; Filters, Favorites, and the match
  count; then the sort select on its own row. A first version shared the
  sort's row with Filters and Favorites, and the second mobile pass caught its
  labels clipping at 360 px ("Best matcl"). A new Playwright test checks each
  control's box, because the page-width check could not catch a row that
  clips its own overflow. It also measures every sort label against the
  select's width.

## Limits

Mobile testing used Chromium emulation, not physical devices or
Safari/WebKit. Board electrical data was not re-verified against datasheets,
and no board records changed. The price pipeline changes are covered by unit
tests with mocked Blob storage; no live Blob publication ran.
