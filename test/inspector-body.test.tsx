// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { boards } from "@/lib/boards";
import { buildBoardGeometry } from "@/lib/board-visual-geometry";
import { InspectorBody } from "@/components/board-visual/InspectorBody";
import { PinDetails } from "@/components/board-visual/PinDetails";

// A drawing only exists for a board with both a source-backed pinout and a
// curated visual, so the sheet is tested against a real catalog entry.
const board = (() => {
  const found = boards.find((item) => item.id === "raspberry-pi-5");
  if (!found) throw new Error("raspberry-pi-5 missing from the catalog");
  return found;
})();

// jsdom reports every box as zero-sized, so the sheet is told it overflows —
// which is the state the phone layout is built for.
beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  Object.defineProperty(HTMLElement.prototype, "scrollWidth", {
    configurable: true,
    get() {
      return this.className?.includes?.("bv-stage-wrap") ? 900 : 0;
    },
  });
  Object.defineProperty(HTMLElement.prototype, "clientWidth", {
    configurable: true,
    get() {
      return this.className?.includes?.("bv-stage-wrap") ? 360 : 0;
    },
  });
});

afterEach(cleanup);

function renderSheet() {
  const geometry = buildBoardGeometry(board);
  if (!geometry) throw new Error("fixture board has no geometry");
  return render(
    <InspectorBody
      board={board}
      geometry={geometry}
      selectedKey={null}
      activeKey={null}
      activeRole={null}
      liveAnchor={null}
      onSelect={() => {}}
      onActiveKey={() => {}}
      onToggleRole={() => {}}
    />,
  );
}

describe("InspectorBody sheet", () => {
  it("uses unique IDs for every SVG definition", () => {
    const { container } = renderSheet();
    const ids = [...container.querySelectorAll("[id]")].map(
      (element) => element.id,
    );

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("explains the horizontal scroll and describes it to the drawing", () => {
    renderSheet();

    const drawing = screen.getByRole("group", {
      name: "Raspberry Pi 5 connector diagram",
    });
    expect(drawing.getAttribute("tabindex")).toBe("0");

    const hint = screen.getByText(
      "Swipe horizontally to view the full connector",
    );
    expect(drawing.getAttribute("aria-describedby")).toBe(hint.id);
  });

  it("offers a fit-to-width mode and says what it costs", () => {
    renderSheet();

    const fit = screen.getByRole("button", { name: "Fit width" });
    expect(fit.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(fit);

    expect(fit.getAttribute("aria-pressed")).toBe("true");
    expect(
      screen.getByText("Whole board shown — labels are reduced"),
    ).toBeTruthy();
    expect(
      screen.queryByText("Swipe horizontally to view the full connector"),
    ).toBeNull();
  });

  it("keeps the full pin table available whichever mode is on", () => {
    renderSheet();

    expect(screen.getByText(/All \d+ pins/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Fit width" }));
    expect(screen.getByText(/All \d+ pins/)).toBeTruthy();
  });

  it("filters the real table and reports the active search/category", () => {
    renderSheet();

    const status = () =>
      screen
        .getAllByRole("status")
        .find((node) => node.textContent?.startsWith("Showing"));

    fireEvent.change(screen.getByLabelText("Search pins, groups, or connector"), {
      target: { value: "GPIO2" },
    });
    expect(status()?.textContent).toContain("matching “GPIO2”");
    expect(status()?.textContent).toMatch(/Showing \d+ of \d+ pins/);

    fireEvent.click(screen.getByRole("button", { name: "I2C" }));
    expect(status()?.textContent).toContain("in I2C");
    expect(screen.getByRole("button", { name: "Clear filters" })).toBeTruthy();
  });

  it("exposes the catalog source and its provenance in the inspector", () => {
    renderSheet();

    expect(
      screen.getByRole("link", { name: /Open official .* source:/i }),
    ).toBeTruthy();
  });

  it("offers the existing copy action for a selected pin", () => {
    const geometry = buildBoardGeometry(board);
    if (!geometry) throw new Error("fixture board has no geometry");

    render(
      <PinDetails
        anchor={geometry.anchors[0]}
        pinned
        net={null}
        netSize={1}
      />,
    );

    expect(
      screen.getByRole("button", { name: /Copy pin \d+,/i }),
    ).toBeTruthy();
  });
});
