import { parseBoardPrices, type BoardPrice } from "./board-price-schema";
import { readBoundedBytes } from "./bounded-read";

export const priceSnapshotPath = "prices/latest-v1.json";
export const maxPriceSnapshotBytes = 256 * 1024;
export type PriceSnapshot = { schemaVersion: 1; generatedAt: string; prices: BoardPrice[] };
export type PriceResponse = { source: "shared" | "fallback"; snapshot: PriceSnapshot };

export function parsePriceSnapshot(value: unknown, now = Date.now()): PriceSnapshot {
  if (!value || typeof value !== "object") throw new Error("Invalid price snapshot");
  if (new TextEncoder().encode(JSON.stringify(value)).length > maxPriceSnapshotBytes) throw new Error("Price snapshot exceeds size limit");
  const p = value as Record<string, unknown>;
  if (p.schemaVersion !== 1 || typeof p.generatedAt !== "string"
    || !Number.isFinite(Date.parse(p.generatedAt))
    || new Date(p.generatedAt).toISOString() !== p.generatedAt
    || Date.parse(p.generatedAt) > now + 60_000
    || !Array.isArray(p.prices) || p.prices.length > 500) throw new Error("Invalid price snapshot metadata");
  const prices = parseBoardPrices(p.prices);
  const generatedAt = p.generatedAt;
  if (prices.some((price) => Date.parse(price.checkedAt) > Date.parse(generatedAt)
    || Object.values(price).some((field) => typeof field === "string" && field.length > 2000))) {
    throw new Error("Invalid price snapshot observation");
  }
  return { schemaVersion: 1, generatedAt: p.generatedAt, prices };
}

const listingIdentityKeys = ["boardId", "variant", "sku", "retailer", "sellerType", "url", "currency"] as const;

/** True when an observation describes exactly the curated listing it claims to update. */
export function isSameListing(curated: BoardPrice, observed: BoardPrice): boolean {
  return listingIdentityKeys.every((key) => curated[key] === observed[key]);
}

/**
 * Only observations can change remotely; catalog identity and defaults stay
 * curated. An observation whose identity no longer matches the curated listing
 * (for example after a deploy corrects a listing's URL) is ignored rather than
 * failing the whole merge: the curated listing keeps its own dated price until
 * the next publisher run observes the new identity. Throwing here used to make
 * every shared snapshot unusable after any such edit, and the hourly publisher
 * could never recover because it merges the same stale snapshot first.
 */
export function mergePriceObservations(catalog: BoardPrice[], observations: BoardPrice[]): BoardPrice[] {
  const byId = new Map(observations.map((price) => [price.id, price]));
  return catalog.map((price) => {
    const latest = byId.get(price.id);
    if (!latest || Date.parse(latest.checkedAt) < Date.parse(price.checkedAt)) return price;
    if (!isSameListing(price, latest)) return price;
    return { ...price, amount: latest.amount, stock: latest.stock, checkedAt: latest.checkedAt };
  });
}

/**
 * Merges a stored snapshot onto the curated catalog and keeps the result
 * self-consistent. A deploy can re-check a curated listing after the stored
 * snapshot was generated; that listing keeps its newer `checkedAt`, so the
 * snapshot's `generatedAt` must advance to it. Otherwise the browser's
 * `parsePriceSnapshot` rejects the whole response as carrying an observation
 * from after its own generation time, and the page drops to bundled prices.
 */
export function mergePriceSnapshot(catalog: BoardPrice[], snapshot: PriceSnapshot): PriceSnapshot {
  const prices = mergePriceObservations(catalog, snapshot.prices);
  const latest = Math.max(Date.parse(snapshot.generatedAt), ...prices.map((price) => Date.parse(price.checkedAt)));
  return { schemaVersion: 1, generatedAt: new Date(latest).toISOString(), prices };
}

/** Bound the streamed body too: Content-Length alone is not a size limit. */
export async function readPriceJson(stream: ReadableStream<Uint8Array>, maxBytes = maxPriceSnapshotBytes): Promise<unknown> {
  return JSON.parse(new TextDecoder().decode(await readBoundedBytes(stream, maxBytes, "Price snapshot exceeds size limit")));
}

export async function readPriceSnapshot(stream: ReadableStream<Uint8Array>): Promise<PriceSnapshot> {
  return parsePriceSnapshot(await readPriceJson(stream));
}
