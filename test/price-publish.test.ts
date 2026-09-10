import { afterEach, expect, it, vi } from "vitest";
import { boardPrices } from "@/lib/board-prices";
import { readStoredPrices, writeStoredPrices } from "@/lib/server/price-store";
import { publishPrices } from "../scripts/lib/price-publish";

vi.mock("@/lib/server/price-store", () => ({ priceStoreConfigured: () => true, readStoredPrices: vi.fn(), writeStoredPrices: vi.fn() }));
afterEach(() => vi.resetAllMocks());
const now = Date.parse("2026-09-10T02:00:00Z");
const previous = boardPrices.map((price) => ({ ...price, checkedAt: "2026-09-10T01:00:00Z" }));
const fetcher = (failed: string[] = []) => vi.fn(async (url: string | URL | Request) => {
  const price = boardPrices.find((item) => item.url === String(url))!;
  if (failed.includes(price.id)) return new Response("unavailable", { status: 404 });
  return new Response(`<script type="application/ld+json">${JSON.stringify({ "@type": "Product", name: "Board", sku: price.sku, offers: {
    "@type": "Offer", url: price.url, price: price.amount / 100, priceCurrency: "USD", itemCondition: "https://schema.org/NewCondition", availability: "https://schema.org/InStock",
  } })}</script>`);
});

it("publishes partial success while preserving the latest failed observation, and reports failure", async () => {
  vi.mocked(readStoredPrices).mockResolvedValue({ snapshot: { schemaVersion: 1, generatedAt: "2026-09-10T01:00:00.000Z", prices: previous }, etag: "origin-version" });
  const result = await publishPrices({ fetcher: fetcher([previous[0].id]), now: () => now });
  expect(result).toMatchObject({ published: true, failed: 1, checked: 10 });
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
