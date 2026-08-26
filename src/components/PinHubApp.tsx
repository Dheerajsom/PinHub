"use client";

import Image from "next/image";
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
  CircuitBoard,
  BookCheck,
  Cpu,
  Database,
  Factory,
  GitCompareArrows,
  Layers3,
  LoaderCircle,
  Radio,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  X,
  Zap,
} from "lucide-react";
import { clsx } from "clsx";
import type { Board } from "@/lib/boards";
import type { BoardSummary } from "@/lib/board-summary";
import {
  createBoardSearchIndex,
  matchBoardSearchEntry,
  tokenizeQuery,
  type BoardMatchField,
} from "@/lib/board-search";
import { createBoardDetailLoader } from "@/lib/board-detail-loader";
import { toggleFavorite, useFavorites } from "@/lib/favorites";
import { CircuitBackground } from "@/components/CircuitBackground";
import { ActiveFilterChip, BoardResult, FilterPanel, FilterSelect } from "@/components/catalog/CatalogListParts";
import { BoardDetailPanel, type DetailState } from "@/components/BoardDetailPanel";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ProjectShelf } from "@/components/ProjectShelf";
import { useCatalogUrlState } from "@/components/catalog/useCatalogUrlState";
import {
  activeCatalogFilterCount,
  compareCatalogBoards,
  defaultCatalogState,
  matchesCatalogFilters,
  type CatalogFilterKey,
  type CatalogSort,
} from "@/lib/catalog-state";

const allCategory = "All";
const allInterface = "All";
// Render a useful first screen without embedding dozens of offscreen cards in
// the initial HTML. Additional results remain available through the existing
// pagination control and all records remain searchable client-side.
const initialResultLimit = 16;
const resultPageSize = 32;
const desktopMediaQuery = "(min-width: 1024px)";

type PinHubAppProps = {
  catalog: BoardSummary[];
  initialBoard: Board;
  sourceCount: number;
};

// JS-initiated scrolling honors the user's reduced-motion preference (the CSS
// `scroll-behavior` media query does not override an explicit JS behavior).
function scrollBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";
}

function subscribeToDesktopLayout(listener: () => void): () => void {
  const mediaQuery = window.matchMedia(desktopMediaQuery);
  mediaQuery.addEventListener("change", listener);
  return () => mediaQuery.removeEventListener("change", listener);
}

function getDesktopLayoutSnapshot(): boolean {
  return window.matchMedia(desktopMediaQuery).matches;
}

function getServerDesktopLayoutSnapshot(): boolean {
  // The server renders the desktop detail once for useful no-JS HTML. Mobile
  // clients swap to the inline detail surface immediately after hydration.
  return true;
}

