"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Check,
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
  Wifi,
  X,
  Zap,
} from "lucide-react";
import { clsx } from "clsx";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import type { BoardSummary } from "@/lib/board-summary";
import {
  createBoardSearchIndex,
  matchBoardSearchEntry,
  matchFieldLabels,
  tokenizeQuery,
  type BoardMatchField,
} from "@/lib/board-search";
import { toggleFavorite, useFavorites } from "@/lib/favorites";
import { CircuitBackground } from "@/components/CircuitBackground";
import { VendorLogo } from "@/components/VendorLogo";

type SortKey = "relevance" | "name" | "vendor";
type FilterKey =
  | "category"
  | "platform"
  | "interface"
  | "logic"
  | "wireless"
  | "connector";
export type CatalogState = {
  query: string;
  category: string[];
  platform: string[];
  interface: string[];
  logic: string[];
  wireless: string[];
  connector: string[];
  pinoutOnly: boolean;
  favoritesOnly: boolean;
  sort: SortKey;
};

const defaultState: CatalogState = {
  query: "",
  category: [],
  platform: [],
  interface: [],
  logic: [],
  wireless: [],
  connector: [],
  pinoutOnly: false,
  favoritesOnly: false,
  sort: "name",
};

function parseUrlState(): CatalogState {
  const params = new URLSearchParams(location.search);
  const sort = params.get("sort");
  return {
    query: params.get("q") ?? "",
    category: params.getAll("category"),
    platform: params.getAll("platform"),
    interface: params.getAll("interface"),
    logic: params.getAll("logic"),
    wireless: params.getAll("wireless"),
    connector: params.getAll("connector"),
    pinoutOnly: params.get("pinout") === "yes",
    favoritesOnly: params.get("favorites") === "yes",
    sort: sort === "relevance" || sort === "vendor" ? sort : "name",
  };
}

function urlForState(state: CatalogState): string {
  const params = new URLSearchParams();
  if (state.query.trim()) params.set("q", state.query.trim());
  for (const key of [
    "category",
    "platform",
    "interface",
    "logic",
    "wireless",
    "connector",
  ] as const) {
    state[key].forEach((value) => params.append(key, value));
  }
  if (state.pinoutOnly) params.set("pinout", "yes");
  if (state.favoritesOnly) params.set("favorites", "yes");
  const naturalSort = state.query.trim() ? "relevance" : "name";
  if (state.sort !== naturalSort) params.set("sort", state.sort);
  return params.size ? `?${params.toString()}` : "/compare";
}

function matchesFilters(
  board: BoardSummary,
  state: CatalogState,
  favorites: ReadonlySet<string>,
): boolean {
  const profile = board.discovery;
  return (
    (!state.favoritesOnly || favorites.has(board.id)) &&
    (!state.pinoutOnly || board.hasPinout) &&
    (!state.category.length || state.category.includes(board.category)) &&
    (!state.platform.length || state.platform.includes(profile.computeClass)) &&
    (!state.interface.length ||
      state.interface.every((item) =>
        board.interfaces.some((entry) => entry === item),
      )) &&
    (!state.logic.length || state.logic.includes(profile.logicProfile)) &&
    (!state.wireless.length ||
      state.wireless.every((item) =>
        profile.wireless.some((entry) => entry === item),
      )) &&
    (!state.connector.length ||
      state.connector.some((item) => profile.connectorEcosystems.includes(item)))
  );
}

