// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { boards } from "@/lib/boards";
import { buildBoardGeometry } from "@/lib/board-visual-geometry";
import { touchDrawingWidth } from "@/components/board-visual/touch-sizing";
import { RaspberryPiPinout } from "@/components/board-visual/RaspberryPiPinout";

afterEach(cleanup);

const physicalBoard = (name: string) => screen.getByRole("group", { name: new RegExp(`^${name} physical board`) });

it.each(["raspberry-pi-5", "raspberry-pi-pico-2-w", "raspberry-pi-500"])("shows the interactive physical board first for %s, fitted to the panel", (id) => {
  const board = boards.find((board) => board.id === id)!;
  const { container } = render(<RaspberryPiPinout board={board} />);
  const physical = physicalBoard(board.name);
  // Primary, not tucked away: no collapsed disclosure, inert or hidden ancestor.
  expect(physical.closest("details, [inert], [aria-hidden='true']")).toBeNull();
  expect(container.querySelector(".pi-board-overview")).toBeNull();
  // The board precedes the pin list in reading order.
  const list = screen.getByRole("group", { name: "Select a physical pin from the connector" });
  expect(physical.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  // Fit by default: no forced touch-size minimum width.
  const frame = container.querySelector(".pi-board-frame")!;
  expect(frame.getAttribute("data-board-view")).toBe("fit");
  expect(frame.getAttribute("style")).not.toContain("min-width");
  // Every source pin is a pad on the board, labelled with its physical number.
  const pads = within(physical).getAllByRole("button");
  expect(pads).toHaveLength(40);
  const sourcePins = [...board.pinout!.pins!.left, ...board.pinout!.pins!.right];
  for (const pin of sourcePins) {
    expect(pads.some((pad) => pad.getAttribute("aria-label")?.startsWith(`Pin ${pin.position}, ${pin.label}`))).toBe(true);
  }
  expect(screen.getByText(buildBoardGeometry(board)!.orientation)).toBeTruthy();
});

it("keeps the 44px pin list as a secondary selector in physical pairs", () => {
  const board = boards.find((board) => board.id === "raspberry-pi-pico-2-w")!;
  render(<RaspberryPiPinout board={board} />);
  const connector = screen.getByRole("group", { name: "Select a physical pin from the connector" });
  const pins = board.pinout!.pins!;
  const expected = pins.left.flatMap((pin, index) => [pin, pins.right[index]]);
  const buttons = within(connector).getAllByRole("button");
  expect(buttons).toHaveLength(40);
  buttons.forEach((button, index) => {
    expect(button.textContent).toContain(expected[index].label);
    expect(button.getAttribute("aria-label")).toContain(`Pin ${expected[index].position},`);
  });
  fireEvent.click(buttons[0]);
  expect(buttons[0].getAttribute("aria-pressed")).toBe("true");
  expect(screen.getByRole("button", { name: /^Copy pin 1,/ })).toBeTruthy();
});

it("selecting a pad on the board marks the same pin in the list, picker and readout", () => {
  const board = boards.find((board) => board.id === "raspberry-pi-5")!;
  render(<RaspberryPiPinout board={board} />);
  const physical = physicalBoard(board.name);
  const pad = within(physical).getByRole("button", { name: /^Pin 8,/ });
  fireEvent.click(pad);
  expect(pad.getAttribute("aria-pressed")).toBe("true");
  const connector = screen.getByRole("group", { name: "Select a physical pin from the connector" });
  expect(within(connector).getByRole("button", { name: /^Pin 8,/ }).getAttribute("aria-pressed")).toBe("true");
  expect((screen.getByRole("combobox", { name: "Select physical pin" }) as HTMLSelectElement).value).toBe(pad.getAttribute("data-pin-key"));
  expect(screen.getByRole("button", { name: /^Copy pin 8,/ })).toBeTruthy();
  // And the reverse: a list selection moves the marker on the board.
  fireEvent.click(within(connector).getByRole("button", { name: /^Pin 1,/ }));
  expect(within(physical).getByRole("button", { name: /^Pin 1,/ }).getAttribute("aria-pressed")).toBe("true");
  expect(pad.getAttribute("aria-pressed")).toBe("false");
});

it("zooms the board to a 44px touch size and back", () => {
  const board = boards.find((board) => board.id === "raspberry-pi-4-model-b")!;
  const { container } = render(<RaspberryPiPinout board={board} />);
  const frame = container.querySelector<HTMLElement>(".pi-board-frame")!;
  expect(screen.queryByRole("group", { name: "Scrollable board at touch size" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Zoom to touch size" }));
  expect(frame.getAttribute("data-board-view")).toBe("touch");
  expect(frame.style.boxSizing).toBe("content-box");
  expect(parseFloat(frame.style.minWidth)).toBe(touchDrawingWidth(buildBoardGeometry(board)!, true));
  expect(screen.getByRole("group", { name: "Scrollable board at touch size" }).tabIndex).toBe(0);
  expect(screen.getByText(/every pad has a 44 px target/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Fit whole board" }));
  expect(frame.getAttribute("data-board-view")).toBe("fit");
  expect(frame.style.minWidth).toBe("");
  // Fit mode does not claim touch-sized pads.
  expect(screen.getByText(/pads are small at this size/)).toBeTruthy();
});

it("supports a far-end picker selection, keyboard movement and clearing", () => {
  render(<RaspberryPiPinout board={boards.find((board) => board.id === "raspberry-pi-5")!} />);
  const connector = screen.getByRole("group", { name: "Select a physical pin from the connector" });
  const pins = within(connector).getAllByRole("button");
  fireEvent.keyDown(pins[0], { key: "End" });
  expect(document.activeElement).toBe(pins[39]);
  fireEvent.click(pins[39]);
  expect(screen.getByRole("button", { name: /^Copy pin 40,/ })).toBeTruthy();
  expect((screen.getByRole("combobox", { name: "Select physical pin" }) as HTMLSelectElement).value).not.toBe("");
  fireEvent.click(screen.getByRole("button", { name: "Clear selection" }));
  expect(pins[39].getAttribute("aria-pressed")).toBe("false");
  const picker = screen.getByRole("combobox", { name: "Select physical pin" });
  const pin3 = within(picker).getAllByRole("option").find((option) => option.textContent?.startsWith("3 ·"))!;
  fireEvent.change(picker, { target: { value: pin3.getAttribute("value") } });
  expect(within(connector).getByRole("button", { name: /^Pin 3,/ }).getAttribute("aria-pressed")).toBe("true");
});

it("moves between board pads with the keyboard", () => {
  const board = boards.find((board) => board.id === "raspberry-pi-5")!;
  render(<RaspberryPiPinout board={board} />);
  const pads = within(physicalBoard(board.name)).getAllByRole("button");
  expect(pads.filter((pad) => pad.tabIndex === 0)).toHaveLength(1);
  pads[0].focus();
  fireEvent.keyDown(pads[0], { key: "End" });
  expect(document.activeElement).toBe(pads[pads.length - 1]);
  fireEvent.keyDown(document.activeElement!, { key: "Enter" });
  expect(pads[pads.length - 1].getAttribute("aria-pressed")).toBe("true");
});

it("keeps the tab stop on the pin selected from the picker", () => {
  render(<RaspberryPiPinout board={boards.find((board) => board.id === "raspberry-pi-5")!} />);
  const connector = screen.getByRole("group", { name: "Select a physical pin from the connector" });
  const picker = screen.getByRole("combobox", { name: "Select physical pin" });
  const pin17 = within(picker).getAllByRole("option").find((option) => option.textContent?.startsWith("17 ·"))!;
  fireEvent.change(picker, { target: { value: pin17.getAttribute("value") } });
  const tabbable = within(connector).getAllByRole("button").filter((pin) => pin.tabIndex === 0);
  expect(tabbable).toHaveLength(1);
  expect(tabbable[0].getAttribute("aria-label")).toMatch(/^Pin 17,/);
});

it("moves through connector rows and columns without wrapping to the other header", () => {
  render(<RaspberryPiPinout board={boards.find((board) => board.id === "raspberry-pi-5")!} />);
  const connector = screen.getByRole("group", { name: "Select a physical pin from the connector" });
  const pins = within(connector).getAllByRole("button");
  const named = (position: number) => pins.find((pin) => pin.getAttribute("aria-label")?.startsWith(`Pin ${position},`))!;
  named(1).focus();
  fireEvent.keyDown(named(1), { key: "ArrowDown" });
  expect(document.activeElement).toBe(named(3));
  fireEvent.keyDown(named(3), { key: "ArrowRight" });
  expect(document.activeElement).toBe(named(4));
  // The last odd pin's ArrowDown used to wrap to pin 2 at the top of the even header.
  named(39).focus();
  fireEvent.keyDown(named(39), { key: "ArrowDown" });
  expect(document.activeElement).toBe(named(39));
  fireEvent.keyDown(named(39), { key: "ArrowLeft" });
  expect(document.activeElement).toBe(named(39));
});
