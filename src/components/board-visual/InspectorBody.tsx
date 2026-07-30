"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import { Scan } from "lucide-react";
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
  const hintId = `${useId()}-sheet-hint`;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [fitToWidth, setFitToWidth] = useState(false);
  const [scroll, setScroll] = useState({
    scrollable: false,
    atStart: true,
    atEnd: true,
  });
  const { scrollable, atStart, atEnd } = scroll;

  // Whether the sheet overflows, and which way it can still go. Read from the
  // element rather than assumed from the geometry, because the same drawing
  // overflows in a phone panel and does not on a desktop sheet.
  const updateScrollState = useCallback(() => {
    const node = scrollRef.current;
    if (!node) return;
    const slack = node.scrollWidth - node.clientWidth;
    setScroll({
      scrollable: slack > 1,
      atStart: node.scrollLeft <= 1,
      atEnd: node.scrollLeft >= slack - 1,
    });
  }, []);

  useEffect(() => {
    updateScrollState();
    const node = scrollRef.current;
    if (!node) return;
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(node);
    return () => observer.disconnect();
  }, [fitToWidth, geometry, updateScrollState]);

  return (
    <div className="@container grid min-h-0 gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
      <div className="min-w-0">
        <PinRoleLegend
          counts={roleCounts}
          activeRole={activeRole}
          onToggle={onToggleRole}
        />

        <div className="mt-3">
          {/* On a phone the sheet is wider than the screen. Scrolling it at
              working size keeps the signal names legible, so that stays the
              default and the scroll is announced and shown rather than left to
              be discovered; fit-to-width is one tap away when the question is
              "which end is pin 1" rather than "what is pin 12". */}
          {scrollable || fitToWidth ? (
            <div className="mb-2 flex items-center justify-between gap-2">
              <p id={hintId} className="pin-eyebrow min-w-0">
                {fitToWidth
                  ? "Whole connector shown — labels are reduced"
                  : "Swipe horizontally to view the full connector"}
              </p>
              <button
                type="button"
                onClick={() => setFitToWidth((value) => !value)}
                aria-pressed={fitToWidth}
                className={clsx(
                  "pin-tech touch-target inline-flex shrink-0 items-center gap-1.5 rounded-[3px] border px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.1em] transition",
                  fitToWidth
                    ? "border-[var(--pin-probe)]/60 bg-[var(--pin-probe)]/10 text-white"
                    : "border-[var(--pin-frame)] bg-[#0e141b] text-[var(--pin-rail)] hover:border-[var(--pin-probe)] hover:text-white",
                )}
              >
                <Scan className="size-3.5" aria-hidden="true" />
                Fit width
              </button>
            </div>
          ) : null}
          <div className="relative">
            <div
              ref={scrollRef}
              onScroll={updateScrollState}
              // Focusable so the drawing can be panned from the keyboard, and
              // labelled so its instructions reach a screen reader rather than
              // sitting in a caption nobody is pointed at.
              tabIndex={0}
              role="group"
              aria-label={`${board.name} connector drawing`}
              aria-describedby={scrollable || fitToWidth ? hintId : undefined}
              className="pin-sheet w-full overflow-auto rounded-t-[3px] p-2"
            >
              <div
                className="mx-auto"
                style={{
                  aspectRatio: `${geometry.vbw} / ${geometry.vbh}`,
                  minWidth: fitToWidth
                    ? undefined
                    : Math.min(geometry.vbw, 720),
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
            {/* The drawing runs under a fade at the edge it continues past, so
                "there is more sheet this way" is visible, not just stated. */}
            {scrollable ? (
              <>
                <div
                  aria-hidden="true"
                  className={clsx(
                    "pointer-events-none absolute inset-y-px left-px w-8 rounded-l-[3px] bg-gradient-to-r from-[var(--pin-sheet)] to-transparent transition-opacity",
                    atStart ? "opacity-0" : "opacity-100",
                  )}
                />
                <div
                  aria-hidden="true"
                  className={clsx(
                    "pointer-events-none absolute inset-y-px right-px w-8 rounded-r-[3px] bg-gradient-to-l from-[var(--pin-sheet)] to-transparent transition-opacity",
                    atEnd ? "opacity-0" : "opacity-100",
                  )}
                />
              </>
            ) : null}
          </div>
          <TitleBlock
            geometry={geometry}
            connector={board.pinout?.connector ?? "Connector"}
          />
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
