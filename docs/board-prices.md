# Automatic board prices

PinHub checks 11 curated Adafruit/Arduino offers on an hourly target schedule. Successful observations are stored in the public Vercel Blob object `prices/latest-v1.json`; they do not require a Git commit or deployment. Hardware and listing identities remain in the repository. `src/lib/board-prices.json` is the dated fallback when shared storage is unavailable.

## Data flow

1. `.github/workflows/update-prices.yml` runs at minute 17 each hour on `main`, or through manual dispatch. GitHub may delay or drop scheduled runs. Inactive public repositories can have schedules disabled after 60 days.
2. After audit, lint, typecheck, tests and build, `npm run publish-prices` reads the shared snapshot and merges observations into the curated listings. A storage error aborts; only a confirmed missing object permits initialization from the bundled data.
3. Sequential retailer requests validate exact SKU, variant URL, USD, quantity and stock. Successful checks replace amount, stock and timestamp together. Failed checks retain the last verified observation, including its timestamp. A change exceeding 50% needs explicit reviewed-price acceptance.
4. The complete validated snapshot is uploaded with the ETag of the version read. A stale cached read or competing writer causes a conditional-write failure; the publisher does not retry with a blind overwrite. Initial creation refuses to overwrite an existing object. Public Blob reads can be cached for 60 seconds; wait at least that long before retrying a conflict.
5. `/api/prices` validates the shared snapshot and serves it with a 30-second CDN cache and browser revalidation. Failures return the dated bundled fallback with `no-store`. The endpoint never calls retailers and never accepts caller-provided source URLs.
6. One shared browser feed serves the prices page, board detail links and both comparison layouts. It fetches on mount and every minute while visible, pauses in hidden tabs, and deduplicates subscribers and React Strict Mode remounts. It preserves newer observations when the server falls back or a request fails. Filters, focus and navigation are independent of refreshes.

Hourly is a target, not an instantaneous-price guarantee. Delivery can additionally take up to the Blob cache interval, API cache interval and browser polling interval. The UI always shows the actual successful check time; generating a snapshot, building or deploying never makes an old check fresh.

## Storage setup and credentials

Create a **public** Vercel Blob store for the PinHub project, scoped to production. Blob pricing/usage depends on the account plan. Current store: `pinhub-prices` (`store_B8xtFJiYqirs6AZv`, region `iad1`). The initial snapshot was published and read back on September 10, 2026 UTC.

- Vercel runtime: connected `BLOB_STORE_ID` and Vercel-managed OIDC, or `BLOB_READ_WRITE_TOKEN`.
- GitHub repository: Actions secret `PINHUB_PRICES_BLOB_TOKEN`, containing the token for this dedicated store. The workflow maps it to `BLOB_READ_WRITE_TOKEN` only in the publication step. This grants the workflow read/write access to the price store; never put it in a public variable or commit it.
- Local scripts: credentials must be provided through the environment. `tsx` scripts do not automatically load `.env.local`. With supported Node versions, use `node --env-file=.env.prices.local --import tsx scripts/publish-prices.ts --dry-run`. Keep that file ignored.
- Preview/development without credentials: dated fallback mode works, including builds and tests. Browser tests mock the API for deterministic update/failure scenarios.

Activation requires the GitHub secret as well as the published workflow on the default branch with Actions enabled. Missing credentials cause a visible failed publication, never a success or a fresh timestamp. The user explicitly approved the dedicated price-store credential transfer, and `PINHUB_PRICES_BLOB_TOKEN` was configured on September 10, 2026 UTC.

## Listing identity and safety

Each offer has a stable ID, exact SKU, variant, retailer URL, currency and one explicit primary selection per priced board. Keep memory sizes, headers, bundles and revisions separate. A primary listing is curated, not an implied cheapest offer. Shared observations can only replace amount, stock and check time for matching identities. Removed remote offers are ignored; newly curated offers retain their bundled fallback until checked.

Runtime validation applies at the writer, storage reader and browser boundary. Snapshots have schema version 1, at most 500 listings, at most 256 KiB of encoded JSON and string fields capped at 2,000 characters. Future observation times, unsafe retailer URLs, invalid cents/currency/stock and mismatched identities are rejected. Stream reads enforce byte limits even without Content-Length. Reads and requests have timeouts. Credentials and raw upstream errors are not returned to the browser. Blob reads request `Accept-Encoding: identity` so the snapshot carries the strong storage ETag required for conditional publication; weak compression ETags are rejected instead of being stripped or used for an unsafe overwrite.

Adafruit parsing matches Product JSON-LD by SKU and exact Offer URL, verifies USD/new condition/single-unit eligibility and parses decimal dollars without rounding. Arduino now reads the exact public variant page's Product/Offer JSON-LD, matching both SKU and variant URL and verifying currency, price and availability. It does not use the `/cart.js` endpoint disallowed by the store's crawler rules. Manufacturer listings with no condition field are accepted; an explicit non-new condition is rejected. Ambiguous stock/preorders become `unknown`; missing/unrecognized availability fails the check.

The Adafruit and Arduino robots files were inspected September 10, 2026 UTC. Both allowed the selected public product pages and specified no cadence for this user agent. Requests are anonymous and sequential, at most one scheduled pass per hour. This is public storefront parsing, not a vendor API SLA; review retailer access rules if policies change. There are at most three attempts per request, with 15-second timeouts including bodies, backoff for network failures/429/5xx, and no redirects to another product/store.

## Freshness and display

- Recent price: zero through three hours.
- Older check: over three hours through 24 hours.
- Needs new check: over 24 hours, invalid dates or future dates.
- Stock confidence expires at exactly two hours; expired/unknown stock says `Check with seller` and is excluded from the recent-stock filter.

Reference amounts remain visible at every age. Relative check times appear after hydration, with exact UTC timestamps in the time element/title. The prices page reports unavailable updates when the API or shared snapshot cannot be used. Tax, shipping and import costs are excluded; the seller determines final price and availability.

## Manual operation

```sh
npm run publish-prices -- --dry-run
npm run publish-prices -- --report=price-report.json
npm run publish-prices -- --accept-price=adafruit-5812:13000
```

Credentials must already be in the environment. Acceptance authorizes only the exact reviewed cent amount for that listing and does not bypass identity/currency/stock checks. Both partial success and total failure return a nonzero exit status; partial success publishes verified entries and retains failed entries, while total failure leaves the shared object untouched. A dry run never uploads. Publication conflicts and storage errors fail visibly.

The legacy `npm run refresh-prices` command remains available for deliberately updating the bundled fallback file, with the same parsers and validation. It supports `--dry-run`, `--report` and `--accept-price` too. Its local file writer uses an atomic rename and rejects concurrent local edits. The scheduled workflow no longer writes or commits that file.

## Verification

Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` and `npm run test:e2e`. Price coverage includes parser identities/currencies, changed prices, partial/total failures, dry runs, storage failures, conditional-write rejection, invalid/oversized snapshots, fallback timestamps, shared polling, hidden tabs, Strict Mode, unchanged filters/focus, and board-detail/comparison updates. UI publication also requires the repository's mobile-mojo subagent review; see the accompanying mobile audit report for coverage and limits.
