import Link from "next/link";
import { ArrowRight, Tags } from "lucide-react";
import { priceForBoard } from "@/lib/board-prices";

/** Keep volatile amounts on /prices, where freshness is evaluated per request. */
export function BoardPriceLink({ boardId }: { boardId: string }) {
  if (!priceForBoard(boardId)) return null;
  return (
    <Link href={`/prices?board=${encodeURIComponent(boardId)}`}
      className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2.5 text-sm text-amber-100 transition hover:border-amber-300/60 hover:bg-amber-300/20">
      <span className="flex items-center gap-2"><Tags className="size-4 shrink-0" aria-hidden="true" /> Prices &amp; availability</span>
      <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
    </Link>
  );
}
