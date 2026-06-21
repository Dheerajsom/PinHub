"use client";

import { clsx } from "clsx";
import type { PinRole } from "@/lib/boards";
import {
  roleChipStyles,
  roleGlyphs,
  roleLabels,
  roleOrder,
} from "@/components/board-visual/roles";

type PinRoleLegendProps = {
  present: Set<PinRole>;
  activeRole: PinRole | null;
  onToggle: (role: PinRole | null) => void;
};

// Interactive legend: clicking a role highlights matching pins on the board
// (and dims the rest). This is a local, in-visualization highlight only — it
// never touches the catalog-wide interface filters.
export function PinRoleLegend({ present, activeRole, onToggle }: PinRoleLegendProps) {
  const roles = roleOrder.filter((role) => present.has(role));
  return (
    <div
      className="flex flex-wrap gap-1.5"
      role="group"
      aria-label="Highlight pins by role"
    >
      {roles.map((role) => {
        const active = activeRole === role;
        return (
          <button
            key={role}
            type="button"
            onClick={() => onToggle(active ? null : role)}
            aria-pressed={active}
            className={clsx(
              "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-medium transition",
              roleChipStyles[role],
              active
                ? "ring-2 ring-cyan-300/80"
                : activeRole !== null
                  ? "opacity-50"
                  : "opacity-95 hover:opacity-100",
            )}
          >
            <span aria-hidden="true" className="font-mono">
              {roleGlyphs[role]}
            </span>
            {roleLabels[role]}
          </button>
        );
      })}
    </div>
  );
}
