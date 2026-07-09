"use client";

import { Fragment } from "react";
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
    <table className="w-full table-fixed border-collapse text-left text-sm">
      <caption className="sr-only">
        Full pin list, synchronized with the board diagram.
      </caption>
      <thead>
        <tr className="text-[11px] uppercase tracking-[0.12em] text-zinc-500">
          <th scope="col" className="w-8 py-1.5 pr-2 font-medium">
            #
          </th>
          <th scope="col" className="w-[32%] py-1.5 pr-2 font-medium">
            Signal
          </th>
          <th scope="col" className="w-20 py-1.5 pr-2 font-medium">
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
          const toggleSelection = () =>
            onSelect(isSelected ? null : anchor.key);

          return (
            <Fragment key={anchor.key}>
              {showGroupHeader ? (
                <tr>
                  <th
                    colSpan={4}
                    className="border-t border-white/10 pt-5 pb-2 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400"
                  >
                    {anchor.group}
                  </th>
                </tr>
              ) : null}
              <tr
                onClick={toggleSelection}
                onPointerEnter={() => onActiveKey(anchor.key)}
                onPointerLeave={() => onActiveKey(selectedKey)}
                className={clsx(
                  "cursor-pointer border-t border-white/5 transition",
                  isActive ? "bg-cyan-300/10" : "hover:bg-white/[0.04]",
                  dimmed && "opacity-45",
                )}
              >
                <td className="px-1.5 py-1 font-mono text-xs text-zinc-400">
                  {anchor.pin.position}
                </td>
                <th
                  scope="row"
                  className="min-w-0 py-1 pr-2 text-left font-normal"
                >
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleSelection();
                    }}
                    className="w-full truncate rounded text-left font-mono font-semibold text-white outline-none transition hover:text-cyan-100 focus-visible:ring-1 focus-visible:ring-cyan-300/80"
                    aria-label={`${isSelected ? "Unselect" : "Select"} pin ${anchor.pin.position}, ${anchor.pin.label}`}
                    aria-pressed={isSelected}
                  >
                    {anchor.pin.label}
                  </button>
                </th>
                <td className="py-1 pr-2">
                  <span
                    className={clsx(
                      "inline-flex whitespace-nowrap rounded border px-1 py-0.5 text-[10px] font-medium",
                      roleChipStyles[anchor.pin.role],
                    )}
                  >
                    {roleLabels[anchor.pin.role]}
                  </span>
                </td>
                <td className="break-words py-1 pr-1.5 text-[12px] leading-5 text-zinc-400">
                  {anchor.pin.aliases?.length
                    ? anchor.pin.aliases.join(" / ")
                    : ""}
                  {anchor.pin.aliases?.length && anchor.pin.note ? " · " : ""}
                  {anchor.pin.note ?? ""}
                </td>
              </tr>
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}
