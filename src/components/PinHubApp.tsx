"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Fragment,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  ArrowUp,
  ArrowUpRight,
  BadgeCheck,
  BookOpen,
  CircuitBoard,
  Cpu,
  Database,
  GitCompareArrows,
  Layers3,
  LoaderCircle,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Star,
  X,
  Zap,
} from "lucide-react";
import { clsx } from "clsx";
import {
  type Board,
  type BoardCategory,
  type BoardInterface,
} from "@/lib/boards";
import type { BoardSummary } from "@/lib/board-summary";
import { createBoardDetailLoader } from "@/lib/board-detail-loader";
import { classifySource, verificationSourceFor } from "@/lib/source-trust";
import { PinoutTabs } from "@/components/PinoutTabs";
import { VendorLogo } from "@/components/VendorLogo";
import { CircuitBackground } from "@/components/CircuitBackground";

const allCategory = "All";
const allInterface = "All";
const favoritesStorageKey = "pinhub.favorites";
// Render a useful first screen without embedding dozens of offscreen cards in
// the initial HTML. Additional results remain available through the existing
// pagination control and all records remain searchable client-side.
const initialResultLimit = 16;
const resultPageSize = 32;
const desktopMediaQuery = "(min-width: 1024px)";

type BoardSearchEntry = {
  board: BoardSummary;
  name: string;
  nameWords: string[];
  primary: string;
  secondary: string;
  body: string;
};

function createBoardSearchEntries(catalog: BoardSummary[]): BoardSearchEntry[] {
  return catalog.map((board) => {
    const name = board.name.toLowerCase();
    return {
      board,
      name,
      nameWords: name.split(/[^a-z0-9+]+/),
      primary: [board.vendor, board.family, board.processor]
        .join(" ")
        .toLowerCase(),
      secondary: [board.category, ...board.tags, ...board.interfaces]
        .join(" ")
        .toLowerCase(),
      body: [board.description, board.warningSearchText]
        .join(" ")
        .toLowerCase(),
    };
  });
}

type DetailState =
  | { status: "ready"; board: Board }
  | { status: "loading"; board: null; id: string }
  | { status: "error"; board: null; id: string };

type PinHubAppProps = {
  catalog: BoardSummary[];
  initialBoard: Board;
  sourceCount: number;
};

// Favorites live in localStorage and are exposed to React through a tiny
// external store so the component can read them via useSyncExternalStore.
const emptyFavorites: ReadonlySet<string> = new Set();
const favoritesListeners = new Set<() => void>();
let favoritesSnapshot: ReadonlySet<string> | null = null;

function getFavoritesSnapshot(): ReadonlySet<string> {
  if (favoritesSnapshot === null) {
    try {
      const stored = window.localStorage.getItem(favoritesStorageKey);
      const parsed: unknown = stored ? JSON.parse(stored) : [];
      const ids = Array.isArray(parsed) ? parsed : [];
      favoritesSnapshot = new Set(
        ids.filter((id): id is string => typeof id === "string"),
      );
    } catch {
      favoritesSnapshot = new Set();
    }
  }
  return favoritesSnapshot;
}

function getServerFavoritesSnapshot(): ReadonlySet<string> {
  return emptyFavorites;
}

// Keep favorites in sync when another tab writes to the same storage key.
function onStorageEvent(event: StorageEvent) {
  if (event.key !== null && event.key !== favoritesStorageKey) return;
  favoritesSnapshot = null; // force a re-read on the next getSnapshot call
  for (const listener of favoritesListeners) listener();
}

function subscribeToFavorites(listener: () => void): () => void {
  if (favoritesListeners.size === 0) {
    window.addEventListener("storage", onStorageEvent);
  }
  favoritesListeners.add(listener);
  return () => {
    favoritesListeners.delete(listener);
    if (favoritesListeners.size === 0) {
      window.removeEventListener("storage", onStorageEvent);
    }
  };
}

