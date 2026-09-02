/** Single-unit US listings, manually checked against each linked product page.
 * See docs/board-prices.md before updating. Never refresh checkedAt on a build.
 * Prices are cents, not floats; these snapshots are deliberately separate from
 * the hardware catalog and must never be presented as a live retailer feed.
 */
export type BoardPrice = {
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

export const boardPrices: BoardPrice[] = [
  { boardId: "raspberry-pi-5", variant: "4 GB RAM · board only", sku: "5812", retailer: "Adafruit", sellerType: "Retailer", url: "https://www.adafruit.com/product/5812", amount: 13000, currency: "USD", stock: "in-stock", checkedAt: "2026-09-02T14:07:00Z" },
  { boardId: "arduino-uno-r4-wifi", variant: "WiFi · board only", sku: "ABX00087", retailer: "Arduino", sellerType: "Manufacturer", url: "https://store-usa.arduino.cc/products/uno-r4-wifi?variant=42871580917967", amount: 2200, currency: "USD", stock: "in-stock", checkedAt: "2026-09-02T14:06:00Z" },
  { boardId: "raspberry-pi-pico-2-w", variant: "RP2350 · without headers", sku: "6087", retailer: "Adafruit", sellerType: "Retailer", url: "https://www.adafruit.com/product/6087", amount: 700, currency: "USD", stock: "in-stock", checkedAt: "2026-09-02T14:07:00Z" },
  { boardId: "esp32-s3-devkitc-1", variant: "N8R8 · 8 MB flash / 8 MB PSRAM", sku: "5336", retailer: "Adafruit", sellerType: "Retailer", url: "https://www.adafruit.com/product/5336", amount: 1995, currency: "USD", stock: "in-stock", checkedAt: "2026-09-02T14:07:00Z" },
  { boardId: "arduino-nano-esp32", variant: "ABX00092 · without headers", sku: "ABX00092", retailer: "Arduino", sellerType: "Manufacturer", url: "https://store-usa.arduino.cc/products/nano-esp32?variant=42894643101903", amount: 1830, currency: "USD", stock: "in-stock", checkedAt: "2026-09-02T14:06:00Z" },
  { boardId: "raspberry-pi-pico-2", variant: "RP2350 · without headers", sku: "6006", retailer: "Adafruit", sellerType: "Retailer", url: "https://www.adafruit.com/product/6006", amount: 625, currency: "USD", stock: "in-stock", checkedAt: "2026-09-02T14:07:00Z" },
  { boardId: "adafruit-feather-rp2040", variant: "RP2040 · loose headers included", sku: "4884", retailer: "Adafruit", sellerType: "Manufacturer", url: "https://www.adafruit.com/product/4884", amount: 1195, currency: "USD", stock: "in-stock", checkedAt: "2026-09-02T14:07:00Z" },
  { boardId: "arduino-uno-r4-minima", variant: "Minima · board only", sku: "ABX00080", retailer: "Arduino", sellerType: "Manufacturer", url: "https://store-usa.arduino.cc/products/uno-r4-minima?variant=42871509876943", amount: 2000, currency: "USD", stock: "in-stock", checkedAt: "2026-09-02T14:06:00Z" },
  { boardId: "raspberry-pi-zero-2-w", variant: "512 MB RAM · without headers", sku: "5291", retailer: "Adafruit", sellerType: "Retailer", url: "https://www.adafruit.com/product/5291", amount: 1905, currency: "USD", stock: "out-of-stock", checkedAt: "2026-09-02T14:07:00Z" },
  { boardId: "raspberry-pi-pico-w", variant: "RP2040 · without headers", sku: "5526", retailer: "Adafruit", sellerType: "Retailer", url: "https://www.adafruit.com/product/5526", amount: 600, currency: "USD", stock: "in-stock", checkedAt: "2026-09-02T14:07:00Z" },
  { boardId: "raspberry-pi-pico", variant: "RP2040 · without headers", sku: "4864", retailer: "Adafruit", sellerType: "Retailer", url: "https://www.adafruit.com/product/4864", amount: 400, currency: "USD", stock: "out-of-stock", checkedAt: "2026-09-02T14:07:00Z" },
];

export const priceStaleAfterMs = 7 * 24 * 60 * 60 * 1000;

export function isPriceStale(price: BoardPrice, now: number): boolean {
  const checked = Date.parse(price.checkedAt);
  return !Number.isFinite(checked) || checked > now || now - checked >= priceStaleAfterMs;
}

export function formatPrice(price: Pick<BoardPrice, "amount" | "currency">): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: price.currency }).format(price.amount / 100);
}

export function formatPriceDate(checkedAt: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(checkedAt));
}

export function priceForBoard(boardId: string): BoardPrice | undefined {
  return boardPrices.find((price) => price.boardId === boardId);
}
