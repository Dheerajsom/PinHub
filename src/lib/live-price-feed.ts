import { boardPrices, type BoardPrice } from "./board-prices";
import { maxPriceSnapshotBytes, mergePriceObservations, parsePriceSnapshot, readPriceJson } from "./price-snapshot";

type FeedState = { prices: BoardPrice[] | null; source: "loading" | "shared" | "fallback" | "unavailable"; now: number | null };
export const initialPriceFeed: FeedState = { prices: null, source: "loading", now: null };

/** One poller per tab, started only while a price consumer is mounted. */
export function createPriceFeed(fetcher: typeof fetch = (input, init) => fetch(input, init)) {
  let state = initialPriceFeed;
  const listeners = new Set<() => void>();
  let timer: ReturnType<typeof setInterval> | undefined;
  let request: AbortController | undefined;
  let lastAttempt = 0;
  function notify() { for (const listener of listeners) listener(); }
  async function refresh() {
    if (document.visibilityState === "hidden" || request || Date.now() - lastAttempt < 10_000) return;
    const controller = new AbortController();
    request = controller;
    lastAttempt = Date.now();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    try {
      const response = await fetcher("/api/prices", { signal: controller.signal, cache: "no-store", credentials: "omit" });
      if (!response.ok || !response.body) throw new Error("Price feed unavailable");
      // Allow the small API envelope in addition to the shared snapshot limit.
      const body = await readPriceJson(response.body, maxPriceSnapshotBytes + 128) as Record<string, unknown> | null;
      if (!body || !["shared", "fallback"].includes(String(body.source))) throw new Error("Invalid price feed");
      const snapshot = parsePriceSnapshot(body.snapshot);
      const prices = mergePriceObservations(boardPrices, snapshot.prices);
      if (!controller.signal.aborted) {
        state = { prices: mergePriceObservations(state.prices ?? boardPrices, prices), source: body.source as "shared" | "fallback", now: Date.now() };
      }
    } catch {
      if (request === controller && listeners.size) state = { ...state, source: "unavailable", now: Date.now() };
    } finally {
      clearTimeout(timeout);
      if (request === controller) { request = undefined; notify(); }
    }
  }
  function tick() {
    if (document.visibilityState === "hidden") return;
    state = { ...state, now: Date.now() };
    notify();
    void refresh();
  }
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      if (listeners.size === 1) {
        void refresh();
        timer = setInterval(tick, 60_000);
        document.addEventListener("visibilitychange", tick);
        window.addEventListener("online", tick);
      }
      return () => {
        listeners.delete(listener);
        if (!listeners.size) {
          clearInterval(timer);
          document.removeEventListener("visibilitychange", tick);
          window.removeEventListener("online", tick);
          // React Strict Mode briefly unsubscribes and resubscribes. Keep its
          // in-flight request instead of sending a second identical request.
          queueMicrotask(() => {
            if (!listeners.size) {
              request?.abort();
              request = undefined;
              lastAttempt = 0;
            }
          });
        }
      };
    },
  };
}
