// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Board } from "@/lib/boards";
import { PinoutTabs } from "@/components/PinoutTabs";

vi.mock("@/components/PinoutDiagram", () => ({
  PinoutDiagram: () => <div>Static pin map</div>,
}));
vi.mock("@/components/board-visual/BoardPinoutVisualization", () => ({
  BoardPinoutVisualization: () => <div>Dynamic pin map</div>,
}));
vi.mock("@/components/board-visual/RaspberryPiPinout", () => ({
  RaspberryPiPinout: () => <div>Raspberry Pi component view</div>,
}));

const board: Board = {
  id: "test-board",
  name: "Test board",
  vendor: "Test vendor",
  category: "Microcontroller",
  family: "Test",
  processor: "Test MCU",
  logicLevel: "3.3 V",
  power: "USB",
  formFactor: "Test",
  description: "Fixture",
  tags: ["test"],
  interfaces: ["GPIO"],
  highlights: [],
  warnings: ["Verify before wiring."],
  sourceLinks: [
    {
      label: "Vendor documentation",
      url: "https://example.com/docs",
      type: "Docs",
    },
  ],
  pinout: {
    connector: "Header",
    layout: "grouped",
    notes: ["Fixture"],
    groups: [
      {
        label: "Pins",
        pins: [{ position: 1, label: "D1", role: "gpio" }],
      },
    ],
  },
};

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("PinoutTabs", () => {
  it("uses the original pin-only Static view for Raspberry Pi boards", () => {
    render(<PinoutTabs board={{ ...board, id: "raspberry-pi-4-model-b" }} />);
    fireEvent.click(screen.getByRole("tab", { name: "Dynamic" }));
    expect(screen.getByText("Raspberry Pi component view")).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: "Static" }));
    expect(screen.getByText("Static pin map")).toBeTruthy();
    expect(screen.queryByText("Raspberry Pi component view")).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: "Dynamic" }));
    expect(screen.getByText("Raspberry Pi component view")).toBeTruthy();
  });

  it("supports keyboard navigation, persistence, and cross-tab updates", () => {
    render(<PinoutTabs board={board} />);

    const tabList = screen.getByRole("tablist", { name: "Pin map view" });
    const staticTab = screen.getByRole("tab", { name: "Static" });
    const dynamicTab = screen.getByRole("tab", { name: "Dynamic" });

    expect(dynamicTab.getAttribute("aria-selected")).toBe("true");
    expect(screen.getByText("Dynamic pin map")).toBeTruthy();

    fireEvent.keyDown(tabList, { key: "ArrowLeft" });
    expect(staticTab.getAttribute("aria-selected")).toBe("true");
    expect(window.localStorage.getItem("pinhub.pinoutTab")).toBe("static");
    expect(screen.getByText("Static pin map")).toBeTruthy();

    act(() => {
      window.localStorage.setItem("pinhub.pinoutTab", "dynamic");
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "pinhub.pinoutTab",
          newValue: "dynamic",
        }),
      );
    });

    expect(dynamicTab.getAttribute("aria-selected")).toBe("true");
    expect(screen.getByText("Dynamic pin map")).toBeTruthy();
  });
});
