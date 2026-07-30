"use client";

import { MoveHorizontal, Shrink } from "lucide-react";
import { clsx } from "clsx";
import { useState, type CSSProperties } from "react";
import type { Board, PinRole } from "@/lib/boards";
import type { BoardGeometry, PinAnchor } from "@/lib/board-visual-geometry";
import { BoardStage } from "@/components/board-visual/BoardStage";
import { PinDetails } from "@/components/board-visual/PinDetails";
import { PinRoleLegend } from "@/components/board-visual/PinRoleLegend";
import { PinoutTable } from "@/components/board-visual/PinoutTable";

// Shared diagram + details + table layout used by both the Inspect modal and the
// standalone full-page pinout route. Presentational: all interaction state is
// owned by the wrapper so each surface can decide how to persist it.
export function InspectorBody({
  board,
  geometry,
  selectedKey,
  activeKey,
  activeRole,
  liveAnchor,
  presentRoles,
  onSelect,
  onActiveKey,
  onToggleRole,
}: {
  board: Board;
  geometry: BoardGeometry;
  selectedKey: string | null;
  activeKey: string | null;
  activeRole: PinRole | null;
  liveAnchor: PinAnchor | null;
  presentRoles: Set<PinRole>;
  onSelect: (key: string | null) => void;
  onActiveKey: (key: string | null) => void;
  onToggleRole: (role: PinRole | null) => void;
}) {
  // Schematic group-strip boards (dense FPGA expansion headers) carry long
  // signal names; rendering every label on the diagram collides into noise, so
  // those rely on hover + the adjacent table for labels. Physical-layout boards
  // have short pin names and read better fully annotated.
  const showAllLabels = geometry.kind !== "group-strips";
  const [fitToWidth, setFitToWidth] = useState(true);
  const stageStyle = {
    aspectRatio: `${geometry.vbw} / ${geometry.vbh}`,
    "--stage-width": `${geometry.vbw}px`,
    "--stage-min-width": `${Math.min(geometry.vbw, 720)}px`,
  } as CSSProperties;

  return (
    <div className="grid min-h-0 gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
      <div className="min-w-0">
        <PinRoleLegend
          present={presentRoles}
          activeRole={activeRole}
          onToggle={onToggleRole}
        />
        <div className="mt-3 flex items-center justify-between gap-3 sm:hidden">
          <p
            id="mobile-pinout-guidance"
            className="flex min-w-0 items-center gap-2 text-xs leading-5 text-zinc-400"
          >
            <MoveHorizontal
              className="size-4 shrink-0 text-cyan-200"
              aria-hidden="true"
            />
            {fitToWidth
              ? "Fit to screen. Tap a pad or use the pin list for full labels."
              : "Swipe horizontally to view the full connector."}
          </p>
          <button
            type="button"
            onClick={() => setFitToWidth((value) => !value)}
            aria-label={
              fitToWidth
                ? "Show pinout at actual size"
                : "Fit pinout to screen"
            }
            className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-md border border-white/10 bg-[#15181f] px-2.5 text-xs font-medium text-zinc-200 transition hover:border-cyan-300/40 hover:text-white"
          >
            {fitToWidth ? (
              <MoveHorizontal className="size-3.5" aria-hidden="true" />
            ) : (
              <Shrink className="size-3.5" aria-hidden="true" />
            )}
            {fitToWidth ? "Actual size" : "Fit screen"}
          </button>
        </div>
        <div
          className="mt-3 w-full overflow-auto rounded-md bg-[#0a0c11] p-2"
          aria-describedby="mobile-pinout-guidance"
        >
          <div
            className={clsx(
              "mx-auto",
              fitToWidth
                ? "w-full"
                : "w-[var(--stage-width)] min-w-[var(--stage-min-width)]",
              "sm:w-full sm:min-w-[var(--stage-min-width)] sm:max-w-[var(--stage-width)]",
            )}
            style={stageStyle}
          >
            <BoardStage
              geometry={geometry}
              title={`${board.name} — ${board.pinout?.connector ?? "pinout"}`}
              selectedKey={selectedKey}
              activeKey={activeKey}
              activeRole={activeRole}
              showAllLabels={showAllLabels}
              onSelect={onSelect}
              onActiveKey={onActiveKey}
            />
          </div>
        </div>
        <div className="mt-3">
          <PinDetails anchor={liveAnchor} pinned={selectedKey !== null} />
        </div>
        {board.pinout ? (
          <ul className="mt-4 space-y-1.5 border-t border-white/10 pt-3 text-sm leading-6 text-zinc-400">
            {board.pinout.notes.map((note) => (
              <li key={note} className="flex gap-2">
                <span
                  className="mt-2.5 size-1 shrink-0 rounded-full bg-zinc-600"
                  aria-hidden="true"
                />
                <span className="min-w-0">{note}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="min-w-0">
        <h4 className="mb-2 text-sm font-semibold text-white">
          All {geometry.anchors.length} pins
        </h4>
        <PinoutTable
          anchors={geometry.anchors}
          activeKey={activeKey}
          selectedKey={selectedKey}
          activeRole={activeRole}
          onSelect={onSelect}
          onActiveKey={onActiveKey}
        />
      </div>
    </div>
  );
}
