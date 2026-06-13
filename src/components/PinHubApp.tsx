"use client";

import Image from "next/image";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  ArrowUpRight,
  BookOpen,
  CircuitBoard,
  Cpu,
  Database,
  Layers3,
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
  boards,
  categories,
  interfaceFilters,
  type Board,
  type BoardCategory,
  type BoardInterface,
} from "@/lib/boards";
import { PinoutDiagram } from "@/components/PinoutDiagram";
import { VendorLogo } from "@/components/VendorLogo";

const allCategory = "All";
const allInterface = "All";
const favoritesStorageKey = "pinhub.favorites";

// Favorites live in localStorage and are exposed to React through a tiny
// external store so the component can read them via useSyncExternalStore.
const emptyFavorites: ReadonlySet<string> = new Set();
const favoritesListeners = new Set<() => void>();
let favoritesSnapshot: ReadonlySet<string> | null = null;

function getFavoritesSnapshot(): ReadonlySet<string> {
  if (favoritesSnapshot === null) {
    try {
      const stored = window.localStorage.getItem(favoritesStorageKey);
      const ids = stored ? (JSON.parse(stored) as string[]) : [];
      favoritesSnapshot = new Set(
        ids.filter((id) => boards.some((board) => board.id === id)),
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

// Scores how well a board matches a single search token. Word-boundary hits
// on the name rank above substring hits, which rank above matches in
// secondary fields, so "pi" surfaces Raspberry Pi boards before boards that
// only mention SPI in their interface list.
function scoreBoardForToken(board: Board, token: string): number {
  const name = board.name.toLowerCase();
  if (name.split(/[^a-z0-9+]+/).some((word) => word.startsWith(token))) {
    return 100;
  }
  if (name.includes(token)) return 60;

  const primary = [board.vendor, board.family, board.processor]
    .join(" ")
    .toLowerCase();
  if (primary.includes(token)) return 40;

  const secondary = [board.category, ...board.tags, ...board.interfaces]
    .join(" ")
    .toLowerCase();
  if (secondary.includes(token)) return 20;

  const text = [board.description, ...board.warnings].join(" ").toLowerCase();
  if (text.includes(token)) return 10;

  return 0;
}

// Every whitespace-separated token must match somewhere; the board's score
// is the sum of its per-token scores, used to rank results by relevance.
function scoreBoard(board: Board, tokens: string[]): number {
  let total = 0;
  for (const token of tokens) {
    const score = scoreBoardForToken(board, token);
    if (score === 0) return 0;
    total += score;
  }
  return total;
}

export function PinHubApp() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] =
    useState<BoardCategory | typeof allCategory>(allCategory);
  const [activeInterface, setActiveInterface] =
    useState<BoardInterface | typeof allInterface>(allInterface);
  const [selectedId, setSelectedId] = useState(boards[0]?.id ?? "");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const favorites = useSyncExternalStore(
    subscribeToFavorites,
    getFavoritesSnapshot,
    getServerFavoritesSnapshot,
  );
  const searchRef = useRef<HTMLInputElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  const filteredBoards = useMemo(() => {
    const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);

    const scored = boards
      .map((board) => ({
        board,
        score: tokens.length === 0 ? 1 : scoreBoard(board, tokens),
      }))
      .filter(({ board, score }) => {
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
    return scored.map(({ board }) => board);
  }, [activeCategory, activeInterface, query, favorites, showFavoritesOnly]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    counts.set(allCategory, boards.length);
    for (const board of boards) {
      counts.set(board.category, (counts.get(board.category) ?? 0) + 1);
    }
    return counts;
  }, []);

  const selectedBoard =
    filteredBoards.find((board) => board.id === selectedId) ??
    filteredBoards[0] ??
    boards[0];

  const interfaceCount = new Set(boards.flatMap((board) => board.interfaces)).size;
  const sourceCount = boards.reduce(
    (total, board) => total + board.sourceLinks.length,
    0,
  );

  const hasActiveFilters =
    query.trim().length > 0 ||
    activeCategory !== allCategory ||
    activeInterface !== allInterface ||
    showFavoritesOnly;

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
  }

  function selectBoard(id: string) {
    setSelectedId(id);
    // On single-column layouts the detail panel sits below the result list,
    // so bring it into view when a board is picked.
    if (window.matchMedia("(max-width: 1023px)").matches) {
      detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <main className="min-h-screen">
      <header className="relative border-b border-white/10 bg-[#070a0d]">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />
          <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(34,211,238,0.08),rgba(7,10,13,0)_38%)]" />
        </div>
        <div className="relative mx-auto flex max-w-[1560px] flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative size-11 shrink-0 sm:size-12">
              <Image
                src="/pinhub-logo.png"
                alt=""
                fill
                sizes="48px"
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

          <dl className="flex items-center gap-5 text-sm">
            <Metric label="Boards" value={boards.length.toString()} />
            <Metric label="Interfaces" value={interfaceCount.toString()} />
            <Metric label="Sources" value={sourceCount.toString()} />
          </dl>
        </div>
      </header>

      <div className="sticky top-0 z-40 border-b border-white/10 bg-[#0b0c0f]/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1560px] flex-wrap items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <label className="relative block min-w-56 flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500"
              aria-hidden="true"
            />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setQuery("");
                  event.currentTarget.blur();
                }
                if (event.key === "Enter" && filteredBoards[0]) {
                  selectBoard(filteredBoards[0].id);
                }
              }}
              placeholder="Search boards, vendors, interfaces, warnings..."
              aria-label="Search boards"
              className="h-10 w-full rounded-md border border-white/10 bg-zinc-950/80 pl-10 pr-16 text-sm text-white outline-none transition focus:border-cyan-300/70 focus:ring-1 focus:ring-cyan-300/40"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded text-zinc-500 transition hover:text-white"
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

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span
              className="font-mono text-xs text-zinc-400"
              role="status"
              aria-live="polite"
            >
              {filteredBoards.length} of {boards.length} boards
            </span>
            <button
              type="button"
              onClick={() => setShowFavoritesOnly((value) => !value)}
              aria-pressed={showFavoritesOnly}
              className={clsx(
                "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition",
                showFavoritesOnly
                  ? "border-amber-300/70 bg-amber-300/10 text-amber-100"
                  : "border-white/10 text-zinc-400 hover:border-white/25 hover:text-white",
              )}
            >
              <Star
                className={clsx(
                  "size-3.5",
                  showFavoritesOnly && "fill-amber-300 text-amber-300",
                )}
                aria-hidden="true"
              />
              Favorites
              {favorites.size > 0 ? (
                <span className="font-mono text-[11px] text-zinc-500">
                  {favorites.size}
                </span>
              ) : null}
            </button>
            {activeCategory !== allCategory ? (
              <ActiveFilterChip
                label={activeCategory}
                onClear={() => setActiveCategory(allCategory)}
              />
            ) : null}
            {activeInterface !== allInterface ? (
              <ActiveFilterChip
                label={activeInterface}
                onClear={() => setActiveInterface(allInterface)}
              />
            ) : null}
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-md px-2 py-1 text-xs text-zinc-400 underline-offset-4 transition hover:text-white hover:underline"
              >
                Reset
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1560px] gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[15rem_minmax(0,1fr)_minmax(24rem,32rem)] lg:px-8">
        <aside className="space-y-4 lg:sticky lg:top-[4.25rem] lg:max-h-[calc(100vh-5.25rem)] lg:self-start lg:overflow-y-auto lg:pb-2">
          <FilterPanel
            title="Category"
            icon={<Layers3 className="size-4 text-cyan-200" aria-hidden="true" />}
            items={categories}
            active={activeCategory}
            counts={categoryCounts}
            onChange={(value) =>
              setActiveCategory(value as BoardCategory | typeof allCategory)
            }
          />
          <FilterPanel
            title="Interface"
            icon={
              <SlidersHorizontal
                className="size-4 text-cyan-200"
                aria-hidden="true"
              />
            }
            items={interfaceFilters}
            active={activeInterface}
            onChange={(value) =>
              setActiveInterface(value as BoardInterface | typeof allInterface)
            }
          />
          <section className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
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

        <section className="min-w-0" aria-label="Board results">
          <div className="grid gap-2.5">
            {filteredBoards.map((board) => (
              <BoardResult
                key={board.id}
                board={board}
                selected={board.id === selectedBoard.id}
                favorite={favorites.has(board.id)}
                onSelect={() => selectBoard(board.id)}
                onToggleFavorite={() => toggleFavoriteId(board.id)}
              />
            ))}
          </div>

          {filteredBoards.length === 0 ? (
            <div className="rounded-lg border border-dashed border-white/15 bg-white/[0.03] p-8 text-center">
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

        <div ref={detailRef} className="min-w-0 scroll-mt-16">
          <BoardDetail board={selectedBoard} />
        </div>
      </div>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1560px] flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-zinc-500 sm:px-6 lg:px-8">
          <span>
            Always verify against the linked official documentation before
            wiring.
          </span>
          <span className="font-mono">
            {boards.length} boards · {sourceCount} source links
          </span>
        </div>
      </footer>
    </main>
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
    <section className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
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
              "flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-left text-sm transition",
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
  board: Board;
  selected: boolean;
  favorite: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
};

