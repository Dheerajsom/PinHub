import Link from "next/link";
import { ArrowRight, Tags } from "lucide-react";
import { formatPrice, formatPriceDate, priceForBoard } from "@/lib/board-prices";

/** Absolute check dates are safe on static pages; never imply current stock. */
export function BoardPriceLink({ boardId }: { boardId: string }) {
  const price = priceForBoard(boardId);
  if (!price) return null;
  return (
    <Link href={`/prices?board=${encodeURIComponent(boardId)}#${price.id}`}
      className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2.5 text-sm text-amber-100 transition hover:border-amber-300/60 hover:bg-amber-300/20">
      <span className="flex min-w-0 items-start gap-2"><Tags className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><span className="min-w-0">
        <span className="block font-medium">{formatPrice(price)} · {price.retailer}</span>
        <span className="mt-1 block text-xs leading-5 text-zinc-400">{price.variant}</span>
        <span className="block text-xs leading-5 text-zinc-400">USD reference · <time dateTime={price.checkedAt}>{formatPriceDate(price.checkedAt)}</time> · tax/shipping extra</span>
      </span></span>
      <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
    </Link>
  );
}