export function PinHubApp({
  catalog,
  initialBoard,
  sourceCount,
}: PinHubAppProps) {
  const [catalogState, setCatalogState] = useCatalogUrlState("/");
  const query = catalogState.query;
  const activeCategory = catalogState.category[0] ?? allCategory;
  const activeInterface = catalogState.interface[0] ?? allInterface;
  const activeLogic = catalogState.logic[0] ?? allCategory;
  const activePower = catalogState.power[0] ?? allCategory;
  const activeForm = catalogState.form[0] ?? allCategory;
  const activeVendor = catalogState.vendor[0] ?? allCategory;
  const activeFamily = catalogState.family[0] ?? allCategory;
  const [selectedId, setSelectedId] = useState(initialBoard.id);
  const showFavoritesOnly = catalogState.favoritesOnly;
  const visibleLimit =
    initialResultLimit + (catalogState.page - 1) * resultPageSize;
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [detailRetry, setDetailRetry] = useState(0);
  const [detailState, setDetailState] = useState<DetailState>({
    status: "ready",
    board: initialBoard,
  });
  // On phones the filter sidebar is collapsed into a toggle so the catalog
  // stays first; on lg+ it is always shown as a sticky column.
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  // Paging in 32 more result rows is the one interaction here that can take
  // long enough to look broken, so it runs as a transition: the button says it
  // is working and stops accepting clicks until the rows are committed.
  const [paging, startPaging] = useTransition();
  const storedFavorites = useFavorites();
  const isDesktop = useSyncExternalStore(
    subscribeToDesktopLayout,
    getDesktopLayoutSnapshot,
    getServerDesktopLayoutSnapshot,
  );
  const searchRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLElement>(null);
  const [detailLoader] = useState(() =>
    createBoardDetailLoader([initialBoard]),
  );

  const catalogIds = useMemo(
    () => new Set(catalog.map((board) => board.id)),
    [catalog],
  );
  const favorites = useMemo(
    () =>
      new Set(
        [...storedFavorites].filter((boardId) => catalogIds.has(boardId)),
      ),
    [catalogIds, storedFavorites],
  );
  const boardSearchEntries = useMemo(
    () => createBoardSearchIndex(catalog),
    [catalog],
  );
  const categoryItems = useMemo(
    () => [allCategory, ...new Set(catalog.map((board) => board.category))],
    [catalog],
  );
  const interfaceItems = useMemo(
    () => [allInterface, ...new Set(catalog.flatMap((board) => board.interfaces))],
    [catalog],
  );
  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>([[allCategory, catalog.length]]);
    for (const board of catalog) {
      counts.set(board.category, (counts.get(board.category) ?? 0) + 1);
    }
    return counts;
  }, [catalog]);
  const interfaceCount = interfaceItems.length - 1;
  const logicItems = useMemo(
    () => [allCategory, ...new Set(catalog.map((board) => board.discovery.logicProfile))],
    [catalog],
  );
  const powerItems = useMemo(
    () => [allCategory, ...new Set(catalog.flatMap((board) => board.discovery.powerInputs))],
    [catalog],
  );
  const formItems = useMemo(
    () => [allCategory, ...new Set(catalog.map((board) => board.discovery.formFactorProfile))],
    [catalog],
  );
  const vendorItems = useMemo(
    () => [allCategory, ...new Set(catalog.map((board) => board.vendor))].sort((a, b) => a === allCategory ? -1 : b === allCategory ? 1 : a.localeCompare(b)),
    [catalog],
  );
  const familyItems = useMemo(
    () => [allCategory, ...new Set(catalog.map((board) => board.family))].sort((a, b) => a === allCategory ? -1 : b === allCategory ? 1 : a.localeCompare(b)),
    [catalog],
  );

  const results = useMemo(() => {
    const tokens = tokenizeQuery(query);

    const scored: {
      board: BoardSummary;
      score: number;
      matchedBy: BoardMatchField | null;
    }[] = [];
    for (const entry of boardSearchEntries) {
      const board = entry.board;
      if (!matchesCatalogFilters(board, catalogState, favorites)) continue;
      const match = matchBoardSearchEntry(entry, tokens);
      if (!match) continue;
      scored.push({ board, score: match.score, matchedBy: match.matchedBy });
    }

    scored.sort((a, b) =>
      compareCatalogBoards(a.board, b.board, catalogState.sort, a.score, b.score),
    );
    return scored;
  }, [
    boardSearchEntries,
    catalogState,
    favorites,
    query,
  ]);
  const filteredBoards = useMemo(
    () => results.map((result) => result.board),
    [results],
  );
  const matchReasons = useMemo(
    () =>
      new Map(results.map((result) => [result.board.id, result.matchedBy])),
    [results],
  );

  const selectedBoard =
    filteredBoards.find((board) => board.id === selectedId) ??
    filteredBoards[0] ??
    catalog[0];
  const visibleBoards = filteredBoards.slice(0, visibleLimit);
  // Read by the stable `selectBoard` callback, which must not close over the
  // selection without re-rendering every memoized row.
  const selectedIdRef = useRef(selectedBoard.id);
  useEffect(() => {
    selectedIdRef.current = selectedBoard.id;
  }, [selectedBoard.id]);

  const loadBoardDetail = detailLoader.load;

  const prefetchBoard = useCallback(
    (id: string) => {
      void loadBoardDetail(id).catch(() => {
        // Hover/focus prefetching is opportunistic; selection exposes a retry
        // state if the endpoint is genuinely unavailable.
      });
    },
    [loadBoardDetail],
  );

  // Favorites-only with an empty shortlist is a different situation from a
  // search that found nothing, and it gets its own copy.
  const favoritesEmpty = showFavoritesOnly && favorites.size === 0;

  const showMore = useCallback(() => {
    if (paging) return;
    startPaging(() => {
      setCatalogState((current) => ({ ...current, page: current.page + 1 }));
    });
  }, [paging, setCatalogState]);

  // Count of sidebar filters in effect, surfaced as a badge on the mobile
  // Filters toggle so users know constraints are applied while it is collapsed.
  const activeFilterCount = activeCatalogFilterCount(catalogState);
  const hasActiveFilters = query.trim().length > 0 || activeFilterCount > 0;

  useEffect(() => {
    if (!selectedBoard || (!isDesktop && !mobileDetailOpen)) return;
    let current = true;
    void loadBoardDetail(selectedBoard.id)
      .then((board) => {
        if (current) setDetailState({ status: "ready", board });
      })
      .catch(() => {
        if (current) {
          setDetailState({
            status: "error",
            board: null,
            id: selectedBoard.id,
          });
        }
      });

    return () => {
      current = false;
    };
  }, [
    detailRetry,
    isDesktop,
    loadBoardDetail,
    mobileDetailOpen,
    selectedBoard,
  ]);

  useEffect(() => {
    if (isDesktop || !mobileDetailOpen || !selectedBoard) return;
    const frame = window.requestAnimationFrame(() => {
      const detail = document.getElementById("mobile-board-detail");
      detail?.scrollIntoView({
        behavior: scrollBehavior(),
        block: "start",
      });
      detail?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isDesktop, mobileDetailOpen, selectedBoard]);

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

  // Any change to the result set invalidates what is currently selected, how
  // far the list has been paged, and the open mobile detail, so every filter
  // control funnels through this instead of repeating the three resets.
  function resetResultView() {
    setSelectedId("");
    setMobileDetailOpen(false);
  }

  function resetFilters() {
    setCatalogState(defaultCatalogState);
    resetResultView();
  }

  function changeQuery(nextQuery: string) {
    setCatalogState(
      (current) => ({
        ...current,
        query: nextQuery,
        page: 1,
        sort:
          nextQuery.trim() &&
          (current.sort === "name" || current.sort === "catalog")
            ? "relevance"
          : !nextQuery.trim() && current.sort === "relevance"
              ? "catalog"
              : current.sort,
      }),
      "replace",
    );
    resetResultView();
  }

  function clearArrayFilter(key: CatalogFilterKey, value: string) {
    setCatalogState((current) => ({
      ...current,
      [key]: current[key].filter((item) => item !== value),
      page: 1,
    }));
    resetResultView();
  }

  // Stable identity so the memoized result rows don't re-render when only the
  // query or an unrelated row's state changes — which is why the layout and the
  // current selection are read at click time instead of being closed over. The
  // layout check must use the same query the layout does: a separate
  // `(max-width: 1023px)` query disagrees at fractional widths, where neither
  // matches and the detail would then render in neither column.
  const selectBoard = useCallback((id: string) => {
    const reselected = selectedIdRef.current === id;
    setSelectedId(id);
    if (!getDesktopLayoutSnapshot()) {
      // On phones the row is a disclosure for the inline detail below it, so
      // tapping the open board closes it again — which is what `aria-expanded`
      // on that row promises.
      setMobileDetailOpen((open) => !(open && reselected));
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
            Math.ceil(
              (nextIndex + 1 - initialResultLimit) / resultPageSize,
            ) + 1,
        }));
      }
      setSelectedId(next.id);
      prefetchBoard(next.id);
      requestAnimationFrame(() => {
        document.getElementById(`board-result-action-${next.id}`)?.focus();
      });
    },
    [filteredBoards, prefetchBoard, setCatalogState, visibleLimit],
  );

  const retryBoardDetail = useCallback(() => {
    setDetailState({
      status: "loading",
      board: null,
      id: selectedBoard.id,
    });
    setDetailRetry((value) => value + 1);
  }, [selectedBoard.id]);

  return (
    <main className="relative isolate min-h-screen">
      <CircuitBackground />
      <header className="relative border-b border-white/10 bg-[#0a0d12] shadow-[0_1px_0_rgba(255,255,255,0.05)_inset,0_12px_30px_-24px_rgba(0,0,0,0.9)] pt-[env(safe-area-inset-top)]">
        <div className="relative mx-auto flex max-w-[1560px] items-center justify-between gap-x-4 gap-y-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative size-12 shrink-0 sm:size-14">
              <Image
                src="/pinhub-logo.png"
                alt=""
                fill
                sizes="(min-width: 640px) 56px, 48px"
                className="object-contain"
                priority
                aria-hidden="true"
              />
            </div>
            <div className="min-w-0">
              <h1 className="brand-title bg-gradient-to-r from-white via-cyan-200 to-amber-200 bg-clip-text text-2xl leading-none text-transparent sm:text-3xl">
                PinHub
              </h1>
              <p className="mt-1 truncate text-xs text-zinc-400 sm:text-sm">
                Source-backed pinouts for dev boards, SBCs, and
                microcontrollers
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3 sm:gap-5">
            <dl className="hidden items-center gap-5 text-sm sm:flex">
              <Metric label="Boards" value={catalog.length.toString()} />
              <Metric label="Interfaces" value={interfaceCount.toString()} />
              <Metric label="Sources" value={sourceCount.toString()} />
            </dl>
            <ThemeToggle />
            <GitHubButton />
          </div>
        </div>
      </header>

      <div className="sticky top-0 z-40 border-b border-white/10 bg-[#0c0e13] shadow-[0_12px_30px_-18px_rgba(0,0,0,0.95)]">
        <div className="mx-auto flex max-w-[1560px] flex-col gap-2.5 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 sm:px-6 lg:px-8">
          <nav
            aria-label="PinHub sections"
            className="flex h-10 w-fit shrink-0 items-center rounded-lg border border-white/10 bg-[#090b10] p-1"
          >
            <span
              aria-current="page"
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-cyan-300/12 px-2.5 text-xs font-semibold text-cyan-100 shadow-[inset_0_0_0_1px_rgba(103,232,249,0.25)]"
            >
              <CircuitBoard className="size-3.5" /> Pin Maps
            </span>
            <Link
              href="/compare"
              className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-zinc-400 transition hover:bg-white/[0.05] hover:text-white"
            >
              <GitCompareArrows className="size-3.5" /> Compare
            </Link>
          </nav>
          <label className="relative block w-full sm:min-w-56 sm:flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500"
              aria-hidden="true"
            />
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
                // Arrow keys walk the selection through the current results
                // without leaving the search field, so a lookup can stay
                // entirely on the keyboard: type, arrow, read the pin map.
                if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                  event.preventDefault();
                  if (filteredBoards.length === 0) return;
                  const index = filteredBoards.findIndex(
                    (board) => board.id === selectedBoard.id,
                  );
                  const step = event.key === "ArrowDown" ? 1 : -1;
                  const nextIndex = Math.min(
                    Math.max(index + step, 0),
                    filteredBoards.length - 1,
                  );
                  const next = filteredBoards[nextIndex];
                  if (next) {
                    setSelectedId(next.id);
                    if (nextIndex >= visibleLimit) {
                      setCatalogState((current) => ({
                        ...current,
                        page:
                          Math.ceil(
                            (nextIndex + 1 - initialResultLimit) /
                              resultPageSize,
                          ) + 1,
                      }));
                    }
                  }
                }
              }}
              placeholder="Search boards, vendors, interfaces, warnings..."
              aria-label="Search boards"
              aria-controls="board-results"
              className="h-11 w-full rounded-md border border-white/10 bg-[#0a0c11] pl-10 pr-16 text-sm text-white shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)] outline-none transition focus:border-cyan-300/70 focus:ring-1 focus:ring-cyan-300/40"
            />
            {query ? (
              <button
                type="button"
                onClick={() => changeQuery("")}
                aria-label="Clear search"
                className="absolute right-0 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded text-zinc-500 transition hover:text-white"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            ) : (
              <kbd
                className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-white/15 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[11px] text-zinc-500 sm:block"
                aria-hidden="true"
              >
                /
              </kbd>
            )}
          </label>

          {/* On mobile the controls scroll horizontally in one compact row
              instead of wrapping into a tall stack on every scroll. The
              negative margin lets the row bleed to the screen edges. */}
          <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 text-sm [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => setMobileFiltersOpen((value) => !value)}
              aria-expanded={mobileFiltersOpen}
              aria-controls="mobile-filters"
              className={clsx(
                "flex min-h-11 shrink-0 items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs transition lg:hidden",
                mobileFiltersOpen || activeFilterCount > 0
                  ? "border-cyan-300/70 bg-cyan-300/10 text-cyan-50"
                  : "border-white/10 text-zinc-300 hover:border-white/25 hover:text-white",
              )}
            >
              <SlidersHorizontal className="size-3.5" aria-hidden="true" />
              Filters
              {activeFilterCount > 0 ? (
                <span className="grid size-4 place-items-center rounded-full bg-cyan-300/20 font-mono text-[10px] text-cyan-100">
                  {activeFilterCount}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              onClick={() => {
                setCatalogState((current) => ({
                  ...current,
                  favoritesOnly: !current.favoritesOnly,
                  page: 1,
                }));
                resetResultView();
              }}
              aria-pressed={showFavoritesOnly}
              className={clsx(
                "fav-button inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-md border border-transparent px-3 py-1.5 text-xs font-semibold leading-none",
                showFavoritesOnly
                  ? "bg-gradient-to-b from-amber-300 to-amber-400 text-zinc-950"
                  : "bg-amber-400/10 text-amber-200 hover:bg-amber-400/20 hover:text-amber-50",
              )}
            >
              <Star
                className={clsx(
                  "fav-star size-3.5",
                  showFavoritesOnly
                    ? "fill-zinc-950 text-zinc-950"
                    : "fill-amber-300 text-amber-300",
                )}
                aria-hidden="true"
              />
              Favorites
              {favorites.size > 0 ? (
                <span
                  className={clsx(
                    "grid h-4 min-w-4 place-items-center rounded-full px-1 font-mono text-[10px] font-semibold leading-none tabular-nums",
                    showFavoritesOnly
                      ? "bg-zinc-950/15 text-zinc-900"
                      : "bg-amber-400/20 text-amber-100",
                  )}
                >
                  {favorites.size}
                </span>
              ) : null}
            </button>
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
              className="h-11 shrink-0 rounded-md border border-white/10 bg-[#15181f] px-2.5 text-xs text-zinc-200 outline-none transition focus:border-cyan-300/60"
            >
              {query ? <option value="relevance">Best match</option> : null}
              <option value="catalog">Catalog order</option>
              <option value="name">Name A–Z</option>
              <option value="vendor">Vendor A–Z</option>
              <option value="recentlyAdded">Recently added</option>
              <option value="interfaceCount">Most interfaces</option>
            </select>
            <span
              className="shrink-0 font-mono text-xs text-zinc-400"
              role="status"
              aria-live="polite"
            >
              Showing {visibleBoards.length} of {filteredBoards.length}{" "}
              {hasActiveFilters ? "matches" : "boards"}
              {hasActiveFilters ? ` · ${catalog.length} total` : ""}
              {paging ? " · loading more" : ""}
            </span>
            {catalogState.category.map((value) => (
              <ActiveFilterChip key={`category-${value}`} label={value} onClear={() => clearArrayFilter("category", value)} />
            ))}
            {catalogState.interface.map((value) => (
              <ActiveFilterChip key={`interface-${value}`} label={value} onClear={() => clearArrayFilter("interface", value)} />
            ))}
            {catalogState.vendor.map((value) => (
              <ActiveFilterChip key={`vendor-${value}`} label={`Maker: ${value}`} onClear={() => clearArrayFilter("vendor", value)} />
            ))}
            {catalogState.family.map((value) => (
              <ActiveFilterChip key={`family-${value}`} label={`Family: ${value}`} onClear={() => clearArrayFilter("family", value)} />
            ))}
            {catalogState.logic.map((value) => (
              <ActiveFilterChip key={`logic-${value}`} label={value} onClear={() => clearArrayFilter("logic", value)} />
            ))}
            {catalogState.power.map((value) => (
              <ActiveFilterChip key={`power-${value}`} label={value} onClear={() => clearArrayFilter("power", value)} />
            ))}
            {catalogState.form.map((value) => (
              <ActiveFilterChip key={`form-${value}`} label={value} onClear={() => clearArrayFilter("form", value)} />
            ))}
            {catalogState.wirelessCapability !== "any" ? (
              <ActiveFilterChip label={catalogState.wirelessCapability === "has" ? "Has wireless" : "No wireless"} onClear={() => setCatalogState((current) => ({ ...current, wirelessCapability: "any", page: 1 }))} />
            ) : null}
            {catalogState.officialDocumentation !== "any" ? (
              <ActiveFilterChip label={catalogState.officialDocumentation === "has" ? "Official docs" : "No official docs"} onClear={() => setCatalogState((current) => ({ ...current, officialDocumentation: "any", page: 1 }))} />
            ) : null}
            {catalogState.pinoutOnly ? (
              <ActiveFilterChip label="In-app pin map" onClear={() => setCatalogState((current) => ({ ...current, pinoutOnly: false, page: 1 }))} />
            ) : null}
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={resetFilters}
                className="shrink-0 rounded-md px-2 py-1 text-xs text-zinc-400 underline-offset-4 transition hover:text-white hover:underline"
              >
                Reset
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <ProjectShelf catalog={catalog} />

      <div className="mx-auto grid max-w-[1560px] grid-cols-1 gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[15rem_minmax(0,1fr)_clamp(21rem,30vw,32rem)] lg:px-8">
        <aside
          id="mobile-filters"
          className={clsx(
            "space-y-4 lg:sticky lg:top-[4.25rem] lg:max-h-[calc(100vh-5.25rem)] lg:self-start lg:overflow-y-auto lg:pb-2",
            // Collapsed on phones until the Filters toggle is tapped; the
            // sidebar is always visible from lg up.
            mobileFiltersOpen ? "block" : "hidden lg:block",
          )}
        >
          <FilterPanel
            title="Category"
            icon={<Layers3 className="size-4 text-cyan-200" aria-hidden="true" />}
            items={categoryItems}
            active={activeCategory}
            counts={categoryCounts}
            onChange={(value) => {
              setCatalogState((current) => ({
                ...current,
                category: value === allCategory ? [] : [value],
                page: 1,
              }));
              resetResultView();
              setMobileFiltersOpen(false);
            }}
          />
          <FilterSelect
            title="Manufacturer"
            icon={<Factory className="size-4 text-cyan-200" aria-hidden="true" />}
            items={vendorItems}
            active={activeVendor}
            onChange={(value) => {
              setCatalogState((current) => ({ ...current, vendor: value === allCategory ? [] : [value], page: 1 }));
              resetResultView();
              setMobileFiltersOpen(false);
            }}
          />
          <FilterSelect
            title="Processor family"
            icon={<Cpu className="size-4 text-cyan-200" aria-hidden="true" />}
            items={familyItems}
            active={activeFamily}
            onChange={(value) => {
              setCatalogState((current) => ({ ...current, family: value === allCategory ? [] : [value], page: 1 }));
              resetResultView();
              setMobileFiltersOpen(false);
            }}
          />
          <FilterPanel
            title="Interface"
            icon={
              <SlidersHorizontal
                className="size-4 text-cyan-200"
                aria-hidden="true"
              />
            }
            items={interfaceItems}
            active={activeInterface}
            onChange={(value) => {
              setCatalogState((current) => ({
                ...current,
                interface: value === allInterface ? [] : [value],
                page: 1,
              }));
              resetResultView();
              setMobileFiltersOpen(false);
            }}
          />
          <FilterPanel
            title="Logic level"
            icon={<Zap className="size-4 text-cyan-200" aria-hidden="true" />}
            items={logicItems}
            active={activeLogic}
            onChange={(value) => {
              setCatalogState((current) => ({
                ...current,
                logic: value === allCategory ? [] : [value],
                page: 1,
              }));
              resetResultView();
              setMobileFiltersOpen(false);
            }}
          />
          <FilterPanel
            title="Power input"
            icon={<Zap className="size-4 text-cyan-200" aria-hidden="true" />}
            items={powerItems}
            active={activePower}
            onChange={(value) => {
              setCatalogState((current) => ({
                ...current,
                power: value === allCategory ? [] : [value],
                page: 1,
              }));
              resetResultView();
              setMobileFiltersOpen(false);
            }}
          />
          <FilterPanel
            title="Form factor"
            icon={<CircuitBoard className="size-4 text-cyan-200" aria-hidden="true" />}
            items={formItems}
            active={activeForm}
            onChange={(value) => {
              setCatalogState((current) => ({
                ...current,
                form: value === allCategory ? [] : [value],
                page: 1,
              }));
              resetResultView();
              setMobileFiltersOpen(false);
            }}
          />
          <FilterPanel
            title="Wireless capability"
            icon={<Radio className="size-4 text-cyan-200" aria-hidden="true" />}
            items={["All", "Has wireless", "No wireless"]}
            active={catalogState.wirelessCapability === "has" ? "Has wireless" : catalogState.wirelessCapability === "none" ? "No wireless" : "All"}
            onChange={(value) => {
              setCatalogState((current) => ({ ...current, wirelessCapability: value === "Has wireless" ? "has" : value === "No wireless" ? "none" : "any", page: 1 }));
              resetResultView();
              setMobileFiltersOpen(false);
            }}
          />
          <FilterPanel
            title="Documentation"
            icon={<BookCheck className="size-4 text-cyan-200" aria-hidden="true" />}
            items={["All", "Official documentation", "No official source"]}
            active={catalogState.officialDocumentation === "has" ? "Official documentation" : catalogState.officialDocumentation === "none" ? "No official source" : "All"}
            onChange={(value) => {
              setCatalogState((current) => ({ ...current, officialDocumentation: value === "Official documentation" ? "has" : value === "No official source" ? "none" : "any", page: 1 }));
              resetResultView();
              setMobileFiltersOpen(false);
            }}
          />
          <label className="surface-panel flex cursor-pointer items-center justify-between gap-3 rounded-lg p-3 text-sm text-zinc-300">
            Has in-app pin map
            <input
              type="checkbox"
              checked={catalogState.pinoutOnly}
              onChange={(event) => {
                setCatalogState((current) => ({ ...current, pinoutOnly: event.target.checked, page: 1 }));
                resetResultView();
              }}
              className="size-4 accent-cyan-300"
            />
          </label>
          <section className="surface-panel hidden rounded-lg p-4 lg:block">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Sparkles className="size-4 text-amber-200" aria-hidden="true" />
              Curation notes
            </div>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              In-app maps are included where connector layouts are stable and
              source-backed. Entries without maps still link to the official
              pinout, manual, datasheet, or schematic.
            </p>
          </section>
        </aside>

        <section
          ref={resultsRef}
          id="board-results"
          className="min-w-0 scroll-mt-32"
          aria-label="Board results"
        >
          <div className="grid gap-2.5">
            {visibleBoards.map((board) => (
              <Fragment key={board.id}>
                <BoardResult
                  board={board}
                  selected={board.id === selectedBoard.id}
                  detailOpen={
                    isDesktop
                      ? null
                      : mobileDetailOpen && board.id === selectedBoard.id
                  }
                  matchedBy={matchReasons.get(board.id) ?? null}
                  favorite={favorites.has(board.id)}
                  onSelect={selectBoard}
                  onNavigate={navigateBoard}
                  onPrefetch={prefetchBoard}
                  onToggleFavorite={toggleFavorite}
                />
                {!isDesktop &&
                  mobileDetailOpen &&
                  board.id === selectedBoard.id ? (
                  <div
                    id="mobile-board-detail"
                    role="region"
                    aria-label={`${board.name} details`}
                    tabIndex={-1}
                    className="min-w-0 scroll-mt-32 outline-none lg:hidden"
                  >
                    <BoardDetailPanel
                      expectedBoard={board}
                      detailState={detailState}
                      onRetry={retryBoardDetail}
                      onBackToResults={() => {
                        setMobileDetailOpen(false);
                        window.requestAnimationFrame(() => {
                          const row = document.getElementById(
                            `board-result-${board.id}`,
                          );
                          row?.scrollIntoView({
                            behavior: scrollBehavior(),
                            block: "center",
                          });
                          document
                            .getElementById(`board-result-action-${board.id}`)
                            ?.focus({ preventScroll: true });
                        });
                      }}
                    />
                  </div>
                ) : null}
              </Fragment>
            ))}
          </div>

          {visibleBoards.length < filteredBoards.length ? (
            <button
              type="button"
              onClick={showMore}
              disabled={paging}
              aria-disabled={paging}
              aria-controls="board-results"
              className="mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-[#14161d] px-4 text-sm font-medium text-zinc-300 transition hover:border-cyan-300/40 hover:bg-[#191c24] hover:text-white disabled:cursor-progress disabled:border-white/10 disabled:bg-[#14161d] disabled:text-zinc-500"
            >
              {paging ? (
                <>
                  <LoaderCircle
                    className="size-4 motion-safe:animate-spin"
                    aria-hidden="true"
                  />
                  Loading boards…
                </>
              ) : (
                <>
                  Show{" "}
                  {Math.min(
                    resultPageSize,
                    filteredBoards.length - visibleBoards.length,
                  )}{" "}
                  more
                </>
              )}
            </button>
          ) : null}

          {filteredBoards.length === 0 ? (
            favoritesEmpty ? (
              <div className="rounded-lg border border-dashed border-amber-300/25 bg-[#15120c] p-8 text-center">
                <Star
                  className="mx-auto size-8 fill-amber-300/20 text-amber-300/80"
                  aria-hidden="true"
                />
                <h2 className="mt-4 text-lg font-semibold text-white">
                  No saved boards yet
                </h2>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-400">
                  Star a board from the catalog to pin it here. Favorites are
                  kept on this device, so your shortlist is waiting the next
                  time you open PinHub.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setCatalogState((current) => ({
                      ...current,
                      favoritesOnly: false,
                      page: 1,
                    }));
                    resetResultView();
                  }}
                  className="mt-4 min-h-10 rounded-md border border-amber-300/40 bg-amber-300/10 px-4 py-2 text-sm font-medium text-amber-50 transition hover:bg-amber-300/20"
                >
                  Browse the catalog
                </button>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-white/15 bg-[#101319] p-8 text-center">
                <Database
                  className="mx-auto size-8 text-zinc-500"
                  aria-hidden="true"
                />
                <h2 className="mt-4 text-lg font-semibold text-white">
                  No boards match that filter
                </h2>
                <p className="mt-2 text-sm text-zinc-400">
                  Try a broader search term or clear one of the filters.
                </p>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-4 min-h-10 rounded-md border border-cyan-300/50 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-50 transition hover:bg-cyan-300/20"
                >
                  Reset filters
                </button>
              </div>
            )
          ) : null}
        </section>

        {filteredBoards.length > 0 && isDesktop ? (
          <div className="min-w-0 scroll-mt-32">
            <BoardDetailPanel
              expectedBoard={selectedBoard}
              detailState={detailState}
              onRetry={retryBoardDetail}
              onBackToResults={() =>
                resultsRef.current?.scrollIntoView({
                  behavior: scrollBehavior(),
                  block: "start",
                })
              }
            />
          </div>
        ) : null}
      </div>
    </main>
  );
}

