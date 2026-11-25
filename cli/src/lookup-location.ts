import type { Board, Header, Pin } from "./model.js";
import type { LookupPin } from "./pin-match.js";

export type DiagramLocation = { header: Header; pin: Pin };

/** The pin's own name, without the function suffixes either side adds ("A4 / SDA" → "A4"). */
export function baseLabel(label: string): string {
  return label.split(" / ")[0].trim().toUpperCase();
}

/**
 * Where a lookup hit sits in the diagram `ph <board>` draws, so the number a
 * lookup prints is the number on that diagram. The index is generated from
 * the website records, the hand-written diagrams are not, and the UNO's
 * diagram numbers each header from 1. Undefined means the two disagree.
 */
export function diagramLocation(board: Pick<Board, "headers" | "lookupLocations">, pin: LookupPin): DiagramLocation | undefined {
  const explicit = board.lookupLocations?.[pin.label];
  const candidates = explicit
    ? board.headers.filter((header) => header.id === explicit.header).map((header) => ({ header, physical: explicit.physical }))
    : board.lookupLocations
      ? []
      : board.headers.map((header) => ({ header, physical: pin.position }));
  const matches = candidates.flatMap(({ header, physical }) => {
    const found = header.pins.find((item) => item.physical === physical && baseLabel(item.label) === baseLabel(pin.label));
    return found ? [{ header, pin: found }] : [];
  });
  if (matches.length <= 1) return matches[0];
  // Two rows can both carry, say, a GND at pin 15. The index group names the
  // header; failing that, the index key says which side the pin is on
  // (`pL:` left, `pR:` right), as the website drawing lays it out.
  const byGroup = matches.find((match) => match.header.name === pin.group);
  if (byGroup) return byGroup;
  const side = /^p([LR]):/.exec(pin.key)?.[1];
  if (!side) return undefined;
  const byColumn = matches.filter((match) => match.pin.position.column === (side === "L" ? 1 : 2));
  if (byColumn.length === 1) return byColumn[0];
  return side === "L" ? matches[0] : matches.at(-1);
}
