"use client";

import { clsx } from "clsx";
import type { PinRole } from "@/lib/boards";
import {
  roleChipStyle,
  roleColors,
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
    <div>
      <p className="mb-1.5 text-[10px] uppercase tracking-[0.16em] text-zinc-500">Highlight pins</p>
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
              "touch-target pin-role-control inline-flex min-h-11 items-center rounded-md border px-2 py-1 text-[11px] font-semibold leading-none transition",
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
    </div>
  );
}

/**
 * The drawing's colour key: what each pad hue means, with no controls. The
 * full pin workbench filters with one row of capability chips, so its key is
 * read, not pressed; one interactive row per surface keeps the two from being
 * mistaken for each other.
 */
export function PinColorKey({ counts }: { counts: Map<PinRole, number> }) {
  const roles = roleOrder.filter((role) => (counts.get(role) ?? 0) > 0);
  return (
    <ul aria-label="Pin colour key" className="flex flex-wrap gap-x-3 gap-y-1.5">
      {roles.map((role) => {
        const count = counts.get(role) ?? 0;
        return (
          <li key={role} className="inline-flex items-center gap-1.5 text-[11px] text-zinc-400">
            <span
              aria-hidden="true"
              className="size-2.5 shrink-0 rounded-[3px] border"
              style={{ backgroundColor: roleColors[role].fill, borderColor: roleColors[role].edge }}
            />
            {roleLabels[role]}
            <span className="sr-only">: {count} {count === 1 ? "pin" : "pins"}</span>
          </li>
        );
      })}
    </ul>
  );
}
