"use client";

import Link from "next/link";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import {
  GitCompareArrows,
  LoaderCircle,
  Search,
  SlidersHorizontal,
  Star,
  X,
} from "lucide-react";
import { clsx } from "clsx";
import type { Board } from "@/lib/boards";
import type { BoardSummary } from "@/lib/board-summary";
import {
  createBoardSearchIndex,
  matchBoardSearchEntry,
  tokenizeQuery,
  type BoardMatchField,
  type BoardSearchEntry,
} from "@/lib/board-search";
import { createBoardDetailLoader } from "@/lib/board-detail-loader";
import { toggleFavorite, useFavorites } from "@/lib/favorites";
import { clearCompared, toggleCompared, useCompared } from "@/lib/compare-tray";
import { compareUrl, maxComparedBoards } from "@/lib/compare-params";
import { AppHeader } from "@/components/shell/AppHeader";
import { FacetGroup, FacetSwitch } from "@/components/catalog/FacetPanel";
import { IndexRow } from "@/components/catalog/IndexRow";
import { BoardBench, type BenchState } from "@/components/board/BoardBench";
import { ReadoutRail } from "@/components/rail/ReadoutRail";
import { useCatalogUrlState } from "@/components/catalog/useCatalogUrlState";
import { blockingTokens, facetValues } from "@/lib/facets";
import {
  activeCatalogFilterCount,
  compareCatalogBoards,
  defaultCatalogState,
  matchesCatalogFilters,
  type CatalogFilterKey,
  type CatalogSort,
  type CatalogState,
} from "@/lib/catalog-state";

// Render a useful first screen without embedding every offscreen row in the
// initial HTML. Everything stays searchable client-side regardless.
const initialResultLimit = 40;
const resultPageSize = 60;
// The width at which the index and the bench sit side by side. This must stay
// equal to `--breakpoint-bench` in globals.css, which drives the `bench:`
// variant used by the grid below. The previous build kept two copies of this
// number and they could disagree at fractional widths, leaving the detail
// rendered in neither column.
export const benchLayoutQuery = "(min-width: 1180px)";

const sortLabels: { value: CatalogSort; label: string }[] = [
  { value: "catalog", label: "Catalog order" },
  { value: "name", label: "Name A–Z" },
  { value: "vendor", label: "Vendor A–Z" },
  { value: "pinCount", label: "Most pins mapped" },
  { value: "interfaceCount", label: "Most interfaces" },
  { value: "recentlyAdded", label: "Recently added" },
];

type PinHubAppProps = {
  catalog: BoardSummary[];
  initialBoard: Board;
  sourceCount: number;
};

function scrollBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";
}

function subscribeToBenchLayout(listener: () => void): () => void {
  const mediaQuery = window.matchMedia(benchLayoutQuery);
  mediaQuery.addEventListener("change", listener);
  return () => mediaQuery.removeEventListener("change", listener);
}

function getBenchLayoutSnapshot(): boolean {
  return window.matchMedia(benchLayoutQuery).matches;
}

function getServerBenchLayoutSnapshot(): boolean {
  // The server renders the side-by-side bench once so the no-JS HTML is useful.
  // Narrow clients swap to the inline bench immediately after hydration.
  return true;
}

/**
 * PinHub's working surface: a bench index on the left, the board under
 * inspection on the right, and the readout rail docked across the bottom.
 *
 * The whole shell is one viewport-height frame whose panes scroll
 * independently, so choosing a board never scrolls the list out from under you
 * and the rail is reachable at any depth.
 */