const repoUrl = "https://github.com/Dheerajsom/PinHub";

// Official GitHub "Octocat" mark, inlined as an SVG path so it renders crisply
// at any size and inherits the current text color on hover.
function GitHubButton() {
  return (
    <a
      href={repoUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="View PinHub source on GitHub (opens in a new tab)"
      title="View source on GitHub"
      className="group relative inline-flex h-10 items-center gap-2 overflow-hidden rounded-lg border border-white/15 bg-[#15181f] px-2.5 text-sm font-medium text-zinc-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_1px_2px_rgba(0,0,0,0.4)] transition hover:border-cyan-300/60 hover:bg-[#1c2029] hover:text-white active:scale-[0.97] sm:px-3"
    >
      <svg
        viewBox="0 0 24 24"
        className="size-5 shrink-0 transition-transform duration-300 group-hover:scale-105"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
      </svg>
      <span className="relative hidden sm:inline">GitHub</span>
    </a>
  );
}

type MetricProps = {
  label: string;
  value: string;
};

function Metric({ label, value }: MetricProps) {
  return (
    // flex-col-reverse keeps the value visually on top while preserving the
    // semantically correct <dt> before <dd> order in the DOM.
    <div className="flex flex-col-reverse text-right">
      <dt className="mt-1 text-[11px] uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </dt>
      <dd className="font-mono text-lg font-semibold leading-none text-white">
        {value}
      </dd>
    </div>
  );
}
