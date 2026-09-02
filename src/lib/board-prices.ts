import snapshots from "./board-prices.json";
import { parseBoardPrices, type BoardPrice } from "./board-price-schema";

export type { BoardPrice } from "./board-price-schema";

/** Dated US retailer snapshots. Builds must never advance checkedAt. */
export const boardPrices = parseBoardPrices(snapshots);

const day = 24 * 60 * 60 * 1000;
export const stockValidForMs = 7 * day;
export const priceFreshForMs = 14 * day;
export const priceStaleAfterMs = 45 * day;
export type PriceFreshness = "fresh" | "aging" | "stale";

function age(price: Pick<BoardPrice, "checkedAt">, now: number): number {
  const checked = Date.parse(price.checkedAt);
  return !Number.isFinite(now) || !Number.isFinite(checked) || checked > now
    ? Infinity : now - checked;
}

export function priceFreshness(price: Pick<BoardPrice, "checkedAt">, now: number): PriceFreshness {
  const elapsed = age(price, now);
  return elapsed <= priceFreshForMs ? "fresh" : elapsed <= priceStaleAfterMs ? "aging" : "stale";
}

export function isPriceStale(price: Pick<BoardPrice, "checkedAt">, now: number): boolean {
  return priceFreshness(price, now) === "stale";
}

export function hasRecentStockCheck(price: Pick<BoardPrice, "checkedAt">, now: number): boolean {
  return age(price, now) < stockValidForMs;
}

export function formatPrice(price: Pick<BoardPrice, "amount" | "currency">): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: price.currency }).format(price.amount / 100);
}

export function formatPriceDate(checkedAt: string): string {
  if (!Number.isFinite(Date.parse(checkedAt))) return "Unknown check date";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(checkedAt));
}

export function pricesForBoard(boardId: string): BoardPrice[] {
  return boardPrices.filter((price) => price.boardId === boardId);
}

/** A curated default, never an implicit cheapest or first matching variant. */
export function priceForBoard(boardId: string): BoardPrice | undefined {
  return boardPrices.find((price) => price.boardId === boardId && price.primary);
}
