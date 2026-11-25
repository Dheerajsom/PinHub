"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Board } from "@/lib/boards";
import type { BoardDetailLoader } from "@/lib/board-detail-loader";

/** One board's full record as a page loads it on demand. */
export type BoardDetail =
  | { status: "idle"; notice?: string }
  | { status: "loading"; id: string }
  | { status: "ready"; board: Board }
  | { status: "error"; id: string };

/** The id a detail is about, whatever its state. */
export function detailId(detail: BoardDetail): string | null {
  if (detail.status === "idle") return null;
  return detail.status === "ready" ? detail.board.id : detail.id;
}

/**
 * The one board a page works on (Check, the planner). A newer `open` always
 * wins: a slow response for a board the reader has since left is dropped.
 */
export function useBoardDetail(loader: BoardDetailLoader) {
  const [detail, setDetail] = useState<BoardDetail>({ status: "idle" });
  const ticket = useRef(0);

  /** Clears the board, with an optional line saying why. */
  const reset = useCallback((notice?: string) => {
    ticket.current += 1;
    setDetail(notice ? { status: "idle", notice } : { status: "idle" });
  }, []);

  const open = useCallback(
    (id: string) => {
      const mine = ++ticket.current;
      const cached = loader.peek(id);
      if (cached) {
        setDetail({ status: "ready", board: cached });
        return;
      }
      setDetail({ status: "loading", id });
      loader.load(id).then(
        (board) => {
          if (ticket.current === mine) setDetail({ status: "ready", board });
        },
        () => {
          if (ticket.current === mine) setDetail({ status: "error", id });
        },
      );
    },
    [loader],
  );

  return { detail, open, reset };
}

export type BoardDetailEntry = { status: "loading" } | { status: "ready"; board: Board } | { status: "error" };

/** Several boards at once, keyed by id (Link's two ends). */
export function useBoardDetails(loader: BoardDetailLoader) {
  const [details, setDetails] = useState<Record<string, BoardDetailEntry>>({});
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  /** Loads a board unless it is already loaded or loading; `retry` reloads a failure. */
  const ensure = useCallback(
    (id: string, retry = false) => {
      const cached = loader.peek(id);
      if (cached) {
        setDetails((value) => (value[id]?.status === "ready" ? value : { ...value, [id]: { status: "ready", board: cached } }));
        return;
      }
      setDetails((value) => (value[id] && !retry ? value : { ...value, [id]: { status: "loading" } }));
      // The loader shares one request per id, so a repeat call costs nothing.
      loader.load(id).then(
        (board) => {
          if (mounted.current) setDetails((value) => ({ ...value, [id]: { status: "ready", board } }));
        },
        () => {
          if (mounted.current) setDetails((value) => ({ ...value, [id]: { status: "error" } }));
        },
      );
    },
    [loader],
  );

  return { details, ensure };
}
