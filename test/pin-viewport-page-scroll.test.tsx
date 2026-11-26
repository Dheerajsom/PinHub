// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BoardPinoutVisualization } from "@/components/board-visual/BoardPinoutVisualization";
import { boards } from "@/lib/boards";

// The zoomed pin map pans sideways only and keeps its full height, so the
// page owns vertical scrolling (mobile audit 2026-11-26: a nested vertical
// scroller trapped page-scroll swipes). Zooming in must therefore bring the
// pad into the page's view; picking another pin afterwards must not move the
// page under the reader.
const board = boards.find((item) => item.id === "raspberry-pi-pico")!;

const originalScrollIntoView = Element.prototype.scrollIntoView;

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  Element.prototype.scrollIntoView = originalScrollIntoView;
});

describe("zoomed pin map and the page scroll", () => {
  it("brings the pad into view on zoom, and only on zoom", () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    render(<BoardPinoutVisualization board={board} />);
    expect(scrollIntoView).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Zoom to touch size" }));
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView.mock.contexts[0]).toBeInstanceOf(Element);
    expect((scrollIntoView.mock.contexts[0] as Element).classList.contains("bv-pad")).toBe(true);
    expect(scrollIntoView).toHaveBeenCalledWith(expect.objectContaining({ block: "nearest" }));

    const pads = document.querySelectorAll(".board-view-scroll[data-zoomed] .bv-pad");
    fireEvent.click(pads[pads.length - 1]);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Fit whole board" }));
    fireEvent.click(screen.getByRole("button", { name: "Zoom to touch size" }));
    expect(scrollIntoView).toHaveBeenCalledTimes(2);
  });
});
