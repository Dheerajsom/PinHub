"use client";

import Image from "next/image";
import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowUpRight,
  BookOpen,
  Cpu,
  Database,
  Filter,
  Layers3,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
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

const allCategory = "All";
const allInterface = "All";

export function PinHubApp() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] =
    useState<BoardCategory | typeof allCategory>(allCategory);
  const [activeInterface, setActiveInterface] =
    useState<BoardInterface | typeof allInterface>(allInterface);
  const [selectedId, setSelectedId] = useState(boards[0]?.id ?? "");

  const filteredBoards = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return boards.filter((board) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [
          board.name,
          board.vendor,
          board.family,
          board.processor,
          board.category,
          board.description,
          ...board.tags,
          ...board.interfaces,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      const matchesCategory =
        activeCategory === allCategory || board.category === activeCategory;
      const matchesInterface =
        activeInterface === allInterface ||
        board.interfaces.includes(activeInterface);

      return matchesQuery && matchesCategory && matchesInterface;
    });
  }, [activeCategory, activeInterface, query]);

  const selectedBoard =
    filteredBoards.find((board) => board.id === selectedId) ??
    filteredBoards[0] ??
    boards[0];

  const interfaceCount = new Set(boards.flatMap((board) => board.interfaces)).size;
  const sourceCount = boards.reduce(
    (total, board) => total + board.sourceLinks.length,
    0,
  );

  return (
    <main className="min-h-screen">
      <header className="border-b border-white/10 bg-black/20">
        <div className="mx-auto flex max-w-[1560px] flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-4 sm:gap-5">
                <div className="relative h-20 w-24 shrink-0 sm:h-24 sm:w-32">
                  <Image
                    src="/pinhub-logo.png"
                    alt=""
                    fill
                    sizes="(min-width: 640px) 128px, 96px"
                    className="object-contain drop-shadow-[0_0_18px_rgba(34,211,238,0.16)]"
                    priority
                    aria-hidden="true"
                  />
                </div>
                <div>
                  <h1 className="text-5xl font-semibold leading-none tracking-normal text-white sm:text-6xl">
                    PinHub
                  </h1>
                </div>
              </div>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-400 sm:text-base">
                Search SBCs, microcontrollers, and development boards by vendor,
                interface, warning, and documentation source.
              </p>
            </div>

            <div className="grid grid-cols-3 border border-white/10 bg-white/[0.03] text-sm">
              <Metric label="Boards" value={boards.length.toString()} />
              <Metric label="Interfaces" value={interfaceCount.toString()} />
              <Metric label="Source links" value={sourceCount.toString()} />
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(16rem,1fr)_auto] lg:items-center">
            <label className="relative block">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-zinc-500"
                aria-hidden="true"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search Raspberry Pi, ESP32, ADC, Jetson, 5V, ST-LINK..."
                className="h-12 w-full border border-white/10 bg-zinc-950/80 pl-11 pr-4 text-sm text-white outline-none transition focus:border-cyan-300/70"
              />
            </label>
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <Filter className="size-4" aria-hidden="true" />
              <span>{filteredBoards.length} matching boards</span>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1560px] gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[17rem_minmax(0,1fr)_minmax(24rem,34rem)] lg:px-8">
        <aside className="space-y-5">
          <FilterPanel
            title="Category"
            icon={<Layers3 className="size-4" aria-hidden="true" />}
            items={categories}
            active={activeCategory}
            onChange={(value) =>
              setActiveCategory(value as BoardCategory | typeof allCategory)
            }
          />
          <FilterPanel
            title="Interface"
            icon={<SlidersHorizontal className="size-4" aria-hidden="true" />}
            items={interfaceFilters}
            active={activeInterface}
            onChange={(value) =>
              setActiveInterface(value as BoardInterface | typeof allInterface)
            }
          />
          <section className="border border-white/10 bg-white/[0.03] p-4">
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

        <section className="min-w-0">
          <div className="grid gap-3">
            {filteredBoards.map((board) => (
              <BoardResult
                key={board.id}
                board={board}
                selected={board.id === selectedBoard.id}
                onSelect={() => setSelectedId(board.id)}
              />
            ))}
          </div>

          {filteredBoards.length === 0 ? (
            <div className="border border-dashed border-white/15 bg-white/[0.03] p-8 text-center">
              <Database className="mx-auto size-8 text-zinc-500" aria-hidden="true" />
              <h2 className="mt-4 text-lg font-semibold text-white">
                No boards match that filter
              </h2>
              <p className="mt-2 text-sm text-zinc-400">
                Try a broader search term or clear one of the filters.
              </p>
            </div>
          ) : null}
        </section>

        <BoardDetail board={selectedBoard} />
      </div>
    </main>
  );
}

