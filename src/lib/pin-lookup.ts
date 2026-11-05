import { matchBoardSearchEntry, type BoardSearchEntry } from "@/lib/board-search";
import { matchesPin, matchesSignalValue, pinQueryTokens, type PinIndexBoard, type LookupPin } from "@/lib/pin-match";

export const maxLookupBoards = 8;
export const maxLookupRows = 64;
export type PinMatchKind = "default" | "labelled" | "alternate";
export type PinLookupResult = {
  boards: { id: string; name: string; pins: LookupPin[]; pinCount: number; secondary: boolean }[];
  totalBoards: number;
  primaryBoards: number;
  truncated: boolean;
};

export function pinMatchKind(pin: LookupPin, term: string): PinMatchKind {
  if (pin.defaultSignals?.some((signal) => signal.toLowerCase() === term.toLowerCase())) return "default";
  return matchesPin({ ...pin, signals: undefined }, term) ? "labelled" : "alternate";
}

function revisionAlias(token: string): string {
  return /^r\d+$/.test(token) ? token.replace(/^r/, "rev") : token.replace(/^rev(?=\d+$)/, "r");
}

function identityMatch(entry: BoardSearchEntry, tokens: string[], includeChip: boolean): boolean {
  const values = [entry.name, entry.board.vendor, ...(includeChip ? [entry.board.family, entry.board.processor] : [])].map((value) => value.toLowerCase());
  // Chip core counts ("4× Cortex") are not board model identities.
  const words = values.flatMap((value, index) => value.split(/[^a-z0-9+]+/).filter((word) => index < 2 || !/^\d+$/.test(word)));
  const compact = (value: string) => value.replace(/[^a-z0-9+]+/g, "");
  // Retain decimal boundaries as well as glued spellings: teensy4 is a
  // family prefix of teensy4.1, but pi5 is not a prefix of pi500.
  const names = [entry.name, entry.name.replace(/^raspberry pi /, "rpi")]
    .flatMap((name) => [compact(name), name.replace(/[^a-z0-9+.]+/g, "")]);
  const bounded = (name: string, token: string) => {
    const offset = name.indexOf(token);
    const next = name.slice(offset + token.length, offset + token.length + 1);
    return offset >= 0 && next !== "+" && !(/\d$/.test(token) && /^\d/.test(next));
  };
  return tokens.every((token) => {
    if (!/[a-z0-9]/.test(token)) return false;
    // Check the whole token before splitting decimal punctuation: teensy4.1
    // names teensy41, while the partial teensy4 must still exclude teensy41.
    const whole = compact(token);
    if (whole.length >= 3 && names.some((name) => bounded(name, whole))) return true;
    const parts = token.split(/[^a-z0-9+]+/).filter(Boolean);
    return parts.length > 0 && parts.every((original) => [original, revisionAlias(original)].some((part) => {
      const prefix = (word: string) => word.startsWith(part) && !(/\d$/.test(part) && /^\d/.test(word.slice(part.length)));
      return words.some((word) => word === part || (part.length >= 3 && prefix(word))) ||
        (part.length >= 3 && names.some((name) => bounded(name, part))) ||
        (includeChip && part.length >= 3 && values.slice(2).some((value) => bounded(compact(value), part) && compact(value).startsWith(part)));
    }));
  });
}

/** Keep the matching peripheral attached to its recorded human-readable line. */
export function matchedPinSignals(pin: LookupPin, term: string): string {
  if (term === "gpio") return "Digital GPIO";
  const matches = (value: string) => matchesSignalValue(value, term);
  const signals = (pin.signals ?? []).filter((signal) => /\s/.test(signal) && matches(signal));
  if (signals.length) return signals.join(" · ");
  const aliases = (pin.aliases ?? []).filter(matches);
  if (aliases.length) return aliases.join(" · ");
  if (pin.net && matches(pin.net)) {
    const lines: Record<string, string[]> = { i2c: ["sda", "scl"], uart: ["tx", "rx"], spi: ["mosi", "miso", "sck", "sclk", "cs"] };
    const labels = [pin.label, ...(pin.aliases ?? [])].filter((value) => Object.hasOwn(lines, term) && lines[term].some((line) => matchesSignalValue(value, line)));
    return [...new Set([pin.net, ...labels])].join(" · ");
  }
  return (pin.signals ?? []).filter(matches).join(" · ") || (matches(pin.label) ? pin.label : "") || (pin.role === term ? term.toUpperCase() : "");
}

/** Defaults first; alternate routes remain discoverable without consuming other boards' slots. */
export function lookupPins(query: string, search: readonly BoardSearchEntry[], index: readonly PinIndexBoard[], boardLimit = maxLookupBoards): PinLookupResult {
  const tokens = pinQueryTokens(query);
  const term = tokens.pop();
  if (!term) return { boards: [], totalBoards: 0, primaryBoards: 0, truncated: false };
  // Revision words and their number may be typed with a space (UNO rev 3).
  for (let i = 0; i < tokens.length - 1; i++) {
    if (/^(rev|r)\.?$/.test(tokens[i]) && /^\d+$/.test(tokens[i + 1])) tokens.splice(i, 2, tokens[i].replace(/\.$/, "") + tokens[i + 1]);
  }
  const exact = tokens.length === 0;
  // Try the recorded name first: R4 is literal, while UNO R3 also names Rev3.
  const revisionTokens = tokens.map(revisionAlias);
  const ranked = search.map((entry) => ({ entry, match: exact ? { score: 1 } : matchBoardSearchEntry(entry, tokens) ?? matchBoardSearchEntry(entry, revisionTokens), secondary: !exact && !identityMatch(entry, tokens, false) }))
    .filter((hit) => hit.match && (exact || identityMatch(hit.entry, tokens, true)))
    .sort((a, b) => Number(a.secondary) - Number(b.secondary) || b.match!.score - a.match!.score);
  const byId = new Map(index.map((board) => [board.id, board.pins]));
  const results: PinLookupResult["boards"] = [];
  const order = { default: 0, labelled: 1, alternate: 2 };
  for (const { entry, secondary } of ranked) {
    const pins = (byId.get(entry.board.id) ?? []).filter((pin) => matchesPin(pin, term, exact))
      .sort((a, b) => order[pinMatchKind(a, term)] - order[pinMatchKind(b, term)]);
    if (pins.length) results.push({ id: entry.board.id, name: entry.board.name, pins: pins.slice(0, maxLookupRows), pinCount: pins.length, secondary });
  }
  const limit = Number.isFinite(boardLimit) ? Math.max(1, Math.min(512, Math.floor(boardLimit))) : maxLookupBoards;
  return { boards: results.slice(0, limit), totalBoards: results.length, primaryBoards: results.filter((board) => !board.secondary).length, truncated: results.length > limit || results.some((board) => board.pinCount > maxLookupRows) };
}
