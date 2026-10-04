"use client";

import clsx from "clsx";
import { stockStatus, type BoardPrice } from "@/lib/board-prices";
import { useLivePrices } from "./useLivePrices";

/** Stock at the last retailer check, as an indicator LED plus its label. */
export function PriceStockStatus({ price, className }: { price: Pick<BoardPrice, "stock" | "checkedAt">; className?: string }) {
  const { now } = useLivePrices();
  const status = stockStatus(price, now);
  return (
    <span className={clsx("ph-stock inline-flex items-center gap-1.5", className)} data-tone={status.tone}>
      <span className="ph-stock-led size-1.5 shrink-0 rounded-full" aria-hidden="true" />
      {status.label}
    </span>
  );
}
