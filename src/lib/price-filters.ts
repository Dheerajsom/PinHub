import type { BoardPrice } from "@/lib/board-prices";
import { isPriceStale } from "@/lib/board-prices";

export type PriceListing = BoardPrice & { name: string; vendor: string; category: string };
export type PriceFilters = { query: string; board: string; category: string; sort: string; inStock: boolean };
export const defaultPriceFilters: PriceFilters = { query: "", board: "", category: "all", sort: "featured", inStock: false };

export function parsePriceFilters(params: URLSearchParams): PriceFilters {
  return {
    query: (params.get("q") ?? "").slice(0, 100),
    board: (params.get("board") ?? "").slice(0, 100),
    category: ["SBC", "Microcontroller"].includes(params.get("category") ?? "") ? params.get("category")! : "all",
    sort: ["price-asc", "price-desc", "name"].includes(params.get("sort") ?? "") ? params.get("sort")! : "featured",
    inStock: params.get("stock") === "in",
  };
}

export function pricesUrl(filters: PriceFilters): string {
  const params = new URLSearchParams();
  if (filters.board) params.set("board", filters.board);
  if (filters.query) params.set("q", filters.query);
  if (filters.category !== "all") params.set("category", filters.category);
  if (filters.sort !== "featured") params.set("sort", filters.sort);
  if (filters.inStock) params.set("stock", "in");
  return params.size ? `/prices?${params}` : "/prices";
}

export function filterPrices(listings: PriceListing[], filters: PriceFilters, now: number): PriceListing[] {
  const words = filters.query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const matches = listings.filter((item) => {
    const searchable = `${item.name} ${item.vendor} ${item.variant} ${item.sku} ${item.retailer}`.toLowerCase();
    return (!filters.board || item.boardId === filters.board)
      && (filters.category === "all" || filters.category === item.category)
      && (!filters.inStock || (item.stock === "in-stock" && !isPriceStale(item, now)))
      && words.every((word) => searchable.includes(word));
  });
  if (filters.sort === "price-asc") matches.sort((a, b) => a.amount - b.amount);
  if (filters.sort === "price-desc") matches.sort((a, b) => b.amount - a.amount);
  if (filters.sort === "name") matches.sort((a, b) => a.name.localeCompare(b.name));
  return matches;
}
