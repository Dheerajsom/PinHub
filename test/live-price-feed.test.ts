// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createPriceFeed } from "@/lib/live-price-feed";
import { boardPrices } from "@/lib/board-prices";

const now = Date.parse("2026-09-10T02:00:00Z");
function response(amount: number, source = "shared", checkedAt = new Date(Date.now()).toISOString()) {
  return Response.json({ source, snapshot: { schemaVersion: 1, generatedAt: checkedAt,
    prices: boardPrices.map((price, i) => ({ ...price, amount: i === 0 ? amount : price.amount, checkedAt })),
  } });
}
const cleanups: (() => void)[] = [];
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(now); vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible"); });
afterEach(() => { cleanups.splice(0).forEach((fn) => fn()); vi.useRealTimers(); vi.restoreAllMocks(); });

it("shares one request across consumers, polls every minute, and stops when unmounted", async () => {
  const fetcher = vi.fn().mockImplementation(async () => response(12500));
  const feed = createPriceFeed(fetcher);
  const a = feed.subscribe(vi.fn()); const b = feed.subscribe(vi.fn());
  cleanups.push(a, b);
  await vi.advanceTimersByTimeAsync(0);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(feed.getSnapshot().prices![0].amount).toBe(12500);
  await vi.advanceTimersByTimeAsync(60_000);
  expect(fetcher).toHaveBeenCalledTimes(2);
  a(); b();
  await vi.advanceTimersByTimeAsync(60_000);
  expect(fetcher).toHaveBeenCalledTimes(2);
});

it("pauses hidden tabs and resumes with one request when visible", async () => {
  const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
  const fetcher = vi.fn().mockImplementation(async () => response(12500));
  const feed = createPriceFeed(fetcher);
  cleanups.push(feed.subscribe(vi.fn()));
  await vi.advanceTimersByTimeAsync(120_000);
  expect(fetcher).not.toHaveBeenCalled();
  visibility.mockReturnValue("visible");
  document.dispatchEvent(new Event("visibilitychange"));
  await vi.advanceTimersByTimeAsync(0);
  expect(fetcher).toHaveBeenCalledTimes(1);
});

it("deduplicates the Strict Mode unsubscribe/resubscribe cycle", async () => {
  const fetcher = vi.fn().mockImplementation(async () => response(12500));
  const feed = createPriceFeed(fetcher);
  feed.subscribe(vi.fn())();
  cleanups.push(feed.subscribe(vi.fn()));
  await vi.advanceTimersByTimeAsync(0);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(feed.getSnapshot().source).toBe("shared");
});

it("retains newer prices through network failures, older fallback responses and malformed data", async () => {
  const fetcher = vi.fn()
    .mockImplementationOnce(async () => response(12500))
    .mockRejectedValueOnce(new Error("offline"))
    .mockImplementationOnce(async () => response(9999, "fallback", "2026-09-02T14:00:00.000Z"))
    .mockImplementationOnce(async () => Response.json({ source: "shared", snapshot: { schemaVersion: 99 } }));
  const feed = createPriceFeed(fetcher);
  cleanups.push(feed.subscribe(vi.fn()));
  await vi.advanceTimersByTimeAsync(0);
  for (const source of ["unavailable", "fallback", "unavailable"]) {
    await vi.advanceTimersByTimeAsync(60_000);
    expect(feed.getSnapshot()).toMatchObject({ source, prices: [{ amount: 12500 }, ...boardPrices.slice(1).map((p) => expect.objectContaining({ id: p.id }))] });
    expect(feed.getSnapshot().prices![0].checkedAt).toBe(new Date(now).toISOString());
  }
});
