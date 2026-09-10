"use client";

import { useSyncExternalStore } from "react";
import { createPriceFeed, initialPriceFeed } from "@/lib/live-price-feed";

const feed = createPriceFeed();
const serverSnapshot = () => initialPriceFeed;

export function useLivePrices() {
  return useSyncExternalStore(feed.subscribe, feed.getSnapshot, serverSnapshot);
}
