import Link from "next/link";
import { ArrowRight, CircuitBoard, TriangleAlert } from "lucide-react";
import type { Board } from "@/lib/boards";
import {
  assignmentLines,
  finderPageSize,
  hasRequirements,
  plannerHref,
  serializeFinderQuery,
  type FinderFit,
  type FinderQuery,
  type FinderResult,
} from "@/lib/board-finder";
import { defaultPlanStepBudget } from "@/lib/pin-planner";
import { VendorLogo } from "@/components/VendorLogo";
import { FindMoreLink } from "@/components/find/FindMoreLink";

/** Fits listed before "Show more"; a later page is asked for in the URL. */
export const finderVisibleFits = finderPageSize;
/** Assignment lines shown per board before "+N more in the plan". */
const visibleLines = 4;

export function FindResults({ query, result }: { query: FinderQuery; result: FinderResult }) {
  const asked = hasRequirements(query.requirements);
  const { fits, misses, undecided, unchecked, checked } = result;
  const visible = Math.min(fits.length, query.show ?? finderVisibleFits);
  const shown = fits.slice(0, visible);
  const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;
  const remaining = fits.length - visible;
  const nextSearch = serializeFinderQuery({ ...query, show: visible + finderPageSize });

  return (
    <section aria-labelledby="find-results-heading">
      <h2 id="find-results-heading" className="text-lg font-semibold tracking-tight text-white">
        {!asked || fits.length
          ? "Boards that fit"
          : undecided.length
            ? "No board confirmed yet"
            : "No board fits all of that"}
      </h2>
      <p role="status" aria-live="polite" className="mt-1 text-sm leading-6 text-zinc-400">
        {!asked
          ? `Add a bus or pin above. PinHub will check ${checked} ${checked === 1 ? "board" : "boards"} with source-backed pin functions.`
          : fits.length
            ? `Fits on ${fits.length} of ${checked} ${checked === 1 ? "board" : "boards"} checked.`
            : undecided.length
              ? `No fit confirmed on the ${plural(checked, "board", "boards")} checked: ${plural(misses.length, "board can't", "boards can't")} take all of it, and the search couldn't settle ${plural(undecided.length, "board", "boards")}. Remove a requirement, or read the details below.`
              : `None of the ${plural(checked, "board", "boards")} checked can take all of it at once. Remove a requirement, or read why each board missed below.`}
      </p>
      {asked && fits.length ? (
        <p className="mt-1 text-xs leading-5 text-zinc-500">
          Each fit is the pin planner&apos;s own plan, from source-backed pin functions. Clean fits
          come first, then fits that need pins with recorded cautions; each group in catalog order.
        </p>
      ) : null}

      {shown.length ? (
        <ul className="mt-4 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(100%,22rem),1fr))]">
          {shown.map((fit, index) => (
            <FitCard key={fit.board.id} fit={fit} query={query} index={index} />
          ))}
        </ul>
      ) : null}
      {/* Later fits are a URL step, never rendered hidden: each card is a
          server-rendered plan, and folding them all cost ~300 KB per change. */}
      <FindMoreLink
        href={`/find?${nextSearch}`}
        visible={visible}
        label={remaining ? `Show ${Math.min(finderPageSize, remaining)} more of ${plural(remaining, "board", "boards")} that fit` : null}
      />

      {asked && misses.length ? (
        <details className="surface-panel mt-5 rounded-xl p-4" open={!fits.length}>
          <summary className="ph-find-summary flex min-h-11 cursor-pointer items-center rounded-md px-1 text-sm font-medium text-white">
            Doesn&apos;t fit on {plural(misses.length, "board", "boards")}
          </summary>
          <ul className="mt-2 grid gap-1.5">
            {misses.map(({ board, reason }) => (
              <MissRow key={board.id} board={board} reason={reason} />
            ))}
          </ul>
        </details>
      ) : null}

      {/* Undecided is not a miss: the planner neither found a plan nor ruled
          one out, so these boards are listed apart and never counted as
          "doesn't fit". */}
      {asked && undecided.length ? (
        <details className="surface-panel mt-3 rounded-xl p-4" open={!fits.length}>
          <summary className="ph-find-summary flex min-h-11 cursor-pointer items-center rounded-md px-1 text-sm font-medium text-white">
            Couldn&apos;t settle {plural(undecided.length, "board", "boards")}
          </summary>
          <ul className="mt-2 grid gap-1.5">
            {undecided.map((board) => (
              <MissRow
                key={board.id}
                board={board}
                reason={`The search stopped after ${defaultPlanStepBudget.toLocaleString("en-US")} combinations without finding a plan or ruling one out. It may still fit: open the planner and try it with fewer requirements first.`}
              />
            ))}
          </ul>
        </details>
      ) : null}

      {unchecked.length ? (
        <p className="mt-4 text-xs leading-5 text-zinc-500">
          {unchecked.length} more {unchecked.length === 1 ? "board" : "boards"}
          {" "}
          {unchecked.length === 1 ? "has" : "have"} no source-backed pin functions yet, so PinHub
          can&apos;t plan {unchecked.length === 1 ? "it" : "them"} and does not guess. Their pin maps and
          sources are still in the{" "}
          {/* In running text: vertical padding widens the tap area to 44 px
              without changing the line's height. */}
          <Link href="/" className="py-3 text-cyan-200 underline underline-offset-4">
            catalog
          </Link>
          .
        </p>
      ) : null}
    </section>
  );
}

