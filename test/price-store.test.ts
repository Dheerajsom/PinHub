import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { get, put } from "@vercel/blob";
import { boardPrices } from "@/lib/board-prices";
import { getLivePrices, readStoredPrices, resetLivePriceCache, writeStoredPrices } from "@/lib/server/price-store";
import { maxPriceSnapshotBytes, mergePriceObservations, parsePriceSnapshot, readPriceSnapshot } from "@/lib/price-snapshot";
import { GET } from "@/app/api/prices/route";

vi.mock("@vercel/blob", () => ({ get: vi.fn(), put: vi.fn() }));
const time = "2026-09-10T02:00:00.000Z";
const snapshot = () => ({ schemaVersion: 1 as const, generatedAt: time, prices: boardPrices.map((price) => ({ ...price, checkedAt: time })) });
const stored = () => ({ statusCode: 200, stream: new Response(JSON.stringify(snapshot())).body!, blob: { etag: "version-1" } });

beforeEach(() => { vi.setSystemTime(new Date(time)); vi.stubEnv("BLOB_READ_WRITE_TOKEN", "test-only"); resetLivePriceCache(); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.resetAllMocks(); });

describe("shared price boundaries", () => {
  it("rejects malformed, future and oversized observations", async () => {
    expect(() => parsePriceSnapshot({ ...snapshot(), schemaVersion: 2 })).toThrow();
    expect(() => parsePriceSnapshot({ ...snapshot(), generatedAt: "2026-09-11T02:00:00.000Z" })).toThrow();
    expect(() => parsePriceSnapshot({ ...snapshot(), prices: [{ ...boardPrices[0], checkedAt: "2026-09-11T02:00:00Z" }] })).toThrow();
    expect(() => parsePriceSnapshot({ ...snapshot(), prices: Array(501).fill(boardPrices[0]) })).toThrow();
    await expect(readPriceSnapshot(new Response(" ".repeat(maxPriceSnapshotBytes + 1)).body!)).rejects.toThrow("size limit");
    await expect(writeStoredPrices({ ...snapshot(), prices: [{ ...boardPrices[0], variant: "x".repeat(2001) }] })).rejects.toThrow();
    expect(put).not.toHaveBeenCalled();
  });

  it("updates only exact catalog observations and never regresses their timestamp", () => {
    const current = snapshot().prices;
    expect(mergePriceObservations(current, boardPrices)).toEqual(current);
    const changed = [{ ...current[0], amount: 12345, primary: false }, ...current.slice(1)];
    expect(mergePriceObservations(boardPrices, changed)[0]).toMatchObject({ amount: 12345, primary: true });
    // A mismatched identity is never applied, and it must not discard the
    // other listings' valid observations either.
    const mismatched = [{ ...current[0], boardId: "wrong", amount: 1 }, ...current.slice(1)];
    const merged = mergePriceObservations(boardPrices, mismatched);
    expect(merged[0]).toEqual(boardPrices[0]);
    expect(merged.slice(1)).toEqual(current.slice(1));
    expect(mergePriceObservations(boardPrices, [{ ...current[0], variant: "different kit", amount: 1 }])[0]).toEqual(boardPrices[0]);
  });

  it("keeps publishing after a curated listing identity changes", async () => {
    // The stored snapshot still carries the listing's old URL; the deploy has
    // since corrected it. The API must keep serving shared observations for
    // every other listing instead of falling back for the whole catalog.
    const stale = snapshot();
    stale.prices[0] = { ...stale.prices[0], sku: `${stale.prices[0].sku}9`, url: stale.prices[0].url.replace(/\d+(?=$|\?)/, (sku) => `${sku}9`), amount: 1 };
    vi.mocked(get).mockResolvedValue({ ...stored(), stream: new Response(JSON.stringify(stale)).body! } as Awaited<ReturnType<typeof get>>);
    const result = await getLivePrices();
    expect(result.source).toBe("shared");
    expect(result.snapshot.prices[0]).toEqual(boardPrices[0]);
    expect(result.snapshot.prices[1]).toMatchObject({ checkedAt: time });
  });

  it("conditionally replaces exactly the version read, rejecting a cached or concurrent version", async () => {
    vi.mocked(get).mockResolvedValue(stored() as Awaited<ReturnType<typeof get>>);
    const result = await readStoredPrices();
    expect(get).toHaveBeenCalledWith("prices/latest-v1.json", expect.objectContaining({ access: "public", headers: { "Accept-Encoding": "identity" } }));
    await writeStoredPrices(result!.snapshot, result!.etag);
    expect(put).toHaveBeenCalledWith("prices/latest-v1.json", expect.any(String), expect.objectContaining({ ifMatch: "version-1", cacheControlMaxAge: 60 }));
    await writeStoredPrices(snapshot());
    expect(put).toHaveBeenLastCalledWith(expect.any(String), expect.any(String), expect.objectContaining({ allowOverwrite: false }));
    vi.mocked(put).mockRejectedValue(new Error("Precondition failed"));
    await expect(writeStoredPrices(snapshot(), "old-etag")).rejects.toThrow("Precondition");
  });

  it("never uses a weak compressed-response ETag for a conditional write", async () => {
    await expect(writeStoredPrices(snapshot(), 'W/"compressed-version"')).rejects.toThrow("strong storage ETag");
    await expect(writeStoredPrices(snapshot(), "")).rejects.toThrow("strong storage ETag");
    expect(put).not.toHaveBeenCalled();
  });

  it("serves shared observations from the read-only API with a bounded cache", async () => {
    vi.mocked(get).mockResolvedValue(stored() as Awaited<ReturnType<typeof get>>);
    const response = await GET();
    expect(response.headers.get("cache-control")).toBe("public, max-age=0, s-maxage=30");
    expect(await response.json()).toMatchObject({ source: "shared", snapshot: { prices: snapshot().prices } });
    expect(put).not.toHaveBeenCalled();
  });

  it("keeps dated fallback data on storage failure or invalid data, without caching the failure", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.mocked(get).mockRejectedValueOnce(new Error("offline"));
    const response = await GET();
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toMatchObject({ source: "fallback", snapshot: { prices: boardPrices } });
    resetLivePriceCache();
    vi.mocked(get).mockResolvedValue({ ...stored(), stream: new Response('{"bad":true}').body! } as Awaited<ReturnType<typeof get>>);
    expect((await getLivePrices()).source).toBe("fallback");
  });

  it("reads storage once per reuse window, including while storage is failing", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.mocked(get).mockRejectedValue(new Error("offline"));
    const results = await Promise.all([getLivePrices(), getLivePrices(), GET(), GET()]);
    expect(get).toHaveBeenCalledTimes(1);
    expect(results[0]).toMatchObject({ source: "fallback" });
    vi.setSystemTime(new Date(Date.parse(time) + 31_000));
    vi.mocked(get).mockResolvedValue(stored() as Awaited<ReturnType<typeof get>>);
    expect((await getLivePrices()).source).toBe("shared");
    expect(get).toHaveBeenCalledTimes(2);
  });
});
