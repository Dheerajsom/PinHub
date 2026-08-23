import type { BoardSummary } from "@/lib/board-summary";
import {
  matchesCatalogFilters,
  type CatalogFilterKey,
  type CatalogState,
} from "@/lib/catalog-state";
import type { FacetValue } from "@/components/catalog/FacetPanel";

/** How each facet reads its values off a board summary. */
const facetReaders: Record<
  CatalogFilterKey,
  (board: BoardSummary) => readonly string[]
> = {
  category: (board) => [board.category],
  platform: (board) => [board.discovery.computeClass],
  vendor: (board) => [board.vendor],
  family: (board) => [board.family],
  interface: (board) => board.interfaces,
  logic: (board) => [board.discovery.logicProfile],
  power: (board) => board.discovery.powerInputs,
  form: (board) => [board.discovery.formFactorProfile],
  wireless: (board) => board.discovery.wireless,
  connector: (board) => board.discovery.connectorEcosystems,
};

/**
 * The values one facet can take, each with the number of boards that would
 * remain if it were ticked.
 *
 * Counts are computed against the state with *this* facet cleared, which is
 * what makes them honest: a count answers "how many results would I get if I
 * picked this", not "how many are showing right now". Values that would yield
 * nothing are still returned, with a zero — the panel greys them rather than
 * hiding them, because a hidden option reads as an option that does not exist.
 */
export function facetValues(
  catalog: readonly BoardSummary[],
  key: CatalogFilterKey,
  state: CatalogState,
  favorites: ReadonlySet<string>,
): FacetValue[] {
  const read = facetReaders[key];
  const withoutThisFacet: CatalogState = { ...state, [key]: [] };
  const pool = catalog.filter((board) =>
    matchesCatalogFilters(board, withoutThisFacet, favorites),
  );

  // Every value the whole catalog offers, so an option never disappears just
  // because the current narrowing excludes it.
  const values = new Set<string>();
  for (const board of catalog) {
    for (const value of read(board)) values.add(value);
  }

  const counts = new Map<string, number>();
  for (const board of pool) {
    for (const value of read(board)) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }

  return [...values]
    .map((value) => ({ value, count: counts.get(value) ?? 0 }))
    .sort(
      (a, b) => b.count - a.count || a.value.localeCompare(b.value),
    );
}

/**
 * When a search returns nothing, work out which single term is responsible.
 *
 * `matchBoardSearchEntry` requires every token to hit, so a query of three
 * words can be killed by one of them. Re-running the match without each token
 * in turn finds the ones whose removal would bring results back, which is what
 * the empty state offers to drop.
 */
export function blockingTokens(
  tokens: readonly string[],
  countFor: (subset: readonly string[]) => number,
): string[] {
  if (tokens.length < 2) return [];
  return tokens.filter((token) => {
    const without = tokens.filter((entry) => entry !== token);
    return countFor(without) > 0;
  });
}