function FitCard({ fit, query, index }: { fit: FinderFit; query: FinderQuery; index: number }) {
  const { board, assignments, usedFlaggedPins } = fit;
  const lines = assignmentLines(assignments);
  const extra = lines.length - visibleLines;
  return (
    <li className="surface-panel flex min-w-0 flex-col rounded-xl p-4" data-fit-index={index}>
      <div className="flex min-w-0 items-start gap-2.5">
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center overflow-hidden rounded-md border border-white/10 bg-[#0a0c11]">
          <VendorLogo vendor={board.vendor} size={18} />
        </span>
        <div className="min-w-0">
          <Link href={`/boards/${board.id}`} className="inline-flex min-h-11 items-center text-[15px] font-semibold leading-tight text-white hover:text-cyan-100">
            {board.name}
          </Link>
          <p className="font-mono text-[11px] leading-4 text-zinc-500">
            {board.vendor} · {board.logicLevel}
          </p>
        </div>
      </div>

      {usedFlaggedPins ? (
        <p className="mt-3 flex items-start gap-1.5 text-xs leading-5 text-orange-200">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          Fits only by using pins with recorded cautions. Read them in the plan before wiring.
        </p>
      ) : null}

      <ul aria-label={`Pins PinHub assigned on ${board.name}`} className="mt-3 grid gap-1 font-mono text-[12px] leading-5 text-zinc-300">
        {lines.slice(0, visibleLines).map((line) => (
          <li key={line} className="break-words">{line}</li>
        ))}
        {extra > 0 ? <li className="text-zinc-500">+{extra} more in the plan</li> : null}
      </ul>

      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-3">
        <Link
          href={plannerHref(board.id, query.requirements)}
          className="ph-find-open inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold"
        >
          Open this plan <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
        <Link
          href={`/boards/${board.id}#pins`}
          className="inline-flex min-h-11 items-center gap-1.5 text-xs text-cyan-200 hover:text-white"
        >
          <CircuitBoard className="size-3.5" aria-hidden="true" /> Pin map
        </Link>
        {board.warnings.length ? (
          <span className="text-xs text-orange-200">
            {board.warnings.length} wiring {board.warnings.length === 1 ? "caution" : "cautions"}
          </span>
        ) : null}
      </div>
    </li>
  );
}

function MissRow({ board, reason }: { board: Board; reason: string }) {
  return (
    <li className="surface-well rounded-lg px-3 py-2">
      <Link href={`/boards/${board.id}`} className="inline-flex min-h-11 items-center text-sm font-medium text-zinc-200 hover:text-white">
        {board.name}
      </Link>
      <p className="text-xs leading-5 text-zinc-400">{reason}</p>
    </li>
  );
}
