import { matchBoardSearchEntry, type BoardSearchEntry } from "@/lib/board-search";
import { matchesPin, pinQueryTokens, type PinIndexBoard, type LookupPin } from "@/lib/pin-match";

export const maxLookupBoards = 8;
export const maxLookupRows = 64;
export type PinLookupResult = {
  boards: { id: string; name: string; pins: LookupPin[] }[];
  truncated: boolean;
};

export function lookupPins(query: string, search: readonly BoardSearchEntry[], index: readonly PinIndexBoard[]): PinLookupResult {
  const tokens = pinQueryTokens(query);
  const term = tokens.pop();
  if (!term) return { boards: [], truncated: false };
  const exact = tokens.length === 0;
  const ranked = search.map((entry) => ({ entry, match: exact ? { score: 1, matchedBy: "name" } : matchBoardSearchEntry(entry, tokens) }))
    .filter((hit) => hit.match && (exact || hit.match.matchedBy === "name" || hit.match.matchedBy === "vendor"))
    .sort((a, b) => b.match!.score - a.match!.score);
  // Board-qualified lookups retain equally ranked candidates instead of silently
  // choosing among ambiguous variants (Pico, Pico W, Pico 2, ...).
  const candidates = exact ? ranked : ranked.filter((hit) => hit.match!.score === ranked[0]?.match?.score);
  const byId = new Map(index.map((board) => [board.id, board.pins]));
  let count = 0;
  let truncated = false;
  const boards: PinLookupResult["boards"] = [];
  for (const { entry } of candidates) {
    const pins = (byId.get(entry.board.id) ?? []).filter((pin) => matchesPin(pin, term, exact));
    if (!pins.length) continue;
    if (boards.length >= maxLookupBoards || count >= maxLookupRows) { truncated = true; continue; }
    const rows = pins.slice(0, maxLookupRows - count);
    truncated ||= rows.length < pins.length;
    count += rows.length;
    boards.push({ id: entry.board.id, name: entry.board.name, pins: rows });
  }
  return { boards, truncated };
}
