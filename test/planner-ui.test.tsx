// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { boards, type Board } from "@/lib/boards";
import { summarizeBoard } from "@/lib/board-summary";
import { createBoardDetailLoader } from "@/lib/board-detail-loader";
import { PlannerApp } from "@/components/planner/PlannerApp";
import { PlannerBoardPicker } from "@/components/planner/PlannerBoardPicker";
import { PlannerWorkspace } from "@/components/planner/PlannerWorkspace";

const catalog = boards.map(summarizeBoard);
const autoAssignIds = boards
  .filter((item) => item.pinFunctions && item.pinout)
  .map((item) => item.id);

function board(id: string): Board {
  const found = boards.find((item) => item.id === id);
  if (!found) throw new Error(`${id} missing`);
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
  Element.prototype.scrollIntoView = () => {};
});

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
});

async function settle() {
  // The planner reads the URL on the first animation frame after mount.
  await act(async () => {
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  });
}

describe("PlannerBoardPicker", () => {
  it("finds a board, tags what it supports, and picks it with Enter", () => {
    const onPick = vi.fn();
    render(<PlannerBoardPicker catalog={catalog} autoAssignIds={autoAssignIds} onPick={onPick} />);
    const input = screen.getByRole("combobox", { name: "Search for your board" });
    fireEvent.change(input, { target: { value: "raspberry pi pico" } });
    const options = screen.getAllByRole("option");
    expect(options[0].textContent).toContain("Raspberry Pi Pico");
    expect(options[0].textContent).toContain("Auto-assign");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onPick).toHaveBeenCalledWith("raspberry-pi-pico");
  });

  it("lists the auto-assign boards as quick picks", () => {
    const onPick = vi.fn();
    render(<PlannerBoardPicker catalog={catalog} autoAssignIds={autoAssignIds} onPick={onPick} />);
    const group = screen.getByRole("group", { name: "Boards with auto-assign" });
    expect(within(group).getAllByRole("button")).toHaveLength(autoAssignIds.length);
    fireEvent.click(within(group).getByRole("button", { name: /Arduino UNO/ }));
    expect(onPick).toHaveBeenCalledWith("arduino-uno-rev3");
  });

  it("shows a board with no pin map as unavailable", () => {
    const unmapped = catalog.find((item) => !item.hasPinout)!;
    const onPick = vi.fn();
    render(<PlannerBoardPicker catalog={catalog} autoAssignIds={autoAssignIds} onPick={onPick} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: unmapped.name } });
    const option = screen
      .getAllByRole("option")
      .find((item) => item.textContent?.includes(unmapped.name))!;
    expect(option.getAttribute("aria-disabled")).toBe("true");
    expect(option.textContent).toContain("No pin map");
    fireEvent.click(option);
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Enter" });
    expect(onPick).not.toHaveBeenCalledWith(unmapped.id);
  });

  it("says when nothing matches", () => {
    render(<PlannerBoardPicker catalog={catalog} autoAssignIds={autoAssignIds} onPick={() => {}} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "zzzzqqqq" } });
    expect(screen.getByText("No board matches that.")).toBeTruthy();
  });
});

