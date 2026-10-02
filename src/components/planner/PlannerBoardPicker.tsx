"use client";

import { useId, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import { Search } from "lucide-react";
import type { BoardSummary } from "@/lib/board-summary";
import {
  createBoardSearchIndex,
  matchBoardSearchEntry,
  tokenizeQuery,
} from "@/lib/board-search";
import { VendorLogo } from "@/components/VendorLogo";
import { useSlashToFocus } from "@/components/catalog/useSlashToFocus";

const maxResults = 12;
const maxQueryLength = 256;

/**
 * Step one of the planner: find the board. Every board with a pin map can be
 * planned by hand; the tag says which ones PinHub can also auto-assign.
 */
export function PlannerBoardPicker({
  catalog,
  autoAssignIds,
  onPick,
  notice,
}: {
  catalog: readonly BoardSummary[];
  autoAssignIds: readonly string[];
  onPick: (id: string) => void;
  notice?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  useSlashToFocus(inputRef);
  const listId = useId();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const index = useMemo(() => createBoardSearchIndex(catalog), [catalog]);
  const auto = useMemo(() => new Set(autoAssignIds), [autoAssignIds]);
  const quickPicks = useMemo(
    () => catalog.filter((board) => auto.has(board.id)),
    [auto, catalog],
  );

  const tokens = useMemo(() => tokenizeQuery(query), [query]);
  const results = useMemo(() => {
    if (!tokens.length) return [];
    return index
      .flatMap((entry) => {
        const match = matchBoardSearchEntry(entry, tokens);
        return match ? [{ board: entry.board, score: match.score }] : [];
      })
      .sort((a, b) => b.score - a.score || a.board.name.localeCompare(b.board.name))
      .slice(0, maxResults)
      .map((item) => item.board);
  }, [index, tokens]);
  const current = results[Math.min(active, results.length - 1)];

  function move(delta: number) {
    if (!results.length) return;
    let next = Math.min(active, results.length - 1);
    for (let step = 0; step < results.length; step += 1) {
      next = (next + delta + results.length) % results.length;
      if (results[next].hasPinout) break;
    }
    setActive(next);
  }

  return (
    <section aria-labelledby={`${listId}-title`} className="surface-panel rounded-2xl p-5 sm:p-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-cyan-200">Pin planner</p>
      <h1 id={`${listId}-title`} className="mt-2 text-[1.75rem] font-semibold leading-tight tracking-tight text-white">
        Which board are you wiring?
      </h1>
      <p className="mt-2 max-w-2xl text-[15px] leading-7 text-zinc-400">
        Pick your board, then mark the pins your circuit uses. On boards with source-backed pin
        functions PinHub can also assign buses for you.
      </p>
      {notice ? (
        <p role="status" className="surface-well mt-4 max-w-2xl rounded-md px-3 py-2 text-[13px] leading-6 text-zinc-300">
          {notice}
        </p>
      ) : null}

      <div className="relative mt-5 max-w-2xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
        <input
          ref={inputRef}
          role="combobox"
          aria-label="Search for your board"
          aria-expanded={results.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={current ? `${listId}-${current.id}` : undefined}
          autoComplete="off"
          spellCheck={false}
          maxLength={maxQueryLength}
          value={query}
          placeholder="Search by board, vendor, or chip…"
          onChange={(event) => {
            setQuery(event.target.value.slice(0, maxQueryLength));
            setActive(0);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              move(1);
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              move(-1);
            } else if (event.key === "Enter") {
              const target = current?.hasPinout ? current : results.find((board) => board.hasPinout);
              if (target) {
                event.preventDefault();
                onPick(target.id);
              }
            } else if (event.key === "Escape" && query) {
              event.preventDefault();
              setQuery("");
            }
          }}
          className="h-12 w-full rounded-md border border-white/10 bg-[#0a0c11] pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-cyan-300/70 focus:ring-1 focus:ring-cyan-300/30"
        />
      </div>

      <ul
        id={listId}
        role="listbox"
        aria-label="Boards"
        className={clsx("mt-2 max-w-2xl", results.length ? "surface-well rounded-md p-1" : "")}
      >
        {results.map((board) => {
          const selectable = board.hasPinout;
          const isActive = board === current;
          return (
            <li
              key={board.id}
              id={`${listId}-${board.id}`}
              role="option"
              aria-selected={isActive}
              aria-disabled={!selectable}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                if (selectable) onPick(board.id);
              }}
              className={clsx(
                "ph-plan-option flex min-h-11 items-center gap-3 rounded px-2 py-1.5",
                selectable ? "cursor-pointer" : "cursor-not-allowed opacity-50",
              )}
            >
              <VendorLogo vendor={board.vendor} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-white">{board.name}</span>
                <span className="block truncate font-mono text-[11px] text-zinc-500">
                  {board.vendor} / {board.family}
                </span>
              </span>
              <CapabilityTag auto={auto.has(board.id)} mapped={selectable} />
            </li>
          );
        })}
      </ul>
      <p
        role="status"
        aria-live="polite"
        className={tokens.length && !results.length ? "mt-2 text-[13px] text-zinc-400" : "sr-only"}
      >
        {tokens.length
          ? results.length
            ? `${results.length} ${results.length === 1 ? "board" : "boards"} found`
            : "No board matches that."
          : ""}
      </p>

      {quickPicks.length ? (
        <div role="group" aria-labelledby={`${listId}-quick`} className="mt-6">
          <h2 id={`${listId}-quick`} className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
            Boards with auto-assign
          </h2>
          <div className="mt-2 grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(min(100%,15rem),1fr))]">
            {quickPicks.map((board) => (
              <button
                key={board.id}
                type="button"
                onClick={() => onPick(board.id)}
                className="surface-well flex min-h-11 min-w-0 items-center gap-2 rounded-lg px-3 py-2 text-left text-zinc-200 transition hover:border-cyan-300/40 hover:text-white"
              >
                <VendorLogo vendor={board.vendor} />
                <span className="min-w-0 truncate text-sm font-medium">{board.name}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function CapabilityTag({ auto, mapped }: { auto: boolean; mapped: boolean }) {
  const label = !mapped ? "No pin map" : auto ? "Auto-assign" : "Manual";
  return (
    <span
      className={clsx(
        "shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px]",
        auto && mapped
          ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-100"
          : "border-white/10 text-zinc-400",
      )}
    >
      {label}
    </span>
  );
}
