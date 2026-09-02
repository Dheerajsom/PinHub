import { describe, expect, it } from "vitest";
import { boards } from "@/lib/boards";
import { boardPrices, formatPrice, isPriceStale, priceStaleAfterMs } from "@/lib/board-prices";
import { defaultPriceFilters, filterPrices, parsePriceFilters, pricesUrl, type PriceListing } from "@/lib/price-filters";

const now = Date.parse("2026-09-03T00:00:00Z");
const listings: PriceListing[] = boardPrices.map((price) => {
  const board = boards.find((item) => item.id === price.boardId)!;
  return { ...price, name: board.name, vendor: board.vendor, category: board.category };
});

describe("price source integrity", () => {
  it("ties every listing to a real board, pinout, exact SKU, and safe retailer URL", () => {
    expect(new Set(boardPrices.map((price) => price.boardId)).size).toBe(boardPrices.length);
    for (const price of boardPrices) {
      expect(boards.find((board) => board.id === price.boardId)?.pinout).toBeDefined();
      const url = new URL(price.url);
      expect(url.protocol).toBe("https:");
      expect(url.hostname).toBe(price.retailer === "Arduino" ? "store-usa.arduino.cc" : "www.adafruit.com");
      expect(price.sku.length).toBeGreaterThan(0);
      expect(price.variant.length).toBeGreaterThan(0);
      expect(Number.isSafeInteger(price.amount) && price.amount > 0).toBe(true);
      expect(price.currency).toBe("USD");
      expect(Number.isFinite(Date.parse(price.checkedAt))).toBe(true);
    }
  });

  it("expires stock at exactly seven days and fails closed on invalid or future checks", () => {
    const price = boardPrices[0];
    const checked = Date.parse(price.checkedAt);
    expect(isPriceStale(price, checked + priceStaleAfterMs - 1)).toBe(false);
    expect(isPriceStale(price, checked + priceStaleAfterMs)).toBe(true);
    expect(isPriceStale(price, checked - 1)).toBe(true);
    expect(isPriceStale({ ...price, checkedAt: "bad-date" }, now)).toBe(true);
  });

  it("preserves cents when formatting prices", () => {
    expect(formatPrice({ amount: 1905, currency: "USD" })).toBe("$19.05");
  });
});

describe("pricing discovery", () => {
  it("excludes sold-out and stale listings from the in-stock filter", () => {
    const filters = { ...defaultPriceFilters, inStock: true };
    expect(filterPrices(listings, filters, now).every((item) => item.stock === "in-stock")).toBe(true);
    expect(filterPrices(listings, filters, now + priceStaleAfterMs)).toEqual([]);
  });

  it("combines exact board, category, variant search, and stock constraints", () => {
    const filters = { ...defaultPriceFilters, query: "8MB", board: "esp32-s3-devkitc-1" };
    // Search respects the human-readable variant, including its spaces.
    expect(filterPrices(listings, { ...filters, query: "N8R8 Adafruit", inStock: true }, now)).toHaveLength(1);
    expect(filterPrices(listings, { ...filters, query: "N8R8", category: "SBC" }, now)).toHaveLength(0);
    expect(filterPrices(listings, { ...defaultPriceFilters, board: "missing" }, now)).toHaveLength(0);
  });

  it("sorts numerically without changing featured order", () => {
    const original = listings.map((item) => item.boardId);
    const sorted = filterPrices(listings, { ...defaultPriceFilters, sort: "price-asc" }, now);
    expect(sorted.map((item) => item.amount)).toEqual([...listings.map((item) => item.amount)].sort((a, b) => a - b));
    expect(listings.map((item) => item.boardId)).toEqual(original);
  });

  it("round trips shareable filters and bounds unknown parameters", () => {
    const filters = { query: "Pico & headers", board: "raspberry-pi-pico", category: "Microcontroller", sort: "price-asc", inStock: true };
    expect(parsePriceFilters(new URL(pricesUrl(filters), "https://pinhub.test").searchParams)).toEqual(filters);
    expect(parsePriceFilters(new URLSearchParams("sort=bad&category=bad&stock=bad"))).toEqual(defaultPriceFilters);
    expect(parsePriceFilters(new URLSearchParams({ q: "x".repeat(500) })).query).toHaveLength(100);
  });
});
