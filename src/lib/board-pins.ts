import type { Board, Pin } from "@/lib/boards";
import { netForPin, type PinNet } from "@/lib/pin-nets";

/**
 * One pin, flattened out of whichever pinout shape the board uses, carrying the
 * derived net and the group it came from. Nothing here is invented: every field
 * is either copied from `boards.ts` or derived by `pin-nets.ts`, which returns
 * null rather than guessing.
 */
export type BoardPin = {
  pin: Pin;
  /** Position in the flattened rail, 0-based. Not the physical pin number. */
  index: number;
  /** Connector group label for `grouped` pinouts; null for dual-row headers. */
  group: string | null;
  net: PinNet | null;
};

/**
 * Flattens a board's pinout into physical order.
 *
 * A dual-row header interleaves its two columns, so the rail reads 1,2,3,4…
 * across the connector exactly as the pins sit on the board. A `grouped` pinout
 * has no single physical ordering, so its groups are concatenated in the order
 * the catalog declares them and the group label travels with each pin.
 */
export function flattenBoardPins(board: Board): BoardPin[] {
  const pinout = board.pinout;
  if (!pinout) return [];

  const rows: { pin: Pin; group: string | null }[] = pinout.pins
    ? [...pinout.pins.left, ...pinout.pins.right]
        .sort((a, b) => a.position - b.position)
        .map((pin) => ({ pin, group: null }))
    : (pinout.groups ?? []).flatMap((group) =>
        group.pins.map((pin) => ({ pin, group: group.label })),
      );

  return rows.map((row, index) => ({
    pin: row.pin,
    index,
    group: row.group,
    net: netForPin(row.pin),
  }));
}

/** Every pin id sharing the given pin's net. Empty when the pin is an island. */
export function netMembers(
  pins: readonly BoardPin[],
  target: BoardPin | null,
): ReadonlySet<number> {
  if (!target?.net) return new Set();
  const members = new Set<number>();
  for (const candidate of pins) {
    if (candidate.net?.id === target.net.id) members.add(candidate.index);
  }
  // A net of one is not a net — reporting it would imply a connection that the
  // data does not support.
  return members.size > 1 ? members : new Set();
}

/**
 * Does this pin answer the typed query?
 *
 * Matches the physical position, the signal label, the role, the connector
 * group, every alias, and the pin note — so "sda" finds a pin whose only clue
 * is an `SDA1` alias, "gpio17" finds it by label, and "strap" finds it by note.
 */
export function pinMatchesQuery(entry: BoardPin, query: string): boolean {
  const term = query.trim().toLowerCase();
  if (!term) return true;
  const haystack = [
    String(entry.pin.position),
    entry.pin.label,
    entry.pin.role,
    entry.group ?? "",
    entry.net?.label ?? "",
    ...(entry.pin.aliases ?? []),
    entry.pin.note ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(term);
}

/** Copy-ready one-line summary of a pin, used by the readout's copy control. */
export function pinSummaryText(board: Board, entry: BoardPin): string {
  const parts = [
    `${board.name}`,
    `pin ${entry.pin.position}`,
    entry.pin.label,
    entry.pin.role.toUpperCase(),
  ];
  if (entry.pin.aliases?.length) parts.push(entry.pin.aliases.join(" / "));
  if (entry.net) parts.push(`net ${entry.net.label}`);
  return parts.join(" · ");
}
