import { get, put } from "@vercel/blob";
import { boardPrices } from "../board-prices";
import { maxPriceSnapshotBytes, mergePriceObservations, parsePriceSnapshot, priceSnapshotPath, readPriceSnapshot, type PriceResponse, type PriceSnapshot } from "../price-snapshot";

export function priceStoreConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

export async function readStoredPrices() {
  const result = await get(priceSnapshotPath, {
    access: "public", abortSignal: AbortSignal.timeout(8000),
    // Blob's compressed CDN responses carry W/ ETags that cannot be used for
    // conditional writes. Read the identity representation and its strong ETag.
    headers: { "Accept-Encoding": "identity" },
  });
  if (!result) return null;
  if (result.statusCode !== 200) throw new Error("Unexpected price storage response");
  const snapshot = await readPriceSnapshot(result.stream);
  return { snapshot, etag: result.blob.etag };
}

export async function writeStoredPrices(snapshot: PriceSnapshot, etag?: string) {
  if (etag !== undefined && (!etag || etag.startsWith("W/"))) throw new Error("Price publication requires a strong storage ETag");
  const body = JSON.stringify(parsePriceSnapshot(snapshot));
  if (new TextEncoder().encode(body).length > maxPriceSnapshotBytes) throw new Error("Price snapshot exceeds size limit");
  return put(priceSnapshotPath, body, {
    access: "public", addRandomSuffix: false, contentType: "application/json",
    cacheControlMaxAge: 60, abortSignal: AbortSignal.timeout(15_000),
    // Public reads may be cached for 60s. Compare that read's ETag at the
    // origin: a stale read fails publication rather than overwriting newer data.
    ...(etag ? { ifMatch: etag } : { allowOverwrite: false }),
  });
}

export function fallbackPrices(): PriceResponse {
  return { source: "fallback", snapshot: {
    schemaVersion: 1,
    generatedAt: new Date(Math.max(...boardPrices.map((price) => Date.parse(price.checkedAt)))).toISOString(),
    prices: boardPrices,
  } };
}

// The CDN only caches the shared response, so a slow or failing store would
// otherwise hold every uncached request open for the full read timeout. One
// read per instance serves concurrent requests, and its result is reused
// briefly so an outage costs one storage read per window, not one per visitor.
const livePriceReuseMs = 30_000;
let recent: { at: number; result: Promise<PriceResponse> } | null = null;

/** Test hook: forget the reused result so each case reads storage again. */
export function resetLivePriceCache() {
  recent = null;
}

export function getLivePrices(): Promise<PriceResponse> {
  const now = Date.now();
  if (recent && now - recent.at < livePriceReuseMs && now >= recent.at) return recent.result;
  const result = readLivePrices();
  recent = { at: now, result };
  return result;
}

async function readLivePrices(): Promise<PriceResponse> {
  if (priceStoreConfigured()) {
    try {
      const stored = await readStoredPrices();
      if (stored) return { source: "shared", snapshot: {
        ...stored.snapshot, prices: mergePriceObservations(boardPrices, stored.snapshot.prices),
      } };
    } catch {
      // Do not log upstream URLs/credentials or discard the bundled fallback.
      console.warn("Shared price snapshot unavailable; serving dated reference prices.");
    }
  }
  return fallbackPrices();
}
