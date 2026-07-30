"use client";

import { useMemo } from "react";
import type { Board, PinRole } from "@/lib/boards";
import type { BoardGeometry, PinAnchor } from "@/lib/board-visual-geometry";
import { BoardStage } from "@/components/board-visual/BoardStage";
import { PinDetails } from "@/components/board-visual/PinDetails";
import { PinRoleLegend } from "@/components/board-visual/PinRoleLegend";
import { PinoutTable } from "@/components/board-visual/PinoutTable";
import { TitleBlock } from "@/components/board-visual/TitleBlock";
import { countRoles } from "@/components/board-visual/roles";
import { probedNet, useBoardNets } from "@/components/board-visual/use-board-nets";

// Shared drawing + readout + schedule layout used by both the Inspect modal and
// the standalone full-page pinout route. Presentational: all interaction state is
// owned by the wrapper so each surface can decide how to persist it.
export function InspectorBody({
  board,
  geometry,
  selectedKey,
  activeKey,
  activeRole,
  liveAnchor,
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
  onSelect: (key: string | null) => void;
  onActiveKey: (key: string | null) => void;
  onToggleRole: (role: PinRole | null) => void;
}) {
  const nets = useBoardNets(geometry.anchors);
  const probe = probedNet(nets, activeKey);
  const roleCounts = useMemo(
    () => countRoles(geometry.anchors.map((anchor) => anchor.pin)),
    [geometry.anchors],
  );

  return (
    <div className="@container grid min-h-0 gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
      <div className="min-w-0">
        <PinRoleLegend
          counts={roleCounts}
          activeRole={activeRole}
          onToggle={onToggleRole}
        />

        <div className="mt-3">
          <div className="pin-sheet w-full overflow-auto rounded-t-[3px] p-2">
            <div
              className="mx-auto"
              style={{
                aspectRatio: `${geometry.vbw} / ${geometry.vbh}`,
                minWidth: Math.min(geometry.vbw, 720),
                maxWidth: geometry.vbw,
              }}
            >
              <BoardStage
                geometry={geometry}
                title={`${board.name} — ${board.pinout?.connector ?? "pinout"}`}
                sheetLabel={board.name}
                selectedKey={selectedKey}
                activeKey={activeKey}
                activeRole={activeRole}
                netKeys={probe.keys}
                onSelect={onSelect}
                onActiveKey={onActiveKey}
              />
            </div>
          </div>
          <TitleBlock
            geometry={geometry}
            connector={board.pinout?.connector ?? "Connector"}
          />
          {/* On a phone the sheet is wider than the screen and scrolls, which
              looks like a cropped drawing unless we say so. Shrinking it to fit
              instead would put the signal names below five pixels. */}
          <p className="pin-eyebrow mt-2 sm:hidden">
            Drag the sheet sideways to reach the rest of the connector
          </p>
        </div>

        <div className="mt-3">
          <PinDetails
            anchor={liveAnchor}
            pinned={selectedKey !== null}
            net={probe.net}
            netSize={probe.keys.size}
          />
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
        <h4 className="pin-eyebrow mb-2 text-[var(--pin-ink-strong)]">
          Pin schedule · {geometry.anchors.length} pins
        </h4>
        <PinoutTable
          anchors={geometry.anchors}
          activeKey={activeKey}
          selectedKey={selectedKey}
          activeRole={activeRole}
          netKeys={probe.keys}
          netByKey={nets.netByKey}
          onSelect={onSelect}
          onActiveKey={onActiveKey}
        />
      </div>
    </div>
  );
}
