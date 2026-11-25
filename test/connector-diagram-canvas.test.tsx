// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { boards } from "@/lib/boards";
import { buildBoardGeometry } from "@/lib/board-visual-geometry";
import { BoardPinoutVisualization } from "@/components/board-visual/BoardPinoutVisualization";
import { clampView, fitRect, panBy, reveal, viewRect, zoomAt, FIT } from "@/components/board-visual/diagram-view";

const board = boards.find((item) => item.id === "stm32-nucleo-h753zi")!;
const sheet = buildBoardGeometry(board, { sheet: true })!;
const BOX = { w: 400, h: 600 };

beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(BOX.w);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(BOX.h);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// jsdom has no PointerEvent; a MouseEvent carries the coordinates and button.
function pointer(target: Element, type: "pointerdown" | "pointermove" | "pointerup", id: number, button: number, x: number, y: number) {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button });
  Object.defineProperty(event, "pointerId", { value: id });
  Object.defineProperty(event, "pointerType", { value: "mouse" });
  fireEvent(target, event);
}

function setup() {
  const utils = render(<BoardPinoutVisualization board={board} />);
  const canvas = screen.getByRole("group", { name: "Connector diagram, zoomable" });
  const svg = () => canvas.querySelector("svg")!;
  const viewBox = () => svg().getAttribute("viewBox")!.split(" ").map(Number);
  return { ...utils, canvas, viewBox };
}

describe("connector diagram canvas", () => {
  it("opens on the whole diagram under the product illustration", () => {
    const { canvas, viewBox } = setup();
    expect(screen.getByRole("img", { name: `Simplified illustration of ${board.name}` })).toBeTruthy();
    expect(canvas.dataset.boardView).toBe("fit");
    const fit = fitRect({ w: sheet.vbw, h: sheet.vbh }, BOX);
    expect(viewBox()).toEqual([fit.x, fit.y, fit.w, fit.h].map((n) => expect.closeTo(n, 3)));
    expect(screen.getByText(/Scroll to zoom/).closest("p")!.id).toBe(canvas.getAttribute("aria-describedby"));
  });

  it("zooms with the wheel about the pointer and keeps the page still", () => {
    const { canvas, viewBox } = setup();
    const [x0, y0, w0, h0] = viewBox();
    const pointer = { x: 100, y: 150 };
    const under = { x: x0 + (pointer.x / BOX.w) * w0, y: y0 + (pointer.y / BOX.h) * h0 };
    const wheel = new WheelEvent("wheel", { deltaY: -200, clientX: pointer.x, clientY: pointer.y, bubbles: true, cancelable: true });
    act(() => { canvas.dispatchEvent(wheel); });
    expect(wheel.defaultPrevented).toBe(true);
    expect(canvas.dataset.boardView).toBe("zoomed");
    const [x1, y1, w1, h1] = viewBox();
    expect(w1).toBeLessThan(w0);
    expect(x1 + (pointer.x / BOX.w) * w1).toBeCloseTo(under.x, 3);
    expect(y1 + (pointer.y / BOX.h) * h1).toBeCloseTo(under.y, 3);
  });

  it("lets the wheel scroll the page when the whole diagram is already shown", () => {
    const { canvas } = setup();
    const wheel = new WheelEvent("wheel", { deltaY: 200, bubbles: true, cancelable: true });
    act(() => { canvas.dispatchEvent(wheel); });
    expect(wheel.defaultPrevented).toBe(false);
    expect(canvas.dataset.boardView).toBe("fit");
  });

  it("pans with a right-button drag without opening the context menu", () => {
    const { canvas, viewBox } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    const [x0, y0, w0] = viewBox();
    pointer(canvas, "pointerdown", 1, 2, 200, 300);
    pointer(canvas, "pointermove", 1, 2, 150, 260);
    pointer(canvas, "pointerup", 1, 2, 150, 260);
    const [x1, y1, w1] = viewBox();
    expect(w1).toBeCloseTo(w0);
    expect(x1 - x0).toBeCloseTo((50 * w0) / BOX.w, 3);
    expect(y1 - y0).toBeCloseTo((40 * w0) / BOX.w, 3);
    expect(fireEvent.contextMenu(canvas)).toBe(false);
  });

  it("selects a pad on a click but not at the end of a drag", () => {
    const { canvas, container } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Zoom to touch size" }));
    const pad = container.querySelector<SVGGElement>(".bv-pad")!;
    pointer(pad, "pointerdown", 2, 0, 10, 10);
    pointer(pad, "pointermove", 2, 0, 60, 10);
    pointer(pad, "pointerup", 2, 0, 60, 10);
    fireEvent.click(pad);
    expect(pad.getAttribute("aria-pressed")).toBe("false");
    pointer(pad, "pointerdown", 3, 0, 10, 10);
    pointer(pad, "pointerup", 3, 0, 10, 10);
    fireEvent.click(pad);
    expect(pad.getAttribute("aria-pressed")).toBe("true");
    expect(canvas.dataset.boardView).toBe("zoomed");
  });

  it("zooms, pans and fits from the keyboard", () => {
    const { canvas, viewBox } = setup();
    const fitBox = viewBox();
    canvas.focus();
    fireEvent.keyDown(canvas, { key: "+" });
    expect(canvas.dataset.boardView).toBe("zoomed");
    const zoomedBox = viewBox();
    fireEvent.keyDown(canvas, { key: "ArrowDown" });
    expect(viewBox()[1]).toBeGreaterThan(zoomedBox[1]);
    fireEvent.keyDown(canvas, { key: "0" });
    expect(viewBox()).toEqual(fitBox);
    expect(screen.getByRole("button", { name: "Zoom out" }).hasAttribute("disabled")).toBe(true);
  });

  it("brings a pin picked from the list into a zoomed view", () => {
    const { viewBox } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Zoom to touch size" }));
    const last = sheet.anchors.at(-1)!;
    fireEvent.change(screen.getByRole("combobox", { name: "Select a pin" }), { target: { value: last.key } });
    const [x, y, w, h] = viewBox();
    expect(last.cx).toBeGreaterThanOrEqual(x);
    expect(last.cx).toBeLessThanOrEqual(x + w);
    expect(last.cy).toBeGreaterThanOrEqual(y);
    expect(last.cy).toBeLessThanOrEqual(y + h);
  });
});

