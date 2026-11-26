"use client";

import { useEffect, useId, useMemo, useRef, useState, type ComponentProps } from "react";
import { Scan, ZoomIn, ZoomOut } from "lucide-react";
import type { Board } from "@/lib/boards";
import { readableDiagramFor, wholeBoardFrame, type BoardGeometry } from "@/lib/board-visual-geometry";
import { BoardStage } from "./BoardStage";
import { ConnectorDiagramCanvas } from "./ConnectorDiagramCanvas";
import { ProductPortrait } from "./ProductPortrait";
import { touchDrawingWidth } from "./touch-sizing";
import { usePinViewport } from "./use-pin-viewport";

type Props = Pick<ComponentProps<typeof BoardStage>,
  "selectedKey" | "activeKey" | "activeRole" | "netKeys" | "highlight" | "onSelect" | "onActiveKey"
> & {
  board: Board;
  geometry: BoardGeometry;
  enlargeLabels?: boolean;
  /**
   * The host draws the level connector diagram itself, elsewhere in its
   * layout (`ReadableConnectorDiagram`). The Raspberry Pi workbench does, so
   * the pin readout stays beside the board instead of below a tall diagram.
   */
  diagramElsewhere?: boolean;
};

/** The level connector diagram for a board that needs one, or nothing. */
export function ReadableConnectorDiagram({ board, geometry, ...pins }: Omit<Props, "enlargeLabels" | "diagramElsewhere">) {
  const diagram = useMemo(() => readableDiagramFor(board, geometry), [board, geometry]);
  if (!diagram) return null;
  return <ConnectorDiagramCanvas key={board.id} sheet={diagram} sheetLabel={board.name}
    title={`${board.name} connector diagram — ${board.pinout?.connector}`} {...pins} />;
}

export function BoardDrawingViewport({ board, geometry, enlargeLabels = false, diagramElsewhere = false, ...pins }: Props) {
  const [zoom, setZoom] = useState<"fit" | "touch" | "labels">("fit");
  const touch = zoom !== "fit";
  const registered = Boolean(geometry.artworkId || geometry.portraitId);
  // Grouped and catalog-ordered signals need their own diagram: they have
  // stable anchor keys, but no verified positions on the product illustration.
  // So does a board drawing that can only fit its labels sideways; zooming it
  // would just enlarge text you have to tilt your head to read.
  const diagram = useMemo(() => readableDiagramFor(board, geometry), [board, geometry]);
  const sheet = diagram ?? geometry;
  const compact = registered && !touch;
  const frame = compact ? wholeBoardFrame(sheet) : { w: sheet.vbw, h: sheet.vbh };
  const viewport = useRef<HTMLDivElement>(null);
  const hintId = useId();
  const [overflows, setOverflows] = useState(false);
  usePinViewport(viewport, board.id, pins.selectedKey, touch);

  useEffect(() => {
    const node = viewport.current;
    if (!node || !touch) return;
    const measure = () => setOverflows(node.scrollWidth > node.clientWidth + 1 || node.scrollHeight > node.clientHeight + 1);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    if (node.firstElementChild) observer.observe(node.firstElementChild);
    return () => observer.disconnect();
  }, [sheet, touch, zoom]);

  const pannable = touch && overflows;
  if (diagram) {
    // Show the product (with its pads, when they are registered to it), then
    // the connector diagram, labels level, on its own pan-and-zoom canvas.
    const whole = wholeBoardFrame(geometry);
    return (
      <div className="min-w-0">
        {registered ? (
          <div className="board-drawing min-w-0">
            <div className="board-view-toolbar"><span>Whole board</span></div>
            <div className="bv-stage-wrap board-view-scroll">
              <div className="board-view-frame" data-board-view="fit"
                style={{ aspectRatio: `${whole.w} / ${whole.h}`, maxWidth: `min(100%, 720px, calc(60svh * ${whole.w / whole.h}))` }}>
                <BoardStage geometry={geometry} compact sheetLabel={board.name}
                  title={`${board.name} physical board — ${board.pinout?.connector}`}
                  showAllLabels={false} {...pins} />
              </div>
            </div>
          </div>
        ) : <ProductPortrait id={board.id} name={board.name} />}
        {diagramElsewhere ? null : <ConnectorDiagramCanvas key={board.id} sheet={diagram} sheetLabel={board.name}
          title={`${board.name} connector diagram — ${board.pinout?.connector}`} {...pins} />}
      </div>
    );
  }
  return (
    <div className="board-drawing min-w-0">
      <div className="board-view-toolbar">
        <span>{touch ? "Pin detail" : "Whole board"}</span>
        <div className="flex flex-wrap gap-x-2">
          {enlargeLabels && touch && (
            <button type="button" aria-pressed={zoom === "labels"} onClick={() => setZoom(zoom === "labels" ? "touch" : "labels")}>
              <Scan size={14} aria-hidden="true" />{zoom === "labels" ? "Working size" : "Zoom labels"}
            </button>
          )}
          <button type="button" aria-pressed={touch} onClick={() => setZoom(touch ? "fit" : "touch")}>
            {touch ? <ZoomOut size={14} aria-hidden="true" /> : <ZoomIn size={14} aria-hidden="true" />}
            {touch ? "Fit whole board" : "Zoom to touch size"}
          </button>
        </div>
      </div>
      <div
        ref={viewport}
        className="bv-stage-wrap board-view-scroll"
        data-zoomed={touch || undefined}
        {...(pannable ? { tabIndex: 0, role: "group", "aria-label": "Scrollable pin map", "aria-describedby": hintId } : {})}
      >
        <div
          className="board-view-frame"
          data-board-view={touch ? "touch" : "fit"}
          style={{
            aspectRatio: `${frame.w} / ${frame.h}`,
            ...(touch ? { minWidth: touchDrawingWidth(sheet) * (zoom === "labels" ? 1.5 : 1) }
              : { maxWidth: `min(100%, 720px, calc(60svh * ${frame.w / frame.h}))` }),
          }}
        >
          <BoardStage geometry={sheet} compact={compact} sheetLabel={board.name}
            title={`${board.name} physical board — ${board.pinout?.connector}`}
            showAllLabels={!compact} {...pins} />
        </div>
      </div>
      {pannable && (
        <p id={hintId} className="mt-2 text-[11px] leading-5 text-zinc-400">
          {zoom === "labels" ? "Labels enlarged. " : ""}Swipe the drawing, or focus it and use the arrow keys, to reach every pad.
        </p>
      )}
    </div>
  );
}
