import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { get, put } from "@vercel/blob";
import { boardPrices } from "@/lib/board-prices";
import { getLivePrices, readStoredPrices, writeStoredPrices } from "@/lib/server/price-store";
import { maxPriceSnapshotBytes, mergePriceObservations, parsePriceSnapshot, readPriceSnapshot } from "@/lib/price-snapshot";
import { GET } from "@/app/api/prices/route";

vi.mock("@vercel/blob", () => ({ get: vi.fn(), put: vi.fn() }));
const time = "2026-09-10T02:00:00.000Z";
const snapshot = () => ({ schemaVersion: 1 as const, generatedAt: time, prices: boardPrices.map((price) => ({ ...price, checkedAt: time })) });
const stored = () => ({ statusCode: 200, stream: new Response(JSON.stringify(snapshot())).body!, blob: { etag: "version-1" } });

beforeEach(() => { vi.setSystemTime(new Date(time)); vi.stubEnv("BLOB_READ_WRITE_TOKEN", "test-only"); });
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
    expect(() => mergePriceObservations(boardPrices, [{ ...current[0], boardId: "wrong" }])).toThrow("identity");
    expect(() => mergePriceObservations(boardPrices, [{ ...current[0], variant: "different kit" }])).toThrow("identity");
  });

  it("conditionally replaces exactly the version read, rejecting a cached or concurrent version", async () => {
    vi.mocked(get).mockResolvedValue(stored() as Awaited<ReturnType<typeof get>>);
    const result = await readStoredPrices();
    expect(get).toHaveBeenCalledWith("prices/latest-v1.json", expect.objectContaining({ access: "public" }));
    await writeStoredPrices(result!.snapshot, result!.etag);
    expect(put).toHaveBeenCalledWith("prices/latest-v1.json", expect.any(String), expect.objectContaining({ ifMatch: "version-1", cacheControlMaxAge: 60 }));
    await writeStoredPrices(snapshot());
    expect(put).toHaveBeenLastCalledWith(expect.any(String), expect.any(String), expect.objectContaining({ allowOverwrite: false }));
    vi.mocked(put).mockRejectedValue(new Error("Precondition failed"));
    await expect(writeStoredPrices(snapshot(), "old-etag")).rejects.toThrow("Precondition");
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
    vi.mocked(get).mockResolvedValue({ ...stored(), stream: new Response('{"bad":true}').body! } as Awaited<ReturnType<typeof get>>);
    expect((await getLivePrices()).source).toBe("fallback");
  });
});
