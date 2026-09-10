"use client";

import { formatPriceDate, priceFreshness } from "@/lib/board-prices";
import { useLivePrices } from "./useLivePrices";

export function PriceCheckTime({ checkedAt, showAgeWarning = true }: { checkedAt: string; showAgeWarning?: boolean }) {
  const { now } = useLivePrices();
  const minutes = now === null ? -1 : Math.floor((now - Date.parse(checkedAt)) / 60_000);
  const label = minutes < 0 || minutes >= 1440 ? formatPriceDate(checkedAt)
    : minutes < 1 ? "just now" : minutes < 60 ? `${minutes} min ago` : `${Math.floor(minutes / 60)} hr ago`;
  const stale = now !== null && priceFreshness({ checkedAt }, now) !== "fresh";
  return <><time dateTime={checkedAt} title={checkedAt}>{label}</time>{showAgeWarning && stale ? <span className="text-amber-200"> · older check</span> : null}</>;
}
