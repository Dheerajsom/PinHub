// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { boards, type Board } from "@/lib/boards";
import { buildBoardGeometry } from "@/lib/board-visual-geometry";
import { fiveVoltCaution } from "@/lib/board-utilities";
import { raspberryPiModel } from "@/lib/raspberry-pi-models";
import { PinDetails } from "@/components/board-visual/PinDetails";
import { RaspberryPiPinout } from "@/components/board-visual/RaspberryPiPinout";
import { roleColors } from "@/components/board-visual/roles";

function catalogBoard(id: string): Board {
  const found = boards.find((item) => item.id === id);
  if (!found) throw new Error(`${id} missing from the catalog`);
  return found;
}

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

afterEach(cleanup);

describe("PinDetails readout", () => {
  const board = catalogBoard("raspberry-pi-5");
  const anchor = buildBoardGeometry(board)!.anchors.find(({ pin }) => pin.position === 8)!;

  it("offers Clear only for a pinned pin and calls the handler", () => {
    const onClear = vi.fn();
    const { rerender } = render(
      <PinDetails anchor={anchor} pinned={false} net={null} netSize={1} onClear={onClear} />,
    );
    expect(screen.queryByRole("button", { name: "Clear selection" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Copy pin/ })).toBeNull();

    rerender(<PinDetails anchor={anchor} pinned net={null} netSize={1} onClear={onClear} />);
    fireEvent.click(screen.getByRole("button", { name: "Clear selection" }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("labels the copy action and keeps its pin-specific name", () => {
    render(<PinDetails anchor={anchor} pinned net={null} netSize={1} />);
    const copy = screen.getByRole("button", { name: `Copy pin 8, ${anchor.pin.label}` });
    expect(copy.textContent).toBe("Copy");
  });

  it("rules the card in the pin's role hue", () => {
    const { container } = render(
      <PinDetails anchor={anchor} pinned={false} net={null} netSize={1} />,
    );
    const card = container.querySelector<HTMLElement>(".pin-readout")!;
    expect(card.style.borderLeftColor).not.toBe("");
    const probe = document.createElement("div");
    probe.style.borderLeftColor = roleColors[anchor.pin.role].edge;
    expect(card.style.borderLeftColor).toBe(probe.style.borderLeftColor);
  });

  it("keeps the empty state's prompt", () => {
    render(<PinDetails anchor={null} pinned={false} net={null} netSize={1} />);
    expect(screen.getByText(/Hover, tap, or arrow to a pad/)).toBeTruthy();
  });
});

describe("Raspberry Pi workbench logic caption", () => {
  // The caption used to hard-code "GPIO is not 5 V tolerant" for every Pi
  // family except Pico. It must quote the record through fiveVoltCaution, the
  // same rule the board page uses, and never state more than the record does.
  const piBoards = boards.filter((board) => raspberryPiModel(board.id) && board.pinout);

  it.each(piBoards.map((board) => [board.id, board] as const))(
    "%s derives its caption from the record",
    (_id, board) => {
      render(<RaspberryPiPinout board={board} />);
      const workbench = screen.getByRole("region", { name: /dynamic pinout/ });
      const note = workbench.querySelector<HTMLElement>(".pi-electrical-note")!;
      expect(within(note).getByText(board.logicLevel)).toBeTruthy();
      const caution = fiveVoltCaution(board);
      if (caution) expect(note.textContent).toContain(caution);
      expect(note.textContent).not.toContain("GPIO is not 5 V tolerant");
    },
  );
});
