"use client";

import { useMemo } from "react";
import type { BoardSummary } from "@/lib/board-summary";
import {
  matchBoardSearchEntry,
  tokenizeQuery,
  type BoardMatchField,
  type BoardSearchEntry,
} from "@/lib/board-search";
import {
  compareCatalogBoards,
  matchesCatalogFilters,
  type CatalogState,
} from "@/lib/catalog-state";

export type CatalogResult = {
  board: BoardSummary;
  score: number;
  matchedBy: BoardMatchField | null;
};

/**
 * Filters, scores, and sorts the catalog for one URL state. Facets run before
 * search scoring so boards that cannot be shown are never scored. Both catalog
 * surfaces (the pin-map workspace and discovery) share this so their result
 * sets cannot drift apart.
 */
export function useCatalogResults(
  entries: readonly BoardSearchEntry[],
  state: CatalogState,
  favorites: ReadonlySet<string>,
): CatalogResult[] {
  return useMemo(() => {
    const tokens = tokenizeQuery(state.query);
    const scored: CatalogResult[] = [];
    for (const entry of entries) {
      if (!matchesCatalogFilters(entry.board, state, favorites)) continue;
      const match = matchBoardSearchEntry(entry, tokens);
      if (!match) continue;
      scored.push({ board: entry.board, score: match.score, matchedBy: match.matchedBy });
    }
    scored.sort((a, b) =>
      compareCatalogBoards(a.board, b.board, state.sort, a.score, b.score),
    );
    return scored;
  }, [entries, favorites, state]);
}
