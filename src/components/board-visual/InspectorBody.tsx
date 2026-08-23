"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import { Search, Scan, X } from "lucide-react";
import type { Board, PinRole } from "@/lib/boards";
import type { BoardGeometry, PinAnchor } from "@/lib/board-visual-geometry";
import { BoardStage } from "@/components/board-visual/BoardStage";
import {
  PinDetails,
  type PinoutSource,
} from "@/components/board-visual/PinDetails";
import { PinRoleLegend } from "@/components/board-visual/PinRoleLegend";
import {
  filterPinAnchors,
  pinoutFilterOptions,
  PinoutTable,
  type PinoutFilterCategory,
} from "@/components/board-visual/PinoutTable";
import { countRoles } from "@/components/board-visual/roles";
import { probedNet, useBoardNets } from "@/components/board-visual/use-board-nets";
import { classifySource } from "@/lib/source-trust";
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
      }),
    [connector, explorerCategories, explorerQuery, geometry.anchors],
  );
  const source = useMemo<PinoutSource | undefined>(() => {
    const link =
      board.sourceLinks.find((item) => item.type === "Pinout") ??
      board.sourceLinks[0];
    return link
      ? {
          ...link,
          provenance: classifySource(board.vendor, link.url),
        }
      : undefined;
  }, [board]);
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
  const hintId = `${useId()}-sheet-hint`;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [fitToWidth, setFitToWidth] = useState(false);
  const [scroll, setScroll] = useState({
    scrollable: false,
    atStart: true,
    atEnd: true,
  });
  const { scrollable, atStart, atEnd } = scroll;
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
                className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center text-zinc-500 transition hover:text-white"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            ) : null}
          </label>
        ) : null}

        <div className={clsx("space-y-2", query === undefined ? "mt-3" : "mt-0")}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">
              Filter pins
            </span>
            {explorerCategories.length || explorerQuery ? (
              <button
                type="button"
                onClick={clearExplorerFilters}
                className="text-[11px] text-cyan-200 underline-offset-4 transition hover:text-white hover:underline"
              >
                Clear filters
              </button>
            ) : null}
          </div>
          <div
            className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="group"
            aria-label="Filter pins by category"
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
                    "min-h-9 shrink-0 rounded-md border px-2.5 text-[11px] font-medium transition",
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
          <p className="text-[11px] text-zinc-500" role="status" aria-live="polite">
            Showing {filteredAnchors.length} of {geometry.anchors.length} pins
            {filterStatus ? ` · ${filterStatus}` : ""}
          </p>
        </div>

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
              <p
                id={hintId}
                className="min-w-0 text-[11px] leading-4 text-zinc-500"
              >
                {fitToWidth
                  ? "Whole board shown — labels are reduced"
                  : "Swipe horizontally to view the full connector"}
              </p>
              <button
                type="button"
                onClick={() => setFitToWidth((value) => !value)}
                aria-pressed={fitToWidth}
                className={clsx(
                  "touch-target inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] font-medium transition",
                  fitToWidth
                    ? "border-cyan-300/60 bg-cyan-300/10 text-cyan-50"
                    : "border-white/15 bg-[#15181f] text-zinc-200 hover:border-cyan-300/60 hover:text-white",
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
              aria-label={`${board.name} connector diagram`}
              aria-describedby={scrollable || fitToWidth ? hintId : undefined}
              className="bv-stage-wrap w-full overflow-auto rounded-md p-2"
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
                  showAllLabels
                  netKeys={probe.keys}
                  onSelect={onSelect}
                  onActiveKey={onActiveKey}
                />
              </div>
            </div>
            {/* The diagram runs under a fade at the edge it continues past, so
                "there is more board this way" is visible, not just stated. */}
            {scrollable ? (
              <>
                <div
                  aria-hidden="true"
                  className={clsx(
                    "pointer-events-none absolute inset-y-px left-px w-8 rounded-l-md bg-gradient-to-r from-[#0a0c11] to-transparent transition-opacity",
                    atStart ? "opacity-0" : "opacity-100",
                  )}
                />
                <div
                  aria-hidden="true"
                  className={clsx(
                    "pointer-events-none absolute inset-y-px right-px w-8 rounded-r-md bg-gradient-to-l from-[#0a0c11] to-transparent transition-opacity",
                    atEnd ? "opacity-0" : "opacity-100",
                  )}
                />
              </>
            ) : null}
          </div>
          <p className="mt-2 text-[11px] leading-5 text-zinc-500">
            {geometry.notToScale
              ? "Simplified diagram, grouped by function — not to physical scale. Pin data is source-backed; verify against the linked documentation."
              : "Simplified technical illustration. Pin data is source-backed; verify against the linked documentation before wiring."}
          </p>
        </div>

        <div className="mt-3">
          <PinDetails
            anchor={liveAnchor}
            pinned={selectedKey !== null}
            net={probe.net}
            netSize={probe.keys.size}
            source={source}
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
          {board.pinout ? <CopyPinTable pinout={board.pinout} /> : null}
        </div>
        {filteredAnchors.length ? (
          <PinoutTable
            anchors={filteredAnchors}
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
              className="mt-3 min-h-10 rounded-md border border-cyan-300/40 bg-cyan-300/10 px-3 text-xs font-medium text-cyan-50 transition hover:bg-cyan-300/20"
            >
              Clear pin filters
            </button>
          </section>
        )}
      </div>
    </div>
  );
}
