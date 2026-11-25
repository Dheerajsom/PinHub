import { describe, expect, it } from "vitest";
import { boards, type Board } from "@/lib/boards";
import { createPinIndex } from "@/lib/server/pin-index";

const byId = new Map(boards.map((board) => [board.id, board]));

function pins(board: Board) {
  const pinout = board.pinout!;
  return pinout.layout === "dual-row" ? [...pinout.pins!.left, ...pinout.pins!.right] : pinout.groups!.flatMap((group) => group.pins);
}

function defaultUart(boardId: string, label: string) {
  const pin = pins(byId.get(boardId)!).find((item) => item.label === label)!;
  return pin.functions?.filter((item) => item.default && item.peripheral === "UART").map((item) => `${item.instance}.${item.signal}`);
}

describe("Raspberry Pi primary UART on GPIO14 and GPIO15", () => {
  // Raspberry Pi serial documentation, "Primary UART": UART1 (mini UART) is
  // primary on the "Zero W and Zero 2 W" and "Raspberry Pi 3 and 4"; UART0
  // there is the secondary UART, wired to Bluetooth.
  it.each([
    "raspberry-pi-zero-w",
    "raspberry-pi-zero-2-w",
    "raspberry-pi-3-model-a-plus",
    "raspberry-pi-3-model-b",
    "raspberry-pi-3-model-b-plus",
    "raspberry-pi-4-model-b",
    "raspberry-pi-400",
  ])("%s defaults to the mini UART, not the Bluetooth UART", (id) => {
    expect(defaultUart(id, "GPIO14")).toEqual(["UART1.TX"]);
    expect(defaultUart(id, "GPIO15")).toEqual(["UART1.RX"]);
    const note = byId.get(id)!.pinFunctions!.mux.note;
    expect(note).toContain("Bluetooth");
    expect(note).toContain("enable_uart");
    // The lookup's "Recorded default" badge reads the same data.
    const lookup = createPinIndex().find((board) => board.id === id)!.pins.find((pin) => pin.label === "GPIO14")!;
    expect(lookup.defaultSignals).toContain("UART1");
    expect(lookup.defaultSignals).not.toContain("UART0");
  });

  it.each(["raspberry-pi-zero", "raspberry-pi-1-model-b-plus", "raspberry-pi-2-model-b"])(
    "%s keeps UART0, its primary UART",
    (id) => {
      expect(defaultUart(id, "GPIO14")).toEqual(["UART0.TX"]);
      expect(byId.get(id)!.pinFunctions!.mux.note).not.toContain("Bluetooth");
    },
  );
});

describe("Libre Computer always-on I2C controllers", () => {
  it.each(["libre-computer-alta", "libre-computer-solitude"])(
    "%s says I2C_AO_M0 and I2C_AO_S0 are different controllers, not aliases of one bus",
    (id) => {
      const shared = pins(byId.get(id)!).filter((pin) => pin.aliases?.some((alias) => alias.startsWith("I2C_AO_S0")));
      expect(shared.map((pin) => pin.label).sort()).toEqual(["GPIOAO_2", "GPIOAO_3"]);
      for (const pin of shared) {
        expect(pin.aliases).toEqual(expect.arrayContaining([expect.stringMatching(/^I2C_AO_M0_/)]));
        expect(pin.note).toMatch(/I2C_AO_M0 and I2C_AO_S0/);
        expect(pin.note).toMatch(/not two names for one bus/);
      }
    },
  );
});

describe("pin lookup names the default route", () => {
  it("lists a Bluetooth Pi's UART1 first and marks it as the default, with UART0 as an alternate", async () => {
    const { matchedPinSignals } = await import("@/lib/pin-lookup");
    const pin = createPinIndex().find((board) => board.id === "raspberry-pi-4-model-b")!.pins.find((item) => item.label === "GPIO14")!;
    expect(matchedPinSignals(pin, "uart")).toBe("UART1 TX (default) · UART0 TX");
    const zero = createPinIndex().find((board) => board.id === "raspberry-pi-zero")!.pins.find((item) => item.label === "GPIO14")!;
    expect(matchedPinSignals(zero, "uart")).toBe("UART0 TX (default) · UART1 TX");
  });
});
