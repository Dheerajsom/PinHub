import { describe, expect, it } from "vitest";
import { boards, type Pin } from "@/lib/boards";
import { netDescription, netForPin } from "@/lib/pin-nets";

function pin(partial: Partial<Pin>): Pin {
  return { position: 1, label: "X", role: "gpio", ...partial };
}

function netId(partial: Partial<Pin>): string | null {
  return netForPin(pin(partial))?.id ?? null;
}

function boardPins(id: string): Pin[] {
  const board = boards.find((entry) => entry.id === id);
  if (!board?.pinout) throw new Error(`no pinout fixture for ${id}`);
  const { pins, groups } = board.pinout;
  return [
    ...(pins ? [...pins.left, ...pins.right] : []),
    ...(groups ?? []).flatMap((group) => group.pins),
  ];
}

function netMembers(id: string, net: string): string[] {
  return boardPins(id)
    .filter((entry) => netForPin(entry)?.id === net)
    .map((entry) => entry.label);
}

describe("netForPin", () => {
  it("reads the bus instance from an explicit alias", () => {
    expect(netId({ label: "GPIO10", role: "spi", aliases: ["SPI0 MOSI"] })).toBe("SPI0");
    expect(netId({ label: "GP4", role: "i2c", aliases: ["I2C0 SDA"] })).toBe("I2C0");
    expect(netId({ label: "GP1", role: "uart", aliases: ["UART0 RX"] })).toBe("UART0");
  });

  it("reads the bus instance from a bare suffixed signal name", () => {
    expect(netId({ label: "GPIO2", role: "i2c", aliases: ["SDA1"] })).toBe("I2C1");
    expect(netId({ label: "GPIO14", role: "uart", aliases: ["TXD0"] })).toBe("UART0");
    expect(netId({ label: "11", role: "spi", aliases: ["MOSI0"] })).toBe("SPI0");
  });

  it("normalizes USART to UART so both spellings share a net", () => {
    expect(netId({ label: "PA9", role: "uart", aliases: ["USART1 TX"] })).toBe("UART1");
  });

  it("treats a trailing chip-select number as a select, not a bus index", () => {
    // CE1 is chip-select 1 of an SPI controller; claiming "SPI1" would invent a
    // second bus that may not exist on the part.
    expect(netId({ label: "BCM7", role: "dac", aliases: ["CE1"] })).toBe("SPI");
    expect(netId({ label: "D10", role: "pwm", aliases: ["SS"] })).toBe("SPI");
  });

  it("does not resolve another protocol's clock to an SPI net", () => {
    expect(netId({ label: "GPIOAO_8", role: "special", aliases: ["TDMB SCLK"] })).toBeNull();
    expect(netId({ label: "GPIO19", role: "special", aliases: ["PCM FS"] })).toBeNull();
  });

  it("keeps analog ground off the digital ground net", () => {
    expect(netId({ label: "GND", role: "ground" })).toBe("GND");
    expect(netId({ label: "AGND", role: "ground" })).toBe("AGND");
  });

  it("folds equivalent rail spellings onto one net", () => {
    expect(netId({ label: "3V3", role: "power" })).toBe("3V3");
    expect(netId({ label: "3.3V", role: "power" })).toBe("3V3");
    expect(netId({ label: "+5V", role: "power" })).toBe("5V");
    expect(netId({ label: "5V", role: "power" })).toBe("5V");
  });

  it("keeps distinct rails distinct", () => {
    expect(netId({ label: "VBUS", role: "power" })).toBe("VBUS");
    expect(netId({ label: "VSYS", role: "power" })).toBe("VSYS");
    expect(netId({ label: "3V3", role: "power" })).not.toBe(netId({ label: "5V", role: "power" }));
  });

  it("groups debug pins by interface", () => {
    expect(netId({ label: "SWDIO", role: "debug" })).toBe("SWD");
    expect(netId({ label: "SWCLK", role: "debug" })).toBe("SWD");
    expect(netId({ label: "TCK", role: "debug" })).toBe("JTAG");
  });

  it("falls back to the family when the data does not name an instance", () => {
    expect(netId({ label: "A4 / SDA", role: "i2c" })).toBe("I2C");
    expect(netId({ label: "D13", role: "spi" })).toBe("SPI");
  });

  it("leaves unrelated pins without a net", () => {
    expect(netId({ label: "GPIO17", role: "gpio" })).toBeNull();
    expect(netId({ label: "GP26", role: "adc", aliases: ["ADC0"] })).toBeNull();
    expect(netId({ label: "RUN", role: "system" })).toBeNull();
  });

  it("resolves real catalog nets across a full connector", () => {
    // Pi 5 J8: five SPI0 pins, both I2C1 pins, eight grounds.
    expect(netMembers("raspberry-pi-5", "SPI0")).toEqual([
      "GPIO10",
      "GPIO9",
      "GPIO11",
      "GPIO8",
      "GPIO7",
    ]);
    expect(netMembers("raspberry-pi-5", "I2C1")).toEqual(["GPIO2", "GPIO3"]);
    expect(netMembers("raspberry-pi-5", "GND")).toHaveLength(8);
    expect(netMembers("raspberry-pi-5", "3V3")).toEqual(["3V3", "3V3"]);

    // Pico exposes two independent SPI blocks; they must not merge.
    expect(netMembers("raspberry-pi-pico", "SPI0")).toHaveLength(4);
    expect(netMembers("raspberry-pi-pico", "SPI1")).toHaveLength(4);
    expect(netMembers("raspberry-pi-pico", "AGND")).toEqual(["AGND"]);
  });

  it("never resolves a net for a board that has none of that bus", () => {
    const pico = boardPins("raspberry-pi-pico");
    expect(pico.some((entry) => netForPin(entry)?.id === "JTAG")).toBe(false);
  });
});

describe("netDescription", () => {
  it("names each net kind the way the readout reads it", () => {
    expect(netDescription({ id: "SPI0", label: "SPI0", kind: "bus" })).toBe("SPI0 bus");
    expect(netDescription({ id: "3V3", label: "3V3", kind: "rail" })).toBe("3V3 rail");
    expect(netDescription({ id: "GND", label: "GND", kind: "ground" })).toBe("GND");
    expect(netDescription({ id: "SWD", label: "SWD", kind: "debug" })).toBe("SWD debug");
  });
});
