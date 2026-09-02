import { readFile, writeFile, rename, unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { parseBoardPrices, type BoardPrice } from "../../src/lib/board-price-schema";

type RecordValue = Record<string, unknown>;
export type Observation = Pick<BoardPrice, "amount" | "stock">;
export type RefreshResult = {
  id: string;
  status: "checked" | "failed";
  previousAmount: number;
  amount?: number;
  stock?: BoardPrice["stock"];
  checkedAt?: string;
  error?: string;
};
export type RefreshOptions = {
  dryRun?: boolean;
  acceptedPrices?: ReadonlyMap<string, number>;
  fetcher?: typeof fetch;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  log?: (message: string) => void;
};

function object(value: unknown, label: string): RecordValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`Missing ${label}`);
  return value as RecordValue;
}

function cents(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) throw new Error("Price must be positive integer cents");
  return value as number;
}

/** Parse decimal dollars exactly; reject rounding, exponents, and separators. */
export function dollarsToCents(value: unknown): number {
  if (typeof value !== "string" && typeof value !== "number") throw new Error("Missing USD price");
  const match = /^(\d+)(?:\.(\d{1,2})0*)?$/.exec(String(value));
  if (!match) throw new Error("Invalid USD decimal price");
  return cents(Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0")));
}

function schemaType(value: unknown, type: string): boolean {
  return [type, `http://schema.org/${type}`, `https://schema.org/${type}`].some((name) =>
    Array.isArray(value) ? value.includes(name) : value === name);
}

function graphNodes(value: unknown): RecordValue[] {
  if (Array.isArray(value)) return value.flatMap(graphNodes);
  if (!value || typeof value !== "object") return [];
  const node = value as RecordValue;
  return [node, ...graphNodes(node["@graph"])];
}

function exactAdafruitUrl(value: unknown, sku: string): boolean {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && ["adafruit.com", "www.adafruit.com"].includes(url.hostname)
      && url.pathname === `/product/${sku}` && !url.search && !url.hash && !url.port && !url.username && !url.password;
  } catch { return false; }
}

export function parseAdafruit(html: string, listing: BoardPrice): Observation {
  const nodes: RecordValue[] = [];
  for (const match of html.matchAll(/<script\b[^>]*\btype\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script\s*>/gi)) {
    // Fail closed on malformed JSON-LD rather than accidentally choosing a related product.
    nodes.push(...graphNodes(JSON.parse(match[1])));
  }
  const products = nodes.filter((node) => schemaType(node["@type"], "Product") && String(node.sku) === listing.sku);
  if (products.length !== 1) throw new Error("Expected exactly one Product matching the Adafruit SKU");
  const product = products[0];
  if (typeof product.name !== "string" || !product.name.trim()) throw new Error("Missing product name");
  const rawOffers = Array.isArray(product.offers) ? product.offers : [product.offers];
  const offers = rawOffers.map((offer) => object(offer, "Offer")).filter((offer) =>
    schemaType(offer["@type"], "Offer") && exactAdafruitUrl(offer.url, listing.sku));
  if (offers.length !== 1) throw new Error("Expected exactly one Offer for the selected Adafruit product");
  const offer = offers[0];
  if (offer.priceCurrency !== listing.currency) throw new Error("Retailer currency is not USD");
  if (!schemaType(offer.itemCondition, "NewCondition")) throw new Error("Offer is not a confirmed new board");
  if (offer.eligibleQuantity !== undefined) {
    const quantity = object(offer.eligibleQuantity, "eligible quantity");
    for (const key of ["value", "minValue", "maxValue"]) {
      if (quantity[key] !== undefined && ((typeof quantity[key] !== "number" && typeof quantity[key] !== "string")
        || !Number.isFinite(Number(quantity[key])) || Number(quantity[key]) <= 0)) throw new Error("Invalid eligible quantity");
    }
    if ((quantity.value !== undefined && Number(quantity.value) !== 1)
      || (quantity.minValue !== undefined && Number(quantity.minValue) > 1)
      || (quantity.maxValue !== undefined && Number(quantity.maxValue) < 1)) throw new Error("Offer is not a single-unit price");
  }
  let stock: BoardPrice["stock"];
  if (schemaType(offer.availability, "InStock")) stock = "in-stock";
  else if (["OutOfStock", "SoldOut", "Discontinued"].some((type) => schemaType(offer.availability, type))) stock = "out-of-stock";
  else if (["PreOrder", "PreSale", "BackOrder", "LimitedAvailability", "OnlineOnly", "InStoreOnly"].some((type) => schemaType(offer.availability, type))) stock = "unknown";
  else throw new Error("Missing or unrecognized availability");
  return { amount: dollarsToCents(offer.price), stock };
}

