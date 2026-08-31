import type { Board } from "./model.js";
import { boards } from "./boards/index.js";

export const MAX_SUGGESTION_QUERY_LENGTH = 256;

/**
 * Normalizes a user query or alias: case-insensitive, and spaces, underscores
 * and repeated hyphens all collapse to single hyphens, so "Raspberry Pi 5",
 * "raspberry_pi_5" and "raspberry-pi-5" are equivalent.
 */
export function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function candidateNames(board: Board): string[] {
  return [board.id, normalizeQuery(board.name), ...board.aliases.map(normalizeQuery)];
}

export function resolveBoard(query: string): Board | undefined {
  const q = normalizeQuery(query);
  if (!q) return undefined;
  return boards.find((board) => candidateNames(board).includes(q));
}

function levenshtein(a: string, b: string): number {
  const prev = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    let diagonal = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const insertOrDelete = Math.min(prev[j], prev[j - 1]) + 1;
      const substitute = diagonal + (a[i - 1] === b[j - 1] ? 0 : 1);
      diagonal = prev[j];
      prev[j] = Math.min(insertOrDelete, substitute);
    }
  }
  return prev[b.length];
}

export type Suggestion = {
  board: Board;
  /** The closest matching alias — what the user probably meant to type. */
  alias: string;
  distance: number;
};

/**
 * Ranks boards by edit distance between the query and their closest alias.
 * Prefix matches count as very close so "rasp" still suggests the Pis.
 */
export function suggestBoards(query: string, max = 3): Suggestion[] {
  const q = normalizeQuery(query);
  const limit = Number.isFinite(max) ? Math.max(0, Math.floor(max)) : 0;
  // Levenshtein work grows with query length × aliases × boards. Command-line
  // arguments can be far larger than a human lookup, so skip fuzzy scoring
  // beyond a practical search length instead of allowing algorithmic DoS.
  if (!q || q.length > MAX_SUGGESTION_QUERY_LENGTH || limit === 0) return [];
  const scored = boards.map((board) => {
    let best: Suggestion = { board, alias: board.id, distance: Number.POSITIVE_INFINITY };
    for (const name of candidateNames(board)) {
      const distance = name.startsWith(q) ? 1 : levenshtein(q, name);
      if (distance < best.distance) best = { board, alias: name, distance };
    }
    return best;
  });
  const threshold = Math.max(2, Math.floor(q.length / 2));
  return scored
    .filter((s) => s.distance <= threshold)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
}

export function searchBoards(query: string): Board[] {
  const q = normalizeQuery(query);
  if (!q) return [];
  return boards.filter((board) =>
    [
      board.id,
      normalizeQuery(board.name),
      normalizeQuery(board.manufacturer),
      normalizeQuery(board.description ?? ""),
      ...board.aliases.map(normalizeQuery),
    ].some((text) => text.includes(q)),
  );
}

export { boards };
