import { isBoardId, maxBoardIdLength } from "@/lib/board-id";
import { linkBuses, type LinkBus } from "@/lib/board-link";

// The link page's URL state: `?a=raspberry-pi-5&b=arduino-uno-rev3&bus=uart`,
// plus `pa` / `pb` when a side uses a bus other than its first. The values come
// from shared links, so they are bounded and shape-checked here; port ids are
// matched against the ports the board actually has before they are used.

export type LinkState = {
  a: string | null;
  b: string | null;
  bus: LinkBus;
  pa: string | null;
  pb: string | null;
};

export const maxPortIdLength = 64;
// Two board ids, two port ids, the bus, and the separators, with room for
// percent-encoding of the port ids (group labels can carry spaces and slashes).
const maxSearchScan = 2 * maxBoardIdLength + 6 * maxPortIdLength + 64;

export function isLinkBus(value: unknown): value is LinkBus {
  return typeof value === "string" && (linkBuses as readonly string[]).includes(value);
}

function portId(value: string | null): string | null {
  if (!value || value.length > maxPortIdLength) return null;
  // Printable text only; anything else was not written by PinHub.
  return /^[\x20-\x7e\u00b7]+$/.test(value) ? value : null;
}

export function linkStateFromSearch(search: string): LinkState {
  const params = new URLSearchParams(search.slice(0, maxSearchScan));
  const a = params.get("a");
  const b = params.get("b");
  const bus = params.get("bus");
  return {
    a: isBoardId(a) ? a : null,
    b: isBoardId(b) ? b : null,
    bus: isLinkBus(bus) ? bus : "uart",
    pa: portId(params.get("pa")),
    pb: portId(params.get("pb")),
  };
}

/** The canonical query string for a link state ("" when nothing is chosen). */
export function linkSearch(state: Partial<LinkState>): string {
  const params = new URLSearchParams();
  if (state.a && isBoardId(state.a)) params.set("a", state.a);
  if (state.b && isBoardId(state.b)) params.set("b", state.b);
  if (params.size) params.set("bus", isLinkBus(state.bus) ? state.bus : "uart");
  const pa = portId(state.pa ?? null);
  const pb = portId(state.pb ?? null);
  if (state.a && pa) params.set("pa", pa);
  if (state.b && pb) params.set("pb", pb);
  const query = params.toString();
  return query ? `?${query}` : "";
}

/** A shareable link page URL for two boards. */
export function linkUrl(a: string, b: string, bus: LinkBus = "uart"): string {
  return `/link${linkSearch({ a, b, bus })}`;
}
