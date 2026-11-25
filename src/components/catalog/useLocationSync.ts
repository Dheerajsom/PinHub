"use client";

import { useEffect } from "react";

/**
 * Runs `sync` once after the first paint and again on every back/forward
 * navigation. The tool pages are static, so the state in their URL is only
 * known in the browser; reading it in a frame keeps hydration identical to
 * the server render. `sync` should be stable (wrap it in useCallback).
 */
export function useLocationSync(sync: () => void) {
  useEffect(() => {
    const frame = requestAnimationFrame(sync);
    window.addEventListener("popstate", sync);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("popstate", sync);
    };
  }, [sync]);
}

/** Pushes `?param=value` (or a bare path) onto the history stack. */
export function pushSearchParam(param: string, value: string | null) {
  history.pushState(null, "", value === null ? location.pathname : `${location.pathname}?${param}=${encodeURIComponent(value)}`);
}
