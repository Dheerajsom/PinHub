"use client";

import { useId } from "react";
import { clsx } from "clsx";
import { Flag, Minus, Plus, RotateCcw, TriangleAlert, Wand2 } from "lucide-react";
import type { PlanPeripheral, PlanRequirements } from "@/lib/pin-planner";
import { roleColors } from "@/components/board-visual/roles";
import { peripheralHint, peripheralRole } from "@/components/planner/peripherals";

type Props = {
  /** False for a board without source-backed pin functions. */
  available: boolean;
  boardName: string;
  reportUrl: string | null;
  capabilities: { peripheral: PlanPeripheral; max: number }[];
  requirements: PlanRequirements;
  status: string;
  unsatisfiable: boolean;
  usedFlaggedPins: boolean;
  onStep: (peripheral: PlanPeripheral, delta: number) => void;
  onClear: () => void;
};

/**
 * "Fit these buses into the pins I have left." Only for boards whose pin
 * functions are source-backed; every other board gets one line, never a guess.
 */
export function PlannerAutoAssign({
  available,
  boardName,
  reportUrl,
  capabilities,
  requirements,
  status,
  unsatisfiable,
  usedFlaggedPins,
  onStep,
  onClear,
}: Props) {
  const headingId = useId();
  const statusId = useId();
  const total = Object.values(requirements).reduce((sum, count) => sum + (count ?? 0), 0);
  // A requirement can outlive its capacity once pins are claimed by hand, so
  // it keeps a stepper (to take it back down) even when the board has no room.
  const rows = [
    ...capabilities,
    ...(Object.keys(requirements) as PlanPeripheral[])
      .filter((peripheral) => !capabilities.some((item) => item.peripheral === peripheral))
      .map((peripheral) => ({ peripheral, max: 0 })),
  ];

  return (
    <section aria-labelledby={headingId} className="surface-panel min-w-0 rounded-xl p-4">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2 id={headingId} className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-white">
            <Wand2 className="size-4 text-zinc-400" aria-hidden="true" />
            Auto-assign
          </h2>
          {available ? (
            <p className="mt-1 text-[13px] leading-6 text-zinc-400">
              Say what else the circuit needs. PinHub fits it into the pins you have not claimed,
              using {boardName}&apos;s source-backed pin functions only.
            </p>
          ) : null}
        </div>
        {available && total ? (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-3 text-xs font-medium text-zinc-300 transition hover:border-white/25 hover:text-white"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            <span className="text-xs">Clear auto-assign</span>
          </button>
        ) : null}
      </div>

      {!available ? (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] leading-6 text-zinc-400">
          <p className="min-w-0">
            Auto-assign isn&apos;t available for this board yet. It needs source-backed pin functions,
            and PinHub does not guess them. You can still claim pins by hand on the board.
          </p>
          {reportUrl ? (
            <a
              href={reportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-1.5 underline-offset-4 transition hover:text-white hover:underline"
            >
              <Flag className="size-3.5" aria-hidden="true" />
              Report a data error
              <span className="sr-only"> on GitHub (opens in a new tab)</span>
            </a>
          ) : null}
        </div>
      ) : (
        <>
          <div
            role="group"
            aria-labelledby={headingId}
            aria-describedby={statusId}
            className="mt-3 grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(min(100%,13rem),1fr))]"
          >
            {rows.map(({ peripheral, max }) => {
              const count = requirements[peripheral] ?? 0;
              const colors = roleColors[peripheralRole[peripheral]];
              return (
                <div
                  key={peripheral}
                  role="group"
                  aria-label={`${peripheral}, ${count} planned, up to ${max}`}
                  className="surface-well flex min-w-0 items-center justify-between gap-2 rounded-lg py-1 pl-3 pr-1"
                >
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-1.5 font-mono text-[13px] font-semibold text-zinc-100">
                      <span
                        className="size-2 shrink-0 self-center rounded-full"
                        style={{ backgroundColor: colors.edge }}
                        aria-hidden="true"
                      />
                      {peripheral}
                      <span className="text-[10px] font-normal text-zinc-500">max {max}</span>
                    </div>
                    <div className="text-[10px] leading-4 text-zinc-500">{peripheralHint[peripheral]}</div>
                  </div>
                  <div className="flex shrink-0 items-center">
                    <button
                      type="button"
                      onClick={() => onStep(peripheral, -1)}
                      disabled={count === 0}
                      aria-label={`Remove one ${peripheral}`}
                      className="ph-plan-step grid size-11 place-items-center rounded-md text-zinc-300 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      <Minus className="size-4" aria-hidden="true" />
                    </button>
                    <span
                      aria-hidden="true"
                      data-plan-count={peripheral}
                      className="w-6 text-center font-mono text-base font-semibold tabular-nums text-white"
                    >
                      {count}
                    </span>
                    <button
                      type="button"
                      onClick={() => onStep(peripheral, 1)}
                      disabled={count >= max}
                      aria-label={`Add one ${peripheral}`}
                      className="ph-plan-step grid size-11 place-items-center rounded-md text-zinc-300 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      <Plus className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <p
            id={statusId}
            data-plan-status=""
            role="status"
            aria-live="polite"
            className={clsx(
              "mt-3 flex items-start gap-2 rounded-md px-3 py-2 text-[13px] leading-6",
              unsatisfiable
                ? "border border-orange-300/30 bg-orange-400/10 text-orange-100"
                : "surface-well text-zinc-300",
            )}
          >
            {unsatisfiable ? (
              <TriangleAlert className="mt-1 size-3.5 shrink-0 text-orange-200" aria-hidden="true" />
            ) : null}
            <span className="min-w-0">{status}</span>
          </p>
          {usedFlaggedPins ? (
            <p className="mt-2 text-[12px] leading-5 text-orange-200">
              Every unflagged pin that could carry these signals is taken, so the plan uses the
              flagged pins marked in your pin list. Read each caution before wiring.
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