export function DiscoveryApp({
  catalog,
  sourceCount,
  initialCompareIds = [],
}: {
  catalog: BoardSummary[];
  sourceCount: number;
  initialCompareIds?: string[];
}) {
  const [state, setState] = useState(defaultState);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>(() =>
    initialCompareIds.slice(0, 3),
  );
  const [visible, setVisible] = useState(24);
  // Rendering another 24 cards is the slow part on a phone, so the page-in runs
  // as a transition: the button reports it is working and refuses further
  // clicks until the new rows are on screen.
  const [paging, startPaging] = useTransition();
  const urlReady = useRef(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const storedFavorites = useFavorites();
  const ids = useMemo(() => new Set(catalog.map((board) => board.id)), [catalog]);
  const favorites = useMemo(
    () => new Set([...storedFavorites].filter((id) => ids.has(id))),
    [ids, storedFavorites],
  );

  useEffect(() => {
    const restore = () => {
      setState(parseUrlState());
      setVisible(24);
    };
    const frame = requestAnimationFrame(() => {
      restore();
      urlReady.current = true;
    });
    addEventListener("popstate", restore);
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener("popstate", restore);
    };
  }, []);
  useEffect(() => {
    if (urlReady.current) history.replaceState(null, "", urlForState(state));
  }, [state]);
  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if (
        event.key === "/" &&
        !(event.target instanceof HTMLInputElement) &&
        !(event.target instanceof HTMLTextAreaElement)
      ) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener("keydown", focusSearch);
    return () => document.removeEventListener("keydown", focusSearch);
  }, []);

  const options = useMemo(
    () => ({
      category: [...new Set(catalog.map((board) => board.category))],
      platform: [...new Set(catalog.map((board) => board.discovery.computeClass))],
      interface: [...new Set(catalog.flatMap((board) => board.interfaces))],
      logic: [...new Set(catalog.map((board) => board.discovery.logicProfile))],
      wireless: [...new Set(catalog.flatMap((board) => board.discovery.wireless))],
      connector: [
        ...new Set(catalog.flatMap((board) => board.discovery.connectorEcosystems)),
      ],
    }),
    [catalog],
  );
  const searchIndex = useMemo(() => createBoardSearchIndex(catalog), [catalog]);
  const filtered = useMemo(() => {
    const tokens = tokenizeQuery(state.query);
    const scored: {
      board: BoardSummary;
      score: number;
      matchedBy: BoardMatchField | null;
    }[] = [];
    for (const entry of searchIndex) {
      const match = matchBoardSearchEntry(entry, tokens);
      if (!match) continue;
      if (!matchesFilters(entry.board, state, favorites)) continue;
      scored.push({ board: entry.board, ...match });
    }
    scored.sort((a, b) => {
      if (state.sort === "relevance") {
        return b.score - a.score || a.board.name.localeCompare(b.board.name);
      }
      if (state.sort === "vendor") {
        return (
          a.board.vendor.localeCompare(b.board.vendor) ||
          a.board.name.localeCompare(b.board.name)
        );
      }
      return a.board.name.localeCompare(b.board.name);
    });
    return scored;
  }, [favorites, searchIndex, state]);
  // Favorites-only with nothing starred is its own state, not a failed filter.
  const favoritesEmpty = state.favoritesOnly && favorites.size === 0;
  const activeCount =
    state.category.length +
    state.platform.length +
    state.interface.length +
    state.logic.length +
    state.wireless.length +
    state.connector.length +
    Number(state.pinoutOnly) +
    Number(state.favoritesOnly);

  const setQuery = (query: string) => {
    setState((current) => ({
      ...current,
      query,
      sort:
        query.trim() && current.sort === "name"
          ? "relevance"
          : !query.trim() && current.sort === "relevance"
            ? "name"
            : current.sort,
    }));
    setVisible(24);
  };
  const toggleFilter = useCallback((key: FilterKey, value: string) => {
    setState((current) => ({
      ...current,
      [key]: current[key].includes(value)
        ? current[key].filter((item) => item !== value)
        : [...current[key], value],
    }));
    setVisible(24);
  }, []);
  const toggleCompare = (id: string) => {
    setCompareIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : current.length < 3
          ? [...current, id]
          : current,
    );
  };

  return (
    <main className="relative isolate min-h-screen pb-28">
      <CircuitBackground />
      <header className="relative border-b border-white/10 bg-[#0a0d12] pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-[1560px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="group flex min-w-0 items-center gap-3">
            <Image
              src="/pinhub-logo.png"
              alt=""
              width={52}
              height={52}
              priority
              className="transition duration-500 group-hover:rotate-6 group-hover:scale-110"
            />
            <div className="min-w-0">
              <h1 className="brand-title bg-gradient-to-r from-white via-cyan-200 to-amber-200 bg-clip-text text-2xl leading-none text-transparent sm:text-3xl">
                PinHub
              </h1>
              <p className="mt-1 truncate text-xs text-zinc-400 sm:text-sm">
                Compare boards. Verify pins. Build with confidence.
              </p>
            </div>
          </Link>
          <div className="hidden items-center gap-5 sm:flex">
            <Metric value={catalog.length} label="Boards" />
            <Metric value={sourceCount} label="Sources" />
          </div>
        </div>
      </header>

      <div className="sticky top-0 z-40 border-b border-white/10 bg-[#0c0e13] shadow-[0_12px_30px_-18px_rgba(0,0,0,0.95)]">
        {/* Below sm this is two rows — search, then one horizontally scrolling
            control row — because wrapping all six controls cost 219px of an
            844px viewport. From sm up the wrapper below becomes `contents`,
            so the toolbar lays out exactly as it always has. */}
        <div className="mx-auto flex max-w-[1560px] flex-col gap-2.5 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:px-6 lg:px-8">
          <label className="relative order-first min-w-0 sm:order-2 sm:flex-1 sm:basis-80">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
            <input
              ref={searchRef}
              value={state.query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setQuery("");
                  event.currentTarget.blur();
                }
              }}
              placeholder="Search processor, interface, connector, or warning…"
              aria-label="Search boards"
              className="h-11 w-full rounded-lg border border-white/10 bg-[#090b10] pl-10 pr-12 text-sm text-white outline-none transition focus:border-cyan-300/70 focus:ring-1 focus:ring-cyan-300/30"
            />
            {state.query ? (
              <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center text-zinc-500 hover:text-white">
                <X className="size-4" />
              </button>
            ) : (
              <kbd className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-white/15 px-1.5 py-0.5 font-mono text-[11px] text-zinc-500 sm:block">/</kbd>
            )}
          </label>
          <div className="-mx-4 flex items-center gap-2.5 overflow-x-auto px-4 sm:contents">
            <nav
              aria-label="PinHub sections"
              className="flex h-10 shrink-0 items-center rounded-lg border border-white/10 bg-[#090b10] p-1 sm:order-1"
            >
              <Link
                href="/"
                className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-zinc-400 transition hover:bg-white/[0.05] hover:text-white"
              >
                <CircuitBoard className="size-3.5" /> Pin Maps
              </Link>
              <span
                aria-current="page"
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-cyan-300/12 px-2.5 text-xs font-semibold text-cyan-100 shadow-[inset_0_0_0_1px_rgba(103,232,249,0.25)]"
              >
                <GitCompareArrows className="size-3.5" /> Compare
              </span>
            </nav>
            <button type="button" onClick={() => setFiltersOpen((open) => !open)} aria-expanded={filtersOpen} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-white/10 bg-[#15181f] px-3 text-sm text-zinc-200 sm:order-3 sm:shrink lg:hidden">
              <SlidersHorizontal className="size-4 text-cyan-200" /> Filters
              {activeCount ? <span className="rounded bg-cyan-300/15 px-1.5 font-mono text-xs text-cyan-100">{activeCount}</span> : null}
            </button>
            <button type="button" onClick={() => setState((current) => ({ ...current, favoritesOnly: !current.favoritesOnly }))} aria-pressed={state.favoritesOnly} className={clsx("inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border px-3 text-sm transition sm:order-4 sm:shrink", state.favoritesOnly ? "fav-button border-amber-300/60 bg-amber-300/10 text-amber-100" : "border-white/10 bg-[#15181f] text-zinc-300 hover:text-white")}>
              <Star className={clsx("fav-star size-4", state.favoritesOnly && "fill-amber-300")} /> Favorites
            </button>
            <select value={state.sort} onChange={(event) => setState((current) => ({ ...current, sort: event.target.value as SortKey }))} aria-label="Sort boards" className="h-10 shrink-0 rounded-lg border border-white/10 bg-[#15181f] px-3 text-sm text-zinc-200 outline-none sm:order-5 sm:shrink">
              {state.query ? <option value="relevance">Best match</option> : null}
              <option value="name">Name A–Z</option>
              <option value="vendor">Vendor A–Z</option>
            </select>
            <span className="ml-auto shrink-0 font-mono text-xs text-zinc-400 sm:order-6 sm:shrink" role="status" aria-live="polite">{filtered.length} matches</span>
          </div>
        </div>
      </div>

      <div className="relative mx-auto grid max-w-[1560px] gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[17rem_minmax(0,1fr)] lg:px-8">
        <aside className={clsx("space-y-3 lg:sticky lg:top-[4.75rem] lg:block lg:max-h-[calc(100vh-5.75rem)] lg:overflow-y-auto lg:pr-1", filtersOpen ? "block" : "hidden")}>
          <div className="flex items-center justify-between px-1">
            <span className="text-xs uppercase tracking-[0.16em] text-zinc-500">Discovery facets</span>
            {activeCount ? <button type="button" onClick={() => setState(defaultState)} className="text-xs text-cyan-200 hover:text-white">Clear all</button> : null}
          </div>
          <Facet title="Platform" icon={<Cpu className="size-4" />} filterKey="platform" values={options.platform} selected={state.platform} onToggle={toggleFilter} />
          <Facet title="Category" icon={<Layers3 className="size-4" />} filterKey="category" values={options.category} selected={state.category} onToggle={toggleFilter} />
          <Facet title="Logic level" icon={<Zap className="size-4" />} filterKey="logic" values={options.logic} selected={state.logic} onToggle={toggleFilter} />
          <Facet title="Wireless" icon={<Wifi className="size-4" />} filterKey="wireless" values={options.wireless} selected={state.wireless} onToggle={toggleFilter} />
          <Facet title="Connector" icon={<CircuitBoard className="size-4" />} filterKey="connector" values={options.connector} selected={state.connector} onToggle={toggleFilter} />
          <Facet title="Interfaces" icon={<SlidersHorizontal className="size-4" />} filterKey="interface" values={options.interface} selected={state.interface} onToggle={toggleFilter} collapsed />
          <label className="surface-panel flex cursor-pointer items-center justify-between rounded-lg p-3 text-sm text-zinc-300">
            Has in-app pin map
            <input type="checkbox" checked={state.pinoutOnly} onChange={(event) => setState((current) => ({ ...current, pinoutOnly: event.target.checked }))} className="size-4 accent-cyan-300" />
          </label>
        </aside>

        <section id="board-results" aria-label="Board results" className="min-w-0">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-cyan-200"><Sparkles className="size-3.5" /> Discovery workspace</div>
              <h2 className="mt-1 text-xl font-semibold text-white">Find the right board, then verify every wire.</h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-zinc-400">Use factual filters, shortlist up to three boards, and inspect the differences that matter.</p>
          </div>
          <div className="grid gap-3 xl:grid-cols-2">
            {filtered.slice(0, visible).map(({ board, matchedBy }, index) => (
              <BoardCard key={board.id} board={board} matchedBy={matchedBy} favorite={favorites.has(board.id)} comparing={compareIds.includes(board.id)} compareFull={compareIds.length === 3} onFavorite={toggleFavorite} onCompare={toggleCompare} index={index} />
            ))}
          </div>
          {visible < filtered.length ? (
            <button
              type="button"
              onClick={() =>
                startPaging(() =>
                  setVisible((current) =>
                    Math.min(current + 24, filtered.length),
                  ),
                )
              }
              disabled={paging}
              aria-disabled={paging}
              className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-[#14161d] text-sm text-zinc-300 transition hover:border-cyan-300/40 hover:text-white disabled:cursor-progress disabled:text-zinc-500"
            >
              {paging ? (
                <>
                  <LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden="true" />
                  Loading boards…
                </>
              ) : (
                `Show ${Math.min(24, filtered.length - visible)} more`
              )}
            </button>
          ) : null}
          {!filtered.length ? (
            favoritesEmpty ? (
              <div className="rounded-xl border border-dashed border-amber-300/25 bg-[#15120c] p-10 text-center">
                <Star className="mx-auto size-8 text-amber-300/80" aria-hidden="true" />
                <h2 className="mt-4 text-lg font-semibold text-white">No saved boards yet</h2>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-400">
                  Tap the star on any board to keep it here. Favorites stay on this device, so your shortlist survives a reload.
                </p>
                <button type="button" onClick={() => setState((current) => ({ ...current, favoritesOnly: false }))} className="mt-4 rounded-lg border border-amber-300/40 bg-amber-300/10 px-4 py-2 text-sm text-amber-50 transition hover:bg-amber-300/20">
                  Browse the catalog
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-white/15 bg-[#101319] p-10 text-center">
                <Database className="mx-auto size-8 text-zinc-500" />
                <h2 className="mt-4 text-lg font-semibold text-white">No boards match this stack</h2>
                <p className="mt-2 text-sm text-zinc-400">Remove one constraint or clear the complete filter set.</p>
                <button type="button" onClick={() => setState(defaultState)} className="mt-4 rounded-lg border border-cyan-300/50 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-50">Reset filters</button>
              </div>
            )
          ) : null}
        </section>
      </div>

      {/* The tray floats over the results, so it has to own an edge. A colored
          glow used to do that job; a raised neutral surface plus a lit top edge
          does it without spending the accent on a container. */}
      {compareIds.length ? (
        <div className="compare-tray fixed inset-x-3 bottom-3 z-50 mx-auto max-w-3xl rounded-xl border border-white/20 bg-[#212734] p-3 shadow-[0_20px_70px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.09)] sm:bottom-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <GitCompareArrows className="hidden size-5 shrink-0 text-cyan-200 sm:block" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap gap-1.5">
                {compareIds.map((id) => {
                  const board = catalog.find((item) => item.id === id);
                  return board ? <button key={id} type="button" onClick={() => toggleCompare(id)} className="inline-flex max-w-full items-center gap-1 rounded-md border border-white/10 bg-white/[0.05] px-2 py-1 text-xs text-zinc-200"><span className="truncate">{board.name}</span><X className="size-3 shrink-0" /></button> : null;
                })}
              </div>
              <p className="mt-1 text-[11px] text-zinc-500">{compareIds.length < 2 ? "Choose one more board." : compareIds.length === 3 ? "Comparison set is full." : "Ready to compare."}</p>
            </div>
            <Link href={compareIds.length > 1 ? `/compare?boards=${compareIds.join(",")}` : "#board-results"} aria-disabled={compareIds.length < 2} className={clsx("inline-flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition sm:w-auto", compareIds.length > 1 ? "bg-cyan-300 text-slate-950 hover:bg-cyan-200" : "pointer-events-none bg-white/10 text-zinc-600")}>Compare <ArrowRight className="size-4" /></Link>
          </div>
        </div>
      ) : null}

      <footer className="relative border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-[1560px] flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-zinc-500 sm:px-6 lg:px-8">
          <span>Always verify against linked official documentation before wiring.</span>
          <span className="font-mono">{catalog.length} boards · {sourceCount} sources</span>
        </div>
      </footer>
    </main>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  return <div className="text-right"><div className="font-mono text-lg font-semibold text-white">{value}</div><div className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">{label}</div></div>;
}

function Facet({
  title,
  icon,
  filterKey,
  values,
  selected,
  onToggle,
  collapsed = false,
}: {
  title: string;
  icon: React.ReactNode;
  filterKey: FilterKey;
  values: string[];
  selected: string[];
  onToggle: (key: FilterKey, value: string) => void;
  collapsed?: boolean;
}) {
  const content = <div className="mt-2 grid gap-1">{values.map((value) => {
    const active = selected.includes(value);
    return <button key={value} type="button" onClick={() => onToggle(filterKey, value)} aria-pressed={active} className={clsx("flex min-h-9 items-center gap-2 rounded-md border px-2.5 text-left text-sm transition", active ? "border-cyan-300/60 bg-cyan-300/10 text-cyan-50" : "border-transparent text-zinc-400 hover:bg-white/[0.05] hover:text-white")}>{active ? <Check className="size-3.5 text-cyan-200" /> : <span className="size-3.5 rounded border border-white/15" />}{value}</button>;
  })}</div>;
  return <section className="surface-panel rounded-lg p-3">{collapsed ? <details><summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-white">{icon}{title}<span className="ml-auto text-xs text-zinc-500">{selected.length || values.length}</span></summary>{content}</details> : <><div className="flex items-center gap-2 text-sm font-semibold text-white">{icon}{title}</div>{content}</>}</section>;
}

function BoardCard({
  board,
  matchedBy,
  favorite,
  comparing,
  compareFull,
  onFavorite,
  onCompare,
  index,
}: {
  board: BoardSummary;
  matchedBy: BoardMatchField | null;
  favorite: boolean;
  comparing: boolean;
  compareFull: boolean;
  onFavorite: (id: string) => void;
  onCompare: (id: string) => void;
  index: number;
}) {
  return (
    <article className="discovery-card group relative overflow-hidden rounded-xl border border-white/10 bg-[#14161d] p-4 shadow-[0_14px_34px_-24px_rgba(0,0,0,0.9)] transition duration-300 hover:-translate-y-0.5 hover:border-cyan-300/35 hover:bg-[#171b22]" style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}>
      <div className="flex items-start gap-3">
        <VendorLogo vendor={board.vendor} size={30} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/boards/${board.id}`} className="text-base font-semibold text-white outline-none before:absolute before:inset-0 before:z-0 focus-visible:before:ring-2 focus-visible:before:ring-cyan-300">{board.name}</Link>
            {board.hasPinout ? <span className="rounded border border-emerald-400/35 bg-emerald-400/10 px-1.5 py-0.5 text-[10px] text-emerald-100">Pin map</span> : null}
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs text-zinc-500">
            <span>{board.vendor} · {board.discovery.computeClass}</span>
            {matchedBy ? (
              <span className="rounded border border-cyan-300/25 bg-cyan-300/[0.07] px-1.5 py-0.5 text-[10px] uppercase tracking-[0.1em] text-cyan-200/90">
                <span className="sr-only">Matched by {matchFieldLabels[matchedBy]}</span>
                <span aria-hidden="true">{matchFieldLabels[matchedBy]} match</span>
              </span>
            ) : null}
          </p>
        </div>
        <button type="button" onClick={() => onFavorite(board.id)} aria-label={favorite ? `Remove ${board.name} from favorites` : `Add ${board.name} to favorites`} aria-pressed={favorite} className="relative z-10 grid size-11 place-items-center rounded-md text-zinc-500 transition hover:bg-white/[0.06] hover:text-amber-200"><Star className={clsx("size-4", favorite && "fill-amber-300 text-amber-300")} /></button>
      </div>
      <p className="mt-3 line-clamp-2 text-sm leading-6 text-zinc-400">{board.description}</p>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <CardSpec label="Processor" value={board.processor} />
        <CardSpec label="Logic" value={board.discovery.logicProfile} />
        <CardSpec label="Wireless" value={board.discovery.wireless.join(" · ") || "None listed"} />
        <CardSpec label="Connector" value={board.discovery.connectorEcosystems.join(" · ") || "Board-specific"} />
      </dl>
      <div className="relative z-10 mt-3 flex items-center justify-between gap-3 border-t border-white/8 pt-3">
        <span className={clsx("inline-flex items-center gap-1.5 text-xs", board.warningCount ? "text-orange-200" : "text-zinc-500")}><ShieldAlert className="size-3.5" />{board.warningCount} wiring cautions</span>
        <button type="button" onClick={() => onCompare(board.id)} disabled={compareFull && !comparing} aria-pressed={comparing} className={clsx("inline-flex h-10 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition", comparing ? "border-cyan-300/60 bg-cyan-300/12 text-cyan-50" : "border-white/10 bg-white/[0.03] text-zinc-300 hover:border-cyan-300/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-35")}><GitCompareArrows className="size-3.5" />{comparing ? "Selected" : "Compare"}</button>
      </div>
    </article>
  );
}

function CardSpec({ label, value }: { label: string; value: string }) {
  return <div className="surface-well min-w-0 rounded-md p-2"><dt className="text-[10px] uppercase tracking-[0.12em] text-zinc-600">{label}</dt><dd className="mt-1 truncate text-zinc-300" title={value}>{value}</dd></div>;
}
