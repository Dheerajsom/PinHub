"use client";

import { clsx } from "clsx";
import type { PinRole } from "@/lib/boards";
import type { PinAnchor } from "@/lib/board-visual-geometry";
import { roleChipStyles, roleLabels } from "@/components/board-visual/roles";

// Non-visual / print-friendly representation of the pinout, synchronized with
// the graphic: the active pin's row is highlighted, and clicking a row pins it.
// This is the robust fallback for assistive technology and is always present in
// the DOM.
export function PinoutTable({
  anchors,
  activeKey,
  selectedKey,
  activeRole,
  onSelect,
  onActiveKey,
}: {
  anchors: PinAnchor[];
  activeKey: string | null;
  selectedKey: string | null;
  activeRole: PinRole | null;
  onSelect: (key: string | null) => void;
  onActiveKey: (key: string | null) => void;
}) {
  return (
    <table className="w-full border-collapse text-left text-sm">
      <caption className="sr-only">
        Full pin list, synchronized with the board diagram.
      </caption>
      <thead>
        <tr className="text-[11px] uppercase tracking-[0.12em] text-zinc-500">
          <th scope="col" className="py-1.5 pr-2 font-medium">
            #
          </th>
          <th scope="col" className="py-1.5 pr-2 font-medium">
            Signal
          </th>
          <th scope="col" className="py-1.5 pr-2 font-medium">
            Role
          </th>
          <th scope="col" className="py-1.5 pr-2 font-medium">
            Aliases / notes
          </th>
        </tr>
      </thead>
      <tbody>
        {anchors.map((anchor, index) => {
          const showGroupHeader =
            Boolean(anchor.group) &&
            anchor.group !== anchors[index - 1]?.group;
          const isActive = anchor.key === activeKey;
          const isSelected = anchor.key === selectedKey;
          const dimmed =
            activeRole !== null && anchor.pin.role !== activeRole;
          return (
            <tr key={anchor.key}>
              <td colSpan={4} className="p-0">
                {showGroupHeader ? (
                  <div className="mt-3 border-t border-white/10 pt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
                    {anchor.group}
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => onSelect(isSelected ? null : anchor.key)}
                  onPointerEnter={() => onActiveKey(anchor.key)}
                  onPointerLeave={() => onActiveKey(selectedKey)}
                  className={clsx(
                    "grid w-full grid-cols-[2rem_minmax(5rem,1fr)_4.5rem_minmax(0,1.4fr)] items-baseline gap-2 rounded px-1.5 py-1 text-left transition",
                    isActive
                      ? "bg-cyan-300/10 ring-1 ring-cyan-300/40"
                      : "hover:bg-white/[0.04]",
                    dimmed && "opacity-45",
                  )}
                  aria-pressed={isSelected}
                >
                  <span className="font-mono text-xs text-zinc-400">
                    {anchor.pin.position}
                  </span>
                  <span className="min-w-0 truncate font-mono font-semibold text-white">
                    {anchor.pin.label}
                  </span>
                  <span
                    className={clsx(
                      "justify-self-start rounded border px-1 py-0.5 text-[10px] font-medium",
                      roleChipStyles[anchor.pin.role],
                    )}
                  >
                    {roleLabels[anchor.pin.role]}
                  </span>
                  <span className="min-w-0 truncate text-[12px] text-zinc-400">
                    {anchor.pin.aliases?.length
                      ? anchor.pin.aliases.join(" / ")
                      : ""}
                    {anchor.pin.aliases?.length && anchor.pin.note ? " · " : ""}
                    {anchor.pin.note ?? ""}
                  </span>
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
