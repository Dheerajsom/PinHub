"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { clsx } from "clsx";
import { Expand, ExternalLink, X } from "lucide-react";
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
import { InspectorBody } from "@/components/board-visual/InspectorBody";
import { TitleBlock } from "@/components/board-visual/TitleBlock";
import { countRoles } from "@/components/board-visual/roles";
import { probedNet, useBoardNets } from "@/components/board-visual/use-board-nets";

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

  const roleCounts = useMemo(
    () => countRoles((geometry?.anchors ?? []).map((anchor) => anchor.pin)),
    [geometry],
  );
  const nets = useBoardNets(geometry?.anchors);
  const liveKey = activeKey ?? selectedKey;
  const probe = probedNet(nets, liveKey);

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

  const liveAnchor = anchorsByKey.get(liveKey ?? "") ?? null;
  const stageTitle = `${board.name} — ${board.pinout.connector}`;
  // Dense schematic headers (FPGA expansion landings, 50+ pads) are cramped in
  // the narrow detail column, so we steer users to the roomy standalone view.
  const isComplex =
    geometry.kind === "group-strips" || geometry.anchors.length > 48;
  // Very tall drawings letterbox down to an unreadable sliver if we force the
  // whole thing into the panel height. For those we render at full panel width
  // and scroll vertically; flatter boards keep the fit-to-view look. The
  // threshold clears the tallest module sheet (a 2x20 DIP is about 1.5:1) and
  // catches the schematic function-block sheets, which run far taller.
  const tall = geometry.vbh / geometry.vbw > 1.75;

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
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h3 className="pin-eyebrow text-[var(--pin-ink-strong)]">
          Connector drawing
        </h3>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            ref={expandButtonRef}
            type="button"
            onClick={() => setExpanded(true)}
            className="pin-tech touch-target inline-flex items-center gap-1.5 rounded-[3px] border border-[var(--pin-frame)] bg-[#0e141b] px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--pin-rail)] transition hover:border-[var(--pin-probe)] hover:text-white"
          >
            <Expand className="size-3.5" aria-hidden="true" />
            Inspect
          </button>
          <a
            href={`/pinout/${board.id}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open the ${board.name} pinout in a new tab`}
            title="Open the full pinout in a new tab"
            className={clsx(
              "pin-tech touch-target inline-flex items-center gap-1.5 rounded-[3px] border px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.1em] transition",
              isComplex
                ? "border-[var(--pin-probe)]/60 bg-[var(--pin-probe)]/10 text-white hover:bg-[var(--pin-probe)]/20"
                : "border-[var(--pin-frame)] bg-[#0e141b] text-[var(--pin-rail)] hover:border-[var(--pin-probe)] hover:text-white",
            )}
          >
            <ExternalLink className="size-3.5" aria-hidden="true" />
            Full sheet
          </a>
        </div>
      </div>

      <div className="mt-3">
        <PinRoleLegend
          counts={roleCounts}
          activeRole={activeRole}
          onToggle={setActiveRole}
        />
      </div>

      {/* Tall drawings render at full panel width and scroll vertically so pads
          stay legible; flatter ones letterbox to fit the panel. */}
      <div className="mt-3">
        <div
          className={clsx(
            "pin-sheet w-full rounded-t-[3px]",
            tall ? "overflow-y-auto overflow-x-hidden" : "overflow-hidden",
          )}
          style={tall ? { maxHeight: 460 } : undefined}
        >
          <div
            className="w-full"
            style={{
              aspectRatio: `${geometry.vbw} / ${geometry.vbh}`,
              maxHeight: tall ? undefined : 460,
            }}
          >
            <BoardStage
              geometry={geometry}
              title={stageTitle}
              sheetLabel={board.name}
              selectedKey={selectedKey}
              activeKey={liveKey}
              activeRole={activeRole}
              netKeys={probe.keys}
              onSelect={(key) => {
                setSelectedKey(key);
                setActiveKey(key);
              }}
              onActiveKey={setActiveKey}
            />
          </div>
        </div>
        <TitleBlock geometry={geometry} connector={board.pinout.connector} />
      </div>

      {isComplex ? (
        <p className="mt-2 flex items-center gap-1.5 text-[11px] leading-5 text-[var(--pin-rail)]/75">
          <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
          Dense connector — open the{" "}
          <a
            href={`/pinout/${board.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline underline-offset-2 hover:text-white"
          >
            full sheet
          </a>{" "}
          for a roomier, fully-annotated drawing.
        </p>
      ) : null}

      <div className="mt-3">
        <PinDetails
          anchor={liveAnchor}
          pinned={selectedKey !== null}
          net={probe.net}
          netSize={probe.keys.size}
        />
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
        <summary className="pin-eyebrow cursor-pointer text-[var(--pin-ink-strong)] transition hover:text-white">
          Pin schedule · {geometry.anchors.length} pins
        </summary>
        <div className="mt-2 max-h-80 overflow-y-auto pr-1">
          <PinoutTable
            anchors={geometry.anchors}
            activeKey={liveKey}
            selectedKey={selectedKey}
            activeRole={activeRole}
            netKeys={probe.keys}
            netByKey={nets.netByKey}
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
          activeKey={liveKey}
          activeRole={activeRole}
          liveAnchor={liveAnchor}
          onSelect={(key) => {
            setSelectedKey(key);
            setActiveKey(key);
          }}
          onActiveKey={setActiveKey}
          onToggleRole={setActiveRole}
          onClose={() => {
            setExpanded(false);
            window.requestAnimationFrame(() => expandButtonRef.current?.focus());
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
    const appRoot = document.querySelector("main");
    const wasInert = appRoot instanceof HTMLElement ? appRoot.inert : false;
    document.body.style.overflow = "hidden";
    if (appRoot instanceof HTMLElement) appRoot.inert = true;
    return () => {
      document.body.style.overflow = previousOverflow;
      if (appRoot instanceof HTMLElement) appRoot.inert = wasInert;
    };
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-3 sm:p-6"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
        // Keep Tab cycling inside the dialog while it is open; without this
        // focus walks out into the (visually inert) page behind the overlay.
        if (event.key === "Tab") {
          const dialog = dialogRef.current;
          if (!dialog) return;
          const focusable = dialog.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), summary, [tabindex]:not([tabindex="-1"])',
          );
          if (focusable.length === 0) return;
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          const active = document.activeElement;
          if (event.shiftKey && (active === first || !dialog.contains(active))) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && active === last) {
            event.preventDefault();
            first.focus();
          }
        }
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
            <div className="pin-eyebrow">Connector drawing</div>
            <div className="pin-tech mt-1 truncate text-sm font-bold text-white">
              {board.name}
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close inspector"
            className="touch-target grid size-9 shrink-0 place-items-center rounded-[3px] border border-[var(--pin-frame)] text-[var(--pin-rail)] transition hover:border-[var(--pin-probe)] hover:text-white"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <InspectorBody
            board={board}
            geometry={geometry}
            selectedKey={selectedKey}
            activeKey={activeKey}
            activeRole={activeRole}
            liveAnchor={liveAnchor}
            onSelect={onSelect}
            onActiveKey={onActiveKey}
            onToggleRole={onToggleRole}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