type MetricProps = {
  label: string;
  value: string;
};

function Metric({ label, value }: MetricProps) {
  return (
    <div className="min-w-24 border-r border-white/10 px-4 py-3 last:border-r-0">
      <div className="font-mono text-2xl font-semibold text-white">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </div>
    </div>
  );
}

type FilterPanelProps = {
  title: string;
  icon: ReactNode;
  items: readonly string[];
  active: string;
  onChange: (value: string) => void;
};

function FilterPanel({ title, icon, items, active, onChange }: FilterPanelProps) {
  return (
    <section className="border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
        {icon}
        {title}
      </div>
      <div className="flex flex-wrap gap-2 lg:flex-col">
        {items.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            className={clsx(
              "min-h-9 border px-3 py-2 text-left text-sm transition",
              active === item
                ? "border-cyan-300/70 bg-cyan-300/10 text-cyan-50"
                : "border-white/10 bg-black/20 text-zinc-400 hover:border-white/25 hover:text-white",
            )}
            aria-pressed={active === item}
          >
            {item}
          </button>
        ))}
      </div>
    </section>
  );
}

type BoardResultProps = {
  board: Board;
  selected: boolean;
  onSelect: () => void;
};

function BoardResult({ board, selected, onSelect }: BoardResultProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx(
        "w-full border p-4 text-left transition",
        selected
          ? "border-cyan-300/70 bg-cyan-300/[0.08]"
          : "border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.05]",
      )}
      aria-pressed={selected}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-white">{board.name}</h2>
            <span className="border border-white/10 bg-black/30 px-2 py-1 text-xs text-zinc-300">
              {board.category}
            </span>
          </div>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-400">
            {board.description}
          </p>
        </div>
        <div className="shrink-0 text-left md:text-right">
          <div className="text-sm font-medium text-zinc-200">{board.vendor}</div>
          <div className="mt-1 font-mono text-xs text-zinc-500">
            {board.logicLevel}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {board.interfaces.slice(0, 8).map((item) => (
          <span
            key={item}
            className="border border-white/10 bg-zinc-950 px-2 py-1 text-xs text-zinc-300"
          >
            {item}
          </span>
        ))}
      </div>
    </button>
  );
}

type BoardDetailProps = {
  board: Board;
};

function BoardDetail({ board }: BoardDetailProps) {
  return (
    <aside className="min-w-0 space-y-4 lg:sticky lg:top-5 lg:self-start">
      <section className="border border-white/10 bg-white/[0.04] p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
              Selected board
            </div>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              {board.name}
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              {board.vendor} / {board.family}
            </p>
          </div>
          <div className="grid size-11 place-items-center border border-amber-300/40 bg-amber-300/10 text-amber-100">
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
        />
      </section>

      <section className="border border-white/10 bg-white/[0.03] p-4">
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
              className="flex items-center justify-between gap-3 border border-white/10 bg-black/20 px-3 py-3 text-sm text-zinc-300 transition hover:border-cyan-300/50 hover:text-white"
            >
              <span className="min-w-0">
                <span className="mr-2 text-xs uppercase tracking-[0.14em] text-zinc-500">
                  {source.type}
                </span>
                {source.label}
              </span>
              <ArrowUpRight className="size-4 shrink-0" aria-hidden="true" />
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
};

function InfoBlock({ title, icon, items }: InfoBlockProps) {
  return (
    <section className="border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
        {icon}
        {title}
      </div>
      <ul className="space-y-2 text-sm leading-6 text-zinc-400">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
