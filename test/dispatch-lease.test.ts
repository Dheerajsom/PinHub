import { beforeEach, describe, expect, it, vi } from "vitest";

// A one-object fake of Vercel Blob with the conditional-write semantics the
// lease relies on: `ifMatch` compares ETags, `allowOverwrite: false` refuses
// an existing object (with a generic error, as the service does).
const store = vi.hoisted(() => ({ body: null as string | null, etag: 0, writes: 0, gate: null as Promise<void> | null }));

vi.mock("@vercel/blob", () => {
  class BlobPreconditionFailedError extends Error {}
  return {
    BlobPreconditionFailedError,
    get: vi.fn(async () => {
      if (store.body === null) return null;
      return {
        statusCode: 200,
        blob: { etag: `"${store.etag}"` },
        stream: new Response(store.body).body!,
      };
    }),
    put: vi.fn(async (_path: string, body: string, options: { ifMatch?: string; allowOverwrite?: boolean }) => {
      // Let concurrent callers all finish their reads before any write lands.
      if (store.gate) await store.gate;
      if (options.ifMatch !== undefined && options.ifMatch !== `"${store.etag}"`) throw new BlobPreconditionFailedError();
      if (options.allowOverwrite === false && store.body !== null) throw new Error("This blob already exists");
      store.body = body;
      store.etag += 1;
      store.writes += 1;
      return { etag: `"${store.etag}"` };
    }),
    del: vi.fn(async (_path: string, options: { ifMatch?: string }) => {
      if (options.ifMatch !== `"${store.etag}"`) throw new BlobPreconditionFailedError();
      store.body = null;
    }),
  };
});

const { blobDispatchLease } = await import("@/lib/server/dispatch-lease");
const interval = 40 * 60_000;
const now = Date.parse("2026-11-25T12:00:00Z");

describe("blob dispatch lease", () => {
  beforeEach(() => {
    store.body = null;
    store.etag = 0;
    store.writes = 0;
    store.gate = null;
  });

  async function race(count: number, seeded: boolean) {
    if (seeded) store.body = JSON.stringify({ claimedAt: new Date(now - 2 * interval).toISOString() });
    let open!: () => void;
    store.gate = new Promise((resolve) => (open = resolve));
    const claims = Array.from({ length: count }, () => blobDispatchLease().claim(now, interval));
    await new Promise((resolve) => setTimeout(resolve, 0));
    open();
    return Promise.all(claims);
  }

  it("lets exactly one concurrent caller claim an expired lease", async () => {
    const results = await race(4, true);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(store.writes).toBe(1);
  });

  it("lets exactly one concurrent caller create the first lease", async () => {
    const results = await race(4, false);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(store.writes).toBe(1);
  });

  it("refuses a claim inside the interval and allows one after it", async () => {
    expect(await blobDispatchLease().claim(now, interval)).toBe(true);
    expect(await blobDispatchLease().claim(now + interval - 1, interval)).toBe(false);
    expect(await blobDispatchLease().claim(now + interval, interval)).toBe(true);
  });

  it("does not honour a claim dated far in the future forever", async () => {
    store.body = JSON.stringify({ claimedAt: new Date(now + 10 * interval).toISOString() });
    expect(await blobDispatchLease().claim(now, interval)).toBe(true);
  });

  it("treats an unreadable or oversized lease as expired", async () => {
    store.body = "not json";
    expect(await blobDispatchLease().claim(now, interval)).toBe(true);
    store.body = JSON.stringify({ claimedAt: new Date(now).toISOString(), pad: "x".repeat(1000) });
    expect(await blobDispatchLease().claim(now, interval)).toBe(true);
  });

  it("releases only its own claim", async () => {
    const lease = blobDispatchLease();
    expect(await lease.claim(now, interval)).toBe(true);
    await lease.release();
    expect(store.body).toBeNull();
    expect(await blobDispatchLease().claim(now, interval)).toBe(true);
  });
});
