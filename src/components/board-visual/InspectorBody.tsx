"use client";

import { useCallback, useId, useMemo, useState } from "react";
import { clsx } from "clsx";
import { Search, X } from "lucide-react";
import type { Board, PinRole } from "@/lib/boards";
import type { BoardGeometry, PinAnchor } from "@/lib/board-visual-geometry";
import { BoardDrawingViewport } from "./BoardDrawingViewport";
import { connectorCaption } from "@/components/board-visual/illustration-caption";
import {
  PinDetails,
  type PinoutSource,
} from "@/components/board-visual/PinDetails";
import { PinColorKey } from "@/components/board-visual/PinRoleLegend";
import {
  filterPinAnchors,
  pinoutFilterOptions,
  PinoutTable,
  type PinoutFilterCategory,
} from "@/components/board-visual/PinoutTable";
import { countRoles, roleLabels } from "@/components/board-visual/roles";
import { probedNet, useBoardNets } from "@/components/board-visual/use-board-nets";
import { classifySource, verificationSourceFor } from "@/lib/source-trust";
import { pinReportContextFor } from "@/lib/pin-report";
import { CopyPinTable } from "@/components/CopyPinTable";

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
  query,
  onQueryChange,
  activeCategories,
  onActiveCategoriesChange,
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
  /** Optional controlled explorer state used by the standalone full view. */
  query?: string;
  onQueryChange?: (query: string) => void;
  activeCategories?: readonly PinoutFilterCategory[];
  onActiveCategoriesChange?: (categories: PinoutFilterCategory[]) => void;
}) {
  const nets = useBoardNets(geometry.anchors);
  const probe = probedNet(nets, activeKey);
  const [localQuery, setLocalQuery] = useState("");
  const [localCategories, setLocalCategories] = useState<
    PinoutFilterCategory[]
  >([]);
  const explorerQuery = query ?? localQuery;
  const explorerCategories = activeCategories ?? localCategories;
  const setExplorerQuery = onQueryChange ?? setLocalQuery;
  const setExplorerCategories =
    onActiveCategoriesChange ?? setLocalCategories;
  const connector = board.pinout?.connector ?? "";
  const filteredAnchors = useMemo(
    () =>
      filterPinAnchors(geometry.anchors, {
        query: explorerQuery,
        categories: explorerCategories,
        connector,
        functionData: board.pinFunctions,
      }),
    [board.pinFunctions, connector, explorerCategories, explorerQuery, geometry.anchors],
  );
  // The drawing highlights exactly what the table lists, so "Show pins" is one
  // control with one meaning on both halves of the workbench.
  const filtering = explorerCategories.length > 0 || explorerQuery.trim() !== "";
  const highlight = useMemo(
    () => (filtering ? new Set(filteredAnchors.map((anchor) => anchor.key)) : null),
    [filtering, filteredAnchors],
  );
  // The same document "Before you wire" says to verify against, so the pin
  // readout, the board panel, and a filed report all cite one source.
  const source = useMemo<PinoutSource | undefined>(() => {
    const link = verificationSourceFor(board);
    return link
      ? {
          ...link,
          provenance: classifySource(board.vendor, link.url),
        }
      : undefined;
  }, [board]);
  const report = useMemo(() => pinReportContextFor(board), [board]);
  const clearExplorerFilters = useCallback(() => {
    setExplorerQuery("");
    setExplorerCategories([]);
  }, [setExplorerCategories, setExplorerQuery]);
  const toggleCategory = useCallback(
    (category: PinoutFilterCategory) => {
      setExplorerCategories(
        explorerCategories.includes(category)
          ? explorerCategories.filter((item) => item !== category)
          : [...explorerCategories, category],
      );
    },
    [explorerCategories, setExplorerCategories],
  );
  const roleCounts = useMemo(
    () => countRoles(geometry.anchors.map((anchor) => anchor.pin)),
    [geometry.anchors],
  );
  const baseId = useId();
  const showPinsId = `${baseId}-show-pins`;
  const activeCategoryLabels = explorerCategories.map(
    (category) =>
      pinoutFilterOptions.find((option) => option.id === category)?.label ??
      category,
  );
  const filterStatus = [
    explorerQuery.trim() ? `matching “${explorerQuery.trim()}”` : "",
    activeCategoryLabels.length
      ? `in ${activeCategoryLabels.join(", ")}`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="@container grid min-h-0 gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
      <div className="min-w-0">
        {query === undefined ? (
          <label className="relative block">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500"
              aria-hidden="true"
            />
            <input
              value={explorerQuery}
              onChange={(event) => setExplorerQuery(event.target.value)}
              placeholder="Find a pin, position, group, or connector…"
              aria-label="Search pins, groups, or connector"
              className="h-11 w-full rounded-md border border-white/10 bg-[#0a0c11] pl-10 pr-11 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-cyan-300/70 focus:ring-1 focus:ring-cyan-300/30"
            />
            {explorerQuery ? (
              <button
                type="button"
                onClick={() => setExplorerQuery("")}
                aria-label="Clear pin search"
                className="absolute right-1 top-1/2 grid size-11 -translate-y-1/2 place-items-center text-zinc-500 transition hover:text-white"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            ) : null}
          </label>
        ) : null}

        <div className={clsx("space-y-2", query === undefined ? "mt-3" : "mt-0")}>
          <div className="flex items-center justify-between gap-2">
            <span id={showPinsId} className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">
              Show pins
            </span>
            {filtering ? (
              <button
                type="button"
                onClick={clearExplorerFilters}
                className="min-h-11 min-w-11 text-[11px] text-cyan-200 underline-offset-4 transition hover:text-white hover:underline"
              >
                Show all pins
              </button>
            ) : null}
          </div>
          <div
            // The padding gives a focused chip's ring room inside the scroller,
            // which would otherwise clip it; the negative margin keeps the
            // chips aligned with the text above.
            className="-mx-1 -mt-1 flex gap-1.5 overflow-x-auto px-1 pb-1 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="group"
            aria-labelledby={showPinsId}
          >
            {pinoutFilterOptions.map((option) => {
              const active = explorerCategories.includes(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => toggleCategory(option.id)}
                  aria-pressed={active}
                  className={clsx(
                    "min-h-11 min-w-11 shrink-0 rounded-md border px-2.5 text-[11px] font-medium transition",
                    active
                      ? "border-cyan-300/65 bg-cyan-300/12 text-cyan-50"
                      : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/25 hover:text-white",
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          {/* Always present so the live region announces a filter change; only
              visible while filtering, since the table heading says "All N pins". */}
          <p className={filtering ? "text-[11px] text-zinc-500" : "sr-only"} role="status" aria-live="polite">
            {filtering
              ? `Showing ${filteredAnchors.length} of ${geometry.anchors.length} pins${filterStatus ? ` · ${filterStatus}` : ""}`
              : `All ${geometry.anchors.length} pins`}
          </p>
          {explorerCategories.length ? (
            <p className="text-[11px] leading-5 text-zinc-500">
              Matches recorded functions, alternates included. A pin left out may
              still have the function; check the datasheet for mux limits.
            </p>
          ) : null}
          {activeRole ? (
            <p className="flex flex-wrap items-center gap-x-2 text-[11px] text-zinc-400">
              Highlighting {roleLabels[activeRole]} pins
              <button
                type="button"
                onClick={() => onToggleRole(null)}
                className="min-h-11 min-w-11 text-cyan-200 underline-offset-4 transition hover:text-white hover:underline"
              >
                Stop highlighting
              </button>
            </p>
          ) : null}
        </div>

        <div className="mt-3">
          {geometry.portraitId && <p className="text-xs text-zinc-400">{geometry.orientation}</p>}
          <BoardDrawingViewport
            board={board} geometry={geometry} selectedKey={selectedKey} activeKey={activeKey} activeRole={activeRole}
            netKeys={probe.keys} highlight={highlight} onSelect={onSelect} onActiveKey={onActiveKey} enlargeLabels
          />
          <div className="mt-2">
            <PinColorKey counts={roleCounts} />
          </div>
          <p className="mt-2 text-[11px] leading-5 text-zinc-500">
            {connectorCaption(geometry)}
          </p>
        </div>

        <div className="mt-3">
          <PinDetails
            anchor={liveAnchor}
            pinned={selectedKey !== null}
            net={probe.net}
            netSize={probe.keys.size}
            source={source}
            report={report}
            flagNotes={board.pinFunctions?.flagNotes}
            onClear={() => onSelect(null)}
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
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-xs uppercase tracking-[0.16em] text-zinc-500">
            {filteredAnchors.length === geometry.anchors.length
              ? `All ${geometry.anchors.length} pins`
              : `Showing ${filteredAnchors.length} of ${geometry.anchors.length} pins`}
          </h4>
          {board.pinout ? <CopyPinTable pinout={board.pinout} board={board} /> : null}
        </div>
        {filteredAnchors.length ? (
          <PinoutTable
            anchors={filteredAnchors}
            flagNotes={board.pinFunctions?.flagNotes}
            activeKey={activeKey}
            selectedKey={selectedKey}
            activeRole={activeRole}
            netKeys={probe.keys}
            netByKey={nets.netByKey}
            onSelect={onSelect}
            onActiveKey={onActiveKey}
          />
        ) : (
          <section className="rounded-md border border-dashed border-white/15 bg-[#101319] p-4 text-sm text-zinc-400">
            <p>No pins match the current search and category filters.</p>
            <button
              type="button"
              onClick={clearExplorerFilters}
              className="mt-3 min-h-11 rounded-md border border-cyan-300/40 bg-cyan-300/10 px-3 text-xs font-medium text-cyan-50 transition hover:bg-cyan-300/20"
            >
              Clear pin filters
            </button>
          </section>
        )}
      </div>
    </div>
  );
}
