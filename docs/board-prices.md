# Board price snapshots

`src/lib/board-prices.json` stores dated, single-unit US retailer listings in USD. `board-price-schema.ts` validates data at runtime; `board-prices.ts` provides display and lookup helpers. Hardware data stays in `boards.ts`. This feature uses public retailer data without API keys, a database, affiliate links, or a claim of live prices.

## Listing identity and manual updates

Every offer has a unique, stable `id` based on its retailer and SKU. Each priced board has exactly one `primary: true` listing. `priceForBoard` returns that explicit default, while `pricesForBoard` returns all offers. A default is curated, not an implied cheapest price. Keep distinct memory sizes, headers, kits, and revisions explicit in `variant`; never substitute an equivalent-looking product.

Before adding or manually updating a listing, open its exact retailer URL and verify the title, memory, headers, SKU, currency, single-unit price, and availability. Arduino URLs must select an exact variant ID. Adafruit URLs must select an exact product ID/SKU. Record integer cents and the actual UTC check time. Unknown availability is `unknown`, never implicitly in stock. A failed check must not advance the timestamp.

The seed selection was manually checked September 2, 2026. Adafruit is labeled as retailer for other manufacturers' boards and manufacturer for its own Feather. These are curated references, not a popularity ranking or a lowest-price guarantee. The current selection has one offer per board; adding different regions/currencies requires explicit filtering and variant equivalence rules first.

## Freshness and display

`/prices` evaluates freshness per request and passes the server time to the client for consistent hydration. An open page updates its clock every minute. Price age and stock confidence are separate:

- Fresh: age from zero through exactly 14 days, labeled `Recent check`.
- Aging: over 14 days through exactly 45 days, labeled `Older check`.
- Stale: over 45 days, invalid dates, or future dates, labeled `Needs new check`.
- Stock confidence: expires at exactly seven days, independently of price age. The `In stock at recent check` filter includes only in-stock snapshots less than seven days old. Older/unknown availability says `Check with seller`.

Reference amounts remain visible at every age. Board details and both comparison layouts show the exact variant, retailer, absolute date, and USD reference amount, with tax/shipping excluded. They make no current-stock claim and remain safe to pre-render. Builds/deployments never advance timestamps.

Search, board selection, category, recent-stock filtering, and sorting are URL-backed. A synchronous React external store updates controlled inputs without waiting for a router transition. Search replaces history; deliberate filters push history. Back/Forward and Next.js navigation restore filters. The board chip removes only the board constraint. Search keeps the board constraint and explicitly identifies its scope, including unknown board IDs.

## Refresh command

Install dependencies with `npm ci`, then:

```sh
npm run refresh-prices -- --dry-run
npm run refresh-prices
```

The pinned `tsx` dependency runs `scripts/refresh-prices.ts`. Fetches are sequential, with a descriptive User-Agent, a 15-second timeout per attempt (including body), and at most three attempts for network errors, timeouts, HTTP 429, or server errors. Other non-200 responses fail immediately. Redirects are rejected rather than following a changed store/product.

Adafruit parsing matches Product JSON-LD by SKU and the exact Offer URL, verifies USD/new condition/single-unit eligibility, and converts decimal dollars to cents without rounding. Arduino parsing checks the exact product handle, variant ID and SKU, integer-cent price, and boolean availability. Anonymous requests to the same US store's `/cart.js` verify its presentment currency before the product check. Preorders and ambiguous stock categories are `unknown`; missing or unrecognized availability fails the check.

The refresher updates amount, stock, and timestamp together only after a successful check. Failed listings retain all three previous fields. Changes over 50% require manual review. After verifying the exact listing in the store, accept only the observed amount:

```sh
npm run refresh-prices -- --accept-price=adafruit-5812:13000
```

This example authorizes 13000 cents for that listing only. Repeat the flag for multiple reviewed listings. It rejects a changed observed amount and does not bypass SKU, currency, or availability validation. Update a source URL/SKU manually if the retailer has genuinely replaced the product; do not override identity checks.

Writes use a temporary JSON file and atomic rename, after re-validating the complete data. The writer refuses to overwrite a file edited during the fetch. A dry run fetches and validates but never changes snapshot data. `--report=<path>` optionally writes a per-listing JSON report, including in dry-run mode. The command exits nonzero if any check fails, even when other listings were refreshed successfully.

## Weekly GitHub Actions job

`.github/workflows/update-prices.yml` is scheduled Mondays at **06:00 UTC** (01:00 Chicago during daylight time, midnight during standard time). GitHub may delay scheduled jobs; timestamps always record actual checks. The workflow also supports manual dispatch and a `dry_run` input. It operates only on `main` and serializes overlapping refresh runs.

The job checks out `main`, sets up Node 22 and the declared npm version, installs the lockfile with `npm ci`, runs the refresher, and puts its per-listing report in the Actions summary. It then runs audit, lint, typecheck, tests, and the production build. Only after those gates pass does it commit the snapshot JSON as `github-actions[bot]` and push normally to `main` with `chore: update weekly board price snapshots`. It never force-pushes or rebases already-tested changes. If `main` advances during the run, the push fails and the job must be rerun.

Valid checks can be committed even when some retailers fail; failed listings remain unchanged and a final failing step makes the incomplete check visible. A total fetch failure produces no data commit. Dry-run dispatches never commit. The job has `contents: write`; repository rules must permit this bot to update `main`. No additional secret is required for fetching or the GitHub push.

The schedule becomes active after this workflow is published to the repository's default `main` branch with Actions enabled. `GITHUB_TOKEN` pushes do not trigger the separate push-based Web CI, so the refresh job runs its own complete validation. No `[skip ci]` marker is used. The existing Vercel Git integration must accept bot commits for the changed snapshots to deploy; creating the workflow locally does not itself activate the schedule or verify deployment settings.

## Verification

```sh
npm run test -- test/board-prices.test.ts test/price-controls.test.tsx test/compare-table.test.tsx test/price-refresh.test.ts
npm run lint
npm run typecheck
npm run build
npm run refresh-prices -- --dry-run
```

Parser/writer tests use deterministic retailer-shaped fixtures and cover invalid identity/currency, malformed responses, bounded retries, price-change rejection, exact manual acceptance, dry-run immutability, and partial-success writes. Browser verification additionally checks typing, filter chips, history restoration, and both comparison layouts; a build alone cannot establish that hydration and interaction work.
