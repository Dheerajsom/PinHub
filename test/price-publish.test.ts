import { afterEach, expect, it, vi } from "vitest";
import { boardPrices } from "@/lib/board-prices";
import { readStoredPrices, writeStoredPrices } from "@/lib/server/price-store";
import { publishPrices } from "../scripts/lib/price-publish";

vi.mock("@/lib/server/price-store", () => ({ priceStoreConfigured: () => true, readStoredPrices: vi.fn(), writeStoredPrices: vi.fn() }));
afterEach(() => vi.resetAllMocks());
// Clocks run just after the newest bundled check, so adding a freshly checked
// listing to the catalog cannot make these observations look like the past.
const latestCheck = Math.max(...boardPrices.map((price) => Date.parse(price.checkedAt)));
const now = latestCheck + 2 * 60 * 60 * 1000;
const previousTime = new Date(latestCheck + 60 * 60 * 1000).toISOString();
const previous = boardPrices.map((price) => ({ ...price, checkedAt: previousTime }));
const fetcher = (failed: string[] = []) => vi.fn(async (url: string | URL | Request) => {
  const price = boardPrices.find((item) => item.url === String(url))!;
  if (failed.includes(price.id)) return new Response("unavailable", { status: 404 });
  return new Response(`<script type="application/ld+json">${JSON.stringify({ "@type": "Product", name: "Board", sku: price.sku, offers: {
    "@type": "Offer", url: price.url, price: price.amount / 100, priceCurrency: "USD", itemCondition: "https://schema.org/NewCondition", availability: "https://schema.org/InStock",
  } })}</script>`);
});

it("publishes partial success while preserving the latest failed observation, and reports failure", async () => {
  vi.mocked(readStoredPrices).mockResolvedValue({ snapshot: { schemaVersion: 1, generatedAt: previousTime, prices: previous }, etag: "origin-version" });
  const result = await publishPrices({ fetcher: fetcher([previous[0].id]), now: () => now });
  expect(result).toMatchObject({ published: true, failed: 1, checked: boardPrices.length - 1 });
  const [snapshot, etag] = vi.mocked(writeStoredPrices).mock.calls[0];
  expect(etag).toBe("origin-version");
  expect(snapshot.prices[0]).toEqual(previous[0]);
  expect(snapshot.prices[1].checkedAt).toBe(new Date(now).toISOString());
});

it("does not publish on a dry run, total supplier failure, or storage read failure", async () => {
  vi.mocked(readStoredPrices).mockResolvedValue(null);
  expect((await publishPrices({ dryRun: true, fetcher: fetcher(), now: () => now })).published).toBe(false);
  expect((await publishPrices({ fetcher: fetcher(boardPrices.map((price) => price.id)), now: () => now })).published).toBe(false);
  vi.mocked(readStoredPrices).mockRejectedValue(new Error("storage unavailable"));
  const supplier = fetcher();
  await expect(publishPrices({ fetcher: supplier })).rejects.toThrow("storage unavailable");
  expect(supplier).not.toHaveBeenCalled();
  expect(writeStoredPrices).not.toHaveBeenCalled();
});

it("propagates conditional publication failures without a blind overwrite", async () => {
  vi.mocked(readStoredPrices).mockResolvedValue(null);
  vi.mocked(writeStoredPrices).mockRejectedValue(new Error("concurrent writer"));
  await expect(publishPrices({ fetcher: fetcher(), now: () => now })).rejects.toThrow("concurrent writer");
  expect(writeStoredPrices).toHaveBeenCalledTimes(1);
});

it("recovers when the stored snapshot predates a curated listing correction", async () => {
  // Regression: merging a stored observation whose identity no longer matches
  // the curated listing used to throw, so every hourly run failed until the
  // blob was reset by hand. The stale observation is now skipped and the
  // listing is re-observed under its curated identity.
  const stale = previous.map((price, index) => index === 0 ? { ...price, variant: `${price.variant} (old)`, amount: 1 } : price);
  vi.mocked(readStoredPrices).mockResolvedValue({ snapshot: { schemaVersion: 1, generatedAt: previousTime, prices: stale }, etag: "origin-version" });
  const result = await publishPrices({ fetcher: fetcher(), now: () => now });
  expect(result).toMatchObject({ published: true, failed: 0 });
  const [snapshot] = vi.mocked(writeStoredPrices).mock.calls[0];
  expect(snapshot.prices[0]).toMatchObject({ variant: boardPrices[0].variant, amount: boardPrices[0].amount, checkedAt: new Date(now).toISOString() });
});
