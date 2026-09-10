import { parseBoardPrices, type BoardPrice } from "./board-price-schema";

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

/** Only observations can change remotely; catalog identity and defaults stay curated. */
export function mergePriceObservations(catalog: BoardPrice[], observations: BoardPrice[]): BoardPrice[] {
  const byId = new Map(observations.map((price) => [price.id, price]));
  return catalog.map((price) => {
    const latest = byId.get(price.id);
    if (!latest || Date.parse(latest.checkedAt) < Date.parse(price.checkedAt)) return price;
    for (const key of ["boardId", "variant", "sku", "retailer", "sellerType", "url", "currency"] as const) {
      if (price[key] !== latest[key]) throw new Error("Price listing identity changed");
    }
    return { ...price, amount: latest.amount, stock: latest.stock, checkedAt: latest.checkedAt };
  });
}

/** Bound the streamed body too: Content-Length alone is not a size limit. */
export async function readPriceJson(stream: ReadableStream<Uint8Array>, maxBytes = maxPriceSnapshotBytes): Promise<unknown> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes) throw new Error("Price snapshot exceeds size limit");
      chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => undefined); reader.releaseLock(); }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder().decode(bytes));
}

export async function readPriceSnapshot(stream: ReadableStream<Uint8Array>): Promise<PriceSnapshot> {
  return parsePriceSnapshot(await readPriceJson(stream));
}
