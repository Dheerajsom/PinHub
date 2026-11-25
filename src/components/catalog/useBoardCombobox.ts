"use client";

import { useId, useMemo, useState, type KeyboardEvent } from "react";
import type { BoardSummary } from "@/lib/board-summary";
import { matchBoardSearchEntry, tokenizeQuery, type BoardSearchEntry } from "@/lib/board-search";

/** Ranks the boards that match a query, best first, then by name. */
export function rankBoards(index: readonly BoardSearchEntry[], tokens: readonly string[], limit: number): BoardSummary[] {
  if (!tokens.length) return [];
  return index
    .flatMap((entry) => {
      const match = matchBoardSearchEntry(entry, [...tokens]);
      return match ? [{ board: entry.board, score: match.score }] : [];
    })
    .sort((a, b) => b.score - a.score || a.board.name.localeCompare(b.board.name))
    .slice(0, limit)
    .map((item) => item.board);
}

/**
 * The board-search combobox shared by Check, Link, and the planner: one query,
 * ranked results, a keyboard-active option that skips boards that cannot be
 * picked, Enter to pick, Escape to clear. Markup stays with each page; this
 * owns the behaviour and the ARIA wiring so the three cannot drift apart.
 */
export function useBoardCombobox({
  index,
  limit,
  maxQueryLength = 256,
  selectable = () => true,
  onPick,
}: {
  index: readonly BoardSearchEntry[];
  limit: number;
  maxQueryLength?: number;
  selectable?: (board: BoardSummary) => boolean;
  onPick: (id: string) => void;
}) {
  const listId = useId();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const tokens = useMemo(() => tokenizeQuery(query), [query]);
  const results = useMemo(() => rankBoards(index, tokens, limit), [index, tokens, limit]);
  const current = results.length ? results[Math.min(active, results.length - 1)] : undefined;
  const optionId = (board: BoardSummary) => `${listId}-${board.id}`;

  function move(delta: number) {
    if (!results.length) return;
    let next = Math.min(active, results.length - 1);
    for (let step = 0; step < results.length; step += 1) {
      next = (next + delta + results.length) % results.length;
      if (selectable(results[next])) break;
    }
    setActive(next);
  }

  function pick(board: BoardSummary | undefined) {
    if (board && selectable(board)) onPick(board.id);
  }

  const inputProps = {
    role: "combobox" as const,
    "aria-expanded": results.length > 0,
    "aria-controls": listId,
    "aria-autocomplete": "list" as const,
    "aria-activedescendant": current ? optionId(current) : undefined,
    autoComplete: "off",
    spellCheck: false,
    maxLength: maxQueryLength,
    value: query,
    onChange: (event: { target: { value: string } }) => {
      setQuery(event.target.value.slice(0, maxQueryLength));
      setActive(0);
    },
    onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        move(event.key === "ArrowDown" ? 1 : -1);
      } else if (event.key === "Enter") {
        const target = current && selectable(current) ? current : results.find(selectable);
        if (target) {
          event.preventDefault();
          onPick(target.id);
        }
      } else if (event.key === "Escape" && query) {
        event.preventDefault();
        setQuery("");
      }
    },
  };

  const optionProps = (board: BoardSummary) => ({
    id: optionId(board),
    role: "option" as const,
    "aria-selected": board === current,
    "aria-disabled": selectable(board) ? undefined : true,
    // Keep focus in the input so the combobox stays open while clicking.
    onMouseDown: (event: { preventDefault: () => void }) => event.preventDefault(),
    onClick: () => pick(board),
  });

  return { listId, query, setQuery, tokens, results, current, inputProps, optionProps };
}
