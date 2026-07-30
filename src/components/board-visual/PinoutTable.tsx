"use client";

import { Fragment } from "react";
import { clsx } from "clsx";
import type { PinRole } from "@/lib/boards";
import type { PinAnchor } from "@/lib/board-visual-geometry";
import type { PinNet } from "@/lib/pin-nets";
import { roleChipStyle, roleLabels } from "@/components/board-visual/roles";

// The pin schedule: the drawing's companion table, and the robust fallback for
// assistive technology and print. Always present in the DOM and synchronized
// with the drawing — the probed pin's row is marked, every row on the probed net
// is marked more quietly, and clicking a row holds it.
export function PinoutTable({
  anchors,
  activeKey,
  selectedKey,
  activeRole,
  netKeys,
  netByKey,
  onSelect,
  onActiveKey,
}: {
  anchors: PinAnchor[];
  activeKey: string | null;
  selectedKey: string | null;
  activeRole: PinRole | null;
  netKeys: Set<string>;
  netByKey: Map<string, PinNet | null>;
  onSelect: (key: string | null) => void;
  onActiveKey: (key: string | null) => void;
}) {
  return (
    <table className="w-full table-fixed border-collapse text-left text-sm">
      <caption className="sr-only">
        Full pin list, synchronized with the board drawing.
      </caption>
      <thead>
        <tr className="border-b border-[var(--pin-frame)]">
          <th scope="col" className="pin-eyebrow w-8 py-1.5 pr-1.5 text-left">
            #
          </th>
          <th scope="col" className="pin-eyebrow w-[30%] py-1.5 pr-2 text-left">
            Signal
          </th>
          <th scope="col" className="pin-eyebrow w-[4.75rem] py-1.5 pr-2 text-left">
            Role
          </th>
          <th scope="col" className="pin-eyebrow w-[4.25rem] py-1.5 pr-2 text-left">
            Net
          </th>
          <th scope="col" className="pin-eyebrow py-1.5 pr-1 text-left">
            Also / notes
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
          const onNet = netKeys.has(anchor.key) && !isActive;
          const dimmed =
            activeRole !== null && anchor.pin.role !== activeRole;
          const net = netByKey.get(anchor.key) ?? null;
          const toggleSelection = () =>
            onSelect(isSelected ? null : anchor.key);

          return (
            <Fragment key={anchor.key}>
              {showGroupHeader ? (
                <tr>
                  <th
                    colSpan={5}
                    className="pin-eyebrow border-t border-[var(--pin-frame)] pb-1.5 pt-5 text-left text-[var(--pin-ink-strong)]"
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
                  isActive && "bg-[var(--pin-probe)]/[0.12]",
                  onNet && "bg-[var(--pin-probe)]/[0.04]",
                  !isActive && !onNet && "hover:bg-white/[0.04]",
                  dimmed && "opacity-40",
                )}
              >
                <td className="pin-tech px-0.5 py-1 text-xs text-[var(--pin-ink)]">
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
                    className="pin-tech w-full truncate rounded text-left text-[13px] font-bold text-white outline-none transition hover:text-[var(--pin-probe)] focus-visible:ring-1 focus-visible:ring-[var(--pin-probe)]"
                    aria-label={`${isSelected ? "Unselect" : "Select"} pin ${anchor.pin.position}, ${anchor.pin.label}`}
                    aria-pressed={isSelected}
                  >
                    {anchor.pin.label}
                  </button>
                </th>
                <td className="py-1 pr-2">
                  <span
                    className="pin-tech inline-flex whitespace-nowrap rounded-[3px] border px-1 py-0.5 text-[9px] font-medium uppercase tracking-[0.08em]"
                    style={roleChipStyle(anchor.pin.role)}
                  >
                    {roleLabels[anchor.pin.role]}
                  </span>
                </td>
                <td
                  className={clsx(
                    "pin-tech truncate py-1 pr-2 text-[11px]",
                    onNet || isActive
                      ? "text-[var(--pin-probe)]"
                      : "text-[var(--pin-ink)]",
                  )}
                >
                  {net ? net.label : ""}
                </td>
                <td className="break-words py-1 pr-1 text-[11px] leading-4 text-zinc-400">
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
