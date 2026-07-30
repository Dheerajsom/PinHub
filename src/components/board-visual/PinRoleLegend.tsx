"use client";

import { clsx } from "clsx";
import type { PinRole } from "@/lib/boards";
import {
  roleChipStyle,
  roleFamilies,
  roleLabels,
} from "@/components/board-visual/roles";

type PinRoleLegendProps = {
  /** How many pins carry each role on this connector. */
  counts: Map<PinRole, number>;
  activeRole: PinRole | null;
  onToggle: (role: PinRole | null) => void;
};

// Interactive legend: clicking a role highlights matching pins on the drawing
// (and dims the rest). This is a local, in-drawing highlight only — it never
// touches the catalog-wide interface filters.
//
// Chips are grouped into the five families an engineer already sorts a header
// into, which turns a thirteen-swatch row into short scannable runs, and each
// chip carries its pin count because "how many grounds does this header have"
// is a question people actually ask a pinout.
export function PinRoleLegend({ counts, activeRole, onToggle }: PinRoleLegendProps) {
  const families = roleFamilies
    .map((family) => ({
      label: family.label,
      roles: family.roles.filter((role) => (counts.get(role) ?? 0) > 0),
    }))
    .filter((family) => family.roles.length > 0);

  return (
    <div
      className="flex flex-wrap items-center gap-x-3 gap-y-2"
      role="group"
      aria-label="Highlight pins by role"
    >
      {families.map((family) => (
        <div key={family.label} className="flex flex-wrap items-center gap-1.5">
          <span className="pin-eyebrow pr-0.5">{family.label}</span>
          {family.roles.map((role) => {
            const active = activeRole === role;
            return (
              <button
                key={role}
                type="button"
                onClick={() => onToggle(active ? null : role)}
                aria-pressed={active}
                style={roleChipStyle(role)}
                className={clsx(
                  "pin-tech touch-target inline-flex items-center gap-1 rounded-[3px] border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] transition",
                  active
                    ? "ring-1 ring-[var(--pin-probe)] ring-offset-1 ring-offset-[#0b1016]"
                    : activeRole !== null
                      ? "opacity-40"
                      : "opacity-90 hover:opacity-100",
                )}
              >
                {roleLabels[role]}
                <span className="opacity-55">{counts.get(role)}</span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
