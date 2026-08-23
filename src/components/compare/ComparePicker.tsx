"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { GitCompareArrows, Search, X } from "lucide-react";
import { clsx } from "clsx";
import type { BoardSummary } from "@/lib/board-summary";
import {
  createBoardSearchIndex,
  matchBoardSearchEntry,
  tokenizeQuery,
} from "@/lib/board-search";
import { compareUrl, maxComparedBoards } from "@/lib/compare-params";
import { clearCompared, toggleCompared, useCompared } from "@/lib/compare-tray";
import { VendorLogo } from "@/components/VendorLogo";

/**
 * The comparison's empty state: pick the boards.
 *
 * This is deliberately *not* a second catalog — the index at `/` is the one
 * browsing surface. This is a short picker seeded with whatever is already in
 * the tray, so arriving here from the index means the work is already done.
 */
export function ComparePicker({
  catalog,
  seeded,
}: {
  catalog: BoardSummary[];
  /** Board ids already named by the URL, so a shared half-built link still works. */
  seeded: string[];
}) {
  const [query, setQuery] = useState("");
  const tray = useCompared();

  // The URL wins on first paint (it is shareable); the tray adds to it.
  const selected = useMemo(() => {
    const ids = [...new Set([...seeded, ...tray])].slice(0, maxComparedBoards);
    return ids
      .map((id) => catalog.find((board) => board.id === id))
      .filter((board): board is BoardSummary => Boolean(board));
  }, [catalog, seeded, tray]);

  const entries = useMemo(() => createBoardSearchIndex(catalog), [catalog]);
  const suggestions = useMemo(() => {
    const tokens = tokenizeQuery(query);
    if (!tokens.length) return [];
    return entries
      .map((entry) => ({ entry, match: matchBoardSearchEntry(entry, tokens) }))
      .filter((row) => row.match)
      .sort((a, b) => (b.match?.score ?? 0) - (a.match?.score ?? 0))
      .slice(0, 8)
      .map((row) => row.entry.board);
  }, [entries, query]);

  const selectedIds = new Set(selected.map((board) => board.id));
  const full = selected.length >= maxComparedBoards;

  return (
    <div className="mx-auto max-w-3xl">
      <section className="panel">
        <h2 className="silk border-b border-rule px-3 py-1.5">
          Boards in this comparison · {selected.length}/{maxComparedBoards}
        </h2>

        {selected.length ? (
          <ul className="grid gap-1 p-3">
            {selected.map((board) => (
              <li
                key={board.id}
                className="well flex items-center gap-2 px-2.5 py-2"
              >
                <VendorLogo vendor={board.vendor} size={18} />
                <span className="min-w-0 flex-1">
                  <span className="readout block truncate text-sm uppercase text-ink">
                    {board.name}
                  </span>
                  <span className="data block truncate text-[11px] text-faint">
                    {board.vendor} · {board.discovery.logicProfile}
                    {board.hasPinout ? ` · ${board.pinCount} pins mapped` : " · no pin map"}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => toggleCompared(board.id)}
                  aria-label={`Remove ${board.name} from the comparison`}
                  className="grid size-8 shrink-0 place-items-center text-faint transition-colors hover:text-ink"
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-3 text-[13px] leading-snug text-dim">
            Nothing shortlisted yet. Search below, or add boards from the index
            with the compare control on any row.
          </p>
        )}

        <div className="border-t border-rule p-3">
          <label className="relative block">
            <Search
              className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-faint"
              aria-hidden="true"
            />
            <span className="sr-only">Search boards to compare</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search a board to add"
              className="h-9 w-full border border-rule bg-well pl-7 pr-2 text-[13px] text-ink outline-none placeholder:text-faint focus-visible:border-ink"
            />
          </label>

          {suggestions.length ? (
            <ul className="mt-2 grid gap-0.5">
              {suggestions.map((board) => {
                const already = selectedIds.has(board.id);
                const disabled = full && !already;
                return (
                  <li key={board.id}>
                    <button
                      type="button"
                      onClick={() => toggleCompared(board.id)}
                      disabled={disabled}
                      aria-pressed={already}
                      className={clsx(
                        "flex w-full items-center gap-2 px-2 py-1.5 text-left transition-colors",
                        disabled
                          ? "cursor-not-allowed opacity-45"
                          : "hover:bg-raised",
                      )}
                    >
                      <VendorLogo vendor={board.vendor} size={16} />
                      <span className="min-w-0 flex-1 truncate text-[13px] text-ink">
                        {board.name}
                      </span>
                      <span className="silk shrink-0">
                        {already ? "Added" : disabled ? "Full" : "Add"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : query.trim() ? (
            <p className="mt-2 text-[13px] text-dim">
              No board matches “{query.trim()}”.
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 border-t border-rule p-3">
          <Link
            href={compareUrl(selected.map((board) => board.id))}
            aria-disabled={selected.length < 2}
            onClick={(event) => {
              if (selected.length < 2) event.preventDefault();
            }}
            className={clsx(
              "ctl",
              selected.length < 2 && "pointer-events-none opacity-45",
            )}
          >
            <GitCompareArrows className="size-3.5" aria-hidden="true" />
            {selected.length < 2
              ? "Pick at least two boards"
              : `Compare ${selected.length} boards`}
          </Link>
          {selected.length ? (
            <button type="button" onClick={clearCompared} className="ctl">
              Clear
            </button>
          ) : null}
          <Link href="/" className="ctl">
            Back to the index
          </Link>
        </div>
      </section>
    </div>
  );
}
