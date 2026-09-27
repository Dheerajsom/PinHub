// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { boards, type Board } from "@/lib/boards";
import { PinPlannerSection } from "@/components/planner/PinPlannerSection";

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
  // The planner restores ?plan= on the first animation frame after mount.
  await act(async () => {
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  });
}

describe("PinPlannerSection", () => {
  it("offers steppers only for the peripherals the board can supply", async () => {
    render(<PinPlannerSection board={board("raspberry-pi-5")} />);
    await settle();
    const section = screen.getByRole("region", { name: "Pin planner" });
    const groups = within(section)
      .getAllByRole("group")
      .map((group) => group.getAttribute("aria-label"))
      .filter((label) => label && / planned, up to /.test(label));
    expect(groups).toEqual([
      "I2C, 0 planned, up to 1",
      "SPI, 0 planned, up to 2",
      "UART, 0 planned, up to 1",
      "PWM, 0 planned, up to 4",
      "GPIO, 0 planned, up to 8",
    ]);
    expect(within(section).queryByRole("button", { name: "Add one ADC" })).toBeNull();
  });

  it("plans on each tap, announces one summary, and keeps it in the URL", async () => {
    window.history.replaceState(null, "", "/boards/raspberry-pi-pico");
    render(<PinPlannerSection board={board("raspberry-pi-pico")} />);
    await settle();
    const section = screen.getByRole("region", { name: "Pin planner" });
    const statuses = () => within(section).getAllByRole("status");
    expect(statuses()[0].textContent).toBe("Add the peripherals your circuit needs to plan its pins.");

    fireEvent.click(within(section).getByRole("button", { name: "Add one I2C" }));
    expect(statuses()[0].textContent).toBe("Plan ready: 2 pins assigned.");
    expect(within(section).getByRole("group", { name: "I2C, 1 planned, up to 2" })).toBeTruthy();
    expect(window.location.search).toBe("?plan=i2c1");

    // The I2C stepper is at its limit once both instances are planned.
    fireEvent.click(within(section).getByRole("button", { name: "Add one I2C" }));
    expect(
      within(section).getByRole("button", { name: "Add one I2C" }).hasAttribute("disabled"),
    ).toBe(true);
    expect(window.location.search).toBe("?plan=i2c2");
    expect(within(section).getByRole("button", { name: "Show pin 6, GP4 on the board" })).toBeTruthy();

    fireEvent.click(within(section).getByRole("button", { name: "Clear plan" }));
    expect(window.location.search).toBe("");
  });

  it("restores a shared plan and clamps it to what the board supports", async () => {
    window.history.replaceState(null, "", "/boards/raspberry-pi-5?plan=i2c5.adc2.gpio1");
    render(<PinPlannerSection board={board("raspberry-pi-5")} />);
    await settle();
    const section = screen.getByRole("region", { name: "Pin planner" });
    expect(within(section).getByRole("group", { name: "I2C, 1 planned, up to 1" })).toBeTruthy();
    expect(within(section).getAllByRole("status")[0].textContent).toBe("Plan ready: 3 pins assigned.");
    expect(window.location.search).toBe("?plan=i2c1.gpio1");
  });

  it("says planning is unavailable, with a report link, for other boards", () => {
    render(<PinPlannerSection board={board("raspberry-pi-4-model-b")} />);
    const section = screen.getByRole("region", { name: "Pin planner" });
    expect(section.textContent).toContain("Pin planning isn't available for this board yet.");
    const link = within(section).getByRole("link", { name: /Report a data error/ });
    expect(new URL(link.getAttribute("href")!).searchParams.get("board")).toBe("raspberry-pi-4-model-b");
    expect(within(section).queryByRole("button")).toBeNull();
  });
});
