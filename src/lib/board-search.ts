import type { BoardSummary } from "@/lib/board-summary";

// Free-text search shared by the catalog and the discovery workspace. The
// searchable text for a board never changes, so it is derived once per catalog
// into an index rather than being rebuilt for every board on every keystroke.
//
// Ranking is deliberately layered. A typed board name is almost always someone
// asking for that exact board, so a whole-query name hit outranks any amount of
// incidental token matching: "Raspberry Pi 5" must not be buried under boards
// that merely mention Raspberry Pi in a compatibility note. Below that the
// order follows how specific the field is — name, vendor, spec, interface,
// warning, prose — which is also what the result rows report as the match
// reason.

/** Which field earned a board its place in the results. */
export type BoardMatchField =
  | "name"
  | "vendor"
  | "spec"
  | "interface"
  | "warning"
  | "description";

export const matchFieldLabels: Record<BoardMatchField, string> = {
  name: "name",
  vendor: "vendor",
  spec: "specs",
  interface: "interface",
  warning: "warning",
  description: "description",
};

export type BoardSearchMatch = {
  score: number;
  /** Null only for an empty query, where nothing was matched on. */
  matchedBy: BoardMatchField | null;
};

export type BoardSearchEntry = {
  board: BoardSummary;
  /** Lowercased board name, for substring hits. */
  name: string;
  /** Name reduced to single-spaced words, for whole-query comparisons. */
  normalizedName: string;
  /** Lowercased name split on non-alphanumerics, for word hits. */
  nameWords: string[];
  /** Per-field haystacks, lowercased, in match-reason order. */
  fields: Record<Exclude<BoardMatchField, "name">, string>;
  /** Everything worth matching, lowercased and joined. */
  text: string;
};

// Token scores. A token is scored once, by the strongest field it hits.
const scoreExactNameWord = 140;
const scoreNamePrefix = 100;
const scoreNameSubstring = 60;
const fieldScores: Record<Exclude<BoardMatchField, "name">, number> = {
  vendor: 45,
  spec: 30,
  interface: 25,
  warning: 15,
  description: 10,
};
// A token buried inside a longer word in a supporting field ("pi" inside
// "GPIO") still keeps the board in the results — fuzzy lookups depend on it —
// but it earns almost nothing, so a real word hit anywhere else outranks it.
const looseFieldScore = 4;
// Whole-query bonuses, applied once. They are an order of magnitude above the
// per-token scores so an exact name can never lose to a pile of weak hits.
const bonusExactName = 1000;
const bonusNamePrefix = 500;
const bonusNameSubstring = 200;

const fieldOrder = Object.keys(fieldScores) as Exclude<
  BoardMatchField,
  "name"
>[];

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9+]+/g, " ")
    .trim();
}

export function createBoardSearchIndex(
  catalog: readonly BoardSummary[],
): BoardSearchEntry[] {
  return catalog.map((board) => {
    const name = board.name.toLowerCase();
    const fields = {
      vendor: [board.vendor, board.family].join(" ").toLowerCase(),
      spec: [
        board.processor,
        board.category,
        board.logicLevel,
        board.formFactor,
        ...board.tags,
      ]
        .join(" ")
        .toLowerCase(),
      interface: [
        ...board.interfaces,
        ...board.discovery.connectorEcosystems,
        ...board.discovery.wireless,
      ]
        .join(" ")
        .toLowerCase(),
      warning: board.warningSearchText.toLowerCase(),
      description: board.description.toLowerCase(),
    };

    return {
      board,
      name,
      normalizedName: normalize(board.name),
      nameWords: name.split(/[^a-z0-9+]+/).filter(Boolean),
      fields,
      text: [name, ...Object.values(fields)].join(" "),
    };
  });
}

// Matching cost is linear in tokens × boards, and the query is re-scored on
// every keystroke. A hand-typed lookup is a handful of words; a pasted wall of
// text is not a lookup at all, and left unbounded it turns each keystroke into
// a long task (measured: 2,000 matching tokens took ~14 ms per pass over the
// catalog on a desktop, several times that on a phone). Both limits sit far
// above any real query, so ranking for real input is unchanged.
const maxQueryLength = 256;
const maxQueryTokens = 32;

export function tokenizeQuery(query: string): string[] {
  return query
    .slice(0, maxQueryLength)
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, maxQueryTokens);
}

// True when the token starts a word in the haystack, without allocating a
// regular expression for every token/board pair on every keystroke.
function hasWordPrefix(haystack: string, token: string): boolean {
  for (
    let index = haystack.indexOf(token);
    index !== -1;
    index = haystack.indexOf(token, index + 1)
  ) {
    if (index === 0 || !/[a-z0-9+]/.test(haystack[index - 1])) return true;
  }
  return false;
}

// The strongest field a single token hits, with the score it earns there.
function scoreToken(
  entry: BoardSearchEntry,
  token: string,
): BoardSearchMatch | null {
  if (entry.nameWords.includes(token)) {
    return { score: scoreExactNameWord, matchedBy: "name" };
  }
  if (entry.nameWords.some((word) => word.startsWith(token))) {
    return { score: scoreNamePrefix, matchedBy: "name" };
  }
  if (entry.name.includes(token)) {
    return { score: scoreNameSubstring, matchedBy: "name" };
  }
  for (const field of fieldOrder) {
    if (hasWordPrefix(entry.fields[field], token)) {
      return { score: fieldScores[field], matchedBy: field };
    }
  }
  for (const field of fieldOrder) {
    if (entry.fields[field].includes(token)) {
      return { score: looseFieldScore, matchedBy: field };
    }
  }
  return null;
}

/**
 * Ranks one board against pre-tokenized query terms, reporting the field that
 * earned it the most. Every token must appear somewhere or the board is
 * excluded (null); the whole query matching the board name outranks everything
 * else, then name words, vendor, specs, interfaces, warnings, and prose. An
 * empty query matches every board equally so ordering falls to the sort key.
 */
export function matchBoardSearchEntry(
  entry: BoardSearchEntry,
  tokens: readonly string[],
): BoardSearchMatch | null {
  if (!tokens.length) return { score: 1, matchedBy: null };

  let total = 0;
  let best: BoardSearchMatch | null = null;
  for (const token of tokens) {
    const hit = scoreToken(entry, token);
    if (!hit) return null;
    total += hit.score;
    if (!best || hit.score > best.score) best = hit;
  }

  const query = normalize(tokens.join(" "));
  if (query === entry.normalizedName) {
    total += bonusExactName;
  } else if (entry.normalizedName.startsWith(query)) {
    total += bonusNamePrefix;
  } else if (tokens.length > 1 && entry.normalizedName.includes(query)) {
    total += bonusNameSubstring;
  }

  return { score: total, matchedBy: best?.matchedBy ?? null };
}

/** Score-only view of {@link matchBoardSearchEntry}; 0 means excluded. */
export function scoreBoardSearchEntry(
  entry: BoardSearchEntry,
  tokens: readonly string[],
): number {
  return matchBoardSearchEntry(entry, tokens)?.score ?? 0;
}
