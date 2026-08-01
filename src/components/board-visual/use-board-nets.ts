import { useMemo } from "react";
import type { PinAnchor } from "@/lib/board-visual-geometry";
import { netForPin, type PinNet } from "@/lib/pin-nets";

export type BoardNets = {
  /** Net for each anchor, or null when the pin is electrically on its own. */
  netByKey: Map<string, PinNet | null>;
  /** Anchor keys per net id, in connector order. */
  keysByNet: Map<string, string[]>;
};

export function buildBoardNets(anchors: PinAnchor[]): BoardNets {
  const netByKey = new Map<string, PinNet | null>();
  const keysByNet = new Map<string, string[]>();

  for (const anchor of anchors) {
    const net = netForPin(anchor.pin);
    netByKey.set(anchor.key, net);
    if (!net) continue;
    const existing = keysByNet.get(net.id);
    if (existing) existing.push(anchor.key);
    else keysByNet.set(net.id, [anchor.key]);
  }

  return { netByKey, keysByNet };
}

export function useBoardNets(anchors: PinAnchor[] | undefined): BoardNets {
  return useMemo(() => buildBoardNets(anchors ?? []), [anchors]);
}

/**
 * The net a probe on `key` should ring out, and the keys it reaches — but only
 * when the net actually has company on this connector. A "net" of one pin is
 * just the pin, and lighting it up as a net would promise a relationship that
 * is not there.
 */
export function probedNet(
  nets: BoardNets,
  key: string | null,
): { net: PinNet | null; keys: Set<string> } {
  const net = key ? (nets.netByKey.get(key) ?? null) : null;
  const members = net ? (nets.keysByNet.get(net.id) ?? []) : [];
  if (!net || members.length < 2) return { net, keys: new Set() };
  return { net, keys: new Set(members) };
}
