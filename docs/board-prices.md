# Board price snapshots

`src/lib/board-prices.ts` contains manually checked, single-unit US retailer listings in USD. This first release has no scheduled refresh, API keys, database, affiliate links, or claim of live prices. Hardware data remains in `boards.ts`.

## Updating a listing

1. Open its exact retailer URL. Check the product title, memory variant, headers, SKU, currency, single-unit price, and stock. Do not substitute a kit, compatible clone, or different memory size.
2. Store the price in integer cents. Record the actual UTC check time in `checkedAt`. Keep a previous timestamp when a check fails; use `unknown` when availability cannot be verified.
3. For Arduino, the US store's public `/products/<handle>.js` response provides variant IDs, SKU, price in cents, and availability. The URL must select that variant. For Adafruit, the product page and its Product/Offer JSON-LD provide price and availability. Confirm the selected product, not stock on a related variant.
4. Run `npm run test -- test/board-prices.test.ts` and inspect `/prices?board=<boardId>`.

The seed data was checked on September 2, 2026 against the linked Adafruit product pages/JSON-LD and Arduino US product data. Adafruit is labeled as a retailer for other manufacturers' boards and as a manufacturer for its own Feather. Listings are a curated starter selection, not an analytics-based popularity ranking or a lowest-price comparison.

## Freshness and display

The `/prices` server route evaluates freshness per request and passes that time to the client for consistent hydration. An open page rechecks the clock every minute. After seven days a listing says “Older price” and “Needs a new check”; its stock becomes “Check with seller” and it no longer matches the in-stock filter. Absolute check dates remain visible. Deployments never advance those timestamps.

Prices exclude shipping, tax, and import charges. Unavailable boards retain a clearly labeled reference price and a retailer link. Board detail and comparison pages link to the exact pricing entry instead of embedding potentially stale stock claims in statically generated pages.

Search, board selection, category, stock filtering, and sorting are encoded in the URL. Search replaces the current history entry; deliberate filters create history checkpoints. Browser Back and direct links restore those filters.

Before expanding to multiple sellers or currencies, add a separate offer ID, explicit region/currency filtering, and variant equivalence rules. Do not rank prices in different currencies together or silently treat one variant's price as another's.