function toggleFavoriteId(id: string) {
  const next = new Set(getFavoritesSnapshot());
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  favoritesSnapshot = next;
  try {
    window.localStorage.setItem(favoritesStorageKey, JSON.stringify([...next]));
  } catch {
    // Persisting is best-effort.
  }
  for (const listener of favoritesListeners) listener();
}

// JS-initiated scrolling honors the user's reduced-motion preference (the CSS
// `scroll-behavior` media query does not override an explicit JS behavior).
function scrollBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";
}

// Scores how well a board matches a single search token. Word-boundary hits
// on the name rank above substring hits, which rank above matches in
// secondary fields, so "pi" surfaces Raspberry Pi boards before boards that
// only mention SPI in their interface list.
function scoreBoardEntryForToken(
  entry: BoardSearchEntry,
  token: string,
): number {
  if (entry.nameWords.some((word) => word.startsWith(token))) {
    return 100;
  }
  if (entry.name.includes(token)) return 60;
  if (entry.primary.includes(token)) return 40;
  if (entry.secondary.includes(token)) return 20;
  if (entry.body.includes(token)) return 10;

  return 0;
}

// Every whitespace-separated token must match somewhere; the board's score
// is the sum of its per-token scores, used to rank results by relevance.
function scoreBoardEntry(entry: BoardSearchEntry, tokens: string[]): number {
  let total = 0;
  for (const token of tokens) {
    const score = scoreBoardEntryForToken(entry, token);
    if (score === 0) return 0;
    total += score;
  }
  return total;
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
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] =
    useState<BoardCategory | typeof allCategory>(allCategory);
  const [activeInterface, setActiveInterface] =
    useState<BoardInterface | typeof allInterface>(allInterface);
  const [selectedId, setSelectedId] = useState(initialBoard.id);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [visibleLimit, setVisibleLimit] = useState(initialResultLimit);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [detailRetry, setDetailRetry] = useState(0);
  const [detailState, setDetailState] = useState<DetailState>({
    status: "ready",
    board: initialBoard,
  });
  // On phones the filter sidebar is collapsed into a toggle so the catalog
  // stays first; on lg+ it is always shown as a sticky column.
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const storedFavorites = useSyncExternalStore(
    subscribeToFavorites,
    getFavoritesSnapshot,
    getServerFavoritesSnapshot,
  );
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
    () => createBoardSearchEntries(catalog),
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

  const filteredBoards = useMemo(() => {
    const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);

    const scored = boardSearchEntries
      .map((entry) => ({
        entry,
        score: tokens.length === 0 ? 1 : scoreBoardEntry(entry, tokens),
      }))
      .filter(({ entry, score }) => {
        const { board } = entry;
        if (score === 0) return false;
        if (showFavoritesOnly && !favorites.has(board.id)) return false;
        if (activeCategory !== allCategory && board.category !== activeCategory) {
          return false;
        }
        if (
          activeInterface !== allInterface &&
          !board.interfaces.includes(activeInterface)
        ) {
          return false;
        }
        return true;
      });

    if (tokens.length > 0) {
      scored.sort((a, b) => b.score - a.score);
    }
    return scored.map(({ entry }) => entry.board);
  }, [
    activeCategory,
    activeInterface,
    boardSearchEntries,
    query,
    favorites,
    showFavoritesOnly,
  ]);

  const selectedBoard =
    filteredBoards.find((board) => board.id === selectedId) ??
    filteredBoards[0] ??
    catalog[0];
  const visibleBoards = filteredBoards.slice(0, visibleLimit);

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

  const hasActiveFilters =
    query.trim().length > 0 ||
    activeCategory !== allCategory ||
    activeInterface !== allInterface ||
    showFavoritesOnly;

  // Count of sidebar filters in effect, surfaced as a badge on the mobile
  // Filters toggle so users know constraints are applied while it is collapsed.
  const activeFilterCount =
    (activeCategory !== allCategory ? 1 : 0) +
    (activeInterface !== allInterface ? 1 : 0);

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

  function resetFilters() {
    setQuery("");
    setActiveCategory(allCategory);
    setActiveInterface(allInterface);
    setShowFavoritesOnly(false);
    setSelectedId("");
    setVisibleLimit(initialResultLimit);
    setMobileDetailOpen(false);
  }

  function changeQuery(nextQuery: string) {
    setQuery(nextQuery);
    setSelectedId("");
    setVisibleLimit(initialResultLimit);
    setMobileDetailOpen(false);
  }

  // Stable identity so the memoized result rows don't re-render when only the
  // query or an unrelated row's state changes.
  const selectBoard = useCallback((id: string) => {
    setSelectedId(id);
    if (window.matchMedia("(max-width: 1023px)").matches) {
      setMobileDetailOpen(true);
    }
  }, []);

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
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />
          <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(34,211,238,0.08),rgba(7,10,13,0)_38%)]" />
        </div>
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
                      setVisibleLimit(nextIndex + 1);
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
                setShowFavoritesOnly((value) => !value);
                setSelectedId("");
                setVisibleLimit(initialResultLimit);
                setMobileDetailOpen(false);
              }}
              aria-pressed={showFavoritesOnly}
              className={clsx(
                "fav-button ml-1.5 inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-transparent px-3.5 py-1.5 text-xs font-semibold leading-none",
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
            <span
              className="shrink-0 font-mono text-xs text-zinc-400"
              role="status"
              aria-live="polite"
            >
              Showing {visibleBoards.length} of {filteredBoards.length}{" "}
              {hasActiveFilters ? "matches" : "boards"}
              {hasActiveFilters ? ` · ${catalog.length} total` : ""}
            </span>
            {activeCategory !== allCategory ? (
              <ActiveFilterChip
                label={activeCategory}
                onClear={() => {
                  setActiveCategory(allCategory);
                  setSelectedId("");
                  setVisibleLimit(initialResultLimit);
                  setMobileDetailOpen(false);
                }}
              />
            ) : null}
            {activeInterface !== allInterface ? (
              <ActiveFilterChip
                label={activeInterface}
                onClear={() => {
                  setActiveInterface(allInterface);
                  setSelectedId("");
                  setVisibleLimit(initialResultLimit);
                  setMobileDetailOpen(false);
                }}
              />
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
              setActiveCategory(value as BoardCategory | typeof allCategory);
              setSelectedId("");
              setVisibleLimit(initialResultLimit);
              setMobileDetailOpen(false);
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
              setActiveInterface(value as BoardInterface | typeof allInterface);
              setSelectedId("");
              setVisibleLimit(initialResultLimit);
              setMobileDetailOpen(false);
              setMobileFiltersOpen(false);
            }}
          />
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
                  favorite={favorites.has(board.id)}
                  onSelect={selectBoard}
                  onPrefetch={prefetchBoard}
                  onToggleFavorite={toggleFavoriteId}
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
                          document
                            .getElementById(`board-result-${board.id}`)
                            ?.scrollIntoView({
                              behavior: scrollBehavior(),
                              block: "center",
                            });
                          document
                            .getElementById(`board-result-${board.id}`)
                            ?.querySelector<HTMLButtonElement>(
                              'button[aria-label^="Select"]',
                            )
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
              onClick={() =>
                setVisibleLimit((limit) =>
                  Math.min(limit + resultPageSize, filteredBoards.length),
                )
              }
              className="mt-3 flex min-h-10 w-full items-center justify-center rounded-lg border border-white/10 bg-[#14161d] px-4 text-sm font-medium text-zinc-300 transition hover:border-cyan-300/40 hover:bg-[#191c24] hover:text-white"
            >
              Show{" "}
              {Math.min(
                resultPageSize,
                filteredBoards.length - visibleBoards.length,
              )}{" "}
              more
            </button>
          ) : null}

          {filteredBoards.length === 0 ? (
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
                className="mt-4 rounded-md border border-cyan-300/50 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-50 transition hover:bg-cyan-300/20"
              >
                Reset filters
              </button>
            </div>
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
      <span
        className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(110deg,transparent,rgba(34,211,238,0.18),transparent)] transition-transform duration-500 group-hover:translate-x-full"
        aria-hidden="true"
      />
      <svg
        viewBox="0 0 24 24"
        className="size-5 shrink-0 transition-transform duration-300 group-hover:scale-110"
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

type ActiveFilterChipProps = {
  label: string;
  onClear: () => void;
};

function ActiveFilterChip({ label, onClear }: ActiveFilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClear}
      aria-label={`Remove ${label} filter`}
      className="group flex items-center gap-1.5 rounded-md border border-cyan-300/50 bg-cyan-300/10 px-2 py-1 text-xs text-cyan-50 transition hover:border-cyan-300/80"
    >
      {label}
      <X
        className="size-3 text-cyan-200/70 transition group-hover:text-white"
        aria-hidden="true"
      />
    </button>
  );
}

