"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Board, PinRole } from "@/lib/boards";
import { buildBoardGeometry, type BoardGeometry } from "@/lib/board-visual-geometry";
import type { BoardLink, WireEnd } from "@/lib/board-link";
import { BoardStage } from "@/components/board-visual/BoardStage";

const noNet = new Set<string>();

// Smallest drawing scale, in CSS pixels per viewBox unit. Below it pads and
// labels are too small to read or tap (a Mega's 2 × 18 + 1 × 36 header at
// phone width), so the sheet keeps this size and scrolls sideways instead.
const minScale = 0.7;

function keyFor(geometry: BoardGeometry, end: WireEnd): string | null {
  const anchor =
    geometry.anchors.find((item) => item.pin === end.pin) ??
    geometry.anchors.find((item) => item.group === end.group && item.pin.position === end.pin.position);
  return anchor?.key ?? null;
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
  // A long single-row header (the Mega's) is unreadable at half width, so a
  // wide sheet takes the whole row and the pair stacks.
  const wide = useMemo(
    () =>
      [a, b].some((board) => {
        const geometry = buildBoardGeometry(board, { sheet: true });
        return geometry ? geometry.vbw / geometry.vbh > 1.6 : false;
      }),
    [a, b],
  );
  return (
    <div
      className={
        wide
          ? "grid gap-3"
          : "grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,22rem),1fr))]"
      }
    >
      <Sheet side="a" board={a} link={link} activeIndex={activeIndex} onActivate={onActivate} />
      <Sheet side="b" board={b} link={link} activeIndex={activeIndex} onActivate={onActivate} />
    </div>
  );
}

function Sheet({
  side,
  board,
  link,
  activeIndex,
  onActivate,
}: {
  side: "a" | "b";
  board: Board;
  link: BoardLink;
  activeIndex: number | null;
  onActivate: (index: number | null) => void;
}) {
  const geometry = useMemo(() => buildBoardGeometry(board, { sheet: true }), [board]);
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const keys = useMemo(
    () => (geometry ? link.wires.map((wire) => keyFor(geometry, wire[side])) : []),
    [geometry, link, side],
  );
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
      <SheetStage
        geometry={geometry}
        board={board}
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
  board,
  selectedKey,
  hoverKey,
  planned,
  onSelect,
  onHover,
}: {
  geometry: BoardGeometry;
  board: Board;
  selectedKey: string | null;
  hoverKey: string | null;
  planned: ReadonlyMap<string, PinRole>;
  onSelect: (key: string | null) => void;
  onHover: (key: string | null) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [overflows, setOverflows] = useState(false);

  // Say so when the sheet is wider than its panel; nothing else would show
  // that the rest of the connector is a sideways scroll away.
  useEffect(() => {
    const element = scroller.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => setOverflows(element.scrollWidth > element.clientWidth + 1));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // A sheet wider than its panel scrolls; bring the selected wire's pad into
  // view so picking a row in the harness shows where it lands.
  useEffect(() => {
    const element = scroller.current;
    const anchor = selectedKey ? geometry.anchors.find((item) => item.key === selectedKey) : null;
    if (!element || !anchor || element.scrollWidth <= element.clientWidth) return;
    const x = (anchor.cx / geometry.vbw) * element.scrollWidth;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    element.scrollTo({ left: x - element.clientWidth / 2, behavior: reduced ? "auto" : "smooth" });
  }, [geometry, selectedKey]);

  return (
    <>
    <div
      ref={scroller}
      className="bv-stage-wrap w-full overflow-x-auto rounded-md"
      role="region"
      aria-label={`${board.name} connector sheet`}
    >
      <div
        className="mx-auto"
        style={{
          aspectRatio: `${geometry.vbw} / ${geometry.vbh}`,
          width: `max(min(100%, calc(max(320px, 70dvh) * ${(geometry.vbw / geometry.vbh).toFixed(4)})), ${Math.round(geometry.vbw * minScale)}px)`,
        }}
      >
          <BoardStage
            geometry={geometry}
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
        Scroll sideways for the rest of the connector.
      </p>
    ) : null}
    </>
  );
}
