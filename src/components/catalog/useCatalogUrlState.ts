"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type SetStateAction,
} from "react";
import {
  catalogUrl,
  defaultCatalogState,
  maxCatalogSearchLength,
  parseCatalogState,
  type CatalogState,
} from "@/lib/catalog-state";

type HistoryMode = "push" | "replace";

function mergeOwnedSearchParams(
  catalogLocation: string,
  ownedSearch: string,
): string {
  if (!ownedSearch) return catalogLocation;
  const question = catalogLocation.indexOf("?");
  const pathname =
    question === -1 ? catalogLocation : catalogLocation.slice(0, question);
  const catalog = new URLSearchParams(
    question === -1 ? "" : catalogLocation.slice(question + 1),
  );
  const owned = new URLSearchParams(ownedSearch);
  const ownedKeys = new Set(owned.keys());
  const merged = new URLSearchParams();
  let serializedLength = 0;
  const append = (key: string, value: string) => {
    const entry = new URLSearchParams([[key, value]]).toString();
    const nextLength =
      serializedLength + (serializedLength ? 1 : 0) + entry.length;
    if (nextLength > maxCatalogSearchLength) return;
    merged.append(key, value);
    serializedLength = nextLength;
  };

  // Owned parameters go first so a maximal facet selection cannot evict the
  // comparison state. Catalog singleton controls are already ordered before
  // facets, so any necessary trimming still removes facets first.
  for (const [key, value] of owned) append(key, value);
  for (const [key, value] of catalog) {
    if (!ownedKeys.has(key)) append(key, value);
  }
  return merged.size ? `${pathname}?${merged.toString()}` : pathname;
}

/**
 * One URL-backed state machine for both catalog surfaces. Text entry replaces
 * the current history entry; deliberate filters, sorting, and paging push a
 * checkpoint so the browser Back button walks the user's exploration.
 */
export function useCatalogUrlState(
  pathname: string,
  defaults: CatalogState = defaultCatalogState,
  ownedSearchParams: string | URLSearchParams = "",
  restoreOwnedSearchParams?: (params: URLSearchParams) => void,
) {
  const [state, setState] = useState<CatalogState>(defaults);
  const ready = useRef(false);
  const historyMode = useRef<HistoryMode>("replace");
  const ownedSearch = new URLSearchParams(ownedSearchParams).toString();

  useEffect(() => {
    const restore = () => {
      historyMode.current = "replace";
      restoreOwnedSearchParams?.(new URLSearchParams(location.search));
      setState(parseCatalogState(location.search, defaults));
    };
    const frame = requestAnimationFrame(() => {
      restore();
      ready.current = true;
    });
    addEventListener("popstate", restore);
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener("popstate", restore);
    };
  }, [defaults, restoreOwnedSearchParams]);

  useEffect(() => {
    if (!ready.current) return;
    const nextUrl = mergeOwnedSearchParams(
      catalogUrl(state, pathname, defaults.sort),
      ownedSearch,
    );
    if (`${location.pathname}${location.search}` === nextUrl) return;
    if (historyMode.current === "push") history.pushState(null, "", nextUrl);
    else history.replaceState(null, "", nextUrl);
    historyMode.current = "replace";
  }, [defaults.sort, ownedSearch, pathname, state]);

  const updateState = useCallback(
    (update: SetStateAction<CatalogState>, mode: HistoryMode = "push") => {
      historyMode.current = mode;
      setState(update);
    },
    [],
  );

  return [state, updateState] as const;
}
