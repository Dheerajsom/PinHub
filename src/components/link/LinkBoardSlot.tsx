"use client";

import { useId, useMemo, useState } from "react";
import { clsx } from "clsx";
import { Search } from "lucide-react";
import type { BoardSummary } from "@/lib/board-summary";
import {
  createBoardSearchIndex,
  matchBoardSearchEntry,
  tokenizeQuery,
  type BoardSearchEntry,
} from "@/lib/board-search";
import { VendorLogo } from "@/components/VendorLogo";

const maxResults = 8;
const maxQueryLength = 256;

/**
 * One end of the link: a board search until a board is picked, then the
 * board's identity and logic level, which is what the link turns on.
 */
export function LinkBoardSlot({
  side,
  index,
  board,
  status,
  onPick,
  onChange,
  onRetry,
}: {
  side: "A" | "B";
  index: readonly BoardSearchEntry[];
  board: BoardSummary | null;
  status: "idle" | "loading" | "ready" | "error";
  onPick: (id: string) => void;
  onChange: () => void;
  onRetry: () => void;
}) {
  const listId = useId();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const tokens = useMemo(() => tokenizeQuery(query), [query]);
  const results = useMemo(() => {
    if (!tokens.length) return [];
    return index
      .flatMap((entry) => {
        const match = matchBoardSearchEntry(entry, tokens);
        return match ? [{ board: entry.board, score: match.score }] : [];
      })
      .sort((x, y) => y.score - x.score || x.board.name.localeCompare(y.board.name))
      .slice(0, maxResults)
      .map((item) => item.board);
  }, [index, tokens]);
  const current = results[Math.min(active, results.length - 1)];

  if (board) {
    return (
      <div className="ph-link-slot surface-panel min-w-0 rounded-xl p-3.5" data-side={side}>
        <div className="flex items-start gap-3">
          <span className="ph-link-side" aria-hidden="true">{side}</span>
          <div className="min-w-0 flex-1">
            <p className="flex min-w-0 items-center gap-2">
              <VendorLogo vendor={board.vendor} />
              <span className="truncate text-[15px] font-semibold text-white">{board.name}</span>
            </p>
            <p className="mt-1 truncate font-mono text-[11px] text-zinc-500">
              {board.vendor} / {board.processor}
            </p>
            <p className="mt-1.5 font-mono text-[12px] leading-5 text-zinc-300">{board.logicLevel}</p>
            {status === "loading" ? (
              <p role="status" className="mt-1.5 text-[12px] text-zinc-400">Loading pin map…</p>
            ) : status === "error" ? (
              <p role="alert" className="mt-1.5 text-[12px] text-zinc-300">
                The pin map could not be loaded.{" "}
                <button type="button" onClick={onRetry} className="ph-link-text-button">
                  Try again
                </button>
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onChange}
            aria-label={`Change board ${side}, ${board.name}`}
            className="ph-link-ghost shrink-0"
          >
            Change
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ph-link-slot surface-panel min-w-0 rounded-xl p-3.5" data-side={side}>
      <div className="flex items-center gap-3">
        <span className="ph-link-side" aria-hidden="true">{side}</span>
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
          <input
            role="combobox"
            aria-label={`Search for board ${side}`}
            aria-expanded={results.length > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={current ? `${listId}-${current.id}` : undefined}
            autoComplete="off"
            spellCheck={false}
            maxLength={maxQueryLength}
            value={query}
            placeholder={side === "A" ? "First board, e.g. Raspberry Pi 5" : "Second board, e.g. Arduino UNO"}
            onChange={(event) => {
              setQuery(event.target.value.slice(0, maxQueryLength));
              setActive(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                if (!results.length) return;
                const delta = event.key === "ArrowDown" ? 1 : -1;
                setActive((value) => (Math.min(value, results.length - 1) + delta + results.length) % results.length);
              } else if (event.key === "Enter") {
                const target = current?.hasPinout ? current : results.find((item) => item.hasPinout);
                if (target) {
                  event.preventDefault();
                  onPick(target.id);
                }
              } else if (event.key === "Escape" && query) {
                event.preventDefault();
                setQuery("");
              }
            }}
            className="ph-link-input h-11 w-full rounded-md pl-10 pr-3 text-[16px] outline-none transition sm:text-sm"
          />
        </div>
      </div>
      <ul
        id={listId}
        role="listbox"
        aria-label={`Boards for ${side}`}
        className={clsx(results.length ? "surface-well mt-2 rounded-md p-1" : "")}
      >
        {results.map((item) => (
          <li
            key={item.id}
            id={`${listId}-${item.id}`}
            role="option"
            aria-selected={item === current}
            aria-disabled={!item.hasPinout}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              if (item.hasPinout) onPick(item.id);
            }}
            className={clsx(
              "ph-plan-option flex min-h-11 items-center gap-3 rounded px-2 py-1.5",
              item.hasPinout ? "cursor-pointer" : "cursor-not-allowed opacity-50",
            )}
          >
            <VendorLogo vendor={item.vendor} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-white">{item.name}</span>
              <span className="block truncate font-mono text-[11px] text-zinc-500">{item.logicLevel}</span>
            </span>
            {item.hasPinout ? null : (
              <span className="shrink-0 rounded border border-white/10 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                No pin map
              </span>
            )}
          </li>
        ))}
      </ul>
      <p role="status" aria-live="polite" className={tokens.length && !results.length ? "mt-2 text-[13px] text-zinc-400" : "sr-only"}>
        {tokens.length && !results.length ? "No board matches that." : ""}
      </p>
    </div>
  );
}

/** One search index for both slots. */
export function useLinkSearchIndex(catalog: readonly BoardSummary[]) {
  return useMemo(() => createBoardSearchIndex(catalog), [catalog]);
}
