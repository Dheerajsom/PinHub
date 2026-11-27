"use client";

import { useLayoutEffect, useState, type RefObject } from "react";

export type PopoverPlacement = {
  /** From the trigger's left edge, for a panel positioned inside the trigger's box. */
  left: number;
  width: number;
  maxHeight: number;
  /** Viewport coordinates, for a `position: fixed` panel that must escape a clipping ancestor. */
  viewportLeft: number;
  top: number;
};

/**
 * Where a header popover sits, in px from its trigger's left edge. It prefers
 * to line up with the trigger's right edge but is clamped to stay 16 px inside
 * the viewport on any screen, and its height is capped to the space below the
 * trigger (a landscape phone is ~390 px tall), so the panel scrolls inside
 * itself rather than run off screen. Null until the first layout.
 */
export function usePopoverPlacement(
  anchorRef: RefObject<HTMLElement | null>,
  open: boolean,
  maxWidth: number,
  minHeight = 176,
): PopoverPlacement | null {
  const [placement, setPlacement] = useState<PopoverPlacement | null>(null);
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;
      const gutter = 16;
      const width = Math.min(maxWidth, window.innerWidth - gutter * 2);
      const preferred = rect.right - width;
      const left = Math.min(Math.max(preferred, gutter), window.innerWidth - gutter - width);
      const maxHeight = Math.max(minHeight, window.innerHeight - rect.bottom - 8 - gutter);
      setPlacement({ left: left - rect.left, width, maxHeight, viewportLeft: left, top: rect.bottom + 8 });
    };
    place();
    window.addEventListener("resize", place);
    // A fixed panel has to follow its trigger when the page scrolls.
    window.addEventListener("scroll", place, { passive: true });
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place);
    };
  }, [open, anchorRef, maxWidth, minHeight]);
  return placement;
}
