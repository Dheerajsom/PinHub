"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import type { Board } from "@/lib/boards";
import type { PinoutState } from "@/lib/pinout-state";
import { usePinoutUrlState } from "@/components/board-visual/usePinoutUrlState";
import { buildBoardGeometry } from "@/lib/board-visual-geometry";
import { InspectorBody } from "@/components/board-visual/InspectorBody";
import {
  categoryForRole,
  filterPinAnchors,
  type PinoutFilterCategory,
} from "@/components/board-visual/PinoutTable";
import { PlanPinsLink } from "@/components/planner/PlanPinsLink";
import { PinCautions } from "@/components/board-visual/PinCautions";

const noUrlState: PinoutState = { role: null, pin: null };

/**
 * The pin workbench on a board's page: pin search, one "Show pins" filter that
 * drives the drawing and the table together, the net probe, and the pin
 * schedule. `?pin=` selects a pin and `?show=` holds the filter; an old
 * `?role=` seeds the matching filter, so links into the standalone pinout page
 * that merged into this one keep working after the redirect.
 */
export function BoardWorkbench({ board }: { board: Board }) {
  const geometry = useMemo(() => buildBoardGeometry(board), [board]);
  const { state, update } = usePinoutUrlState(geometry?.anchors ?? []);
  return <BoardWorkbenchView board={board} urlState={state} onUrlState={update} />;
}

/**
 * The same workbench with no URL state. It is the Suspense fallback, so the
 * prerendered page carries the whole pin map and schedule, not a spinner.
 */
export function BoardWorkbenchFallback({ board }: { board: Board }) {
  return <BoardWorkbenchView board={board} urlState={noUrlState} onUrlState={() => {}} />;
}

