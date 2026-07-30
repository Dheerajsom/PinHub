import type { BoardSummary } from "@/lib/board-summary";

// Free-text search for the discovery workspace. The searchable text for a
// board never changes, so it is derived once per catalog into an index rather
// than being rebuilt for every board on every keystroke.

export type BoardSearchEntry = {
  board: BoardSummary;
  /** Lowercased and whitespace-normalized board name. */
  name: string;
  /** Lowercased name split on non-alphanumerics, for word-prefix hits. */
  nameWords: string[];
  vendor: string;
  interfaces: string;
  warnings: string;
  supporting: string;
  /** Everything worth matching, lowercased and joined. */
  text: string;
};

export type BoardSearchMatchReason =
  | "name"
  | "vendor"
  | "interface"
  | "warning"
  | "details";

export type BoardSearchMatch = {
  score: number;
  matchedBy: BoardSearchMatchReason | null;
};

function normalizeSearchText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function createBoardSearchIndex(
  catalog: readonly BoardSummary[],
): BoardSearchEntry[] {
  return catalog.map((board) => {
    const name = normalizeSearchText(board.name);
    const vendor = normalizeSearchText(board.vendor);
    const interfaces = normalizeSearchText(board.interfaces.join(" "));
    const warnings = normalizeSearchText(board.warningSearchText);
    const supporting = normalizeSearchText(
      [
        board.family,
        board.processor,
        board.description,
        board.formFactor,
        board.category,
        ...board.tags,
        ...board.discovery.connectorEcosystems,
      ].join(" "),
    );
    return {
      board,
      name,
      nameWords: name.split(" "),
      vendor,
      interfaces,
      warnings,
      supporting,
      text: [name, vendor, interfaces, warnings, supporting].join(" "),
    };
  });
}

export function tokenizeQuery(query: string): string[] {
  return normalizeSearchText(query).split(/\s+/).filter(Boolean);
}

/**
 * Scores one board against pre-tokenized query terms. Every token must appear
 * somewhere or the board is excluded (score 0). Whole-name and phrase-prefix
 * matches receive a large bonus, then name word-prefix hits rank above vendor,
 * interface, warning, and supporting-field hits. Substring matching is kept so
 * partial/fuzzy lookups such as "pico" or "rp204" still work.
 */
export function scoreBoardSearchEntry(
  entry: BoardSearchEntry,
  tokens: readonly string[],
): number {
  if (!tokens.length) return 1;

  let total = 0;
  for (const token of tokens) {
    if (!entry.text.includes(token)) return 0;
    total += entry.nameWords.some((word) => word.startsWith(token))
      ? 160
      : entry.name.includes(token)
        ? 120
        : entry.vendor.includes(token)
          ? 70
          : entry.interfaces.includes(token)
            ? 55
            : entry.warnings.includes(token)
              ? 40
              : 25;
  }

  const phrase = tokens.join(" ");
  if (entry.name === phrase) return total + 10_000;
  if (entry.name.startsWith(phrase)) return total + 5_000;
  if (entry.name.includes(phrase)) return total + 1_000;

  return total;
}

export function getBoardSearchMatch(
  entry: BoardSearchEntry,
  query: string,
): BoardSearchMatch {
  const tokens = tokenizeQuery(query);
  const score = scoreBoardSearchEntry(entry, tokens);
  if (!tokens.length || score === 0) return { score, matchedBy: null };

  const everyTokenMatches = (value: string) =>
    tokens.every((token) => value.includes(token));

  const matchedBy: BoardSearchMatchReason = everyTokenMatches(entry.name)
    ? "name"
    : everyTokenMatches(entry.vendor)
      ? "vendor"
      : everyTokenMatches(entry.interfaces)
        ? "interface"
        : everyTokenMatches(entry.warnings)
          ? "warning"
          : tokens.some((token) => entry.name.includes(token))
            ? "name"
            : tokens.some((token) => entry.vendor.includes(token))
              ? "vendor"
              : tokens.some((token) => entry.interfaces.includes(token))
                ? "interface"
                : tokens.some((token) => entry.warnings.includes(token))
                  ? "warning"
                  : "details";

  return { score, matchedBy };
}
