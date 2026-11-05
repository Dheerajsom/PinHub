// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { boards } from "@/lib/boards";
import { RaspberryPiPinout } from "@/components/board-visual/RaspberryPiPinout";

afterEach(cleanup);

it.each(["raspberry-pi-5", "raspberry-pi-pico-2-w"])("shows named source pin pairs for %s without the illustration hiding the controls", (id) => {
  const board = boards.find((board) => board.id === id)!;
  const { container } = render(<RaspberryPiPinout board={board} />);
  expect(screen.getByText("Select a labelled pin for details and cautions. Keyboard: arrows, then Enter.")).toBeTruthy();
  const connector = screen.getByRole("group", { name: "Select a physical pin from the connector" });
  const pins = board.pinout!.pins!;
  const expected = pins.left.flatMap((pin, index) => [pin, pins.right[index]]);
  const buttons = within(connector).getAllByRole("button");
  expect(buttons).toHaveLength(40);
  buttons.forEach((button, index) => {
    expect(button.textContent).toContain(expected[index].label);
    expect(button.getAttribute("aria-label")).toContain(`Pin ${expected[index].position},`);
  });
  expect(container.querySelector(".pi-board-overview")?.hasAttribute("open")).toBe(false);
  expect(container.querySelector(".pi-board-frame")?.getAttribute("style")).not.toContain("min-width");
  fireEvent.click(buttons[0]);
  expect(buttons[0].getAttribute("aria-pressed")).toBe("true");
  expect(screen.getByRole("button", { name: new RegExp(`^Copy pin 1,`) })).toBeTruthy();
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
