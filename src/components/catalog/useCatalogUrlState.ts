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
  parseCatalogState,
  type CatalogState,
} from "@/lib/catalog-state";

type HistoryMode = "push" | "replace";

/**
 * One URL-backed state machine for both catalog surfaces. Text entry replaces
 * the current history entry; deliberate filters, sorting, and paging push a
 * checkpoint so the browser Back button walks the user's exploration.
 */
export function useCatalogUrlState(
  pathname: string,
  defaults: CatalogState = defaultCatalogState,
) {
  const [state, setState] = useState<CatalogState>(defaults);
  const ready = useRef(false);
  const historyMode = useRef<HistoryMode>("replace");

  useEffect(() => {
    const restore = () => {
      historyMode.current = "replace";
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
  }, [defaults]);

  useEffect(() => {
    if (!ready.current) return;
    const nextUrl = catalogUrl(state, pathname, defaults.sort);
    if (`${location.pathname}${location.search}` === nextUrl) return;
    if (historyMode.current === "push") history.pushState(null, "", nextUrl);
    else history.replaceState(null, "", nextUrl);
    historyMode.current = "replace";
  }, [defaults.sort, pathname, state]);

  const updateState = useCallback(
    (update: SetStateAction<CatalogState>, mode: HistoryMode = "push") => {
      historyMode.current = mode;
      setState(update);
    },
    [],
  );

  return [state, updateState] as const;
}
