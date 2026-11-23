"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import type { Board, PinRole } from "@/lib/boards";
import { buildBoardGeometry, type BoardGeometry } from "@/lib/board-visual-geometry";
import type { BoardLink } from "@/lib/board-link";
import { BoardStage } from "@/components/board-visual/BoardStage";
import { padHitRadius } from "@/components/board-visual/touch-sizing";
import { inView, linkedSheetView, sheetScrollCentre, wireEndKey, type SheetView } from "@/components/link/sheet-view";

const noNet = new Set<string>();

// Smallest drawing scale, in CSS pixels per viewBox unit. Below it pads and
// labels are too small to read or tap (a Mega's 2 × 18 + 1 × 36 header at
// phone width), so the sheet keeps this size and scrolls sideways instead.
const minScale = 0.7;

type SheetPlan = {
  side: "a" | "b";
  board: Board;
  geometry: BoardGeometry | null;
  /** The pad each wire lands on, in wire order (null: not drawn). */
  keys: (string | null)[];
  /** The frame on the linked connectors, or null when the whole sheet is better. */
  view: SheetView | null;
  /** Identity of this sheet for this link, so a "whole board" choice does not
   *  carry over to a different board, bus, or port. */
  id: string;
};

/** Width that keeps every pad's hit region 44 px across, for `w` viewBox units. */
function touchWidthFor(geometry: BoardGeometry, w: number): number {
  return Math.ceil((w * 44) / (2 * padHitRadius(geometry)));
}

// The sheet panel's padding and border, around the drawing.
const panelChrome = 26;
const gridGap = 12;

function useGridWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => setWidth(element.clientWidth));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

function useCoarsePointer(): boolean {
  // Assume touch until the browser says otherwise: the safe sizing.
  const [coarse, setCoarse] = useState(true);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(hover: hover) and (pointer: fine)");
    const touch = window.matchMedia("(any-pointer: coarse)");
    const update = () => setCoarse(touch.matches || !query.matches);
    update();
    query.addEventListener("change", update);
    touch.addEventListener("change", update);
    return () => {
      query.removeEventListener("change", update);
      touch.removeEventListener("change", update);
    };
  }, []);
  return coarse;
}

function planSheet(side: "a" | "b", board: Board, link: BoardLink): SheetPlan {
  const geometry = buildBoardGeometry(board, { sheet: true });
  const keys = geometry ? link.wires.map((wire) => wireEndKey(geometry, wire[side])) : [];
  const view = geometry ? linkedSheetView(geometry, keys) : null;
  return { side, board, geometry, keys, view, id: `${side}:${board.id}:${keys.join(",")}` };
}

/** Both boards' connector sheets, with every linked pin ringed. */
export function LinkSheets({
  link,
  a,
  b,
  activeIndex,
  onActivate,
}: {
  link: BoardLink;
  a: Board;
  b: Board;
  activeIndex: number | null;
  onActivate: (index: number | null) => void;
}) {
  const plans = useMemo(() => [planSheet("a", a, link), planSheet("b", b, link)], [a, b, link]);
  // Sheets the reader opened out to the whole board, by sheet identity.
  const [whole, setWhole] = useState<ReadonlySet<string>>(() => new Set());
  const frameOf = (plan: SheetPlan) => (whole.has(plan.id) ? null : plan.view);

  const [grid, gridWidth] = useGridWidth();
  const coarse = useCoarsePointer();

  // A long single-row header (the Mega's) is unreadable at half width, and so
  // is any sheet whose legible minimum is wider than half the row (a UNO's two
  // headers, a schematic strip of eleven columns): the pair stacks, so each
  // sheet gets the whole row and its linked pins are on screen together.
  const wide = plans.some((plan) => {
    if (!plan.geometry) return false;
    const frame = frameOf(plan);
    const w = frame?.w ?? plan.geometry.vbw;
    const h = frame?.h ?? plan.geometry.vbh;
    if (w / h > 1.6) return true;
    if (gridWidth === null) return false;
    const legible = Math.max(w * minScale, coarse ? touchWidthFor(plan.geometry, w) : 0);
    return legible + panelChrome > (gridWidth - gridGap) / 2;
  });

  return (
    <div
      ref={grid}
      className={
        wide
          ? "grid gap-3"
          : "grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,22rem),1fr))]"
      }
    >
      {plans.map((plan) => (
        <Sheet
          key={plan.side}
          plan={plan}
          link={link}
          frame={frameOf(plan)}
          onWhole={(next) =>
            setWhole((value) => {
              const copy = new Set(value);
              if (next) copy.add(plan.id);
              else copy.delete(plan.id);
              return copy;
            })
          }
          activeIndex={activeIndex}
          onActivate={onActivate}
        />
      ))}
    </div>
  );
}