export function parseArduino(productJson: unknown, listing: BoardPrice, currency: unknown): Observation {
  if (currency !== listing.currency) throw new Error("Arduino store currency is not USD");
  const url = new URL(listing.url);
  const product = object(productJson, "Arduino product");
  if (product.handle !== url.pathname.split("/").at(-1)) throw new Error("Arduino product handle mismatch");
  if (!Array.isArray(product.variants)) throw new Error("Missing Arduino variants");
  const variants = product.variants.map((v) => object(v, "variant")).filter((v) => String(v.id) === url.searchParams.get("variant"));
  if (variants.length !== 1 || variants[0].sku !== listing.sku) throw new Error("Arduino variant ID/SKU mismatch");
  const variant = variants[0];
  if (typeof variant.available !== "boolean") throw new Error("Missing variant availability");
  return { amount: cents(variant.price), stock: variant.available ? "in-stock" : "out-of-stock" };
}

class HttpError extends Error {
  constructor(readonly status: number) { super(`HTTP ${status}`); }
}

/** Three total attempts, 15s including body per attempt; no redirects to another SKU/store. */
export async function fetchRetailerText(url: string, options: RefreshOptions = {}): Promise<string> {
  const fetcher = options.fetcher ?? fetch;
  const sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await fetcher(url, {
        signal: AbortSignal.timeout(15_000), redirect: "error", cache: "no-store",
        headers: { "User-Agent": "PinHub-PriceCheck/1.0 (+https://pinhub-mauve.vercel.app/prices)", "Accept": "text/html,application/json", "Accept-Language": "en-US,en;q=0.9" },
      });
      if (response.status !== 200) {
        await response.body?.cancel();
        throw new HttpError(response.status);
      }
      if (response.url && response.url !== url) throw new Error("Retailer response URL changed");
      return await response.text();
    } catch (error) {
      const retryable = error instanceof HttpError ? error.status === 429 || error.status >= 500
        : error instanceof TypeError || (error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name));
      if (!retryable || attempt >= 2) throw error;
      await sleep(1000 * 2 ** attempt);
    }
  }
}

export async function refreshListings(listings: BoardPrice[], options: RefreshOptions = {}) {
  parseBoardPrices(listings);
  for (const [id, amount] of options.acceptedPrices ?? []) {
    if (!listings.some((listing) => listing.id === id)) throw new Error(`Unknown accepted listing: ${id}`);
    cents(amount);
  }
  const updated: BoardPrice[] = [];
  const results: RefreshResult[] = [];
  // Deliberately sequential: this tiny weekly catalog does not need concurrent retailer traffic.
  for (const listing of listings) {
    try {
      let observation: Observation;
      if (listing.retailer === "Adafruit") {
        observation = parseAdafruit(await fetchRetailerText(listing.url, options), listing);
      } else {
        const url = new URL(listing.url);
        // Both requests are anonymous, same store/locale, with no customer cookies.
        const cart = object(JSON.parse(await fetchRetailerText(`${url.origin}/cart.js`, options)), "store currency");
        const product = JSON.parse(await fetchRetailerText(`${url.origin}${url.pathname}.js`, options));
        observation = parseArduino(product, listing, cart.currency);
      }
      const accepted = options.acceptedPrices?.get(listing.id);
      if (accepted !== undefined && accepted !== observation.amount) throw new Error(`Price no longer matches the manually accepted ${accepted} cents`);
      if (Math.abs(observation.amount - listing.amount) / listing.amount > 0.5 && accepted !== observation.amount) {
        throw new Error(`Price changed over 50% (${listing.amount} -> ${observation.amount} cents); manual review required`);
      }
      const checked = (options.now ?? Date.now)();
      if (!Number.isFinite(checked) || checked < Date.parse(listing.checkedAt)) throw new Error("Check clock predates the existing snapshot");
      const next = { ...listing, ...observation, checkedAt: new Date(checked).toISOString() };
      updated.push(next);
      results.push({ id: listing.id, status: "checked", previousAmount: listing.amount, ...observation, checkedAt: next.checkedAt });
      options.log?.(`${listing.id}: ${listing.amount} -> ${next.amount} cents, ${next.stock}, checked ${next.checkedAt}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown retailer error";
      updated.push({ ...listing });
      results.push({ id: listing.id, status: "failed", previousAmount: listing.amount, error: message });
      options.log?.(`WARNING ${listing.id}: ${message}; snapshot unchanged`);
    }
  }
  parseBoardPrices(updated);
  return { updated, results, failed: results.filter((result) => result.status === "failed").length };
}

export async function refreshPriceFile(path: string, options: RefreshOptions = {}) {
  const original = await readFile(path, "utf8");
  const result = await refreshListings(parseBoardPrices(JSON.parse(original)), options);
  const output = `${JSON.stringify(result.updated, null, 2)}\n`;
  const changed = output !== original && result.results.some((entry) => entry.status === "checked");
  if (!options.dryRun && changed) {
    if (await readFile(path, "utf8") !== original) throw new Error("Price file changed during refresh; refusing to overwrite it");
    const temporary = `${path}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporary, output, { encoding: "utf8", flag: "wx" });
      await rename(temporary, path);
    } finally {
      await unlink(temporary).catch((error: NodeJS.ErrnoException) => { if (error.code !== "ENOENT") throw error; });
    }
  }
  return { ...result, changed, written: !options.dryRun && changed };
}
