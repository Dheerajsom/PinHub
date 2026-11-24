"use client";

import { useId, useOptimistic, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { Minus, Plus, RotateCcw } from "lucide-react";
import {
  finderFilterKeys,
  finderFilters,
  serializeFinderQuery,
  type FinderFilterKey,
  type FinderQuery,
} from "@/lib/board-finder";
import { maxPlanCount, planPeripherals, type PlanPeripheral } from "@/lib/pin-planner";
import { peripheralHint, peripheralRole } from "@/components/planner/peripherals";
import { roleColors } from "@/components/board-visual/roles";

const filterTitles: Record<FinderFilterKey, string> = {
  platform: "Platform",
  logic: "Logic level",
  wireless: "Wireless",
};

/**
 * Starting points named by what they connect, never by a product. Each is a
 * plain set of counts the reader can adjust.
 */
const examples: Array<{ label: string; requirements: FinderQuery["requirements"] }> = [
  { label: "I2C sensor + 2 analog inputs", requirements: { I2C: 1, ADC: 2 } },
  { label: "SPI display + I2C sensor", requirements: { I2C: 1, SPI: 1 } },
  { label: "4 PWM outputs + UART", requirements: { UART: 1, PWM: 4 } },
  { label: "CAN bus + UART", requirements: { UART: 1, CAN: 1 } },
];

/**
 * The finder's inputs. Every change replaces the URL, so the server plans the
 * new request and the result is shareable; the counts update at once
 * (optimistically) while the results below dim until the new plan arrives.
 */
export function FindControls({ query, children }: { query: FinderQuery; children: ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [shown, setShown] = useOptimistic(query);
  const needsId = `${useId()}-needs`;

  const go = (next: FinderQuery) => {
    startTransition(() => {
      setShown(next);
      const search = serializeFinderQuery(next);
      router.replace(search ? `/find?${search}` : "/find", { scroll: false });
    });
  };
  const step = (peripheral: PlanPeripheral, delta: number) => {
    const count = Math.min(maxPlanCount, Math.max(0, (shown.requirements[peripheral] ?? 0) + delta));
    go({ ...shown, requirements: { ...shown.requirements, [peripheral]: count } });
  };
  const setFilter = (key: FinderFilterKey, value: string | undefined) =>
    go({ ...shown, filters: { ...shown.filters, [key]: value } });
  const total = planPeripherals.reduce((sum, peripheral) => sum + (shown.requirements[peripheral] ?? 0), 0);
  const filtered = finderFilterKeys.some((key) => shown.filters[key]);

  return (
    <>
      <section aria-labelledby={needsId} className="surface-panel rounded-2xl p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            <h2 id={needsId} className="text-base font-semibold tracking-tight text-white">
              What does your project need?
            </h2>
            <p className="mt-1 text-[13px] leading-6 text-zinc-400">
              Count each bus or pin your circuit uses. Every bus needs its own pins.
            </p>
          </div>
          {total || filtered ? (
            <button
              type="button"
              onClick={() => go({ requirements: {}, filters: {} })}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-3 text-xs font-medium text-zinc-300 transition hover:border-white/25 hover:text-white"
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              Start over
            </button>
          ) : null}
        </div>

        <div className="mt-3 grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(min(100%,13rem),1fr))]">
          {planPeripherals.map((peripheral) => {
            const count = shown.requirements[peripheral] ?? 0;
            return (
              <div
                key={peripheral}
                role="group"
                aria-label={`${peripheral}, ${count} needed`}
                className={clsx(
                  "surface-well flex min-w-0 items-center justify-between gap-2 rounded-lg py-1 pl-3 pr-1",
                  count > 0 && "ph-find-needed",
                )}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 font-mono text-[13px] font-semibold text-zinc-100">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: roleColors[peripheralRole[peripheral]].edge }}
                      aria-hidden="true"
                    />
                    {peripheral}
                  </div>
                  <div className="text-[10px] leading-4 text-zinc-500">{peripheralHint[peripheral]}</div>
                </div>
                <div className="flex shrink-0 items-center">
                  <button
                    type="button"
                    onClick={() => step(peripheral, -1)}
                    disabled={count === 0}
                    aria-label={`Remove one ${peripheral}`}
                    className="ph-plan-step grid size-11 place-items-center rounded-md text-zinc-300 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <Minus className="size-4" aria-hidden="true" />
                  </button>
                  <span aria-hidden="true" className="w-6 text-center font-mono text-base font-semibold tabular-nums text-white">
                    {count}
                  </span>
                  <button
                    type="button"
                    onClick={() => step(peripheral, 1)}
                    disabled={count >= maxPlanCount}
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

        <div className="mt-4 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(100%,15rem),1fr))]">
          {finderFilterKeys.map((key) => (
            <div key={key} role="group" aria-label={filterTitles[key]} className="min-w-0">
              <p className="mb-1.5 text-[10px] uppercase tracking-[0.16em] text-zinc-500">{filterTitles[key]}</p>
              <div className="flex flex-wrap gap-1.5">
                {[{ value: undefined, label: "Any" }, ...finderFilters[key]].map((option) => {
                  const active = shown.filters[key] === option.value;
                  return (
                    <button
                      key={option.label}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setFilter(key, option.value)}
                      className={clsx(
                        "min-h-11 min-w-11 rounded-md border px-3 text-xs font-medium transition",
                        active
                          ? "border-cyan-300/65 bg-cyan-300/12 text-cyan-50"
                          : "ph-find-option border-white/10 text-zinc-400",
                      )}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {!total ? (
          <div className="mt-4 border-t border-white/10 pt-3">
            <p className="mb-1.5 text-[10px] uppercase tracking-[0.16em] text-zinc-500">Start from an example</p>
            <div className="flex flex-wrap gap-1.5">
              {examples.map((example) => (
                <button
                  key={example.label}
                  type="button"
                  onClick={() => go({ ...shown, requirements: example.requirements })}
                  className="ph-find-option min-h-11 rounded-md border border-white/10 px-3 text-xs text-zinc-300 transition"
                >
                  {example.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <div aria-busy={pending} className={clsx("mt-5 transition-opacity motion-reduce:transition-none", pending && "opacity-60")}>
        {children}
      </div>
    </>
  );
}
