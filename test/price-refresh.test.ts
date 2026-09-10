import { mkdtemp, readFile, rmdir, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { boardPrices as snapshots } from "@/lib/board-prices";
import { dollarsToCents, fetchRetailerText, parseAdafruit, parseArduino, refreshListings, refreshPriceFile } from "../scripts/lib/price-refresh";

// Real refreshes can change every price/date/stock; parser fixtures stay deterministic.
const boardPrices = snapshots.map((price) => ({ ...price, checkedAt: "2026-09-02T14:00:00Z" }));
const created: Array<{ directory: string; file: string }> = [];
afterEach(async () => {
  for (const item of created.splice(0)) {
    await unlink(item.file);
    await rmdir(item.directory);
  }
  vi.restoreAllMocks();
});

// Minimal fixtures preserve the public retailers' Product/Offer and variant shapes.
function adafruitHtml(sku: string, price: number | string, availability = "InStock") {
  return `<script type="application/ld+json">${JSON.stringify({
    "@context": "http://schema.org", "@type": "Product", name: `Board ${sku}`, sku,
    offers: { "@type": "Offer", url: `https://adafruit.com/product/${sku}`, price, priceCurrency: "USD", availability: `https://schema.org/${availability}`, itemCondition: "https://schema.org/NewCondition" },
  })}</script>`;
}

function retailerFetcher(failureId?: string): typeof fetch {
  return vi.fn(async (input: string | URL | Request) => {
    const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
    const listing = boardPrices.find((item) => item.url.startsWith(`${url.origin}${url.pathname.replace(/\.js$/, "")}`));
    if (failureId && listing?.id === failureId) return new Response("try later", { status: 503 });
    if (url.hostname === "www.adafruit.com") {
      const item = boardPrices.find((candidate) => candidate.sku === url.pathname.split("/").at(-1))!;
      return new Response(adafruitHtml(item.sku, item.amount / 100), { status: 200 });
    }
    const item = boardPrices.find((candidate) => candidate.url === url.href)!;
    return new Response(arduinoHtml(item));
  }) as typeof fetch;
}

function arduinoHtml(listing: typeof boardPrices[number], price = listing.amount / 100, availability = "InStock") {
  return `<script type="application/ld+json">${JSON.stringify({
    "@type": "Product", name: "Arduino board", sku: listing.sku,
    offers: { "@type": "Offer", url: listing.url, priceCurrency: "USD", price, availability: `http://schema.org/${availability}` },
  })}</script>`;
}

describe("retailer price parsers", () => {
  it("parses exact decimal USD without rounding", () => {
    expect(dollarsToCents(19.95)).toBe(1995);
    expect(dollarsToCents("7")).toBe(700);
    expect(dollarsToCents("7.5")).toBe(750);
    expect(dollarsToCents("11.9500")).toBe(1195);
    for (const value of ["1.001", "1e2", "1,000", 0, -1, NaN]) expect(() => dollarsToCents(value)).toThrow();
  });

  it("matches Adafruit Product, SKU, exact offer, currency, condition, and availability", () => {
    const listing = boardPrices.find((item) => item.retailer === "Adafruit")!;
    expect(parseAdafruit(adafruitHtml(listing.sku, "130.00"), listing)).toEqual({ amount: 13000, stock: "in-stock" });
    expect(parseAdafruit(adafruitHtml(listing.sku, "130", "OutOfStock"), listing).stock).toBe("out-of-stock");
    expect(parseAdafruit(adafruitHtml(listing.sku, "130", "PreOrder"), listing).stock).toBe("unknown");
    expect(() => parseAdafruit(adafruitHtml("9999", "130"), listing)).toThrow("matching the retailer SKU");
    expect(() => parseAdafruit(adafruitHtml(listing.sku, "130").replace('"USD"', '"EUR"'), listing)).toThrow("currency");
    expect(() => parseAdafruit(adafruitHtml(listing.sku, "130").replace("NewCondition", "UsedCondition"), listing)).toThrow("new board");
    expect(() => parseAdafruit(adafruitHtml(listing.sku, "130", "Unexpected"), listing)).toThrow("availability");
    expect(() => parseAdafruit("<script type='application/ld+json'>{oops}</script>", listing)).toThrow();
  });

  it("finds an exact offer in JSON-LD graphs and rejects ambiguous/quantity pricing", () => {
    const listing = boardPrices[0];
    const product = JSON.parse(adafruitHtml(listing.sku, 130).replace(/^<script[^>]*>|<\/script>$/g, ""));
    const html = (data: unknown) => `<script type='application/ld+json'>${JSON.stringify(data)}</script>`;
    expect(parseAdafruit(html({ "@graph": [{ "@type": "WebSite" }, product] }), listing).amount).toBe(13000);
    expect(() => parseAdafruit(html([product, product]), listing)).toThrow("exactly one Product");
    expect(() => parseAdafruit(html({ ...product, offers: { ...product.offers, eligibleQuantity: { minValue: 10 } } }), listing)).toThrow("single-unit");
    expect(() => parseAdafruit(html({ ...product, offers: { ...product.offers, eligibleQuantity: { minValue: "bad" } } }), listing)).toThrow("eligible quantity");
  });

  it("selects an exact Arduino variant and verifies USD", () => {
    const listing = boardPrices.find((item) => item.retailer === "Arduino")!;
    const html = arduinoHtml(listing, 22, "OutOfStock");
    expect(parseArduino(html, listing)).toEqual({ amount: 2200, stock: "out-of-stock" });
    expect(() => parseArduino(html.replace('"USD"', '"CAD"'), listing)).toThrow("currency");
    expect(() => parseArduino(html.replace(listing.sku, "wrong"), listing)).toThrow("SKU");
    expect(() => parseArduino(html.replace("?variant=", "?wrong="), listing)).toThrow("variant");
    expect(() => parseArduino(html.replace("OutOfStock", "Unexpected"), listing)).toThrow("availability");
    expect(() => parseArduino(arduinoHtml(listing, 22.001), listing)).toThrow("decimal");
  });

  it("checks Arduino only through the exact public variant page", async () => {
    const listing = boardPrices.find((item) => item.retailer === "Arduino")!;
    const fetcher = retailerFetcher();
    expect((await refreshListings([listing], { fetcher })).failed).toBe(0);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith(listing.url, expect.any(Object));
  });

  it("retries transient HTTP failures but not other non-200 responses", async () => {
    const transient = vi.fn().mockResolvedValueOnce(new Response("", { status: 503 })).mockResolvedValueOnce(new Response("ok", { status: 200 }));
    await expect(fetchRetailerText("https://example.test/a", { fetcher: transient as typeof fetch, sleep: async () => undefined })).resolves.toBe("ok");
    expect(transient).toHaveBeenCalledTimes(2);
    const badRequest = vi.fn().mockImplementation(async () => new Response("", { status: 404 }));
    await expect(fetchRetailerText("https://example.test/a", { fetcher: badRequest as typeof fetch })).rejects.toThrow("HTTP 404");
    expect(badRequest).toHaveBeenCalledOnce();
    const exhausted = vi.fn().mockImplementation(async () => new Response("", { status: 429 }));
    await expect(fetchRetailerText("https://example.test/a", { fetcher: exhausted as typeof fetch, sleep: async () => undefined })).rejects.toThrow("HTTP 429");
    expect(exhausted).toHaveBeenCalledTimes(3);
  });
});

describe("refresh writer", () => {
  it("keeps rejected prices and dates unchanged unless that exact price is accepted", async () => {
    const listing = boardPrices[0];
    const changed = adafruitHtml(listing.sku, listing.amount * 2 / 100);
    const fetcher = vi.fn().mockImplementation(async () => new Response(changed, { status: 200 }));
    const options = { fetcher: fetcher as typeof fetch, now: () => Date.parse(listing.checkedAt) + 1000 };
    const rejected = await refreshListings([listing], options);
    expect(rejected.failed).toBe(1);
    expect(rejected.updated[0]).toEqual(listing);
    const accepted = await refreshListings([listing], { ...options, acceptedPrices: new Map([[listing.id, listing.amount * 2]]) });
    expect(accepted.updated[0].amount).toBe(listing.amount * 2);
    expect(accepted.updated[0].checkedAt).not.toBe(listing.checkedAt);
    const mismatch = await refreshListings([listing], { ...options, acceptedPrices: new Map([[listing.id, listing.amount * 3]]) });
    expect(mismatch.failed).toBe(1);
    expect(mismatch.updated[0]).toEqual(listing);
  });

  it("writes successful listings atomically, preserves failed snapshots, and reports failure", async () => {
    const directory = await mkdtemp(join(tmpdir(), "pinhub-price-refresh-"));
    const file = join(directory, "prices.json");
    created.push({ directory, file });
    await writeFile(file, `${JSON.stringify(boardPrices, null, 2)}\n`);
    const failedListing = boardPrices.find((item) => item.retailer === "Adafruit")!;
    const time = Date.parse(boardPrices[0].checkedAt) + 86_400_000;
    const result = await refreshPriceFile(file, { fetcher: retailerFetcher(failedListing.id), now: () => time, sleep: async () => undefined });
    expect(result.written).toBe(true);
    expect(result.failed).toBe(1);
    const saved = JSON.parse(await readFile(file, "utf8"));
    expect(saved.find((item: typeof failedListing) => item.id === failedListing.id)).toEqual(failedListing);
    expect(saved.filter((item: typeof failedListing) => item.id !== failedListing.id).every((item: typeof failedListing) => item.checkedAt === new Date(time).toISOString())).toBe(true);
  });

  it("never writes a dry run", async () => {
    const directory = await mkdtemp(join(tmpdir(), "pinhub-price-dry-"));
    const file = join(directory, "prices.json");
    created.push({ directory, file });
    const original = `${JSON.stringify(boardPrices, null, 2)}\n`;
    await writeFile(file, original);
    const result = await refreshPriceFile(file, { dryRun: true, fetcher: retailerFetcher(), now: () => Date.parse(boardPrices[0].checkedAt) + 1000 });
    expect(result.written).toBe(false);
    expect(result.failed).toBe(0);
    expect(await readFile(file, "utf8")).toBe(original);
  });

  it("does not write on total failure or overwrite an edit made during fetching", async () => {
    const directory = await mkdtemp(join(tmpdir(), "pinhub-price-failure-"));
    const file = join(directory, "prices.json");
    created.push({ directory, file });
    const original = `${JSON.stringify([boardPrices[0]], null, 2)}\n`;
    await writeFile(file, original);
    const failed = await refreshPriceFile(file, { fetcher: vi.fn(async () => new Response("not found", { status: 404 })) as typeof fetch });
    expect(failed.failed).toBe(1);
    expect(failed.written).toBe(false);
    expect(await readFile(file, "utf8")).toBe(original);
    const edited = `${original}\n`;
    await expect(refreshPriceFile(file, {
      fetcher: vi.fn(async () => {
        await writeFile(file, edited);
        return new Response(adafruitHtml(boardPrices[0].sku, boardPrices[0].amount / 100));
      }) as typeof fetch,
      now: () => Date.parse(boardPrices[0].checkedAt) + 1000,
    })).rejects.toThrow("changed during refresh");
    expect(await readFile(file, "utf8")).toBe(edited);
  });
});
