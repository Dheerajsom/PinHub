import { Flag, Route } from "lucide-react";
import type { Board } from "@/lib/boards";
import { pinReportContextFor, pinReportUrl } from "@/lib/pin-report";
import { PinPlanner } from "@/components/planner/PinPlanner";

/**
 * "Plan pins" for a board page or full pinout view. Boards without
 * source-backed pin functions get one line saying so, never a guessed plan.
 */
export function PinPlannerSection({ board }: { board: Board }) {
  if (board.pinFunctions && board.pinout) {
    return (
      <section id="plan" aria-label="Pin planner" className="surface-panel scroll-mt-20 rounded-xl p-4 sm:p-5">
        <PinPlanner board={board} />
      </section>
    );
  }

  const reportUrl = pinReportUrl(pinReportContextFor(board));
  return (
    <section
      id="plan"
      aria-label="Pin planner"
      className="surface-panel flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl px-4 py-2 text-[13px] text-zinc-400"
    >
      <span className="flex min-h-11 items-center gap-2">
        <Route className="size-4 shrink-0 text-zinc-500" aria-hidden="true" />
        Pin planning isn&apos;t available for this board yet.
      </span>
      {reportUrl ? (
        <a
          href={reportUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-1.5 text-zinc-400 underline-offset-4 transition hover:text-white hover:underline"
        >
          <Flag className="size-3.5" aria-hidden="true" />
          Report a data error
          <span className="sr-only"> on GitHub (opens in a new tab)</span>
        </a>
      ) : null}
    </section>
  );
}
