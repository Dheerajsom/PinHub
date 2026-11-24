"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Expand, ExternalLink, X } from "lucide-react";
import type { Board, PinRole } from "@/lib/boards";
import { buildBoardGeometry, type BoardGeometry, type PinAnchor } from "@/lib/board-visual-geometry";
import { BoardDrawingViewport } from "./BoardDrawingViewport";
import { connectorCaption } from "@/components/board-visual/illustration-caption";
import { PinDetails } from "@/components/board-visual/PinDetails";
import { PinRoleLegend } from "@/components/board-visual/PinRoleLegend";
import { PinoutTable } from "@/components/board-visual/PinoutTable";
import { InspectorBody } from "@/components/board-visual/InspectorBody";
import { countRoles } from "@/components/board-visual/roles";
import { probedNet, useBoardNets } from "@/components/board-visual/use-board-nets";
import { pinReportContextFor } from "@/lib/pin-report";
import { serializePinoutState } from "@/lib/pinout-state";

export function BoardPinoutVisualization({ board }: { board: Board }) {
  const geometry = useMemo(() => buildBoardGeometry(board), [board]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [activeRole, setActiveRole] = useState<PinRole | null>(null);
  const [expanded, setExpanded] = useState(false);
  const expandButtonRef = useRef<HTMLButtonElement>(null);
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
  const report = useMemo(() => pinReportContextFor(board), [board]);
  const linkState = serializePinoutState(
    { role: activeRole, pin: selectedKey },
    new Set(geometry?.anchors.map((anchor) => anchor.key)),
    new Set(geometry?.anchors.map((anchor) => anchor.pin.role)),
  );
  const fullViewHref = `/boards/${board.id}${linkState ? `?${linkState}` : ""}#pins`;

  if (!board.pinout || !geometry) {
    return (
      <section className="rounded-lg border border-dashed border-white/15 bg-[#101319] p-4">
        <div className="text-sm font-medium text-white">Pin map queued</div>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          This board has official references linked, but its in-app connector map still needs a source-backed
          import.
        </p>
      </section>
    );
  }

  const liveAnchor = anchorsByKey.get(liveKey ?? "") ?? null;
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
          <h3 className="text-sm font-semibold text-white">{board.pinout.connector}</h3>
          <p className="mt-1 text-xs text-zinc-400">{board.logicLevel}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            ref={expandButtonRef}
            type="button"
            onClick={() => setExpanded(true)}
            className="touch-target inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-[#15181f] px-2.5 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-cyan-300/60 hover:text-white"
          >
            <Expand className="size-3.5" aria-hidden="true" />
            Inspect
          </button>
          <a
            href={fullViewHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open the ${board.name} pinout in a new tab`}
            title="Open the full pinout in a new tab"
            className="touch-target inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-cyan-200 hover:text-white"
          >
            <ExternalLink className="size-3.5" aria-hidden="true" />
            Full view
          </a>
        </div>
      </div>

      <div className="connector-drawing mt-3">
        {(geometry.artworkId || geometry.portraitId) && <p className="text-xs text-zinc-400">{geometry.orientation}</p>}
        <BoardDrawingViewport
          board={board} geometry={geometry} selectedKey={selectedKey} activeKey={liveKey} activeRole={activeRole}
          netKeys={probe.keys} onActiveKey={setActiveKey}
          onSelect={(key) => { setSelectedKey(key); setActiveKey(key); }}
        />
        <p className="mt-2 text-[11px] leading-5 text-zinc-500">{connectorCaption(geometry)}</p>
      </div>
      <label className="mt-3 block">
        <span className="text-xs font-medium text-zinc-400">Select a pin</span>
        <select
          className="mt-1 block min-h-11 w-full min-w-0 rounded-md border border-white/15 bg-[#15181f] px-2 text-base text-white"
          value={selectedKey ?? ""}
          onChange={(event) => {
            setSelectedKey(event.target.value || null);
            setActiveKey(null);
          }}
        >
          <option value="">Choose a pin…</option>
          {geometry.anchors.map(({ key, pin, group }) => (
            <option key={key} value={key}>
              {group ? `${group} · ` : ""}
              {pin.position} · {pin.label}
              {pin.aliases?.length ? ` / ${pin.aliases.join(" / ")}` : ""}
            </option>
          ))}
        </select>
      </label>
      {liveAnchor && (
        <div className="mt-3">
          <PinDetails
            anchor={liveAnchor}
            pinned={selectedKey !== null}
            net={probe.net}
            netSize={probe.keys.size}
            report={report}
            flagNotes={board.pinFunctions?.flagNotes}
            onClear={() => {
              setSelectedKey(null);
              setActiveKey(null);
            }}
          />
        </div>
      )}

      <details className="mt-3 border-t border-white/10">
        <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium text-zinc-300">
          Highlight pin roles
        </summary>
        <PinRoleLegend counts={roleCounts} activeRole={activeRole} onToggle={setActiveRole} />
      </details>
      {/* Connector caveats from the source-backed pinout notes. */}
      <ul className="mt-4 space-y-1.5 border-t border-white/10 pt-3 text-sm leading-6 text-zinc-400">
        {board.pinout.notes.map((note) => (
          <li key={note} className="flex gap-2">
            <span className="mt-2.5 size-1 shrink-0 rounded-full bg-zinc-600" aria-hidden="true" />
            <span className="min-w-0">{note}</span>
          </li>
        ))}
      </ul>

      <details className="pin-reference-table mt-3 border-t border-white/10 pt-3">
        <summary className="min-h-11 cursor-pointer text-sm font-medium text-zinc-300 transition hover:text-white">
          All {geometry.anchors.length} pins (table)
        </summary>
        <div className="mt-2 max-h-80 overflow-y-auto pr-1">
          <PinoutTable
            anchors={geometry.anchors}
            flagNotes={board.pinFunctions?.flagNotes}
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

export function ExpandedInspector({
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
            <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">Connector</div>
            <div className="mt-1 truncate text-sm font-semibold text-white">
              {board.name} · {board.pinout?.connector}
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close inspector"
            className="touch-target grid size-9 shrink-0 place-items-center rounded-md border border-white/15 text-zinc-300 transition hover:border-cyan-300/60 hover:text-white"
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
