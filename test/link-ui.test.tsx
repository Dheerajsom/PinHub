// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { boards } from "@/lib/boards";
import { summarizeBoard } from "@/lib/board-summary";
import { createBoardDetailLoader } from "@/lib/board-detail-loader";
import { LinkApp } from "@/components/link/LinkApp";
import { CompareTable } from "@/components/CompareTable";

const catalog = boards.map(summarizeBoard);
const loader = createBoardDetailLoader(boards);

beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
});

async function open(search: string) {
  window.history.replaceState(null, "", `/link${search}`);
  render(<LinkApp catalog={catalog} loader={loader} />);
  // The page reads the URL on the first animation frame after mount.
  await act(async () => {
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  });
}

function wires() {
  return screen.getAllByRole("button", { name: /^Wire \d/ }).map((item) => item.getAttribute("aria-label"));
}

describe("LinkApp", () => {
  it("lists the crossed UART wires through a level shifter for a 3.3 V and 5 V pair", async () => {
    await open("?a=raspberry-pi-5&b=arduino-uno-rev3&bus=uart");
    expect(screen.getByRole("heading", { name: "Level shifter required" })).toBeTruthy();
    const labels = wires();
    expect(labels).toHaveLength(3);
    expect(labels[0]).toMatch(/^Wire 1, TX → RX: Raspberry Pi 5 pin 8, GPIO14 to Arduino UNO Rev3 .*D0 \/ RX, from Raspberry Pi 5 to Arduino UNO Rev3, through a level shifter/);
    expect(labels[2]).not.toMatch(/level shifter/);
    expect(screen.getByText("Pin cautions from the records")).toBeTruthy();
  });

  it("switches bus and swaps boards in the URL", async () => {
    await open("?a=raspberry-pi-pico&b=esp32-devkitc&bus=uart");
    fireEvent.click(screen.getByRole("radio", { name: "I2C" }));
    expect(new URLSearchParams(location.search).get("bus")).toBe("i2c");
    expect(wires()[0]).toMatch(/SDA: Raspberry Pi Pico pin 6, GP4 to ESP32-DevKitC V4 .*IO21, shared line/);

    fireEvent.click(screen.getByRole("button", { name: "Swap boards A and B" }));
    const params = new URLSearchParams(location.search);
    expect([params.get("a"), params.get("b")]).toEqual(["esp32-devkitc", "raspberry-pi-pico"]);
  });

  it("drops a board id the catalog does not know and asks for the other end", async () => {
    await open("?a=not-a-board&b=raspberry-pi-pico");
    expect(screen.getByRole("combobox", { name: "Search for board A" })).toBeTruthy();
    expect(screen.getByText("Pick the other board to see the wires.")).toBeTruthy();
  });

  it("frames a large sheet on the linked connector and opens it out on request", async () => {
    // Reported: the Nucleo-H753ZI sheet drew all four Zio connectors, so the
    // linked CN7 pins were a long sideways scroll away.
    await open("?a=raspberry-pi-4-model-b&b=stm32-nucleo-h753zi&bus=uart");
    const sheet = screen.getByRole("region", { name: "STM32 Nucleo-H753ZI connector sheet" });
    const viewBox = () => sheet.querySelector("svg")!.getAttribute("viewBox")!;
    expect(viewBox().startsWith("0 0 ")).toBe(false);
    expect(screen.getByText(/^CN7 Zio/, { selector: ".ph-link-frame span" })).toBeTruthy();

    const toggle = screen.getByRole("button", { name: "Whole board" });
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    expect(viewBox().startsWith("0 0 ")).toBe(true);

    // The Pi's 2 × 20 header is already compact, so it is never framed.
    const pi = screen.getByRole("region", { name: "Raspberry Pi 4 Model B connector sheet" });
    expect(pi.querySelector("svg")!.getAttribute("viewBox")!.startsWith("0 0 ")).toBe(true);
    expect(screen.getAllByRole("button", { name: "Whole board" })).toHaveLength(1);
  });

  it("condenses the notes to the ones that bear on the link", async () => {
    await open("?a=raspberry-pi-4-model-b&b=stm32-nucleo-h753zi&bus=uart");
    const notes = screen.getByRole("list", { name: "Board notes for this link" });
    expect(notes.textContent).toMatch(/UART overlays/);
    expect(notes.textContent).not.toMatch(/current-limited/);
    const more = screen.getByText(/^\d+ more board notes$/);
    expect(more.closest("details")!.open).toBe(false);
    expect(more.closest("details")!.textContent).toMatch(/current-limited/);
  });

  it("chooses another bus instance from the select", async () => {
    await open("?a=raspberry-pi-pico&b=raspberry-pi-pico&bus=uart");
    const [select] = screen.getAllByRole("combobox").filter((item) => item.tagName === "SELECT");
    fireEvent.change(select, { target: { value: "UART1" } });
    expect(new URLSearchParams(location.search).get("pa")).toBe("UART1");
    expect(wires()[0]).toMatch(/pin \d+, GP4 to/);
  });
});

describe("CompareTable link entry", () => {
  const board = (id: string) => boards.find((item) => item.id === id)!;

  it("offers to wire exactly two mapped boards", () => {
    render(<CompareTable boards={[board("raspberry-pi-5"), board("arduino-uno-rev3")]} />);
    const link = screen.getByRole("link", { name: "Wire these two boards" });
    expect(link.getAttribute("href")).toBe("/link?a=raspberry-pi-5&b=arduino-uno-rev3&bus=uart");
  });

  it("does not offer it for three boards", () => {
    render(<CompareTable boards={[board("raspberry-pi-5"), board("arduino-uno-rev3"), board("raspberry-pi-pico")]} />);
    expect(screen.queryByRole("link", { name: "Wire these two boards" })).toBeNull();
  });
});
