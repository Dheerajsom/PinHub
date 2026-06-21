"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Expand, Maximize2, X } from "lucide-react";
import type { Board, PinRole } from "@/lib/boards";
import {
  buildBoardGeometry,
  type BoardGeometry,
  type PinAnchor,
} from "@/lib/board-visual-geometry";
import { BoardStage } from "@/components/board-visual/BoardStage";
import { PinDetails } from "@/components/board-visual/PinDetails";
import { PinRoleLegend } from "@/components/board-visual/PinRoleLegend";
import { PinoutTable } from "@/components/board-visual/PinoutTable";
import { assertBoardVisualsValid } from "@/lib/board-visual-validation";

// Dev-time integrity gate: surfaces missing coverage, unanchored pins, or
// out-of-range coordinates immediately while developing. Stripped from the
// production bundle.
if (process.env.NODE_ENV !== "production") {
  assertBoardVisualsValid();
}

export function BoardPinoutVisualization({ board }: { board: Board }) {
  const geometry = useMemo(() => buildBoardGeometry(board), [board]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [activeRole, setActiveRole] = useState<PinRole | null>(null);
  const [expanded, setExpanded] = useState(false);
  const expandButtonRef = useRef<HTMLButtonElement>(null);
  // Interaction state is reset across board switches by remounting via a
  // `key={board.id}` on this component (see PinHubApp), so no reset effect is
  // needed here.

  const anchorsByKey = useMemo(() => {
    const map = new Map<string, NonNullable<typeof geometry>["anchors"][number]>();
    geometry?.anchors.forEach((a) => map.set(a.key, a));
    return map;
  }, [geometry]);

  const presentRoles = useMemo(() => {
    const set = new Set<PinRole>();
    geometry?.anchors.forEach((a) => set.add(a.pin.role));
    return set;
  }, [geometry]);

  if (!board.pinout || !geometry) {
    return (
      <section className="rounded-lg border border-dashed border-white/15 bg-[#101319] p-4">
        <div className="text-sm font-medium text-white">Pin map queued</div>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          This board has official references linked, but its in-app connector map
          still needs a source-backed import.
        </p>
      </section>
    );
  }

  const liveAnchor = anchorsByKey.get(activeKey ?? selectedKey ?? "") ?? null;
  const stageTitle = `${board.name} — ${board.pinout.connector}`;

  function handleEscape() {
    if (expanded) {
      setExpanded(false);
    } else if (selectedKey) {
      setSelectedKey(null);
      setActiveKey(null);
    } else {
      setActiveRole(null);
    }
  }

  return (
    <section
      className="@container surface-panel rounded-lg p-4"
      onKeyDown={(event) => {
        if (event.key === "Escape") handleEscape();
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
            Connector
          </div>
          <h3 className="mt-1 text-base font-semibold text-white">
            {board.pinout.connector}
          </h3>
          <p className="mt-0.5 text-[11px] text-zinc-500">
            {geometry.orientation}
          </p>
        </div>
        <button
          ref={expandButtonRef}
          type="button"
          onClick={() => setExpanded(true)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-white/15 bg-[#15181f] px-2.5 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-cyan-300/60 hover:text-white"
        >
          <Expand className="size-3.5" aria-hidden="true" />
          Inspect
        </button>
      </div>

      <div className="mt-3">
        <PinRoleLegend
          present={presentRoles}
          activeRole={activeRole}
          onToggle={setActiveRole}
        />
      </div>

      <div
        className="bv-stage-wrap mt-3 w-full overflow-hidden rounded-md bg-[#0a0c11]"
        style={{
          aspectRatio: `${geometry.vbw} / ${geometry.vbh}`,
          maxHeight: 460,
        }}
      >
        <BoardStage
          geometry={geometry}
          title={stageTitle}
          selectedKey={selectedKey}
          activeKey={activeKey ?? selectedKey}
          activeRole={activeRole}
          showAllLabels={false}
          onSelect={(key) => {
            setSelectedKey(key);
            setActiveKey(key);
          }}
          onActiveKey={setActiveKey}
        />
      </div>

      {geometry.notToScale ? (
        <p className="mt-2 text-[11px] leading-5 text-zinc-500">
          Simplified diagram, grouped by function — not to physical scale. Pin
          data is source-backed; verify against the linked documentation.
        </p>
      ) : (
        <p className="mt-2 text-[11px] leading-5 text-zinc-500">
          Simplified technical illustration. Pin data is source-backed; verify
          against the linked documentation before wiring.
        </p>
      )}

      <div className="mt-3">
        <PinDetails anchor={liveAnchor} pinned={selectedKey !== null} />
      </div>

      {/* Connector caveats from the source-backed pinout notes. */}
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

      <details className="mt-3 border-t border-white/10 pt-3">
        <summary className="cursor-pointer text-sm font-medium text-zinc-300 transition hover:text-white">
          All {geometry.anchors.length} pins (table)
        </summary>
        <div className="mt-2 max-h-80 overflow-y-auto pr-1">
          <PinoutTable
            anchors={geometry.anchors}
            activeKey={activeKey ?? selectedKey}
            selectedKey={selectedKey}
            activeRole={activeRole}
            onSelect={(key) => {
              setSelectedKey(key);
              setActiveKey(key);
            }}
            onActiveKey={setActiveKey}
          />
        </div>
      </details>

      {expanded ? (
        <ExpandedInspector
          board={board}
          geometry={geometry}
          selectedKey={selectedKey}
          activeKey={activeKey ?? selectedKey}
          activeRole={activeRole}
          liveAnchor={liveAnchor}
          presentRoles={presentRoles}
          onSelect={(key) => {
            setSelectedKey(key);
            setActiveKey(key);
          }}
          onActiveKey={setActiveKey}
          onToggleRole={setActiveRole}
          onClose={() => {
            setExpanded(false);
            expandButtonRef.current?.focus();
          }}
        />
      ) : null}
    </section>
  );
}

function ExpandedInspector({
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
  onClose,
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
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-3 sm:p-6"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${board.name} pinout inspector`}
        className="surface-panel flex max-h-[92vh] w-full max-w-[1100px] flex-col overflow-hidden rounded-xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Maximize2 className="size-4 text-cyan-200" aria-hidden="true" />
              {board.name}
            </div>
            <p className="truncate text-xs text-zinc-400">
              {board.pinout?.connector} · {geometry.orientation}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close inspector"
            className="grid size-9 shrink-0 place-items-center rounded-md border border-white/15 text-zinc-300 transition hover:border-cyan-300/60 hover:text-white"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            <PinRoleLegend
              present={presentRoles}
              activeRole={activeRole}
              onToggle={onToggleRole}
            />
            <div className="mt-3 w-full overflow-auto rounded-md bg-[#0a0c11] p-2">
              <div
                className="mx-auto"
                style={{
                  aspectRatio: `${geometry.vbw} / ${geometry.vbh}`,
                  minWidth: Math.min(geometry.vbw, 760),
                  maxWidth: geometry.vbw,
                }}
              >
                <BoardStage
                  geometry={geometry}
                  title={`${board.name} — ${board.pinout?.connector ?? "pinout"}`}
                  selectedKey={selectedKey}
                  activeKey={activeKey}
                  activeRole={activeRole}
                  showAllLabels
                  onSelect={onSelect}
                  onActiveKey={onActiveKey}
                />
              </div>
            </div>
            <div className="mt-3">
              <PinDetails anchor={liveAnchor} pinned={selectedKey !== null} />
            </div>
          </div>

          <div className="min-w-0">
            <h4 className="mb-2 text-sm font-semibold text-white">All pins</h4>
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
      </div>
    </div>
  );
}
