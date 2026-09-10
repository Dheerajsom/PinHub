import { boardPrices } from "../../src/lib/board-prices";
import { mergePriceObservations } from "../../src/lib/price-snapshot";
import { priceStoreConfigured, readStoredPrices, writeStoredPrices } from "../../src/lib/server/price-store";
import { refreshListings, type RefreshOptions } from "./price-refresh";

export async function publishPrices(options: RefreshOptions = {}) {
  if (!priceStoreConfigured()) throw new Error("Configure Blob credentials before publishing prices");
  // A read error aborts; only a confirmed missing blob allows seeding.
  const stored = await readStoredPrices();
  const baseline = mergePriceObservations(boardPrices, stored?.snapshot.prices ?? []);
  const result = await refreshListings(baseline, options);
  let published = false;
  if (!options.dryRun && result.failed < baseline.length) {
    await writeStoredPrices({ schemaVersion: 1, generatedAt: new Date((options.now ?? Date.now)()).toISOString(), prices: result.updated }, stored?.etag);
    published = true;
  }
  return { dryRun: Boolean(options.dryRun), published, checked: baseline.length - result.failed, failed: result.failed, results: result.results };
}