function Sheet({
  plan,
  link,
  frame,
  onWhole,
  activeIndex,
  onActivate,
}: {
  plan: SheetPlan;
  link: BoardLink;
  frame: SheetView | null;
  onWhole: (whole: boolean) => void;
  activeIndex: number | null;
  onActivate: (index: number | null) => void;
}) {
  const { side, board, geometry, keys, view } = plan;
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const planned = useMemo(() => {
    const map = new Map<string, PinRole>();
    link.wires.forEach((wire, index) => {
      const key = keys[index];
      if (key) map.set(key, wire.kind === "ground" ? "ground" : link.bus);
    });
    return map;
  }, [keys, link]);

  const label = side === "a" ? "A" : "B";
  if (!geometry) {
    return (
      <figure className="surface-panel rounded-xl p-4">
        <figcaption className="text-sm text-zinc-400">
          {label} · {board.name}: no drawing for this connector. The wire list above still applies.
        </figcaption>
      </figure>
    );
  }

  return (
    <figure className="surface-panel min-w-0 rounded-xl p-3">
      <figcaption className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2 px-1 pb-2">
        <span className="ph-link-side row-span-2" aria-hidden="true">{label}</span>
        <span className="text-sm font-semibold leading-5 text-white [overflow-wrap:anywhere]">{board.name}</span>
        <span className="truncate font-mono text-[11px] text-zinc-500">{board.pinout?.connector}</span>
      </figcaption>
      {view ? (
        <div className="ph-link-frame">
          <p className="min-w-0 text-[12px] leading-5 text-zinc-400">
            {frame ? (
              <>
                Showing{" "}
                <span className="font-mono text-zinc-200">
                  {view.connectors.length ? view.connectors.join(" + ") : "the linked pins"}
                </span>
              </>
            ) : (
              "Showing the whole board"
            )}
          </p>
          <button
            type="button"
            className="ph-link-ghost shrink-0"
            aria-pressed={!frame}
            onClick={() => onWhole(Boolean(frame))}
          >
            {frame ? (
              <Maximize2 className="size-3.5" aria-hidden="true" />
            ) : (
              <Minimize2 className="size-3.5" aria-hidden="true" />
            )}
            Whole board
          </button>
        </div>
      ) : null}
      <SheetStage
        geometry={geometry}
        frame={frame}
        board={board}
        linkedKeys={keys}
        selectedKey={activeIndex === null ? null : keys[activeIndex] ?? null}
        hoverKey={hoverKey}
        planned={planned}
        onSelect={(key) => {
          const index = key ? keys.indexOf(key) : -1;
          onActivate(index === -1 ? null : index);
        }}
        onHover={setHoverKey}
      />
    </figure>
  );
}

