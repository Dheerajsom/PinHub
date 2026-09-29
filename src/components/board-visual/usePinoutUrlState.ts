"use client";
import { useSearchParams } from "next/navigation";
import { parsePinoutState, serializePinoutState, type PinoutState } from "@/lib/pinout-state";
import type { PinAnchor } from "@/lib/board-visual-geometry";

export function usePinoutUrlState(anchors: readonly PinAnchor[]) {
  const params = useSearchParams();
  const keys = new Set(anchors.map((anchor) => anchor.key));
  const roles = new Set(anchors.map((anchor) => anchor.pin.role));
  const state = parsePinoutState(params.toString(), keys, roles);
  const update = (next: PinoutState) => {
    const search = serializePinoutState(next, keys, roles);
    const url = `${location.pathname}${search ? `?${search}` : ""}${location.hash}`;
    if (`${location.pathname}${location.search}${location.hash}` !== url) history.pushState(null, "", url);
  };
  return { state, update };
}
