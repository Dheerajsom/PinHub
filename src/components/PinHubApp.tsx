"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import {
  ArrowRight,
  BookCheck,
  CircuitBoard,
  Cpu,
  Database,
  Factory,
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
import { createBoardSearchIndex } from "@/lib/board-search";
import { createBoardDetailLoader } from "@/lib/board-detail-loader";
import { useFavorites } from "@/lib/favorites";
import { CircuitBackground } from "@/components/CircuitBackground";
import { VendorLogo } from "@/components/VendorLogo";
import { ActiveFilterChip, BoardResult, FilterPanel, FilterSelect } from "@/components/catalog/CatalogListParts";
import { BoardDetailPanel, type DetailState } from "@/components/BoardDetailPanel";
import { SectionNav } from "@/components/SectionNav";
import { LibraryRail } from "@/components/ProjectShelf";
import { useCatalogUrlState } from "@/components/catalog/useCatalogUrlState";
import { useCatalogResults } from "@/components/catalog/useCatalogResults";
import { FavoriteLimitToast, useFavoriteToggle } from "@/components/catalog/useFavoriteToggle";
import { useSlashToFocus } from "@/components/catalog/useSlashToFocus";
import { CatalogHeader } from "@/components/catalog/CatalogHeader";
import {
  isDesktopCatalogLayout,
  useDesktopCatalogLayout,
} from "@/components/catalog/useDesktopCatalogLayout";
import {
  activeCatalogFilterCount,
  boundCatalogQuery,
  defaultCatalogState,
  maxCatalogQueryLength,
  type CatalogFilterKey,
  type CatalogSort,
  type CatalogState,
} from "@/lib/catalog-state";

const all = "All";
// Render a useful first screen without embedding dozens of offscreen cards in
// the initial HTML. Additional results remain available through the existing
// pagination control and all records remain searchable client-side.
const initialResultLimit = 16;
const resultPageSize = 32;

/** The result page (1-based, as stored in the URL) that shows `index`. */
function pageForIndex(index: number): number {
  return index < initialResultLimit
    ? 1
    : Math.ceil((index + 1 - initialResultLimit) / resultPageSize) + 1;
}

// First-run invitation: one-tap lookups that show off the search index
// (buses, silicon, safety text) plus four widely used reference boards.
// Rendered only when the catalog is unfiltered so the workspace stays dense
// once a task is underway.
const quickQueries = ["ESP32", "I2C", "strap pins", "5V tolerant", "RP2040"];
const commonBoardIds = [
  "raspberry-pi-5",
  "esp32-devkit-v1",
  "arduino-uno-rev3",
  "raspberry-pi-pico",
];

// How each list facet reads as a removable chip. Facets without a prefix are
// values that already say what they are ("SBC", "3.3 V", "Breadboard").
const chipPrefixes: Record<CatalogFilterKey, string> = {
  category: "",
  interface: "",
  vendor: "Maker: ",
  family: "Family: ",
  platform: "Platform: ",
  logic: "",
  power: "",
  form: "",
  wireless: "Wireless: ",
  connector: "Connector: ",
};
const chipOrder: CatalogFilterKey[] = [
  "category",
  "interface",
  "vendor",
  "family",
  "platform",
  "logic",
  "power",
  "form",
  "wireless",
  "connector",
];

type TriState = CatalogState["wirelessCapability"];
const wirelessOptions: Record<TriState, string> = {
  any: all,
  has: "Has wireless",
  none: "No wireless",
};
const documentationOptions: Record<TriState, string> = {
  any: all,
  has: "Official documentation",
  none: "No official source",
};

function optionKey(options: Record<TriState, string>, label: string): TriState {
  return (Object.keys(options) as TriState[]).find((key) => options[key] === label) ?? "any";
}

function uniqueValues(values: Iterable<string>, sorted = false): string[] {
  const unique = [...new Set(values)];
  return [all, ...(sorted ? unique.sort((a, b) => a.localeCompare(b)) : unique)];
}

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