describe("diagram view math", () => {
  const size = { w: 1000, h: 2000 };
  const box = { w: 500, h: 500 };

  it("fits the sheet to the box aspect without distortion", () => {
    const fit = fitRect(size, box);
    expect(fit.h).toBeCloseTo(2000);
    expect(fit.w).toBeCloseTo(2000);
    expect(fit.x).toBeCloseTo(-500);
  });

  it("never zooms out past the whole sheet or pans off it", () => {
    expect(clampView({ zoom: 0.2, cx: 0, cy: 0 }, size, box, 8).zoom).toBe(1);
    const panned = panBy(zoomAt(FIT, 4, 250, 250, size, box, 8), 99999, 99999, size, box, 8);
    const rect = viewRect(panned, size, box);
    const fit = fitRect(size, box);
    expect(rect.x).toBeCloseTo(fit.x);
    expect(rect.y).toBeCloseTo(fit.y);
    expect(zoomAt(FIT, 100, 0, 0, size, box, 8).zoom).toBe(8);
  });

  it("reveals only points outside the view", () => {
    const view = zoomAt(FIT, 4, 250, 250, size, box, 8);
    const rect = viewRect(view, size, box);
    expect(reveal(view, rect.x + rect.w / 2, rect.y + rect.h / 2, 10, size, box, 8)).toBe(view);
    const moved = reveal(view, 900, 1900, 10, size, box, 8);
    const after = viewRect(moved, size, box);
    expect(900).toBeLessThanOrEqual(after.x + after.w);
    expect(1900).toBeLessThanOrEqual(after.y + after.h);
  });
});
