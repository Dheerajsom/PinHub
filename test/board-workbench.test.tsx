// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { boards } from "@/lib/boards";
import { buildBoardGeometry } from "@/lib/board-visual-geometry";
import { BoardWorkbench, BoardWorkbenchFallback } from "@/components/board-visual/BoardWorkbench";
import { categoryForRole, filterPinAnchors } from "@/components/board-visual/PinoutTable";
import nextConfig from "../next.config";

// Next's useSearchParams follows history.pushState; the mock does the same by
// reading location and re-rendering when the workbench pushes a new URL.
vi.mock("next/navigation", async () => {
  const { useSyncExternalStore } = await import("react");
  const subscribe = (onChange: () => void) => {
    window.addEventListener("ph-test-url", onChange);
    return () => window.removeEventListener("ph-test-url", onChange);
  };
  return {
    useSearchParams: () => new URLSearchParams(useSyncExternalStore(subscribe, () => window.location.search)),
  };
});
const realPushState = window.history.pushState.bind(window.history);
window.history.pushState = (...args: Parameters<History["pushState"]>) => {
  realPushState(...args);
  window.dispatchEvent(new Event("ph-test-url"));
};
const arriveAt = (search: string) => {
  window.history.replaceState(null, "", `/boards/raspberry-pi-pico${search ? `?${search}` : ""}`);
};

beforeAll(() => vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} }));
afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
  vi.restoreAllMocks();
});

const pico = boards.find((board) => board.id === "raspberry-pi-pico")!;
const anchors = buildBoardGeometry(pico)!.anchors;
const pads = () => [...document.querySelectorAll<SVGGElement>("[data-pin-key]")];
const dimmedPads = () => pads().filter((pad) => pad.style.opacity === "0.28");
const pressed = (name: string) => screen.getByRole("button", { name }).getAttribute("aria-pressed");

describe("one Show pins control drives the drawing and the table", () => {
  it("dims exactly the pads a capability chip leaves out of the table", () => {
    render(<BoardWorkbench board={pico} />);
    expect(dimmedPads()).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "I2C" }));
    const matches = filterPinAnchors(anchors, { categories: ["i2c"], functionData: pico.pinFunctions });
    expect(matches.length).toBeGreaterThan(0);
    expect(dimmedPads()).toHaveLength(anchors.length - matches.length);
    const lit = new Set(pads().filter((pad) => pad.style.opacity !== "0.28").map((pad) => pad.dataset.pinKey));
    expect(lit).toEqual(new Set(matches.map((anchor) => anchor.key)));

    fireEvent.click(screen.getByRole("button", { name: "Show all pins" }));
    expect(dimmedPads()).toHaveLength(0);
  });

  it("only shows the alternate-function caveat while a capability filter is on", () => {
    render(<BoardWorkbench board={pico} />);
    expect(screen.queryByText(/alternates included/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "SPI" }));
    expect(screen.getByText(/alternates included/)).toBeTruthy();
  });

  it("has no second, role-only row of highlight buttons", () => {
    render(<BoardWorkbench board={pico} />);
    expect(screen.queryByRole("group", { name: "Highlight pins by role" })).toBeNull();
    expect(screen.getByRole("list", { name: "Pin colour key" })).toBeTruthy();
  });
});

describe("links into the old standalone pinout page", () => {
  it("seed the matching capability chip from ?role=", () => {
    arriveAt("role=i2c");
    render(<BoardWorkbench board={pico} />);
    expect(pressed("I2C")).toBe("true");
    expect(dimmedPads().length).toBeGreaterThan(0);
  });

  it("replace the seeded role with the reader's own filter in the URL", () => {
    arriveAt("role=i2c");
    const push = vi.spyOn(history, "pushState").mockImplementation(() => {});
    render(<BoardWorkbench board={pico} />);
    fireEvent.click(screen.getByRole("button", { name: "SPI" }));
    expect(push).toHaveBeenCalled();
    const url = String(push.mock.calls.at(-1)?.[2]);
    expect(url).not.toContain("role=");
    expect(new URL(url, "https://x").searchParams.get("show")).toBe("i2c,spi");
  });

  it("open a shared ?show= view with those chips on", () => {
    arriveAt("show=uart,spi");
    render(<BoardWorkbench board={pico} />);
    expect(pressed("UART")).toBe("true");
    expect(pressed("SPI")).toBe("true");
    expect(pressed("I2C")).toBe("false");
  });

  it("keep a role with no chip as a highlight the reader can stop", () => {
    const role = anchors.find((anchor) => categoryForRole(anchor.pin.role) === null)?.pin.role;
    expect(role, "Pico has a system-role pin (RUN)").toBeTruthy();
    arriveAt(`role=${role}`);
    const push = vi.spyOn(history, "pushState").mockImplementation(() => {});
    render(<BoardWorkbench board={pico} />);
    expect(screen.getByText(/^Highlighting .* pins/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Stop highlighting" }));
    expect(String(push.mock.calls.at(-1)?.[2])).not.toContain("role=");
  });

  it("are permanently redirected to the board page, preview image included", async () => {
    const redirects = await nextConfig.redirects!();
    expect(redirects).toEqual(
      expect.arrayContaining([
        { source: "/pinout/:id", destination: "/boards/:id", permanent: true },
        { source: "/pinout/:id/opengraph-image", destination: "/boards/:id/opengraph-image", permanent: true },
      ]),
    );
  });
});

describe("prerendered fallback", () => {
  it("draws the whole pin map and schedule before the URL is read", () => {
    render(<BoardWorkbenchFallback board={pico} />);
    expect(pads()).toHaveLength(anchors.length);
    expect(screen.getByRole("heading", { name: `All ${anchors.length} pins` })).toBeTruthy();
  });
});