function BoardResult({
  board,
  selected,
  favorite,
  onSelect,
  onToggleFavorite,
}: BoardResultProps) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onSelect}
        className={clsx(
          "w-full rounded-lg border-y border-r border-l-2 p-4 text-left transition",
          selected
            ? "border-y-cyan-300/40 border-r-cyan-300/40 border-l-cyan-300 bg-cyan-300/[0.07]"
            : "border-y-white/10 border-r-white/10 border-l-white/10 bg-white/[0.03] hover:border-y-white/25 hover:border-r-white/25 hover:border-l-white/25 hover:bg-white/[0.05]",
        )}
        aria-pressed={selected}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <VendorLogo vendor={board.vendor} />
            <h2 className="text-base font-semibold text-white">{board.name}</h2>
            <span className="rounded border border-white/10 bg-black/30 px-1.5 py-0.5 text-[11px] text-zinc-300">
              {board.category}
            </span>
            {board.pinout ? (
              <span className="flex items-center gap-1 rounded border border-emerald-400/40 bg-emerald-400/10 px-1.5 py-0.5 text-[11px] text-emerald-100">
                <CircuitBoard className="size-3" aria-hidden="true" />
                Pin map
              </span>
            ) : null}
          </div>
          <span className="shrink-0 pr-7 font-mono text-xs text-zinc-500">
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
      </button>
      <button
        type="button"
        onClick={onToggleFavorite}
        aria-label={
          favorite
            ? `Remove ${board.name} from favorites`
            : `Add ${board.name} to favorites`
        }
        aria-pressed={favorite}
        title={favorite ? "Remove from favorites" : "Add to favorites"}
        className="absolute right-2.5 top-2.5 grid size-7 place-items-center rounded-md text-zinc-500 transition hover:bg-white/[0.08] hover:text-amber-200"
      >
        <Star
          className={clsx(
            "size-4",
            favorite && "fill-amber-300 text-amber-300",
          )}
          aria-hidden="true"
        />
      </button>
    </div>
  );
}

