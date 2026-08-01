"use client";

import { clsx } from "clsx";
import type { PinRole } from "@/lib/boards";
import {
  roleChipStyle,
  roleLabels,
  roleOrder,
} from "@/components/board-visual/roles";

type PinRoleLegendProps = {
  /** How many pins carry each role on this connector. */
  counts: Map<PinRole, number>;
  activeRole: PinRole | null;
  onToggle: (role: PinRole | null) => void;
};

// Interactive legend: clicking a role highlights matching pins on the board and
// dims the rest. A local, in-diagram highlight only — it never touches the
// catalog-wide interface filters.
//
// One flat row of colored chips, in datasheet order, showing only the roles this
// connector actually has. The count belongs in the accessible name rather than
// on the chip: it answers a question people ask ("how many grounds?") without
// turning a color key into a data table.
export function PinRoleLegend({ counts, activeRole, onToggle }: PinRoleLegendProps) {
  const roles = roleOrder.filter((role) => (counts.get(role) ?? 0) > 0);

  return (
    <div
      className="flex flex-wrap gap-1.5"
      role="group"
      aria-label="Highlight pins by role"
    >
      {roles.map((role) => {
        const active = activeRole === role;
        const count = counts.get(role) ?? 0;
        return (
          <button
            key={role}
            type="button"
            onClick={() => onToggle(active ? null : role)}
            aria-pressed={active}
            aria-label={`${roleLabels[role]} — ${count} ${count === 1 ? "pin" : "pins"}`}
            style={roleChipStyle(role)}
            className={clsx(
              "touch-target inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-semibold leading-none transition",
              active
                ? "ring-2 ring-cyan-300/80 ring-offset-1 ring-offset-[#0a0c11]"
                : activeRole !== null
                  ? "opacity-45 hover:opacity-80"
                  : "hover:brightness-125",
            )}
          >
            {roleLabels[role]}
          </button>
        );
      })}
    </div>
  );
}
