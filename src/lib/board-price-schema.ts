export type BoardPrice = {
  id: string;
  primary: boolean;
  boardId: string;
  variant: string;
  sku: string;
  retailer: "Adafruit" | "Arduino";
  sellerType: "Manufacturer" | "Retailer";
  url: string;
  amount: number;
  currency: "USD";
  stock: "in-stock" | "out-of-stock" | "unknown";
  checkedAt: string;
};

/** Shared runtime validation for both the app and the unattended writer. */
export function parseBoardPrices(value: unknown): BoardPrice[] {
  if (!Array.isArray(value) || value.length === 0) throw new Error("Expected nonempty price listings");
  const ids = new Set<string>();
  const offers = new Set<string>();
  const defaults = new Map<string, number>();
  for (const entry of value) {
    if (!entry || typeof entry !== "object") throw new Error("Invalid price listing");
    const p = entry as Record<string, unknown>;
    for (const key of ["id", "boardId", "variant", "sku", "url", "checkedAt"]) {
      if (typeof p[key] !== "string" || !p[key].trim()) throw new Error(`Missing ${key}`);
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.id as string) || ids.has(p.id as string)) throw new Error("Invalid or duplicate listing ID");
    ids.add(p.id as string);
    if (typeof p.primary !== "boolean") throw new Error("Missing explicit primary selection");
    defaults.set(p.boardId as string, (defaults.get(p.boardId as string) ?? 0) + Number(p.primary));
    if (p.currency !== "USD" || !Number.isSafeInteger(p.amount) || (p.amount as number) <= 0) throw new Error("Expected positive USD integer cents");
    if (!["in-stock", "out-of-stock", "unknown"].includes(p.stock as string)) throw new Error("Invalid stock status");
    if (!["Manufacturer", "Retailer"].includes(p.sellerType as string)) throw new Error("Invalid seller type");
    const checkedAt = p.checkedAt as string;
    const checked = Date.parse(checkedAt);
    const normalized = checkedAt.includes(".") ? checkedAt : checkedAt.replace("Z", ".000Z");
    if (!Number.isFinite(checked) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(checkedAt)
      || new Date(checked).toISOString() !== normalized) throw new Error("Expected a valid UTC check timestamp");
    const url = new URL(p.url as string);
    if (url.protocol !== "https:" || url.username || url.password || url.port || url.hash) throw new Error("Unsafe retailer URL");
    if (p.retailer === "Adafruit") {
      if (url.hostname !== "www.adafruit.com" || url.pathname !== `/product/${p.sku}` || !/^\d+$/.test(p.sku as string) || url.search) throw new Error("Adafruit URL must match exact SKU");
    } else if (p.retailer === "Arduino") {
      if (url.hostname !== "store-usa.arduino.cc" || !/^\/products\/[a-z0-9-]+$/.test(url.pathname)
        || !/^\d+$/.test(url.searchParams.get("variant") ?? "") || [...url.searchParams.keys()].join() !== "variant") throw new Error("Arduino URL must select one exact US variant");
    } else throw new Error("Unsupported retailer");
    if (offers.has(url.href)) throw new Error("Duplicate retailer offer");
    offers.add(url.href);
  }
  if ([...defaults.values()].some((count) => count !== 1)) throw new Error("Every priced board needs exactly one primary listing");
  return value as BoardPrice[];
}
