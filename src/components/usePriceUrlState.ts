"use client";

import { useSearchParams } from "next/navigation";
import { useSyncExternalStore } from "react";
import { parsePriceFilters, pricesUrl, type PriceFilters } from "@/lib/price-filters";

const changed = "pinhub:price-filters";
function subscribe(callback: () => void) {
  window.addEventListener("popstate", callback);
  window.addEventListener(changed, callback);
  return () => {
    window.removeEventListener("popstate", callback);
    window.removeEventListener(changed, callback);
  };
}
function snapshot() { return window.location.search; }

/** Synchronous URL store: controls never wait for a Next router transition.
 * useSearchParams also causes a new snapshot on Next Link navigation; the
 * server snapshot keeps the initial render identical during hydration.
 */
export function usePriceUrlState() {
  const params = useSearchParams();
  const serverSearch = params.size ? `?${params}` : "";
  const search = useSyncExternalStore(subscribe, snapshot, () => serverSearch);
  const filters = parsePriceFilters(new URLSearchParams(search));

  function update(patch: Partial<PriceFilters>, replace = false) {
    const current = parsePriceFilters(new URLSearchParams(window.location.search));
    const url = pricesUrl({ ...current, ...patch });
    if (`${window.location.pathname}${window.location.search}` === url) return;
    if (replace) window.history.replaceState(null, "", url);
    else window.history.pushState(null, "", url);
    window.dispatchEvent(new Event(changed));
  }
  return [filters, update] as const;
}
