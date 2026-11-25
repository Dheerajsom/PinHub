import { useLayoutEffect, useRef, type RefObject } from "react";

/** Pan only the drawing. Preserve a user's position when the pad already fits. */
export function usePinViewport(
  viewport: RefObject<HTMLDivElement | null>,
  boardId: string,
  selectedKey: string | null,
  enabled: boolean,
) {
  const lastPad = useRef<Element | null>(null);
  useLayoutEffect(() => {
    const region = viewport.current;
    if (!region || !enabled) return;
    const previous = region.contains(lastPad.current) ? lastPad.current : null;
    const pad = region.querySelector('.bv-pad[aria-pressed="true"]') ?? previous ?? region.querySelector(".bv-pad");
    const target = pad?.querySelector('circle[fill="transparent"]');
    if (!pad || !target) return;
    lastPad.current = pad;

    const reveal = () => {
      if (!region.clientWidth || !region.clientHeight) return;
      const box = region.getBoundingClientRect();
      const hit = target.getBoundingClientRect();
      const left = box.left + region.clientLeft;
      const top = box.top + region.clientTop;
      const dx = hit.left < left || hit.right > left + region.clientWidth
        ? hit.left + hit.width / 2 - left - region.clientWidth / 2 : 0;
      const dy = hit.top < top || hit.bottom > top + region.clientHeight
        ? hit.top + hit.height / 2 - top - region.clientHeight / 2 : 0;
      if (dx || dy) region.scrollBy({ left: dx, top: dy, behavior: "instant" });
    };

    reveal();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(reveal);
    observer.observe(region);
    const drawing = pad.closest("svg");
    if (drawing) observer.observe(drawing);
    return () => observer.disconnect();
  }, [viewport, boardId, enabled, selectedKey]);
}
