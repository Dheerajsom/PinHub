"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Board } from "@/lib/boards";
import type { BoardSummary } from "@/lib/board-summary";
import { createBoardDetailLoader, type BoardDetailLoader } from "@/lib/board-detail-loader";
import { boardFromSearch, boardParam } from "@/lib/plan-params";
import { PlannerBoardPicker } from "@/components/planner/PlannerBoardPicker";
import { PlannerWorkspace } from "@/components/planner/PlannerWorkspace";

type Detail =
  | { status: "idle"; notice?: string }
  | { status: "loading"; id: string }
  | { status: "ready"; board: Board }
  | { status: "error"; id: string };

/**
 * The planner page: pick a board, then plan it. The board lives in `?board=`
 * and its full record is fetched on demand, so the page ships only the
 * catalog summaries.
 */
export function PlannerApp({
  catalog,
  autoAssignIds,
  loader: providedLoader,
}: {
  catalog: readonly BoardSummary[];
  autoAssignIds: readonly string[];
  loader?: BoardDetailLoader;
}) {
  const byId = useMemo(() => new Map(catalog.map((board) => [board.id, board])), [catalog]);
  const loader = useMemo(() => providedLoader ?? createBoardDetailLoader([]), [providedLoader]);
  const [detail, setDetail] = useState<Detail>({ status: "idle" });
  const ticket = useRef(0);

  const open = useCallback(
    (id: string | null) => {
      const mine = ++ticket.current;
      const summary = id ? byId.get(id) : undefined;
      if (!id || !summary) {
        setDetail({ status: "idle" });
        return;
      }
      if (!summary.hasPinout) {
        setDetail({
          status: "idle",
          notice: `${summary.name} has no pin map in PinHub yet, so there is nothing to plan. Pick another board.`,
        });
        return;
      }
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
    [byId, loader],
  );

  // The page is static, so the board in the URL is only known in the browser.
  useEffect(() => {
    const sync = () => open(boardFromSearch(location.search));
    const frame = requestAnimationFrame(sync);
    window.addEventListener("popstate", sync);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("popstate", sync);
    };
  }, [open]);

  function pick(id: string) {
    history.pushState(null, "", `${location.pathname}?${boardParam}=${encodeURIComponent(id)}`);
    open(id);
  }

  function changeBoard() {
    history.pushState(null, "", location.pathname);
    open(null);
  }

  if (detail.status === "ready") {
    return <PlannerWorkspace key={detail.board.id} board={detail.board} onChangeBoard={changeBoard} />;
  }

  if (detail.status === "loading" || detail.status === "error") {
    const { id } = detail;
    const name = byId.get(id)?.name ?? "the board";
    const failed = detail.status === "error";
    return (
      <section aria-label="Pin planner" className="surface-panel rounded-2xl p-5 sm:p-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-cyan-200">Pin planner</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">{name}</h1>
        <p role="status" aria-live="polite" className="mt-2 text-[13px] leading-6 text-zinc-400">
          {failed ? "The board details could not be loaded." : "Loading source-backed pin data…"}
        </p>
        {failed ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => open(id)}
              className="inline-flex min-h-11 items-center rounded-md border border-cyan-300/60 bg-cyan-300/10 px-3 text-cyan-50 transition hover:bg-cyan-300/20"
            >
              <span className="text-[12px] font-medium">Try again</span>
            </button>
            <button
              type="button"
              onClick={changeBoard}
              className="inline-flex min-h-11 items-center rounded-md border border-white/10 bg-white/[0.03] px-3 text-zinc-300 transition hover:border-white/25 hover:text-white"
            >
              <span className="text-[12px] font-medium">Pick another board</span>
            </button>
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <PlannerBoardPicker
      catalog={catalog}
      autoAssignIds={autoAssignIds}
      onPick={pick}
      notice={detail.notice}
    />
  );
}
