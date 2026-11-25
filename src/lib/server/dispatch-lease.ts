import { BlobPreconditionFailedError, del, get, put } from "@vercel/blob";

/**
 * A cross-instance claim on the next price dispatch. Checking GitHub's latest
 * run and then dispatching is a read-then-act race: two scheduler calls that
 * land together both see no recent run and both dispatch. `claim` makes the
 * cooldown atomic: of any number of concurrent callers inside one interval,
 * exactly one gets `true`.
 */
export type DispatchLease = {
  claim(now: number, intervalMs: number): Promise<boolean>;
  /** Gives the claim back after a failed dispatch so the next call can retry. */
  release(): Promise<void>;
};

export const dispatchLeasePath = "price-dispatch-lease.json";
const maxLeaseBytes = 256;
const storageTimeoutMs = 8000;

type StoredLease = { claimedAt: number; etag: string };

async function readLease(): Promise<StoredLease | null> {
  const result = await get(dispatchLeasePath, {
    access: "public", abortSignal: AbortSignal.timeout(storageTimeoutMs),
    // Conditional writes need the strong ETag of the identity representation.
    headers: { "Accept-Encoding": "identity" },
  });
  if (!result) return null;
  if (result.statusCode !== 200) throw new Error("Unexpected lease storage response");
  const etag = result.blob.etag;
  if (!etag || etag.startsWith("W/")) throw new Error("Lease storage returned no strong ETag");
  const reader = result.stream.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxLeaseBytes) {
      await reader.cancel();
      // An oversized or foreign object is not a valid claim; overwrite it.
      return { claimedAt: Number.NaN, etag };
    }
    chunks.push(value);
  }
  let claimedAt = Number.NaN;
  try {
    const body = JSON.parse(new TextDecoder().decode(Buffer.concat(chunks))) as { claimedAt?: unknown };
    if (typeof body.claimedAt === "string") claimedAt = Date.parse(body.claimedAt);
  } catch {
    // Unreadable lease: treat it as expired.
  }
  return { claimedAt, etag };
}

function active(lease: StoredLease | null, now: number, intervalMs: number): boolean {
  if (!lease || !Number.isFinite(lease.claimedAt)) return false;
  const age = now - lease.claimedAt;
  // A claim from the future (clock skew, tampering) is not honoured forever:
  // it counts as active only within one interval of now.
  return Math.abs(age) < intervalMs;
}

/** The production lease, stored next to the price snapshot in Vercel Blob. */
export function blobDispatchLease(): DispatchLease {
  let held: string | null = null;
  return {
    async claim(now, intervalMs) {
      const current = await readLease();
      if (active(current, now, intervalMs)) return false;
      try {
        const written = await put(dispatchLeasePath, JSON.stringify({ claimedAt: new Date(now).toISOString() }), {
          access: "public", addRandomSuffix: false, contentType: "application/json",
          cacheControlMaxAge: 60, abortSignal: AbortSignal.timeout(storageTimeoutMs),
          // Compare-and-swap: only the caller whose read is still current wins.
          ...(current ? { ifMatch: current.etag } : { allowOverwrite: false }),
        });
        held = written.etag;
        return true;
      } catch (error) {
        if (error instanceof BlobPreconditionFailedError) return false;
        // `allowOverwrite: false` rejects a blob another caller just created
        // with a generic error; a fresh claim on re-read means we lost the race.
        if (!current && active(await readLease(), now, intervalMs)) return false;
        throw error;
      }
    },
    async release() {
      if (!held) return;
      const etag = held;
      held = null;
      await del(dispatchLeasePath, { ifMatch: etag, abortSignal: AbortSignal.timeout(storageTimeoutMs) });
    },
  };
}

/** An in-memory lease with the same contract, for tests and local runs. */
export function memoryDispatchLease(): DispatchLease & { claimedAt: number | null } {
  const lease = {
    claimedAt: null as number | null,
    async claim(now: number, intervalMs: number) {
      if (lease.claimedAt !== null && Math.abs(now - lease.claimedAt) < intervalMs) return false;
      lease.claimedAt = now;
      return true;
    },
    async release() {
      lease.claimedAt = null;
    },
  };
  return lease;
}
