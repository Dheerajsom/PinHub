import { describe, expect, it } from "vitest";
import { boards, type Board, type Pin } from "@/lib/boards";
import { buildBoardLink, busSignalsForPin, linkPorts } from "@/lib/board-link";

function board(id: string): Board {
  const found = boards.find((entry) => entry.id === id);
  if (!found) throw new Error(`no board ${id}`);
  return found;
}

function pin(partial: Partial<Pin>): Pin {
  return { position: 1, label: "X", role: "gpio", ...partial };
}

function signals(partial: Partial<Pin>) {
  return busSignalsForPin(pin(partial)).map((item) => `${item.instance}:${item.signal}`);
}

function wireLabels(link: ReturnType<typeof buildBoardLink>) {
  return link.wires.map((wire) => `${wire.a.pin.label} ${wire.direction} ${wire.b.pin.label}`);
}

describe("busSignalsForPin", () => {
  it("reads instance and signal from the spellings boards use", () => {
    expect(signals({ label: "D1 / TX0", role: "uart" })).toEqual(["UART0:TX"]);
    expect(signals({ label: "GPIO1", role: "uart", aliases: ["U0TXD"] })).toEqual(["UART0:TX"]);
    expect(signals({ label: "UART3_RXD", role: "uart" })).toEqual(["UART3:RX"]);
    expect(signals({ label: "USART2_TX", role: "uart" })).toEqual(["USART2:TX"]);
    expect(signals({ label: "I2C-3 SDA", role: "i2c" })).toEqual(["I2C3:SDA"]);
    expect(signals({ label: "I2C4_SDA_M0", role: "i2c" })).toEqual(["I2C4:SDA"]);
    expect(signals({ label: "SDA1", role: "i2c" })).toEqual(["I2C1:SDA"]);
    expect(signals({ label: "TXO", role: "uart" })).toEqual([":TX"]);
    expect(signals({ label: "RXI", role: "uart" })).toEqual([":RX"]);
  });

  it("maps I2C clock and data spellings only under an I2C prefix", () => {
    expect(signals({ label: "TWI1-SCK", role: "i2c" })).toEqual(["TWI1:SCL"]);
    expect(signals({ label: "I2C2_DAT", role: "i2c" })).toEqual(["I2C2:SDA"]);
    expect(signals({ label: "I2C2_CLK", role: "i2c" })).toEqual(["I2C2:SCL"]);
    // A bare SCK is an SPI clock, never an I2C one.
    expect(signals({ label: "D13 / SCK", role: "spi" })).toEqual([]);
  });

  it("finds every signal a multi-function pin carries", () => {
    expect(signals({ label: "P1.7 / A7 / SDA / MOSI", role: "i2c" })).toEqual([":SDA"]);
    expect(signals({ label: "GPIO17", role: "uart", aliases: ["UART2 TX"] })).toEqual(["UART2:TX"]);
  });

  it("ignores flow control, rails, debug pins, and other protocols", () => {
    expect(signals({ label: "UART1_RTS", role: "uart" })).toEqual([]);
    expect(signals({ label: "TX", role: "power" })).toEqual([]);
    expect(signals({ label: "TX", role: "debug" })).toEqual([]);
    expect(signals({ label: "GPIO19", role: "special", aliases: ["PCM FS"] })).toEqual([]);
    expect(signals({ label: "CAM SDA", role: "i2c" })).toEqual([]);
  });

  it("uses the source-backed functions when the pin has them", () => {
    const withFunctions = pin({
      label: "D0 / RX",
      role: "uart",
      functions: [{ peripheral: "UART", instance: "Serial", signal: "RX" }],
    });
    expect(busSignalsForPin(withFunctions)).toEqual([
      { family: "UART", instance: "Serial", signal: "RX", isDefault: false },
    ]);
  });
});

describe("linkPorts", () => {
  it("keeps unnamed buses on different connectors apart", () => {
    const twoHeaders: Board = {
      ...board("raspberry-pi-pico"),
      id: "two-headers",
      pinFunctions: undefined,
      pinout: {
        connector: "Headers",
        layout: "grouped",
        notes: ["Synthetic."],
        groups: [
          { label: "J1", pins: [pin({ position: 1, label: "TX", role: "uart" }), pin({ position: 2, label: "GND", role: "ground" })] },
          { label: "J2", pins: [pin({ position: 1, label: "RX", role: "uart" }), pin({ position: 2, label: "TX", role: "uart" }), pin({ position: 3, label: "RX", role: "uart" })] },
        ],
      },
    };
    const ports = linkPorts(twoHeaders, "uart");
    expect(ports.map((port) => [port.id, port.complete])).toEqual([
      ["UART~J2", true],
      ["UART~J1", false],
    ]);
  });

  it("prefers the instance the sources name as default", () => {
    const ports = linkPorts(board("raspberry-pi-pico"), "uart");
    expect(ports[0].id).toBe("UART0");
    expect(ports.map((port) => port.id)).toContain("UART1");
  });
});