describe("PlannerWorkspace", () => {
  it("claims a pin by hand, keeps it in the URL, and plans around it", async () => {
    window.history.replaceState(null, "", "/planner?board=raspberry-pi-pico");
    render(<PlannerWorkspace board={board("raspberry-pi-pico")} onChangeBoard={() => {}} />);
    await settle();
    const section = screen.getByRole("region", { name: "Pin planner" });

    fireEvent.click(within(section).getByRole("button", { name: /^Pin 6, GP4/ }));
    const editor = within(section).getByRole("region", { name: "Pin editor" });
    const input = within(editor).getByLabelText("Used for") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "OLED <SDA>" } });
    expect(input.value).toBe("OLED SDA");
    fireEvent.click(within(editor).getByRole("button", { name: "Claim pin" }));

    const params = () => new URLSearchParams(window.location.search);
    expect(params().get("board")).toBe("raspberry-pi-pico");
    expect(params().get("use")).toBe("pL:5~OLED SDA");
    expect(section.querySelectorAll(".bv-claimed-ring")).toHaveLength(1);
    expect(section.querySelector('tr[data-kind="manual"]')?.textContent).toContain("OLED SDA");

    // GP4 is the solver's first choice for I2C0 SDA; claimed, it is left alone.
    fireEvent.click(within(section).getByRole("button", { name: "Add one I2C" }));
    expect(within(section).getByText("Plan ready: 2 pins assigned.")).toBeTruthy();
    expect(params().get("plan")).toBe("i2c1");
    const autoRows = [...section.querySelectorAll('tr[data-kind="auto"]')];
    expect(autoRows).toHaveLength(2);
    for (const row of autoRows) expect(row.textContent).not.toMatch(/GP4(?!\d)/);

    fireEvent.click(within(section).getByRole("button", { name: /^Pin 6, GP4/ }));
    fireEvent.click(within(section).getByRole("button", { name: "Release pin" }));
    expect(params().get("use")).toBeNull();
    expect(section.querySelectorAll(".bv-claimed-ring")).toHaveLength(0);
  });

  it("restores a shared plan with claims and drops what it cannot place", async () => {
    window.history.replaceState(
      null,
      "",
      "/planner?board=raspberry-pi-pico&plan=i2c1&use=pL:0~UART+TX,zz:9~bad",
    );
    render(<PlannerWorkspace board={board("raspberry-pi-pico")} onChangeBoard={() => {}} />);
    await settle();
    const section = screen.getByRole("region", { name: "Pin planner" });
    const manual = section.querySelectorAll('tr[data-kind="manual"]');
    expect(manual).toHaveLength(1);
    expect(manual[0].textContent).toContain("UART TX");
    expect(within(section).getByRole("group", { name: /^I2C, 1 planned/ })).toBeTruthy();
    expect(new URLSearchParams(window.location.search).get("use")).toBe("pL:0~UART TX");
    expect(within(section).getByText(/Some claimed pins in this link could not be restored/)).toBeTruthy();
  });

  it("restores a complete shared link without a warning", async () => {
    window.history.replaceState(null, "", "/planner?board=raspberry-pi-pico&use=pL:0~UART+TX");
    render(<PlannerWorkspace board={board("raspberry-pi-pico")} onChangeBoard={() => {}} />);
    await settle();
    const section = screen.getByRole("region", { name: "Pin planner" });
    expect(section.querySelectorAll('tr[data-kind="manual"]')).toHaveLength(1);
    expect(within(section).queryByText(/could not be restored/)).toBeNull();
  });

  it("offers manual claims but no guessed plan on a board without pin functions", async () => {
    window.history.replaceState(null, "", "/planner?board=raspberry-pi-4-model-b&plan=i2c1");
    render(<PlannerWorkspace board={board("raspberry-pi-4-model-b")} onChangeBoard={() => {}} />);
    await settle();
    const section = screen.getByRole("region", { name: "Pin planner" });
    expect(section.textContent).toContain("Auto-assign isn't available for this board yet.");
    expect(within(section).queryByRole("button", { name: /^Add one/ })).toBeNull();
    expect(section.querySelectorAll(".bv-planned-ring")).toHaveLength(0);
    const report = within(section).getByRole("link", { name: /Report a data error/ });
    expect(report.getAttribute("rel")).toBe("noopener noreferrer");
    expect(new URL(report.getAttribute("href")!).protocol).toBe("https:");

    fireEvent.click(within(section).getByRole("button", { name: /^Pin 3, GPIO2/ }));
    fireEvent.click(within(section).getByRole("button", { name: "Claim pin" }));
    expect(section.querySelector('tr[data-kind="manual"]')?.textContent).toContain("In use");
    expect(within(section).getByRole("button", { name: "CSV" })).toBeTruthy();
    expect(within(section).queryByRole("button", { name: "C header" })).toBeNull();
  });

  it("asks before discarding a plan when changing board", async () => {
    const onChangeBoard = vi.fn();
    window.history.replaceState(null, "", "/planner?board=raspberry-pi-pico&plan=i2c1");
    render(<PlannerWorkspace board={board("raspberry-pi-pico")} onChangeBoard={onChangeBoard} />);
    await settle();
    fireEvent.click(screen.getByRole("button", { name: "Change board" }));
    expect(onChangeBoard).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Discard plan and change board" }));
    expect(onChangeBoard).toHaveBeenCalledTimes(1);
  });

  it("changes board at once when there is nothing to lose", async () => {
    const onChangeBoard = vi.fn();
    window.history.replaceState(null, "", "/planner?board=raspberry-pi-pico");
    render(<PlannerWorkspace board={board("raspberry-pi-pico")} onChangeBoard={onChangeBoard} />);
    await settle();
    fireEvent.click(screen.getByRole("button", { name: "Change board" }));
    expect(onChangeBoard).toHaveBeenCalledTimes(1);
  });
});

describe("PlannerApp", () => {
  it("shows the picker, then the workspace for the picked board", async () => {
    const loader = createBoardDetailLoader(boards);
    render(<PlannerApp catalog={catalog} autoAssignIds={autoAssignIds} loader={loader} />);
    await settle();
    expect(screen.getByRole("combobox", { name: "Search for your board" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Raspberry Pi Pico" }));
    await settle();
    expect(window.location.search).toBe("?board=raspberry-pi-pico");
    expect(screen.getByRole("region", { name: "Pin planner" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("Raspberry Pi Pico");
  });

  it("ignores a malformed board parameter", async () => {
    window.history.replaceState(null, "", "/planner?board=../../etc");
    render(
      <PlannerApp
        catalog={catalog}
        autoAssignIds={autoAssignIds}
        loader={createBoardDetailLoader(boards)}
      />,
    );
    await settle();
    expect(screen.getByRole("combobox", { name: "Search for your board" })).toBeTruthy();
  });

  it("explains a board that has no pin map", async () => {
    const unmapped = catalog.find((item) => !item.hasPinout)!;
    window.history.replaceState(null, "", `/planner?board=${unmapped.id}`);
    render(
      <PlannerApp
        catalog={catalog}
        autoAssignIds={autoAssignIds}
        loader={createBoardDetailLoader(boards)}
      />,
    );
    await settle();
    expect(screen.getByText(`${unmapped.name} has no pin map in PinHub yet`, { exact: false })).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Search for your board" })).toBeTruthy();
  });
});