type BoardDetailProps = {
  board: Board;
};

function BoardDetail({ board }: BoardDetailProps) {
  return (
    <aside className="min-w-0 space-y-4 lg:sticky lg:top-[4.25rem] lg:max-h-[calc(100vh-5.25rem)] lg:self-start lg:overflow-y-auto lg:pb-2 lg:pr-1">
      <section className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
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

      <PinoutDiagram pinout={board.pinout} />

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

      <section className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
          <BookOpen className="size-4 text-cyan-200" aria-hidden="true" />
          Source references
        </div>
        <div className="grid gap-2">
          {board.sourceLinks.map((source) => (
            <a
              key={source.url}
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center justify-between gap-3 rounded-md border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-zinc-300 transition hover:border-cyan-300/50 hover:text-white"
            >
              <span className="flex min-w-0 items-baseline gap-2">
                <span className="shrink-0 rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] text-zinc-500 transition group-hover:text-zinc-300">
                  {source.type}
                </span>
                <span className="min-w-0 truncate">{source.label}</span>
              </span>
              <ArrowUpRight
                className="size-4 shrink-0 text-zinc-500 transition group-hover:text-cyan-200"
                aria-hidden="true"
              />
            </a>
          ))}
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
        "rounded-lg border p-4",
        tone === "warning"
          ? "border-orange-300/25 bg-orange-300/[0.04]"
          : "border-white/10 bg-white/[0.03]",
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
