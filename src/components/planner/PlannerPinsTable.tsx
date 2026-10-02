"use client";

import { clsx } from "clsx";
import { TriangleAlert } from "lucide-react";
import type { PinAnchor } from "@/lib/board-visual-geometry";
import type { PlanAssignment } from "@/lib/pin-planner";
import type { ClaimCaution } from "@/lib/planner-claims";
import { roleColors } from "@/components/board-visual/roles";
import { peripheralRole } from "@/components/planner/peripherals";

export type PlannerRow =
  | { kind: "manual"; anchor: PinAnchor; name: string; cautions: ClaimCaution[] }
  | { kind: "auto"; anchor: PinAnchor; assignment: PlanAssignment; cautions: ClaimCaution[] };

/** Every pin in the plan, in physical order: claimed by hand and auto-assigned. */
export function PlannerPinsTable({
  rows,
  selectedKey,
  auto,
  onProbe,
}: {
  rows: PlannerRow[];
  selectedKey: string | null;
  auto: boolean;
  onProbe: (key: string) => void;
}) {
  if (!rows.length) {
    return (
      <p className="surface-well rounded-md px-3 py-2 text-[13px] leading-6 text-zinc-400">
        No pins planned yet. Select a pin on the board to claim it
        {auto ? ", or add what the circuit needs under Auto-assign." : "."}
      </p>
    );
  }

  return (
    <div className="min-w-0 overflow-x-auto">
      <table className="w-full border-collapse text-left font-mono text-[12px]">
        <caption className="sr-only">Your pins</caption>
        <thead>
          <tr className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">
            <th scope="col" className="px-2 pb-2 font-medium">Use</th>
            <th scope="col" className="px-2 pb-2 font-medium">Signal</th>
            <th scope="col" className="px-2 pb-2 font-medium">Pin</th>
            <th scope="col" className="px-2 pb-2 font-medium">Label</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const { anchor } = row;
            const selected = selectedKey === anchor.key;
            const place = anchor.group
              ? `${anchor.group} · ${anchor.pin.position}`
              : String(anchor.pin.position);
            const item = row.kind === "auto" ? row.assignment : null;
            return [
              <tr
                key={anchor.key}
                data-kind={row.kind}
                data-selected={selected || undefined}
                className={clsx(
                  "border-t border-white/10 align-middle transition",
                  selected ? "bg-white/[0.06]" : "",
                )}
              >
                <td className="px-2 py-1 text-zinc-200">
                  <span className="flex items-center gap-1.5">
                    {item ? (
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: roleColors[peripheralRole[item.peripheral]].edge }}
                        aria-hidden="true"
                      />
                    ) : (
                      <span className="ph-claim-dot size-2 shrink-0 rounded-full" aria-hidden="true" />
                    )}
                    <span className="min-w-0 break-words">
                      {item
                        ? `${item.peripheral} ${item.unit}`
                        : row.kind === "manual" && row.name
                          ? row.name
                          : "In use"}
                    </span>
                  </span>
                </td>
                <td className="whitespace-nowrap px-2 py-1 text-zinc-400">
                  {item
                    ? [item.instance, item.signal !== "IO" ? item.signal : null]
                        .filter(Boolean)
                        .join(" ") || "I/O"
                    : "claimed"}
                </td>
                <td className="whitespace-nowrap px-2 py-1 text-zinc-400">{place}</td>
                <td className="px-2 py-1">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onProbe(anchor.key)}
                      aria-pressed={selected}
                      aria-label={`Show pin ${anchor.pin.position}, ${anchor.pin.label} on the board`}
                      className={clsx(
                        "inline-flex min-h-11 min-w-11 items-center rounded px-1.5 text-left font-semibold underline-offset-4 transition hover:underline",
                        selected ? "text-white" : "text-zinc-100",
                      )}
                    >
                      <span className="font-mono text-[12px]">{anchor.pin.label}</span>
                    </button>
                    {item?.isDefault ? (
                      <span className="rounded border border-white/10 px-1 py-0.5 text-[10px] text-zinc-400">
                        default
                      </span>
                    ) : null}
                    {item?.routed ? (
                      <span className="rounded border border-white/10 px-1 py-0.5 text-[10px] text-zinc-400">
                        routed
                      </span>
                    ) : null}
                  </span>
                </td>
              </tr>,
              row.cautions.length ? (
                <tr key={`${anchor.key}-caution`} className="align-top">
                  <td colSpan={4} className="px-2 pb-2">
                    <ul className="space-y-1 rounded-md border border-orange-300/30 bg-orange-400/10 px-2 py-1.5 font-sans text-[12px] leading-5 text-orange-100">
                      {row.cautions.map((caution) => (
                        <li key={caution.label} className="flex gap-1.5">
                          <TriangleAlert
                            className="mt-0.5 size-3.5 shrink-0 text-orange-200"
                            aria-hidden="true"
                          />
                          <span className="min-w-0">
                            <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-orange-200">
                              {caution.label}
                            </span>{" "}
                            {caution.note}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ) : null,
            ];
          })}
        </tbody>
      </table>
    </div>
  );
}