describe("buildBoardLink", () => {
  it("crosses UART TX and RX and asks for a shifter between 3.3 V and 5 V", () => {
    const link = buildBoardLink(board("raspberry-pi-5"), board("arduino-uno-rev3"), "uart");
    expect(wireLabels(link)).toEqual([
      "GPIO14 a-to-b D0 / RX",
      "GPIO15 b-to-a D1 / TX",
      "GND shared GND",
    ]);
    expect(link.status).toBe("shift");
    expect(link.level.kind).toBe("shift");
    expect(link.level.detail).toContain("not 5 V tolerant");
    expect(link.wires.filter((wire) => wire.kind === "signal").every((wire) => wire.viaShifter)).toBe(true);
    expect(link.wires.find((wire) => wire.kind === "ground")?.viaShifter).toBe(false);
    // The UNO record flags D0/D1 as the USB serial link; that caution travels.
    expect(link.wires[0].b.cautions.map((caution) => caution.label)).toContain("usb");
  });

  it("links two boards at the same level directly and lists alternate pins", () => {
    const pico = board("raspberry-pi-pico");
    const link = buildBoardLink(pico, pico, "uart");
    expect(link.status).toBe("ready");
    expect(link.level.kind).toBe("match");
    expect(wireLabels(link).slice(0, 2)).toEqual(["GP0 a-to-b GP1", "GP1 b-to-a GP0"]);
    expect(link.wires[0].a.alternatives.map((entry) => entry.label)).toEqual(["GP12", "GP16", "GP28"]);
    expect(link.wires.every((wire) => !wire.viaShifter)).toBe(true);
  });

  it("joins I2C data to data and clock to clock, with the pull-up note", () => {
    const link = buildBoardLink(board("raspberry-pi-pico"), board("esp32-devkitc"), "i2c");
    expect(wireLabels(link).slice(0, 2)).toEqual(["GP4 both IO21", "GP5 both IO22"]);
    expect(link.status).toBe("ready");
    expect(link.notes.join(" ")).toMatch(/pull-up/i);
  });

  it("honours a chosen instance and ignores an unknown one", () => {
    const pico = board("raspberry-pi-pico");
    const chosen = buildBoardLink(pico, pico, "uart", { a: "UART1", b: "nope" });
    expect(chosen.port.a?.id).toBe("UART1");
    expect(chosen.port.b?.id).toBe("UART0");
    expect(chosen.wires[0].a.pin.label).toBe("GP4");
  });

  it("asks for a check when a record does not settle one logic level", () => {
    const link = buildBoardLink(board("arduino-pro-mini"), board("raspberry-pi-pico"), "uart");
    expect(link.level.kind).toBe("check");
    expect(["check", "blocked"]).toContain(link.status);
    expect(link.level.detail).toContain("Arduino Pro Mini");
  });

  it("is blocked when a board has no pin map", () => {
    const missing = boards.find((entry) => !entry.pinout);
    if (!missing) throw new Error("expected a board without a pin map");
    const link = buildBoardLink(missing, board("raspberry-pi-pico"), "uart");
    expect(link.status).toBe("blocked");
    expect(link.wires).toEqual([]);
    expect(link.blockers[0]).toContain("no pin map");
  });

  it("is blocked when a board has no complete bus", () => {
    const halfBus: Board = {
      ...board("raspberry-pi-pico"),
      id: "half-bus",
      pinFunctions: undefined,
      pinout: {
        connector: "J1",
        layout: "grouped",
        notes: ["Synthetic."],
        groups: [{ label: "J1", pins: [pin({ position: 1, label: "TX", role: "uart" }), pin({ position: 2, label: "GND", role: "ground" })] }],
      },
    };
    const link = buildBoardLink(halfBus, board("raspberry-pi-pico"), "uart");
    expect(link.status).toBe("blocked");
    expect(link.blockers.join(" ")).toMatch(/no RX/);
  });

  it("never joins power rails", () => {
    for (const bus of ["uart", "i2c"] as const) {
      const link = buildBoardLink(board("raspberry-pi-5"), board("esp32-devkitc"), bus);
      expect(link.wires.some((wire) => wire.a.pin.role === "power" || wire.b.pin.role === "power")).toBe(false);
    }
  });
});
