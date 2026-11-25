"use client";

import {
  useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState,
  type ComponentProps, type KeyboardEvent, type PointerEvent,
} from "react";
import { Minus, Plus, Scan, ZoomIn } from "lucide-react";
import type { BoardGeometry } from "@/lib/board-visual-geometry";
import { BoardStage } from "./BoardStage";
import { touchDrawingWidth } from "./touch-sizing";
import {
  FIT, clampView, panBy, reveal, viewRect, wheelPixels, zoomAt,
  type DiagramView, type Size,
} from "./diagram-view";

type PinProps = Pick<ComponentProps<typeof BoardStage>,
  "selectedKey" | "activeKey" | "activeRole" | "netKeys" | "highlight" | "onSelect" | "onActiveKey"
>;
type Props = PinProps & { sheet: BoardGeometry; title: string; sheetLabel: string };

const STEP = 1.4; // one button press or key press
const DRAG_START = 4; // px before a press becomes a pan, so taps still select pads

/**
 * The connector diagram as a pan-and-zoom canvas: the mouse wheel zooms about
 * the pointer, and dragging (left, middle or right button) pans. Touch pans
 * with one finger and pinches once zoomed in; at the whole-diagram view a
 * finger scrolls the page instead. Buttons and keys cover the same moves.
 */