function SheetStage({
  geometry,
  frame,
  board,
  linkedKeys,
  selectedKey,
  hoverKey,
  planned,
  onSelect,
  onHover,
}: {
  geometry: BoardGeometry;
  frame: SheetView | null;
  board: Board;
  linkedKeys: readonly (string | null)[];
  selectedKey: string | null;
  hoverKey: string | null;
  planned: ReadonlyMap<string, PinRole>;
  onSelect: (key: string | null) => void;
  onHover: (key: string | null) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [overflows, setOverflows] = useState(false);
  const area = frame ?? { x: 0, y: 0, w: geometry.vbw, h: geometry.vbh };

  // Only the pads inside the frame are drawn and focusable.
  const shown = useMemo(
    () => (frame ? { ...geometry, anchors: geometry.anchors.filter((anchor) => inView(frame, anchor)) } : geometry),
    [geometry, frame],
  );

  // Say so when the sheet is wider than its panel; nothing else would show
  // that the rest of the connector is a sideways scroll away.
  useEffect(() => {
    const element = scroller.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => setOverflows(element.scrollWidth > element.clientWidth + 1));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // A sheet wider than its panel scrolls. Open it on the linked pins, so a
  // connector on the board's right edge is not a sideways hunt, and follow the
  // selected wire's pad when a harness row is picked. When the linked pins
  // span more than the panel, open on as many of them as fit and say so.
  const [spread, setSpread] = useState(false);
  const linkedX = useMemo(
    () =>
      linkedKeys
        .map((key) => geometry.anchors.find((anchor) => anchor.key === key)?.cx)
        .filter((x): x is number => x !== undefined),
    [geometry, linkedKeys],
  );
  useEffect(() => {
    const element = scroller.current;
    if (!element || element.scrollWidth <= element.clientWidth) {
      setSpread(false);
      return;
    }
    const scale = element.scrollWidth / area.w;
    const toPx = (cx: number) => (cx - area.x) * scale;
    const anchor = selectedKey ? geometry.anchors.find((item) => item.key === selectedKey) : null;
    const fit = sheetScrollCentre(linkedX.map(toPx), element.clientWidth, (geometry.padR * scale) / 2);
    setSpread(fit !== null && fit.shown < linkedX.length);
    const target = anchor ? toPx(anchor.cx) : fit?.centre;
    if (target === undefined) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    element.scrollTo({ left: target - element.clientWidth / 2, behavior: anchor && !reduced ? "smooth" : "auto" });
  }, [geometry, selectedKey, linkedX, area.x, area.w, overflows]);

  // Keep every pad's hit region at least 44 px across on touch screens. A
  // mouse needs no such margin, so there the sheet may shrink to its legible
  // minimum and fit the panel (see .ph-link-sheet-art).
  const touchWidth = touchWidthFor(geometry, area.w);

  return (
    <>
    <div
      ref={scroller}
      className="bv-stage-wrap w-full overflow-x-auto rounded-md"
      role="region"
      aria-label={`${board.name} connector sheet`}
    >
      <div
        className="ph-link-sheet-art mx-auto"
        style={{
          aspectRatio: `${area.w} / ${area.h}`,
          width: `max(min(100%, calc(max(320px, 70dvh) * ${(area.w / area.h).toFixed(4)})), ${Math.round(area.w * minScale)}px)`,
          ["--sheet-touch-width" as string]: `${touchWidth}px`,
        }}
      >
          <BoardStage
            geometry={shown}
            view={frame ?? undefined}
            title={`${board.name}: linked pins`}
            sheetLabel={board.name}
            selectedKey={selectedKey}
            activeKey={hoverKey ?? selectedKey}
            activeRole={null}
            showAllLabels
            netKeys={noNet}
            planned={planned}
            onSelect={onSelect}
            onActiveKey={onHover}
          />
      </div>
    </div>
    {overflows ? (
      <p className="px-1 pt-2 font-mono text-[11px] text-zinc-500">
        {spread
          ? "The linked pins span more than the screen. Scroll sideways, or pick a wire above to jump to its pin."
          : "Scroll sideways for the rest of the connector."}
      </p>
    ) : null}
    </>
  );
}
