"use client";

import Link from "next/link";
import { ArrowRight, Tags } from "lucide-react";
import { formatPrice, priceForBoard } from "@/lib/board-prices";
import { useLivePrices } from "./useLivePrices";
import { PriceCheckTime } from "./PriceCheckTime";

/**
 * The board's reference price as a shelf tag: the amount in mono, the
 * retailer opposite it, and when it was last checked below a perforated rule.
 */
export function BoardPriceLink({ boardId }: { boardId: string }) {
  const { prices } = useLivePrices();
  const price = prices?.find((item) => item.boardId === boardId && item.primary) ?? priceForBoard(boardId);
  if (!price) return null;
  return (
    <Link href={`/prices?board=${encodeURIComponent(boardId)}#${price.id}`}
      className="ph-price-card group block min-w-0 rounded-xl px-4 pb-3 pt-3">
      <span className="flex items-center justify-between gap-3">
        <span className="ph-price-eyebrow flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em]">
          <Tags className="size-3.5" aria-hidden="true" /> Board price
        </span>
        <span className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-zinc-300">
          <span className="truncate">{price.retailer}</span>
          <ArrowRight className="ph-price-arrow size-3.5 shrink-0" aria-hidden="true" />
        </span>
      </span>
      <span className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="ph-price-ink font-mono text-2xl font-medium leading-8 tabular-nums tracking-tight">{formatPrice(price)}</span>
        <span className="min-w-0 text-xs text-zinc-400">{price.variant}</span>
      </span>
      <span className="ph-price-perf mt-2.5 block pt-2 text-[11px] leading-5 text-zinc-400">
        Last checked: <PriceCheckTime checkedAt={price.checkedAt} />
      </span>
    </Link>
  );
}
