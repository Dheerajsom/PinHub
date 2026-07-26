import type { BoardSummary } from "@/lib/board-summary";

// Free-text search for the discovery workspace. The searchable text for a
// board never changes, so it is derived once per catalog into an index rather
// than being rebuilt for every board on every keystroke.

export type BoardSearchEntry = {
  board: BoardSummary;
  /** Lowercased board name, for substring hits. */
  name: string;
  /** Lowercased name split on non-alphanumerics, for word-prefix hits. */
  nameWords: string[];
  /** Everything else worth matching, lowercased and joined. */
  text: string;
};

export function createBoardSearchIndex(
  catalog: readonly BoardSummary[],
): BoardSearchEntry[] {
  return catalog.map((board) => {
    const name = board.name.toLowerCase();
    return {
      board,
      name,
      nameWords: name.split(/[^a-z0-9]+/),
      text: [
        board.name,
        board.vendor,
        board.family,
        board.processor,
        board.description,
        board.warningSearchText,
        board.formFactor,
        ...board.tags,
        ...board.interfaces,
        ...board.discovery.connectorEcosystems,
      ]
        .join(" ")
        .toLowerCase(),
    };
  });
}

export function tokenizeQuery(query: string): string[] {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

/**
 * Scores one board against pre-tokenized query terms. Every token must appear
 * somewhere or the board is excluded (score 0); a name word-prefix hit ranks
 * above a name substring hit, which ranks above a supporting-field hit. An
 * empty query scores every board equally so ordering falls to the sort key.
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
      ? 100
      : entry.name.includes(token)
        ? 60
        : 20;
  }
  return total;
}