function BoardWorkbenchView({
  board,
  urlState,
  onUrlState,
}: {
  board: Board;
  urlState: PinoutState;
  onUrlState: (next: PinoutState) => void;
}) {
  const geometry = useMemo(() => buildBoardGeometry(board), [board]);
  const inspectorRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLElement>(null);
  // A link to a pin (`?pin=`) lands on its summary: the board page puts specs
  // and cautions first, so without this an arrival from a pin lookup or an old
  // /pinout link would open with the chosen pin below the fold. Arrival only;
  // picking a pin on the page never scrolls it away from the reader.
  const arrivedWithPin = useRef(urlState.pin !== null);
  useEffect(() => {
    if (!arrivedWithPin.current) return;
    arrivedWithPin.current = false;
    selectedRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
  }, []);
  const selectedKey = urlState.pin;
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  // `?show=` holds the active "Show pins" chips, so a filtered view can be
  // shared and the back button steps through filter changes. An old `?role=`
  // link opens with the matching chip on; a role with no chip (debug, system,
  // alternate) stays a plain highlight instead.
  const seededCategory = urlState.role ? categoryForRole(urlState.role) : null;
  // The URL is parsed afresh each render, so memo on its text, not the array:
  // hovering a pad re-renders, and the filter must not be rebuilt for it.
  const showKey = urlState.show?.join(",") ?? "";
  const activeCategories = useMemo<PinoutFilterCategory[]>(
    () => (showKey ? (showKey.split(",") as PinoutFilterCategory[]) : seededCategory ? [seededCategory] : []),
    [seededCategory, showKey],
  );
  const activeRole = urlState.role && !seededCategory ? urlState.role : null;

  const setSelectedKey = (pin: string | null) => onUrlState({ ...urlState, pin });
  // Picking a filter replaces a seeded role, which no longer describes the view.
  const changeCategories = (next: PinoutFilterCategory[]) =>
    onUrlState({ role: seededCategory ? null : urlState.role, pin: urlState.pin, show: next });

  const anchorsByKey = useMemo(() => {
    const map = new Map<string, NonNullable<typeof geometry>["anchors"][number]>();
    geometry?.anchors.forEach((anchor) => map.set(anchor.key, anchor));
    return map;
  }, [geometry]);

  const matches = useMemo(() => {
    if (!query.trim()) return [];
    return filterPinAnchors(geometry?.anchors ?? [], {
      query,
      categories: activeCategories,
      connector: board.pinout?.connector ?? "",
      functionData: board.pinFunctions,
    });
  }, [activeCategories, board.pinFunctions, board.pinout?.connector, geometry, query]);

  if (!geometry) return null;

  const liveAnchor = anchorsByKey.get(activeKey ?? selectedKey ?? "") ?? null;
  const selectedAnchor = anchorsByKey.get(selectedKey ?? "") ?? null;

  return (
    <div
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        if (selectedKey) {
          setSelectedKey(null);
          setActiveKey(null);
        } else if (activeRole) {
          onUrlState({ ...urlState, role: null });
        }
      }}
    >
      {selectedAnchor ? (
        <section
          ref={selectedRef}
          aria-label="Selected pin"
          className="pin-screen-reference surface-panel mb-4 scroll-mt-4 rounded-lg border border-cyan-300/30 p-3"
        >
          <p className="text-xs font-medium text-cyan-200">Selected pin</p>
          <h3 className="mt-1 break-words font-mono text-sm font-semibold text-white">
            {selectedAnchor.pin.label} · Physical pin {selectedAnchor.pin.position}
          </h3>
          {selectedAnchor.group ? <p className="mt-1 text-xs text-zinc-400">{selectedAnchor.group}</p> : null}
          {selectedAnchor.pin.aliases?.length ? (
            <p className="mt-1 break-words font-mono text-xs text-zinc-300">{selectedAnchor.pin.aliases.join(" · ")}</p>
          ) : null}
          <PinCautions pin={selectedAnchor.pin} flagNotes={board.pinFunctions?.flagNotes} />
          <button
            type="button"
            className="mt-2 min-h-11 rounded-md border border-white/15 px-3 text-sm text-cyan-200 hover:border-cyan-300/60"
            onClick={() => {
              const pad = inspectorRef.current?.querySelector<SVGGElement>(`[data-pin-key="${selectedAnchor.key}"]`);
              pad?.scrollIntoView({ block: "center", inline: "center", behavior: "instant" });
              pad?.focus({ preventScroll: true });
            }}
          >
            Show selected pin on diagram
          </button>
        </section>
      ) : null}

      <div className="pin-screen-reference">
        <label className="relative mb-3 block">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500"
            aria-hidden="true"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find a pin by name, number, or function…"
            aria-label="Search pins"
            className="h-11 w-full rounded-md border border-white/10 bg-[#0a0c11] pl-10 pr-12 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-cyan-300/70 focus:ring-1 focus:ring-cyan-300/30"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear pin search"
              className="absolute right-1 top-1/2 grid size-11 -translate-y-1/2 place-items-center text-zinc-500 transition hover:text-white"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          ) : null}
        </label>
        {query ? (
          <div className="mb-3 flex max-h-24 flex-wrap gap-1.5 overflow-y-auto">
            {matches.length ? (
              matches.map((anchor) => (
                <button
                  key={anchor.key}
                  type="button"
                  onClick={() => {
                    setSelectedKey(anchor.key);
                    setActiveKey(anchor.key);
                  }}
                  className="min-h-11 min-w-11 rounded-md border border-white/15 bg-white/[0.04] px-2 py-1 font-mono text-xs text-zinc-200 transition hover:border-cyan-300/60 hover:text-white"
                >
                  {anchor.pin.position} · {anchor.pin.label}
                  {anchor.group ? ` · ${anchor.group}` : ""}
                </button>
              ))
            ) : (
              <span className="px-1 py-1 text-xs text-zinc-500">No pin matches that.</span>
            )}
          </div>
        ) : null}
        <div ref={inspectorRef}>
          <InspectorBody
            board={board}
            geometry={geometry}
            selectedKey={selectedKey}
            activeKey={activeKey ?? selectedKey}
            activeRole={activeRole}
            liveAnchor={liveAnchor}
            onSelect={(key) => {
              setSelectedKey(key);
              setActiveKey(key);
            }}
            onActiveKey={setActiveKey}
            onToggleRole={(role) => onUrlState({ ...urlState, role })}
            query={query}
            onQueryChange={setQuery}
            activeCategories={activeCategories}
            onActiveCategoriesChange={changeCategories}
          />
        </div>
        <PlanPinsLink boardId={board.id} className="mt-5" />
      </div>
    </div>
  );
}
