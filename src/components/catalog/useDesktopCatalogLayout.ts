"use client";

import { useSyncExternalStore } from "react";

export const desktopCatalogMediaQuery = "(min-width: 1280px)";

function subscribe(listener: () => void): () => void {
  const mediaQuery = window.matchMedia(desktopCatalogMediaQuery);
  mediaQuery.addEventListener("change", listener);
  return () => mediaQuery.removeEventListener("change", listener);
}

export function isDesktopCatalogLayout(): boolean {
  return window.matchMedia(desktopCatalogMediaQuery).matches;
}

export function useDesktopCatalogLayout(): boolean {
  return useSyncExternalStore(
    subscribe,
    isDesktopCatalogLayout,
    // Render useful detail HTML on the server. Compact clients swap to the
    // inline surface immediately after hydration.
    () => true,
  );
}