type FilterPanelProps = {
  title: string;
  icon: ReactNode;
  items: readonly string[];
  active: string;
  counts?: Map<string, number>;
  onChange: (value: string) => void;
};

function FilterPanel({
  title,
  icon,
  items,
  active,
  counts,
  onChange,
}: FilterPanelProps) {
  return (
    <section className="surface-panel rounded-lg p-3">
      <div className="mb-2.5 flex items-center gap-2 px-1 text-sm font-semibold text-white">
        {icon}
        {title}
      </div>
      <div className="flex flex-wrap gap-1.5 lg:flex-col lg:gap-1">
        {items.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            className={clsx(
              "flex min-h-10 items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-left text-sm transition lg:min-h-0",
              active === item
                ? "border-cyan-300/70 bg-cyan-300/10 text-cyan-50"
                : "border-transparent text-zinc-400 hover:bg-white/[0.06] hover:text-white",
            )}
            aria-pressed={active === item}
          >
            <span>{item}</span>
            {counts?.has(item) ? (
              <span className="font-mono text-xs text-zinc-500">
                {counts.get(item)}
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </section>
  );
}

type BoardResultProps = {
  board: BoardSummary;
  selected: boolean;
  favorite: boolean;
  onSelect: (id: string) => void;
  onPrefetch: (id: string) => void;
  onToggleFavorite: (id: string) => void;
};

// Memoized with stable callbacks so a keystroke, selection change, or favorite
// toggle only re-renders the rows whose props actually changed, not the whole
// catalog. content-visibility lets the browser skip layout/paint for rows far
// off screen, which keeps scrolling smooth on phones and low-end machines.
const BoardResult = memo(function BoardResult({
  board,
  selected,
  favorite,
  onSelect,
  onPrefetch,
  onToggleFavorite,
}: BoardResultProps) {
  return (
    <article
      id={`board-result-${board.id}`}
      className={clsx(
        "relative rounded-lg border-y border-r border-l-2 [contain-intrinsic-block-size:9rem] [content-visibility:auto] shadow-[0_1px_2px_rgba(0,0,0,0.4),0_12px_30px_-20px_rgba(0,0,0,0.85)] transition",
        selected
          ? "border-y-cyan-300/40 border-r-cyan-300/40 border-l-cyan-300 bg-[#0e1c23] shadow-[0_0_0_1px_rgba(34,211,238,0.14),0_12px_34px_-14px_rgba(34,211,238,0.32)]"
          : "border-y-white/10 border-r-white/10 border-l-white/15 bg-[#14161d] hover:border-y-white/20 hover:border-r-white/20 hover:border-l-white/30 hover:bg-[#191c24]",
      )}
    >
      <button
        type="button"
        onClick={() => onSelect(board.id)}
        onPointerEnter={() => onPrefetch(board.id)}
        onFocus={() => onPrefetch(board.id)}
        aria-label={`Select ${board.name}`}
        aria-pressed={selected}
        className="absolute inset-0 z-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0e13]"
      />
      <div className="pointer-events-none relative z-10 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 pr-10">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <VendorLogo vendor={board.vendor} />
            <h2 className="text-base font-semibold text-white">{board.name}</h2>
            <span className="rounded border border-white/10 bg-[#0a0c11] px-1.5 py-0.5 text-[11px] text-zinc-300">
              {board.category}
            </span>
            {board.hasPinout ? (
              <span className="flex items-center gap-1 rounded border border-emerald-400/40 bg-emerald-400/10 px-1.5 py-0.5 text-[11px] text-emerald-100">
                <CircuitBoard className="size-3" aria-hidden="true" />
                Pin map
              </span>
            ) : null}
            {board.warningCount > 0 ? (
              <span
                className="flex items-center gap-1 rounded border border-orange-300/40 bg-orange-400/10 px-1.5 py-0.5 text-[11px] text-orange-100"
                title={`${board.warningCount} wiring caution${board.warningCount === 1 ? "" : "s"} — see “Check before wiring”`}
              >
                <ShieldAlert className="size-3" aria-hidden="true" />
                {board.warningCount}
              </span>
            ) : null}
          </div>
          <span className="min-w-0 break-words font-mono text-xs text-zinc-500 sm:text-right">
            {board.vendor} · {board.logicLevel}
          </span>
        </div>

        <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-zinc-400">
          {board.description}
        </p>

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {board.interfaces.slice(0, 7).map((item) => (
            <span
              key={item}
              className="rounded border border-white/10 bg-zinc-950 px-1.5 py-0.5 text-[11px] text-zinc-300"
            >
              {item}
            </span>
          ))}
          {board.interfaces.length > 7 ? (
            <span className="rounded border border-white/10 bg-zinc-950 px-1.5 py-0.5 text-[11px] text-zinc-500">
              +{board.interfaces.length - 7}
            </span>
          ) : null}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onToggleFavorite(board.id)}
        aria-label={
          favorite
            ? `Remove ${board.name} from favorites`
            : `Add ${board.name} to favorites`
        }
        aria-pressed={favorite}
        title={favorite ? "Remove from favorites" : "Add to favorites"}
        className="absolute right-1 top-1 z-20 grid size-11 place-items-center rounded-md text-zinc-500 transition hover:bg-white/[0.08] hover:text-amber-200"
      >
        <Star
          className={clsx(
            "size-4",
            favorite && "fill-amber-300 text-amber-300",
          )}
          aria-hidden="true"
        />
      </button>
    </article>
  );
});

type BoardDetailProps = {
  board: Board;
  onBackToResults: () => void;
};

type BoardDetailPanelProps = {
  expectedBoard: BoardSummary;
  detailState: DetailState;
  onRetry: () => void;
  onBackToResults: () => void;
};

function BoardDetailPanel({
  expectedBoard,
  detailState,
  onRetry,
  onBackToResults,
}: BoardDetailPanelProps) {
  const board =
    detailState.status === "ready" &&
    detailState.board.id === expectedBoard.id
      ? detailState.board
      : null;
  const failed =
    detailState.status === "error" && detailState.id === expectedBoard.id;

  return (
    <>
      <span className="sr-only" role="status" aria-live="polite">
        {board
          ? `${expectedBoard.name} details loaded.`
          : failed
            ? `${expectedBoard.name} details could not be loaded.`
            : `Loading ${expectedBoard.name} details.`}
      </span>
      {board ? (
        <BoardDetail board={board} onBackToResults={onBackToResults} />
      ) : (
        <aside
          className="min-w-0 space-y-4 lg:sticky lg:top-[4.25rem] lg:self-start"
          aria-busy={!failed}
        >
          <button
            type="button"
            onClick={onBackToResults}
            className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-[#15181f] px-3 text-sm font-medium text-zinc-300 transition hover:border-cyan-300/50 hover:text-white lg:hidden"
          >
            <ArrowUp className="size-4" aria-hidden="true" />
            Back to results
          </button>
          <section className="surface-panel rounded-lg p-5">
            <div className="flex items-center gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-lg border border-cyan-300/30 bg-cyan-300/10 text-cyan-100">
                {failed ? (
                  <ShieldAlert className="size-5" aria-hidden="true" />
                ) : (
                  <LoaderCircle
                    className="size-5 motion-safe:animate-spin"
                    aria-hidden="true"
                  />
                )}
              </div>
              <div className="min-w-0">
                <div className="truncate font-semibold text-white">
                  {expectedBoard.name}
                </div>
                <p className="mt-1 text-sm text-zinc-400">
                  {failed
                    ? "The board details could not be loaded."
                    : "Loading source-backed pin data…"}
                </p>
              </div>
            </div>
            {failed ? (
              <button
                type="button"
                onClick={onRetry}
                className="mt-4 rounded-md border border-cyan-300/50 bg-cyan-300/10 px-3 py-2 text-sm font-medium text-cyan-50 transition hover:bg-cyan-300/20"
              >
                Try again
              </button>
            ) : null}
          </section>
        </aside>
      )}
    </>
  );
}

function BoardDetail({ board, onBackToResults }: BoardDetailProps) {
  const verifySource = verificationSourceFor(board);
  const verifySourceOfficial = verifySource
    ? classifySource(board.vendor, verifySource.url) === "official"
    : false;
  return (
    <aside className="min-w-0 space-y-4 lg:sticky lg:top-[4.25rem] lg:max-h-[calc(100vh-5.25rem)] lg:self-start lg:overflow-y-auto lg:pb-2 lg:pr-1">
      {/* Stacked-layout escape hatch: the detail panel sits below the result
          list on phones, so offer a quick way back up. Hidden on lg+. */}
      <button
        type="button"
        onClick={onBackToResults}
        className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-[#15181f] px-3 text-sm font-medium text-zinc-300 shadow-[0_1px_2px_rgba(0,0,0,0.4)] transition hover:border-cyan-300/50 hover:bg-[#1c2029] hover:text-white active:scale-[0.99] lg:hidden"
      >
        <ArrowUp className="size-4" aria-hidden="true" />
        Back to results
      </button>
      <section className="surface-panel rounded-lg p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
              Selected board
            </div>
            <h2 className="mt-2 flex items-center gap-2.5 text-2xl font-semibold text-white">
              <VendorLogo vendor={board.vendor} size={24} />
              {board.name}
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              {board.vendor} / {board.family}
            </p>
          </div>
          <div className="grid size-11 shrink-0 place-items-center rounded-lg border border-amber-300/40 bg-amber-300/10 text-amber-100">
            <Cpu className="size-5" aria-hidden="true" />
          </div>
        </div>

        <dl className="mt-5 grid gap-3 text-sm">
          <SpecRow label="Processor" value={board.processor} />
          <SpecRow label="Logic" value={board.logicLevel} />
          <SpecRow label="Power" value={board.power} />
          <SpecRow label="Format" value={board.formFactor} />
        </dl>
      </section>

      {verifySource ? (
        <a
          href={verifySource.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center justify-between gap-3 rounded-lg border border-orange-300/30 bg-[#1b1410] px-3.5 py-2.5 text-sm text-orange-100/90 shadow-[0_1px_2px_rgba(0,0,0,0.4)] transition hover:border-orange-300/60 hover:text-orange-50"
        >
          <span className="flex min-w-0 items-center gap-2">
            <ShieldAlert
              className="size-4 shrink-0 text-orange-200"
              aria-hidden="true"
            />
            <span className="min-w-0 truncate">
              Verify before wiring:{" "}
              <span className="font-medium">{verifySource.label}</span>
            </span>
            <span
              className={clsx(
                "shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium",
                verifySourceOfficial
                  ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-100"
                  : "border-white/15 bg-white/[0.05] text-zinc-300",
              )}
            >
              {verifySourceOfficial ? "Official" : "3rd-party"}
            </span>
          </span>
          <ArrowUpRight
            className="size-4 shrink-0 text-orange-200/60 transition group-hover:text-orange-100"
            aria-hidden="true"
          />
        </a>
      ) : null}

      <PinoutTabs board={board} />

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
        <InfoBlock
          title="Why it matters"
          icon={<Zap className="size-4 text-emerald-200" aria-hidden="true" />}
          items={board.highlights}
        />
        <InfoBlock
          title="Check before wiring"
          icon={
            <ShieldAlert className="size-4 text-orange-200" aria-hidden="true" />
          }
          items={board.warnings}
          tone="warning"
        />
      </section>

      <section className="surface-panel rounded-lg p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
          <BookOpen className="size-4 text-cyan-200" aria-hidden="true" />
          Source references
        </div>
        <div className="grid gap-2">
          {board.sourceLinks.map((source) => {
            const official =
              classifySource(board.vendor, source.url) === "official";
            return (
              <a
                key={source.url}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="surface-well group flex min-w-0 items-center justify-between gap-3 rounded-md px-3 py-2.5 text-sm text-zinc-300 transition hover:border-cyan-300/50 hover:bg-[#13161c] hover:text-white"
              >
                <span className="flex min-w-0 items-baseline gap-2">
                  <span className="shrink-0 rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] text-zinc-500 transition group-hover:text-zinc-300">
                    {source.type}
                  </span>
                  <span className="min-w-0 truncate">{source.label}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {official ? (
                    <span
                      className="flex items-center gap-1 rounded border border-emerald-400/40 bg-emerald-400/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-100"
                      title="Official board-vendor or primary-component documentation"
                    >
                      <BadgeCheck className="size-3" aria-hidden="true" />
                      Official
                    </span>
                  ) : (
                    <span
                      className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-medium text-zinc-400"
                      title={`Not published by ${board.vendor} — cross-check against vendor documentation`}
                    >
                      3rd-party
                    </span>
                  )}
                  <ArrowUpRight
                    className="size-4 text-zinc-500 transition group-hover:text-cyan-200"
                    aria-hidden="true"
                  />
                </span>
              </a>
            );
          })}
        </div>
      </section>
    </aside>
  );
}

type SpecRowProps = {
  label: string;
  value: string;
};

function SpecRow({ label, value }: SpecRowProps) {
  return (
    <div className="grid gap-1 border-t border-white/10 pt-3 first:border-t-0 first:pt-0 sm:grid-cols-[6rem_minmax(0,1fr)]">
      <dt className="text-xs uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </dt>
      <dd className="text-zinc-200">{value}</dd>
    </div>
  );
}

type InfoBlockProps = {
  title: string;
  icon: ReactNode;
  items: string[];
  tone?: "default" | "warning";
};

function InfoBlock({ title, icon, items, tone = "default" }: InfoBlockProps) {
  return (
    <section
      className={clsx(
        "rounded-lg p-4",
        tone === "warning"
          ? "border border-orange-300/30 bg-[#1b1410] shadow-[0_1px_2px_rgba(0,0,0,0.4)]"
          : "surface-panel",
      )}
    >
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
        {icon}
        {title}
      </div>
      <ul className="space-y-2 text-sm leading-6 text-zinc-400">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span
              className={clsx(
                "mt-2.5 size-1 shrink-0 rounded-full",
                tone === "warning" ? "bg-orange-300/70" : "bg-zinc-500",
              )}
              aria-hidden="true"
            />
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
