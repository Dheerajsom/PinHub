import { afterEach, describe, expect, it, vi } from "vitest";
import { boards } from "@/lib/boards";
import { createBoardDetailLoader, maxBoardDetailBytes } from "@/lib/board-detail-loader";
import { PayloadTooLargeError, readBoundedJson } from "@/lib/bounded-read";
import { loadPinIndex, maxPinIndexBytes, pinIndexTimeoutMs, resetPinIndexCache } from "@/lib/pin-index-client";

/** An endless JSON-ish body that counts how much of it was pulled. */
function endlessBody(chunkBytes = 64 * 1024) {
  const chunk = new TextEncoder().encode(" ".repeat(chunkBytes));
  const state = { pulled: 0, cancelled: false };
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      state.pulled += chunk.byteLength;
      controller.enqueue(chunk);
    },
    cancel() {
      state.cancelled = true;
    },
  }, { highWaterMark: 0 });
  return { stream, state };
}

afterEach(() => {
  resetPinIndexCache();
  vi.restoreAllMocks();
});

describe("bounded JSON reads", () => {
  it("stops pulling an oversized body at the limit and cancels it", async () => {
    const { stream, state } = endlessBody();
    await expect(readBoundedJson(new Response(stream), 256 * 1024)).rejects.toBeInstanceOf(PayloadTooLargeError);
    // It never buffered the whole thing: it stopped one chunk past the cap.
    expect(state.pulled).toBeLessThanOrEqual(256 * 1024 + 64 * 1024);
    expect(state.cancelled).toBe(true);
  });

  it("refuses a declared Content-Length over the limit without reading", async () => {
    const { stream, state } = endlessBody();
    const response = new Response(stream, { headers: { "Content-Length": String(10 * 1024 * 1024) } });
    await expect(readBoundedJson(response, 1024)).rejects.toBeInstanceOf(PayloadTooLargeError);
    expect(state.pulled).toBeLessThanOrEqual(64 * 1024);
  });

  it("parses bodies within the limit", async () => {
    expect(await readBoundedJson(Response.json({ ok: true }), 64)).toEqual({ ok: true });
  });
});

describe("pin index fetch", () => {
  it("is bounded by a timeout that covers the whole request", async () => {
    const timeout = vi.spyOn(AbortSignal, "timeout");
    const fetcher = vi.fn<typeof fetch>(async () => new Response("[]"));
    await loadPinIndex(fetcher).catch(() => undefined);
    expect(timeout).toHaveBeenCalledWith(pinIndexTimeoutMs);
    const init = fetcher.mock.calls[0][1]!;
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(init.cache).toBe("no-cache");
  });

  it("refuses an oversized index while streaming, then lets a retry fetch again", async () => {
    const { stream, state } = endlessBody();
    const fetcher = vi.fn<typeof fetch>(async () => new Response(stream));
    await expect(loadPinIndex(fetcher)).rejects.toThrow("Pin index too large");
    expect(state.pulled).toBeLessThanOrEqual(maxPinIndexBytes + 64 * 1024);
    expect(state.cancelled).toBe(true);
    await loadPinIndex(fetcher).catch(() => undefined);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("fails, rather than hanging, when the request is aborted", async () => {
    const fetcher = vi.fn<typeof fetch>((_input, init) => new Promise((_resolve, reject) => {
      init!.signal!.addEventListener("abort", () => reject(new DOMException("timed out", "TimeoutError")));
    }));
    const controller = new AbortController();
    vi.spyOn(AbortSignal, "timeout").mockReturnValue(controller.signal);
    const pending = loadPinIndex(fetcher);
    controller.abort();
    await expect(pending).rejects.toThrow("timed out");
  });
});

describe("board detail loader", () => {
  it("refuses an oversized board record while streaming", async () => {
    const { stream, state } = endlessBody();
    const loader = createBoardDetailLoader([], async () => new Response(stream));
    await expect(loader.load("arduino-uno-r3")).rejects.toThrow("too large");
    expect(state.pulled).toBeLessThanOrEqual(maxBoardDetailBytes + 64 * 1024);
    expect(state.cancelled).toBe(true);
  });

  it("keeps every catalog record well under the byte cap", () => {
    const largest = Math.max(...boards.map((board) => new TextEncoder().encode(JSON.stringify(board)).length));
    expect(largest).toBeLessThan(maxBoardDetailBytes / 4);
  });
});
