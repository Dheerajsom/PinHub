"use client";

import { useCallback, useMemo } from "react";
import type { BoardSummary } from "@/lib/board-summary";
import { createBoardDetailLoader, type BoardDetailLoader } from "@/lib/board-detail-loader";
import { boardFromSearch, boardParam } from "@/lib/plan-params";
import { useBoardDetail } from "@/components/catalog/useBoardDetail";
import { pushSearchParam, useLocationSync } from "@/components/catalog/useLocationSync";
import { PlannerBoardPicker } from "@/components/planner/PlannerBoardPicker";
import { PlannerWorkspace } from "@/components/planner/PlannerWorkspace";

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
  const { detail, open: load, reset } = useBoardDetail(loader);

  const open = useCallback(
    (id: string | null) => {
      const summary = id ? byId.get(id) : undefined;
      if (!id || !summary) reset();
      else if (!summary.hasPinout) reset(`${summary.name} has no pin map in PinHub yet, so there is nothing to plan. Pick another board.`);
      else load(id);
    },
    [byId, load, reset],
  );

  useLocationSync(useCallback(() => open(boardFromSearch(location.search)), [open]));

  function pick(id: string) {
    pushSearchParam(boardParam, id);
    open(id);
  }

  function changeBoard() {
    pushSearchParam(boardParam, null);
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