export function PinHubApp({
  catalog,
  initialBoard,
  sourceCount,
}: PinHubAppProps) {
  const [catalogState, setCatalogState] = useCatalogUrlState("/");
  const query = catalogState.query;
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
  // Below the full three-column workspace the filter sidebar is collapsed
  // into a toggle so the catalog stays wide enough to scan comfortably.
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  // Paging in 32 more result rows is the one interaction here that can take
  // long enough to look broken, so it runs as a transition: the button says it
  // is working and stops accepting clicks until the rows are committed.
  const [paging, startPaging] = useTransition();
  const storedFavorites = useFavorites();
  const { onToggleFavorite, favoriteMessage } = useFavoriteToggle();
  const isDesktop = useDesktopCatalogLayout();
  const searchRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLElement>(null);
  const [detailLoader] = useState(() =>
    createBoardDetailLoader([initialBoard]),
  );
  useSlashToFocus(searchRef);

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
  const facetItems = useMemo(
    () => ({
      category: uniqueValues(catalog.map((board) => board.category)),
      interface: uniqueValues(catalog.flatMap((board) => board.interfaces)),
      logic: uniqueValues(catalog.map((board) => board.discovery.logicProfile)),
      power: uniqueValues(catalog.flatMap((board) => board.discovery.powerInputs)),
      form: uniqueValues(catalog.map((board) => board.discovery.formFactorProfile)),
      vendor: uniqueValues(catalog.map((board) => board.vendor), true),
      family: uniqueValues(catalog.map((board) => board.family), true),
    }),
    [catalog],
  );
  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>([[all, catalog.length]]);
    for (const board of catalog) {
      counts.set(board.category, (counts.get(board.category) ?? 0) + 1);
    }
    return counts;
  }, [catalog]);
  const commonBoards = useMemo(
    () =>
      commonBoardIds.flatMap((id) => {
        const board = catalog.find((item) => item.id === id);
        return board ? [board] : [];
      }),
    [catalog],
  );

  const results = useCatalogResults(boardSearchEntries, catalogState, favorites);
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

  // Any change to the result set invalidates the current selection and the
  // open mobile detail, so every filter control funnels through this instead
  // of repeating the resets.
  function resetResultView() {
    setSelectedId("");
    setMobileDetailOpen(false);
  }

  function updateFilters(
    update: (current: CatalogState) => Partial<CatalogState>,
    { closeFilters = false } = {},
  ) {
    setCatalogState((current) => ({ ...current, ...update(current), page: 1 }));
    resetResultView();
    if (closeFilters) setMobileFiltersOpen(false);
  }

  function selectFacet(key: CatalogFilterKey, value: string) {
    updateFilters(() => ({ [key]: value === all ? [] : [value] }), {
      closeFilters: true,
    });
  }

  function resetFilters() {
    setCatalogState(defaultCatalogState);
    resetResultView();
  }

  function changeQuery(nextQuery: string) {
    const boundedQuery = boundCatalogQuery(nextQuery);
    setCatalogState(
      (current) => ({
        ...current,
        query: boundedQuery,
        page: 1,
        sort:
          boundedQuery.trim() &&
          (current.sort === "name" || current.sort === "catalog")
            ? "relevance"
          : !boundedQuery.trim() && current.sort === "relevance"
              ? "catalog"
              : current.sort,
      }),
      "replace",
    );
    resetResultView();
  }

  // Stable identity so the memoized result rows don't re-render when only the
  // query or an unrelated row's state changes — which is why the layout and the
  // current selection are read at click time instead of being closed over. The
  // layout check must use the same query the layout does: a separate
  // `(max-width: 1279px)` query disagrees at fractional widths, where neither
  // matches and the detail would then render in neither column.
  const selectBoard = useCallback((id: string) => {
    const reselected = selectedIdRef.current === id;
    setSelectedId(id);
    if (!isDesktopCatalogLayout()) {
      // In the compact layout the row discloses its inline detail below it, so
      // tapping the open board closes it again — which is what `aria-expanded`
      // on that row promises.
      setMobileDetailOpen((open) => !(open && reselected));
    }
  }, []);

  // Opens a board without the row's toggle semantics: Enter in the search
  // field and the common-board shortcuts always show the detail, even when
  // that board's detail is already open.
  const openBoard = useCallback((id: string) => {
    setSelectedId(id);
    if (!isDesktopCatalogLayout()) setMobileDetailOpen(true);
  }, []);

  /**
   * Moves the selection through the current results, paging in more rows when
   * the target is not rendered yet. Returns the newly selected board.
   */
  const stepSelection = useCallback(
    (
      fromId: string,
      direction: "next" | "previous" | "first" | "last",
    ): BoardSummary | null => {
      if (!filteredBoards.length) return null;
      const currentIndex = filteredBoards.findIndex((board) => board.id === fromId);
      const lastIndex = filteredBoards.length - 1;
      const nextIndex =
        direction === "first"
          ? 0
          : direction === "last"
            ? lastIndex
            : Math.min(
                Math.max(currentIndex + (direction === "next" ? 1 : -1), 0),
                lastIndex,
              );
      const next = filteredBoards[nextIndex];
      if (!next || next.id === fromId) return null;
      if (nextIndex >= visibleLimit) {
        setCatalogState((current) => ({ ...current, page: pageForIndex(nextIndex) }));
      }
      setSelectedId(next.id);
      prefetchBoard(next.id);
      return next;
    },
    [filteredBoards, prefetchBoard, setCatalogState, visibleLimit],
  );

  const navigateBoard = useCallback(
    (id: string, direction: "next" | "previous" | "first" | "last") => {
      if (filteredBoards.every((board) => board.id !== id)) return;
      const next = stepSelection(id, direction);
      if (!next) return;
      requestAnimationFrame(() => {
        document.getElementById(`board-result-action-${next.id}`)?.focus();
      });
    },
    [filteredBoards, stepSelection],
  );

  const retryBoardDetail = useCallback(() => {
    setDetailState({
      status: "loading",
      board: null,
      id: selectedBoard.id,
    });
    setDetailRetry((value) => value + 1);
  }, [selectedBoard.id]);

  const facetIcon = (Icon: typeof Layers3) => (
    <Icon className="size-4 text-cyan-200" aria-hidden="true" />
  );
  const listFacets: {
    key: CatalogFilterKey;
    title: string;
    icon: ReactNode;
    control: "panel" | "select";
    items: string[];
    counts?: Map<string, number>;
  }[] = [
    { key: "category", title: "Category", icon: facetIcon(Layers3), control: "panel", items: facetItems.category, counts: categoryCounts },
    { key: "vendor", title: "Manufacturer", icon: facetIcon(Factory), control: "select", items: facetItems.vendor },
    { key: "family", title: "Processor family", icon: facetIcon(Cpu), control: "select", items: facetItems.family },
    { key: "interface", title: "Interface", icon: facetIcon(SlidersHorizontal), control: "panel", items: facetItems.interface },
    { key: "logic", title: "Logic level", icon: facetIcon(Zap), control: "panel", items: facetItems.logic },
    { key: "power", title: "Power input", icon: facetIcon(Zap), control: "panel", items: facetItems.power },
    { key: "form", title: "Form factor", icon: facetIcon(CircuitBoard), control: "panel", items: facetItems.form },
  ];

  return (
    <main className="relative isolate min-h-screen">
      <CircuitBackground />
      <CatalogHeader
        boardCount={catalog.length}
        interfaceCount={facetItems.interface.length - 1}
        sourceCount={sourceCount}
      />

      <div className="ph-commandbar sticky top-0 z-40 shadow-[0_12px_30px_-18px_rgba(0,0,0,0.55)]">
        <div className="mx-auto flex max-w-[1560px] flex-wrap items-center gap-2 px-4 py-2.5 sm:px-6 lg:px-8">
          <SectionNav current="/" />
          <label className="ph-search-shell relative block w-full min-w-44 flex-1 rounded-xl shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)] max-sm:order-first sm:w-auto">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-500"
              aria-hidden="true"
            />
            <input
              ref={searchRef}
              value={query}
              maxLength={maxCatalogQueryLength}
              onChange={(event) => changeQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  changeQuery("");
                  event.currentTarget.blur();
                } else if (event.key === "Enter" && filteredBoards.length) {
                  openBoard(selectedBoard.id);
                } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                  // Arrow keys walk the selection through the current results
                  // without leaving the search field, so a lookup can stay
                  // entirely on the keyboard: type, arrow, read the pin map.
                  event.preventDefault();
                  stepSelection(
                    selectedBoard.id,
                    event.key === "ArrowDown" ? "next" : "previous",
                  );
                }
              }}
              placeholder="Search boards, vendors, interfaces, warnings…"
              aria-label="Search boards"
              aria-controls="board-results"
              className="ph-search-input h-10 w-full rounded-xl border-0 bg-transparent pl-10 pr-12 text-sm outline-none"
            />
            {query ? (
              <button
                type="button"
                onClick={() => changeQuery("")}
                aria-label="Clear search"
                className="absolute right-1 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-lg text-zinc-500 transition hover:bg-white/[0.06] hover:text-white"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            ) : (
              <kbd
                className="ph-kbd pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 sm:block"
                aria-hidden="true"
              >
                /
              </kbd>
            )}
          </label>
          <button
            type="button"
            onClick={() => setMobileFiltersOpen((value) => !value)}
            aria-expanded={mobileFiltersOpen}
            aria-controls="mobile-filters"
            className={clsx(
              "flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition xl:hidden",
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
            onClick={() =>
              updateFilters((current) => ({ favoritesOnly: !current.favoritesOnly }))
            }
            aria-pressed={showFavoritesOnly}
            className={clsx(
              "fav-button inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-transparent px-3 py-1.5 text-xs font-semibold leading-none",
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
            className="h-10 shrink-0 cursor-pointer rounded-lg border border-white/10 bg-[#15181f] px-2.5 text-xs text-zinc-200 outline-none transition hover:border-white/20 focus:border-cyan-300/60"
          >
            {query ? <option value="relevance">Best match</option> : null}
            <option value="catalog">Catalog order</option>
            <option value="name">Name A–Z</option>
            <option value="vendor">Vendor A–Z</option>
            <option value="recentlyAdded">Recently added</option>
            <option value="interfaceCount">Most interfaces</option>
          </select>
        </div>
        {hasActiveFilters ? (
          <div className="border-t border-white/5">
            <div className="mx-auto flex max-w-[1560px] flex-wrap items-center gap-1.5 px-4 py-2 sm:px-6 lg:px-8">
              {chipOrder.flatMap((key) =>
                catalogState[key].map((value) => (
                  <ActiveFilterChip
                    key={`${key}-${value}`}
                    label={`${chipPrefixes[key]}${value}`}
                    onClear={() =>
                      updateFilters((current) => ({
                        [key]: current[key].filter((item) => item !== value),
                      }))
                    }
                  />
                )),
              )}
              {catalogState.wirelessCapability !== "any" ? (
                <ActiveFilterChip
                  label={wirelessOptions[catalogState.wirelessCapability]}
                  onClear={() => updateFilters(() => ({ wirelessCapability: "any" }))}
                />
              ) : null}
              {catalogState.officialDocumentation !== "any" ? (
                <ActiveFilterChip
                  label={catalogState.officialDocumentation === "has" ? "Official docs" : "No official docs"}
                  onClear={() => updateFilters(() => ({ officialDocumentation: "any" }))}
                />
              ) : null}
              {catalogState.pinoutOnly ? (
                <ActiveFilterChip
                  label="In-app pin map"
                  onClear={() => updateFilters(() => ({ pinoutOnly: false }))}
                />
              ) : null}
              {catalogState.favoritesOnly ? (
                <ActiveFilterChip
                  label="Favorites"
                  onClear={() => updateFilters(() => ({ favoritesOnly: false }))}
                />
              ) : null}
              <button
                type="button"
                onClick={resetFilters}
                className="shrink-0 rounded-md px-2 py-1 text-xs text-zinc-400 underline-offset-4 transition hover:text-white hover:underline"
              >
                Reset
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div id="catalog-workspace" className="mx-auto grid max-w-[1560px] grid-cols-1 gap-5 px-4 py-5 sm:px-6 lg:px-8 xl:grid-cols-[15rem_minmax(0,1fr)_clamp(21rem,30vw,32rem)]">
        <aside
          id="mobile-filters"
          className={clsx(
            "space-y-4 xl:sticky xl:top-[5.25rem] xl:max-h-[calc(100vh-6.25rem)] xl:self-start xl:overflow-y-auto xl:pb-2",
            // Collapsed until the full desktop workspace fits; the sidebar is
            // always visible from xl up.
            mobileFiltersOpen ? "block" : "hidden xl:block",
          )}
        >
          {listFacets.map(({ key, title, icon, control, items, counts }) =>
            control === "select" ? (
              <FilterSelect
                key={key}
                title={title}
                icon={icon}
                items={items}
                active={catalogState[key][0] ?? all}
                onChange={(value) => selectFacet(key, value)}
              />
            ) : (
              <FilterPanel
                key={key}
                title={title}
                icon={icon}
                items={items}
                active={catalogState[key][0] ?? all}
                counts={counts}
                onChange={(value) => selectFacet(key, value)}
              />
            ),
          )}
          <FilterPanel
            title="Wireless capability"
            icon={facetIcon(Radio)}
            items={Object.values(wirelessOptions)}
            active={wirelessOptions[catalogState.wirelessCapability]}
            onChange={(value) =>
              updateFilters(() => ({ wirelessCapability: optionKey(wirelessOptions, value) }), {
                closeFilters: true,
              })
            }
          />
          <FilterPanel
            title="Documentation"
            icon={facetIcon(BookCheck)}
            items={Object.values(documentationOptions)}
            active={documentationOptions[catalogState.officialDocumentation]}
            onChange={(value) =>
              updateFilters(
                () => ({ officialDocumentation: optionKey(documentationOptions, value) }),
                { closeFilters: true },
              )
            }
          />
          <label className="surface-panel flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl p-3 text-sm text-zinc-300">
            Has in-app pin map
            <input
              type="checkbox"
              checked={catalogState.pinoutOnly}
              onChange={(event) => {
                const pinoutOnly = event.target.checked;
                updateFilters(() => ({ pinoutOnly }));
              }}
              className="size-4 accent-cyan-300"
            />
          </label>
          <section className="surface-panel hidden rounded-xl p-4 xl:block">
            <div className="flex items-center gap-2 text-sm font-semibold tracking-tight text-white">
              <Sparkles className="size-4 text-amber-200" aria-hidden="true" />
              Curation notes
            </div>
            <p className="mt-2.5 text-[13px] leading-6 text-zinc-400">
              In-app maps ship where connector layouts are stable and
              source-backed. Entries without maps still link to the official
              pinout, manual, datasheet, or schematic — nothing is a dead end.
            </p>
            <p className="mt-2.5 border-t border-white/10 pt-2.5 font-mono text-[11px] leading-5 text-zinc-500">
              Tip: star a board, then filter Favorites to keep a bench shortlist.
            </p>
          </section>
          <LibraryRail catalog={catalog} />
        </aside>

        <section
          ref={resultsRef}
          id="board-results"
          className="min-w-0 scroll-mt-32"
          aria-label="Board results"
        >
          <FavoriteLimitToast message={favoriteMessage} />
          <div className="mb-2 flex items-center justify-between gap-3 px-0.5">
            <span
              className="font-mono text-xs tabular-nums text-zinc-400"
              role="status"
              aria-live="polite"
            >
              Showing {visibleBoards.length} of {filteredBoards.length}{" "}
              {hasActiveFilters ? "matches" : "boards"}
              {hasActiveFilters ? ` · ${catalog.length} total` : ""}
              {paging ? " · loading more" : ""}
            </span>
          </div>
          {!hasActiveFilters ? (
            <CommonBoards
              boards={commonBoards}
              onOpen={(id) => {
                prefetchBoard(id);
                openBoard(id);
              }}
              onQuery={(suggestion) => {
                changeQuery(suggestion);
                searchRef.current?.focus();
              }}
            />
          ) : null}
          <div className="grid grid-cols-1 gap-2.5">
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
                  onToggleFavorite={onToggleFavorite}
                />
                {!isDesktop &&
                mobileDetailOpen &&
                board.id === selectedBoard.id ? (
                  <div
                    id="mobile-board-detail"
                    role="region"
                    aria-label={`${board.name} details`}
                    tabIndex={-1}
                    className="min-w-0 scroll-mt-32 outline-none xl:hidden"
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
              className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#14161d] px-4 text-sm font-medium text-zinc-300 transition hover:border-cyan-300/40 hover:bg-[#191c24] hover:text-white disabled:cursor-progress disabled:border-white/10 disabled:bg-[#14161d] disabled:text-zinc-500"
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
              <div className="rounded-xl border border-dashed border-amber-300/25 bg-[#15120c] p-8 text-center">
                <Star
                  className="mx-auto size-8 fill-amber-300/20 text-amber-300/80"
                  aria-hidden="true"
                />
                <h2 className="mt-4 text-lg font-semibold tracking-tight text-white">
                  No saved boards yet
                </h2>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-400">
                  Star a board from the catalog to pin it here. Favorites are
                  kept on this device, so your shortlist is waiting the next
                  time you open PinHub.
                </p>
                <button
                  type="button"
                  onClick={() => updateFilters(() => ({ favoritesOnly: false }))}
                  className="mt-4 min-h-10 rounded-lg border border-amber-300/40 bg-amber-300/10 px-4 py-2 text-sm font-medium text-amber-50 transition hover:bg-amber-300/20"
                >
                  Browse the catalog
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-white/15 bg-[#101319] p-8 text-center">
                <Database
                  className="mx-auto size-8 text-zinc-500"
                  aria-hidden="true"
                />
                <h2 className="mt-4 text-lg font-semibold tracking-tight text-white">
                  No boards match that filter
                </h2>
                <p className="mt-2 text-sm text-zinc-400">
                  Try a broader search term or clear one of the filters.
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
                  {quickQueries.slice(0, 4).map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => changeQuery(suggestion)}
                      className="ph-quick-chip min-h-9 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 font-mono text-[11px] text-zinc-400 hover:border-cyan-300/40 hover:text-cyan-100"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-4 min-h-10 rounded-lg border border-cyan-300/50 bg-cyan-300/10 px-4 py-2 text-sm font-medium text-cyan-50 transition hover:bg-cyan-300/20"
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

/**
 * The unfiltered first screen's invitation: four widely used reference boards
 * and a few searches that show what the index covers. Each board carries the
 * two facts people check first — who makes it and its logic level — so the
 * shortcut is useful on its own rather than decorative.
 */
function CommonBoards({
  boards,
  onOpen,
  onQuery,
}: {
  boards: BoardSummary[];
  onOpen: (id: string) => void;
  onQuery: (query: string) => void;
}) {
  return (
    <section
      aria-labelledby="common-boards-heading"
      className="surface-panel ph-card-in mb-3 overflow-hidden rounded-xl"
    >
      <div className="flex items-baseline justify-between gap-3 border-b border-white/5 px-3.5 py-2.5">
        <h2
          id="common-boards-heading"
          className="text-[13px] font-semibold tracking-tight text-white"
        >
          Common boards
        </h2>
        <span className="font-mono text-[11px] text-zinc-500">
          {boards.length} reference picks
        </span>
      </div>
      <div className="flex gap-1.5 overflow-x-auto p-2.5 [scrollbar-width:none] sm:grid sm:grid-cols-2 sm:overflow-visible min-[1500px]:grid-cols-4 [&::-webkit-scrollbar]:hidden">
        {boards.map((board) => (
          <button
            key={board.id}
            type="button"
            onClick={() => onOpen(board.id)}
            aria-label={`Inspect ${board.name}`}
            className="ph-quick-chip group flex min-h-14 min-w-56 shrink-0 items-center gap-3 rounded-lg border border-white/10 bg-[#0a0c11] px-3 py-2.5 text-left hover:border-cyan-300/40 hover:bg-cyan-300/[0.07] sm:min-w-0"
          >
            <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-md border border-white/10 bg-[#11141a]">
              <VendorLogo vendor={board.vendor} size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold text-zinc-100">
                {board.name}
              </span>
              <span className="mt-0.5 block truncate font-mono text-[11px] text-zinc-500">
                {board.vendor} · {board.logicLevel}
              </span>
            </span>
            <ArrowRight
              className="size-4 shrink-0 text-zinc-600 transition group-hover:translate-x-0.5 group-hover:text-cyan-200"
              aria-hidden="true"
            />
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1.5 overflow-x-auto border-t border-white/5 px-3.5 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-zinc-500">
          <Search className="size-3.5 text-cyan-300/70" aria-hidden="true" />
          Try a search:
        </span>
        {quickQueries.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => onQuery(suggestion)}
            className="ph-quick-chip min-h-9 shrink-0 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 font-mono text-[11px] text-zinc-400 hover:border-cyan-300/40 hover:bg-cyan-300/10 hover:text-cyan-100"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </section>
  );
}
