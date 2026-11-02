// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BoardPinoutVisualization } from "@/components/board-visual/BoardPinoutVisualization";
import { boards } from "@/lib/boards";

const board = boards.find((item) => item.id === "stm32-nucleo-l432kc")!;

function stubStageWidth(scrollWidth: number) {
  let notify = () => {};
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(callback: () => void) {
        notify = callback;
      }
      observe() {}
      disconnect() {}
    },
  );
  vi.spyOn(Element.prototype, "scrollWidth", "get").mockReturnValue(scrollWidth);
  vi.spyOn(Element.prototype, "clientWidth", "get").mockReturnValue(320);
  return () => act(() => notify());
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("compact pin map stage", () => {
  it("offers keyboard panning and says so when the drawing overflows", () => {
    const measure = stubStageWidth(640);
    render(<BoardPinoutVisualization board={board} />);
    measure();
    expect(screen.getByRole("group", { name: "Scrollable pin map" }).tabIndex).toBe(0);
    expect(screen.getByText(/arrow keys/)).toBeTruthy();
  });

  it("adds no tab stop or hint when the drawing fits", () => {
    const measure = stubStageWidth(320);
    render(<BoardPinoutVisualization board={board} />);
    measure();
    expect(screen.queryByRole("group", { name: "Scrollable pin map" })).toBeNull();
    expect(screen.queryByText(/arrow keys/)).toBeNull();
  });
});
