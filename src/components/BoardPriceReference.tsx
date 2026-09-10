"use client";

import { formatPrice, priceForBoard } from "@/lib/board-prices";
import { useLivePrices } from "./useLivePrices";
import { PriceCheckTime } from "./PriceCheckTime";

export function BoardPriceReference({ boardId }: { boardId: string }) {
  const { prices } = useLivePrices();
  const price = prices?.find((item) => item.boardId === boardId && item.primary) ?? priceForBoard(boardId);
  if (!price) return <span className="text-zinc-500">No price recorded</span>;
  return <div className="whitespace-normal">
    <a href={price.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 text-amber-100 underline underline-offset-4" aria-label={`${formatPrice(price)} at ${price.retailer} (opens in a new tab)`}>{formatPrice(price)} · {price.retailer}</a>
    <div className="text-xs leading-5 text-zinc-400">{price.variant}</div>
    <div className="text-xs leading-5 text-zinc-400">Checked <PriceCheckTime checkedAt={price.checkedAt} /> · USD</div>
    <div className="text-xs leading-5 text-zinc-500">Reference only · tax/shipping extra</div>
  </div>;
}