export function PinHubApp({ catalog, initialBoard, sourceCount }: PinHubAppProps) {
  const [catalogState, setCatalogState] = useCatalogUrlState("/");
  const query = catalogState.query;
  const [selectedId, setSelectedId] = useState(initialBoard.id);
  const [inlineBenchOpen, setInlineBenchOpen] = useState(false);
  const [facetsOpen, setFacetsOpen] = useState(false);
  const [benchRetry, setBenchRetry] = useState(0);
  const [benchState, setBenchState] = useState<BenchState>({
    status: "ready",
    board: initialBoard,
  });
  const [paging, startPaging] = useTransition();

  const storedFavorites = useFavorites();
  const comparedIds = useCompared();
  const wideLayout = useSyncExternalStore(
    subscribeToBenchLayout,
    getBenchLayoutSnapshot,
    getServerBenchLayoutSnapshot,
  );
  const searchRef = useRef<HTMLInputElement>(null);
  const indexRef = useRef<HTMLElement>(null);
  const [detailLoader] = useState(() => createBoardDetailLoader([initialBoard]));

  const visibleLimit =
    initialResultLimit + (catalogState.page - 1) * resultPageSize;

  const catalogIds = useMemo(
    () => new Set(catalog.map((board) => board.id)),
    [catalog],
  );
  const favorites = useMemo(
    () => new Set([...storedFavorites].filter((id) => catalogIds.has(id))),
    [catalogIds, storedFavorites],
  );
  const compared = useMemo(
    () => comparedIds.filter((id) => catalogIds.has(id)),
    [catalogIds, comparedIds],
  );
  const searchEntries = useMemo(
    () => createBoardSearchIndex(catalog),
    [catalog],
  );

  const tokens = useMemo(() => tokenizeQuery(query), [query]);

  const results = useMemo(() => {
    const scored: {
      board: BoardSummary;
      score: number;
      matchedBy: BoardMatchField | null;
    }[] = [];
    for (const entry of searchEntries) {
      if (!matchesCatalogFilters(entry.board, catalogState, favorites)) continue;
      const match = matchBoardSearchEntry(entry, tokens);
      if (!match) continue;
      scored.push({
        board: entry.board,
        score: match.score,
        matchedBy: match.matchedBy,
      });
    }
    // A stable sort keeps equal-scoring boards in catalog order, so the list
    // never reshuffles between keystrokes.
    scored.sort((a, b) =>
      compareCatalogBoards(a.board, b.board, catalogState.sort, a.score, b.score),
    );
    return scored;
  }, [catalogState, favorites, searchEntries, tokens]);

  const filteredBoards = useMemo(
    () => results.map((result) => result.board),
    [results],
  );
  const matchReasons = useMemo(
    () => new Map(results.map((result) => [result.board.id, result.matchedBy])),
    [results],
  );

  const selectedBoard =
    filteredBoards.find((board) => board.id === selectedId) ??
    filteredBoards[0] ??
    catalog[0];
  const visibleBoards = filteredBoards.slice(0, visibleLimit);
  const selectedIdRef = useRef(selectedBoard.id);
  useEffect(() => {
    selectedIdRef.current = selectedBoard.id;
  }, [selectedBoard.id]);

  const loadBoardDetail = detailLoader.load;
  const prefetchBoard = useCallback(
    (id: string) => {
      void loadBoardDetail(id).catch(() => {
        // Hover prefetching is opportunistic; selection surfaces the retry.
      });
    },
    [loadBoardDetail],
  );

  const activeFilterCount = activeCatalogFilterCount(catalogState);
  const hasActiveFilters = activeFilterCount > 0 || query.trim().length > 0;
  const favoritesEmpty = catalogState.favoritesOnly && favorites.size === 0;

  // Which single search term, if dropped, would bring results back. Every token
  // must hit for a board to match, so one bad word can empty the whole list.
  const relaxableTokens = useMemo(() => {
    if (filteredBoards.length > 0 || tokens.length < 2) return [];
    const countFor = (subset: readonly string[]) => {
      let total = 0;
      for (const entry of searchEntries as BoardSearchEntry[]) {
        if (!matchesCatalogFilters(entry.board, catalogState, favorites)) continue;
        if (matchBoardSearchEntry(entry, subset)) total += 1;
      }
      return total;
    };
    return blockingTokens(tokens, countFor);
  }, [catalogState, favorites, filteredBoards.length, searchEntries, tokens]);

  useEffect(() => {
    if (!selectedBoard || (!wideLayout && !inlineBenchOpen)) return;
    let current = true;
    void loadBoardDetail(selectedBoard.id)
      .then((board) => {
        if (current) setBenchState({ status: "ready", board });
      })
      .catch(() => {
        if (current) {
          setBenchState({ status: "error", board: null, id: selectedBoard.id });
        }
      });
    return () => {
      current = false;
    };
  }, [benchRetry, inlineBenchOpen, loadBoardDetail, selectedBoard, wideLayout]);

  useEffect(() => {
    if (wideLayout || !inlineBenchOpen || !selectedBoard) return;
    const frame = window.requestAnimationFrame(() => {
      const bench = document.getElementById("inline-bench");
      bench?.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
      bench?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [inlineBenchOpen, selectedBoard, wideLayout]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "/" || event.defaultPrevented) return;
      const target = event.target as HTMLElement | null;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable
      ) {
        return;
      }
      event.preventDefault();
      searchRef.current?.focus();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // Any change to the result set invalidates the selection and the open inline
  // bench, so every filter control funnels through here instead of repeating it.
  const resetResultView = useCallback(() => {
    setSelectedId("");
    setInlineBenchOpen(false);
  }, []);

  const updateFilters = useCallback(
    (patch: Partial<CatalogState>) => {
      setCatalogState((current) => ({ ...current, ...patch, page: 1 }));
      resetResultView();
    },
    [resetResultView, setCatalogState],
  );

  const toggleFacet = useCallback(
    (key: CatalogFilterKey, value: string) => {
      setCatalogState((current) => {
        const selected = current[key];
        return {
          ...current,
          [key]: selected.includes(value)
            ? selected.filter((entry) => entry !== value)
            : [...selected, value],
          page: 1,
        };
      });
      resetResultView();
    },
    [resetResultView, setCatalogState],
  );

  const changeQuery = useCallback(
    (nextQuery: string) => {
      setCatalogState(
        (current) => ({
          ...current,
          query: nextQuery,
          page: 1,
          sort:
            nextQuery.trim() && current.sort === "catalog"
              ? "relevance"
              : !nextQuery.trim() && current.sort === "relevance"
                ? "catalog"
                : current.sort,
        }),
        "replace",
      );
      resetResultView();
    },
    [resetResultView, setCatalogState],
  );

  const dropToken = useCallback(
    (token: string) => {
      changeQuery(tokens.filter((entry) => entry !== token).join(" "));
    },
    [changeQuery, tokens],
  );

  // Stable identity so a keystroke or an unrelated row's state change does not
  // re-render every memoized row — which is why the layout and the current
  // selection are read at click time rather than closed over.
  const selectBoard = useCallback((id: string) => {
    const reselected = selectedIdRef.current === id;
    setSelectedId(id);
    if (!getBenchLayoutSnapshot()) {
      // On the stacked layout the row is a disclosure for the bench below it,
      // so tapping the open board closes it — which is what `aria-expanded` on
      // that row promises.
      setInlineBenchOpen((open) => !(open && reselected));
    }
  }, []);

  const navigateBoard = useCallback(
    (id: string, direction: "next" | "previous" | "first" | "last") => {
      const currentIndex = filteredBoards.findIndex((board) => board.id === id);
      if (currentIndex < 0) return;
      const nextIndex =
        direction === "first"
          ? 0
          : direction === "last"
            ? filteredBoards.length - 1
            : Math.min(
                Math.max(currentIndex + (direction === "next" ? 1 : -1), 0),
                filteredBoards.length - 1,
              );
      const next = filteredBoards[nextIndex];
      if (!next || next.id === id) return;
      if (nextIndex >= visibleLimit) {
        setCatalogState((current) => ({
          ...current,
          page:
            Math.ceil((nextIndex + 1 - initialResultLimit) / resultPageSize) + 1,
        }));
      }
      setSelectedId(next.id);
      prefetchBoard(next.id);
      requestAnimationFrame(() => {
        document.getElementById(`board-row-action-${next.id}`)?.focus();
      });
    },
    [filteredBoards, prefetchBoard, setCatalogState, visibleLimit],
  );

  const retryBench = useCallback(() => {
    setBenchState({ status: "loading", board: null, id: selectedBoard.id });
    setBenchRetry((value) => value + 1);
  }, [selectedBoard.id]);

  const showMore = useCallback(() => {
    if (paging) return;
    startPaging(() => {
      setCatalogState((current) => ({ ...current, page: current.page + 1 }));
    });
  }, [paging, setCatalogState]);

  const facets = useMemo(
    () =>
      ({
        category: facetValues(catalog, "category", catalogState, favorites),
        interface: facetValues(catalog, "interface", catalogState, favorites),
        logic: facetValues(catalog, "logic", catalogState, favorites),
        platform: facetValues(catalog, "platform", catalogState, favorites),
        vendor: facetValues(catalog, "vendor", catalogState, favorites),
        power: facetValues(catalog, "power", catalogState, favorites),
        form: facetValues(catalog, "form", catalogState, favorites),
        connector: facetValues(catalog, "connector", catalogState, favorites),
        wireless: facetValues(catalog, "wireless", catalogState, favorites),
      }) as const,
    [catalog, catalogState, favorites],
  );

  const benchBoard =
    benchState.status === "ready" ? benchState.board : null;

  return (
    <div className="panel-grain flex min-h-screen flex-col">
      <a
        href="#board-index"
        className="sr-only z-50 bg-raised px-3 py-2 text-ink focus:not-sr-only focus:absolute focus:left-2 focus:top-2"
      >
        Skip to the board index
      </a>

      <AppHeader
        section="index"
        readings={[
          { label: "Boards", value: String(catalog.length) },
          { label: "Sources", value: String(sourceCount) },
        ]}
      />

      {/* ---- Command bar -------------------------------------------------- */}
      <div className="sticky top-0 z-20 border-b border-rule bg-face">
        <div className="mx-auto flex max-w-[1720px] flex-wrap items-center gap-1.5 px-4 py-1.5 sm:px-6">
          <label className="relative min-w-0 flex-1 basis-full sm:basis-64">
            <Search
              className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-faint"
              aria-hidden="true"
            />
            <span className="sr-only">Search boards</span>
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => changeQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  changeQuery("");
                  event.currentTarget.blur();
                }
                if (event.key === "Enter" && selectedBoard) {
                  selectBoard(selectedBoard.id);
                }
                if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                  event.preventDefault();
                  if (!filteredBoards.length) return;
                  const index = filteredBoards.findIndex(
                    (board) => board.id === selectedBoard.id,
                  );
                  const step = event.key === "ArrowDown" ? 1 : -1;
                  const nextIndex = Math.min(
                    Math.max(index + step, 0),
                    filteredBoards.length - 1,
                  );
                  const next = filteredBoards[nextIndex];
                  if (!next) return;
                  setSelectedId(next.id);
                  if (nextIndex >= visibleLimit) {
                    setCatalogState((current) => ({
                      ...current,
                      page:
                        Math.ceil(
                          (nextIndex + 1 - initialResultLimit) / resultPageSize,
                        ) + 1,
                    }));
                  }
                }
              }}
              placeholder="Search board, vendor, MCU, interface, or warning"
              aria-label="Search boards"
              aria-controls="board-index"
              className="h-9 w-full border border-rule bg-well pl-7 pr-8 text-[13px] text-ink outline-none transition-colors placeholder:text-faint focus-visible:border-ink"
            />
            {query ? (
              <button
                type="button"
                onClick={() => changeQuery("")}
                aria-label="Clear search"
                className="absolute right-0 top-1/2 grid size-9 -translate-y-1/2 place-items-center text-faint transition-colors hover:text-ink"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            ) : (
              <kbd
                className="data pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 border border-rule px-1 text-[10px] text-faint sm:block"
                aria-hidden="true"
              >
                /
              </kbd>
            )}
          </label>

          <button
            type="button"
            onClick={() => setFacetsOpen((value) => !value)}
            aria-expanded={facetsOpen}
            aria-controls="facet-rail"
            className="ctl !min-h-9 bench:hidden"
          >
            <SlidersHorizontal className="size-3.5" aria-hidden="true" />
            Filters
            {activeFilterCount ? (
              <span className="data text-[11px] text-ink">{activeFilterCount}</span>
            ) : null}
          </button>

          <button
            type="button"
            onClick={() =>
              updateFilters({ favoritesOnly: !catalogState.favoritesOnly })
            }
            aria-pressed={catalogState.favoritesOnly}
            className="ctl !min-h-9"
          >
            <Star
              className={clsx(
                "size-3.5",
                catalogState.favoritesOnly && "fill-current",
              )}
              aria-hidden="true"
            />
            Saved
            {favorites.size ? (
              <span className="data text-[11px]">{favorites.size}</span>
            ) : null}
          </button>

          <label className="ctl !min-h-9 gap-1.5">
            <span className="silk">Sort</span>
            <select
              value={catalogState.sort}
              onChange={(event) =>
                setCatalogState((current) => ({
                  ...current,
                  sort: event.target.value as CatalogSort,
                  page: 1,
                }))
              }
              aria-label="Sort boards"
              className="bg-transparent text-[13px] text-ink outline-none"
            >
              {query.trim() ? (
                <option value="relevance">Best match</option>
              ) : null}
              {sortLabels.map((entry) => (
                <option key={entry.value} value={entry.value}>
                  {entry.label}
                </option>
              ))}
            </select>
          </label>

          {/* The compact form is for the eye; screen readers get the sentence,
              because "40/147" is not something you want read aloud. */}
          <p className="shrink-0 text-[11px] text-dim" role="status" aria-live="polite">
            <span className="sr-only">
              Showing {visibleBoards.length} of {filteredBoards.length}{" "}
              {hasActiveFilters ? "matching boards" : "boards"}
              {hasActiveFilters ? ` from ${catalog.length} in the catalog` : ""}
              {paging ? ", loading more" : ""}.
            </span>
            <span className="data" aria-hidden="true">
              {visibleBoards.length}/{filteredBoards.length}
              {hasActiveFilters ? ` of ${catalog.length}` : ""}
              {paging ? " · loading" : ""}
            </span>
          </p>

          {hasActiveFilters ? (
            <button
              type="button"
              onClick={() => {
                setCatalogState(defaultCatalogState);
                resetResultView();
              }}
              className="silk px-1.5 py-1 !text-dim underline-offset-4 transition-colors hover:!text-ink hover:underline"
            >
              Reset all
            </button>
          ) : null}
        </div>
      </div>

      {/* ---- Workbench ---------------------------------------------------- */}
      <div className="mx-auto grid w-full max-w-[1720px] flex-1 grid-cols-1 items-start gap-2 px-4 py-2 sm:px-6 bench:grid-cols-[14rem_minmax(0,1fr)_clamp(23rem,29vw,30rem)]">
        {/* Facet rail */}
        <aside
          id="facet-rail"
          aria-label="Filters"
          className={clsx(
            "panel bench:sticky bench:top-[3.25rem] bench:max-h-[calc(100vh-8rem)] bench:overflow-y-auto",
            facetsOpen ? "block" : "hidden bench:block",
          )}
        >
          <FacetSwitch
            legend="Mapped connectors only"
            description="Boards with a pin map published in PinHub"
            checked={catalogState.pinoutOnly}
            onChange={(next) => updateFilters({ pinoutOnly: next })}
          />
          <FacetSwitch
            legend="Official sources only"
            description="At least one vendor-published reference"
            checked={catalogState.officialDocumentation === "has"}
            onChange={(next) =>
              updateFilters({ officialDocumentation: next ? "has" : "any" })
            }
          />
          <FacetSwitch
            legend="Wireless on board"
            description="Wi-Fi, Bluetooth, Thread, or Zigbee"
            checked={catalogState.wirelessCapability === "has"}
            onChange={(next) =>
              updateFilters({ wirelessCapability: next ? "has" : "any" })
            }
          />

          <FacetGroup
            legend="Category"
            values={facets.category}
            selected={catalogState.category}
            onToggle={(value) => toggleFacet("category", value)}
          />
          <FacetGroup
            legend="Interface"
            values={facets.interface}
            selected={catalogState.interface}
            onToggle={(value) => toggleFacet("interface", value)}
            hint="Ticking more than one keeps only boards with all of them."
          />
          <FacetGroup
            legend="Logic level"
            values={facets.logic}
            selected={catalogState.logic}
            onToggle={(value) => toggleFacet("logic", value)}
          />
          <FacetGroup
            legend="Platform"
            values={facets.platform}
            selected={catalogState.platform}
            onToggle={(value) => toggleFacet("platform", value)}
            defaultOpen={false}
          />
          <FacetGroup
            legend="Form factor"
            values={facets.form}
            selected={catalogState.form}
            onToggle={(value) => toggleFacet("form", value)}
            defaultOpen={false}
          />
          <FacetGroup
            legend="Power input"
            values={facets.power}
            selected={catalogState.power}
            onToggle={(value) => toggleFacet("power", value)}
            defaultOpen={false}
          />
          <FacetGroup
            legend="Connector ecosystem"
            values={facets.connector}
            selected={catalogState.connector}
            onToggle={(value) => toggleFacet("connector", value)}
            defaultOpen={false}
          />
          <FacetGroup
            legend="Vendor"
            values={facets.vendor}
            selected={catalogState.vendor}
            onToggle={(value) => toggleFacet("vendor", value)}
            defaultOpen={false}
          />
        </aside>

        {/* Index */}
        <section
          ref={indexRef}
          id="board-index"
          aria-label="Board index"
          className="panel min-w-0 scroll-mt-24"
        >
          <div className="flex items-center justify-between gap-3 border-b border-rule px-3 py-1.5">
            <h2 className="silk">Bench index</h2>
            <span className="silk">
              {filteredBoards.length} {filteredBoards.length === 1 ? "board" : "boards"}
            </span>
          </div>

          {visibleBoards.map((board, position) => (
            <Fragment key={board.id}>
              <IndexRow
                board={board}
                ordinal={position + 1}
                selected={board.id === selectedBoard.id}
                benchOpen={
                  wideLayout
                    ? null
                    : inlineBenchOpen && board.id === selectedBoard.id
                }
                matchedBy={matchReasons.get(board.id) ?? null}
                favorite={favorites.has(board.id)}
                compared={compared.includes(board.id)}
                compareFull={compared.length >= maxComparedBoards}
                onSelect={selectBoard}
                onNavigate={navigateBoard}
                onPrefetch={prefetchBoard}
                onToggleFavorite={toggleFavorite}
                onToggleCompare={toggleCompared}
              />
              {!wideLayout && inlineBenchOpen && board.id === selectedBoard.id ? (
                <div
                  id="inline-bench"
                  role="region"
                  aria-label={`${board.name} details`}
                  tabIndex={-1}
                  className="scroll-mt-24 bg-recess p-2 outline-none"
                >
                  <BoardBench
                    expectedBoard={board}
                    benchState={benchState}
                    onRetry={retryBench}
                    onBackToIndex={() => {
                      setInlineBenchOpen(false);
                      window.requestAnimationFrame(() => {
                        document
                          .getElementById(`board-row-${board.id}`)
                          ?.scrollIntoView({
                            behavior: scrollBehavior(),
                            block: "center",
                          });
                        document
                          .getElementById(`board-row-action-${board.id}`)
                          ?.focus({ preventScroll: true });
                      });
                    }}
                  />
                </div>
              ) : null}
            </Fragment>
          ))}

          {visibleBoards.length < filteredBoards.length ? (
            <button
              type="button"
              onClick={showMore}
              disabled={paging}
              aria-controls="board-index"
              className="ctl w-full !border-x-0 !border-b-0"
            >
              {paging ? (
                <>
                  <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
                  Loading boards…
                </>
              ) : (
                `Show ${Math.min(resultPageSize, filteredBoards.length - visibleBoards.length)} more`
              )}
            </button>
          ) : null}

          {filteredBoards.length === 0 ? (
            <EmptyIndex
              favoritesEmpty={favoritesEmpty}
              query={query}
              relaxableTokens={relaxableTokens}
              onDropToken={dropToken}
              onBrowseAll={() => {
                setCatalogState(defaultCatalogState);
                resetResultView();
              }}
              onShowAllBoards={() => updateFilters({ favoritesOnly: false })}
            />
          ) : null}
        </section>

        {/* Bench */}
        {filteredBoards.length > 0 && wideLayout ? (
          <div className="min-w-0 bench:sticky bench:top-[3.25rem] bench:max-h-[calc(100vh-8rem)] bench:overflow-y-auto bench:pr-0.5">
            <BoardBench
              expectedBoard={selectedBoard}
              benchState={benchState}
              onRetry={retryBench}
              onBackToIndex={() =>
                indexRef.current?.scrollIntoView({
                  behavior: scrollBehavior(),
                  block: "start",
                })
              }
            />
          </div>
        ) : null}
      </div>

      {/* ---- Comparison tray ---------------------------------------------- */}
      {compared.length ? (
        <div className="sticky bottom-0 z-20 border-t border-rule bg-raised" data-print="hide">
          <div className="mx-auto flex max-w-[1720px] flex-wrap items-center gap-2 px-4 py-1.5 sm:px-6">
            <span className="silk">
              Comparison · {compared.length}/{maxComparedBoards}
            </span>
            <ul className="flex min-w-0 flex-1 flex-wrap gap-1">
              {compared.map((id) => {
                const board = catalog.find((entry) => entry.id === id);
                if (!board) return null;
                return (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => toggleCompared(id)}
                      className="chip transition-colors hover:text-ink"
                      aria-label={`Remove ${board.name} from the comparison`}
                    >
                      {board.name}
                      <X className="size-2.5" aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
            <button type="button" onClick={clearCompared} className="ctl !min-h-8">
              Clear
            </button>
            <Link
              href={compareUrl(compared)}
              className="ctl !min-h-8 !bg-raised !text-ink"
              aria-disabled={compared.length < 2}
              onClick={(event) => {
                if (compared.length < 2) event.preventDefault();
              }}
            >
              <GitCompareArrows className="size-3.5" aria-hidden="true" />
              {compared.length < 2 ? "Pick one more board" : "Compare"}
            </Link>
          </div>
        </div>
      ) : null}

      {/* ---- The readout rail --------------------------------------------- */}
      <div className="sticky bottom-0 z-10">
        {benchBoard ? <ReadoutRail board={benchBoard} /> : null}
      </div>
    </div>
  );
}

type EmptyIndexProps = {
  favoritesEmpty: boolean;
  query: string;
  relaxableTokens: string[];
  onDropToken: (token: string) => void;
  onBrowseAll: () => void;
  onShowAllBoards: () => void;
};

/**
 * Nothing found. Which nothing it is changes what the user should do next, so
 * the three cases get three different offers rather than one generic apology.
 */
function EmptyIndex({
  favoritesEmpty,
  query,
  relaxableTokens,
  onDropToken,
  onBrowseAll,
  onShowAllBoards,
}: EmptyIndexProps) {
  if (favoritesEmpty) {
    return (
      <div className="p-8 text-center">
        <p className="silk">No saved boards</p>
        <p className="mx-auto mt-2 max-w-sm text-[13px] leading-snug text-dim">
          Star a board in the index to keep it here. Saved boards live on this
          device, so your shortlist is waiting next time you open PinHub.
        </p>
        <button type="button" onClick={onShowAllBoards} className="ctl mt-4">
          Show all boards
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 text-center">
      <p className="silk">No boards match</p>
      <p className="mx-auto mt-2 max-w-md text-[13px] leading-snug text-dim">
        {query.trim()
          ? `Nothing in the catalog matches every part of “${query.trim()}” under the current filters.`
          : "The current filters exclude every board in the catalog."}
      </p>

      {relaxableTokens.length ? (
        <div className="mt-4">
          <p className="text-[13px] text-dim">
            Dropping one term would bring results back:
          </p>
          <ul className="mt-2 flex flex-wrap justify-center gap-1.5">
            {relaxableTokens.map((token) => (
              <li key={token}>
                <button
                  type="button"
                  onClick={() => onDropToken(token)}
                  className="ctl !min-h-8"
                >
                  Drop “{token}”
                  <X className="size-3" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <button type="button" onClick={onBrowseAll} className="ctl mt-4">
        Reset every filter
      </button>
    </div>
  );
}