export function ConnectorDiagramCanvas({ sheet, title, sheetLabel, ...pins }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const hintId = useId();
  const [size, setSize] = useState<Size>({ w: 0, h: 0 });
  const [rawView, setView] = useState<DiagramView>(FIT);
  const [dragging, setDragging] = useState(false);
  const sheetSize = useMemo(() => ({ w: sheet.vbw, h: sheet.vbh }), [sheet.vbw, sheet.vbh]);

  // Zoom at which every pad's hit area reaches 44 px, and a ceiling past it.
  const fitScale = size.w > 0 ? Math.min(size.w / sheet.vbw, size.h / sheet.vbh) : 1;
  // A 3% margin keeps fractional SVG scaling from landing a hair under 44 px.
  const touchZoom = Math.max(1, (1.03 * touchDrawingWidth(sheet) / sheet.vbw) / fitScale);
  const maxZoom = Math.min(Math.max(touchZoom * 2.5, 4), 24);
  // The stored view is clamped on read, so a resized box never strays off the sheet.
  const view = clampView(rawView, sheetSize, size, maxZoom);
  const zoomed = view.zoom > 1.001;

  // Keep the latest values for the native wheel listener and state updaters.
  const live = useRef({ view, size, maxZoom });
  useLayoutEffect(() => {
    live.current = { view, size, maxZoom };
  });
  const settle = useCallback((current: DiagramView) =>
    clampView(current, sheetSize, live.current.size, live.current.maxZoom), [sheetSize]);

  useLayoutEffect(() => {
    const node = box.current;
    if (!node) return;
    const measure = () => setSize({ w: node.clientWidth, h: node.clientHeight });
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);


  const zoomBy = useCallback((factor: number, px?: number, py?: number) => {
    setView((current) => {
      const { size: s, maxZoom: max } = live.current;
      return zoomAt(settle(current), factor, px ?? s.w / 2, py ?? s.h / 2, sheetSize, s, max);
    });
  }, [sheetSize, settle]);

  // Bring a pad into view when it is selected elsewhere or focused by keyboard.
  const revealKey = useCallback((key: string | null) => {
    const anchor = key ? sheet.anchors.find((a) => a.key === key) : undefined;
    if (!anchor) return;
    setView((current) => current.zoom > 1.001
      ? reveal(settle(current), anchor.cx, anchor.cy, sheet.pitch, sheetSize, live.current.size, live.current.maxZoom)
      : current);
  }, [sheet, sheetSize, settle]);
  useEffect(() => revealKey(pins.selectedKey), [pins.selectedKey, revealKey]);

  // The wheel listener must be non-passive to keep the page still while zooming.
  useEffect(() => {
    const node = box.current;
    if (!node) return;
    const onWheel = (event: WheelEvent) => {
      const { view: current, size: s, maxZoom: max } = live.current;
      const pixels = wheelPixels(event.deltaY, event.deltaMode, s.h);
      if (!pixels) return;
      // Trackpad pinches arrive as ctrl+wheel with small deltas.
      const factor = Math.exp(-pixels * (event.ctrlKey ? 0.01 : 0.0015));
      // Zooming out at the whole diagram is a page scroll, not a trap.
      if (factor < 1 && current.zoom <= 1.001) return;
      event.preventDefault();
      if (factor > 1 && current.zoom >= max) return;
      const rect = node.getBoundingClientRect();
      setView(zoomAt(current, factor, event.clientX - rect.left, event.clientY - rect.top, sheetSize, s, max));
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [sheetSize]);

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ x: number; y: number; moved: boolean; id: number } | null>(null);
  const suppressClick = useRef(false);

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button > 2) return;
    // Touch at the whole-diagram view belongs to the page's own scroll.
    if (event.pointerType === "touch" && !zoomed) return;
    // Middle and right buttons pan only; stop autoscroll and the menu.
    if (event.button === 1 || event.button === 2) event.preventDefault();
    suppressClick.current = false;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 1) gesture.current = { x: event.clientX, y: event.clientY, moved: false, id: event.pointerId };
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const last = pointers.current.get(event.pointerId);
    if (!last) return;
    const node = box.current!;
    const rect = node.getBoundingClientRect();
    const { size: s, maxZoom: max } = live.current;
    if (pointers.current.size >= 2) {
      // Pinch: scale by the change in finger spread about their midpoint.
      const [a, b] = [...pointers.current.entries()];
      const other = a[0] === event.pointerId ? b[1] : a[1];
      const before = Math.hypot(last.x - other.x, last.y - other.y);
      const after = Math.hypot(event.clientX - other.x, event.clientY - other.y);
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (before > 0) {
        const mx = (event.clientX + other.x) / 2 - rect.left;
        const my = (event.clientY + other.y) / 2 - rect.top;
        setView((current) => panBy(
          zoomAt(settle(current), after / before, mx, my, sheetSize, s, max),
          (event.clientX - last.x) / 2, (event.clientY - last.y) / 2, sheetSize, s, max,
        ));
      }
      if (gesture.current) gesture.current.moved = true;
      return;
    }
    const start = gesture.current;
    if (!start) return;
    if (!start.moved && Math.hypot(event.clientX - start.x, event.clientY - start.y) < DRAG_START) return;
    if (!start.moved) {
      start.moved = true;
      setDragging(true);
      // Capture keeps the pan going past the canvas edge. It throws for a
      // pointer the browser is not tracking, which must not stop the pan.
      try { node.setPointerCapture?.(event.pointerId); } catch { /* pan without capture */ }
    }
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    setView((current) => panBy(settle(current), event.clientX - last.x, event.clientY - last.y, sheetSize, s, max));
  }

  function onPointerEnd(event: PointerEvent<HTMLDivElement>) {
    if (!pointers.current.delete(event.pointerId)) return;
    if (pointers.current.size === 0) {
      if (gesture.current?.moved) suppressClick.current = true;
      gesture.current = null;
      setDragging(false);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    // Pads keep their own arrow-key navigation; these keys move the view.
    if (event.target !== event.currentTarget) return;
    const { size: s, maxZoom: max } = live.current;
    const step = Math.min(s.w, s.h) * 0.2;
    const moves: Record<string, () => DiagramView> = {
      "+": () => zoomAt(view, STEP, s.w / 2, s.h / 2, sheetSize, s, max),
      "=": () => zoomAt(view, STEP, s.w / 2, s.h / 2, sheetSize, s, max),
      "-": () => zoomAt(view, 1 / STEP, s.w / 2, s.h / 2, sheetSize, s, max),
      "0": () => FIT,
      ArrowLeft: () => panBy(view, step, 0, sheetSize, s, max),
      ArrowRight: () => panBy(view, -step, 0, sheetSize, s, max),
      ArrowUp: () => panBy(view, 0, step, sheetSize, s, max),
      ArrowDown: () => panBy(view, 0, -step, sheetSize, s, max),
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    setView(move());
  }

  const frame = size.w > 0 ? viewRect(view, sheetSize, size) : undefined;
  return (
    <div className="board-drawing min-w-0">
      <div className="board-view-toolbar">
        <span>Connector diagram</span>
        <div className="flex flex-wrap items-center gap-x-1">
          <button type="button" className="min-w-11 justify-center" aria-label="Zoom out" disabled={!zoomed} onClick={() => zoomBy(1 / STEP)}>
            <Minus size={14} aria-hidden="true" />
          </button>
          <span className="min-w-10 text-center font-mono tabular-nums" aria-hidden="true">{Math.round(view.zoom * 100)}%</span>
          <button type="button" className="min-w-11 justify-center" aria-label="Zoom in" disabled={view.zoom >= maxZoom - 0.001} onClick={() => zoomBy(STEP)}>
            <Plus size={14} aria-hidden="true" />
          </button>
          {zoomed ? (
            <button type="button" onClick={() => setView(FIT)}>
              <Scan size={14} aria-hidden="true" />Fit diagram
            </button>
          ) : (
            <button type="button" onClick={() => {
              // Open on the selected pin, or on the first one.
              const key = pins.selectedKey;
              const anchor = (key ? sheet.anchors.find((a) => a.key === key) : undefined) ?? sheet.anchors[0];
              setView(clampView({ zoom: Math.max(touchZoom, 2), cx: anchor?.cx ?? Number.NaN, cy: anchor?.cy ?? Number.NaN },
                sheetSize, size, maxZoom));
            }}>
              <ZoomIn size={14} aria-hidden="true" />Zoom to touch size
            </button>
          )}
        </div>
      </div>
      <div
        ref={box}
        className="bv-stage-wrap board-view-scroll diagram-canvas"
        data-board-view={zoomed ? "zoomed" : "fit"}
        data-dragging={dragging || undefined}
        style={{ aspectRatio: `${sheet.vbw} / ${sheet.vbh}` }}
        tabIndex={0}
        role="group"
        aria-label="Connector diagram, zoomable"
        aria-describedby={hintId}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onContextMenu={(event) => event.preventDefault()}
        onClickCapture={(event) => {
          if (!suppressClick.current) return;
          suppressClick.current = false;
          event.stopPropagation();
          event.preventDefault();
        }}
        onFocusCapture={(event) => {
          const key = (event.target as Element).closest?.("[data-pin-key]")?.getAttribute("data-pin-key");
          if (key) revealKey(key);
        }}
      >
        <BoardStage geometry={sheet} connectorOnly sheetLabel={sheetLabel} title={title}
          showAllLabels view={frame} {...pins} />
      </div>
      <p id={hintId} className="mt-2 text-[11px] leading-5 text-zinc-400">
        <span className="pointer-coarse:hidden">Scroll to zoom. Drag, or hold the right mouse button, to pan. Focus the diagram for + − 0 and the arrow keys.</span>
        <span className="hidden pointer-coarse:inline">Use + and − to zoom, then drag to pan or pinch to zoom further.</span>
      </p>
    </div>
  );
}
