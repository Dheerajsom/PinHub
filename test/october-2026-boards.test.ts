import { describe, expect, it } from "vitest";
import { boards, type Board, type Pin } from "@/lib/boards";
import { boardVisuals } from "@/lib/board-visuals";
import { validateBoardVisuals } from "@/lib/board-visual-validation";
import { getBoardDiscoveryProfile } from "@/lib/board-discovery";

// Row-for-row checks for the October 2026 boards. Each expectation is the
// board's pad order as its sources state it, so a later edit to boards.ts
// cannot quietly move a pin:
//
// - Arduino UNO Q: ABX00162 datasheet JDIGITAL1/JANALOG1 tables, matched by
//   Zephyr boards/arduino/uno_q/arduino_r3_connector.dtsi.
// - Arduino Nano R4: ABX00142 datasheet JP1/JP2 tables, matched by
//   ArduinoCore-renesas variants/NANOR4/variant.cpp and Zephyr.
// - Arduino Nano Matter: ABX00112 full-pinout figure, matched by the Silicon
//   Labs Arduino core variant and Zephyr.
// - Seeed XIAO boards: Seeed wiki "Pin Map" tables and schematic net names,
//   matched by each board's Zephyr seeed_xiao_connector.dtsi gpio-map.

function board(id: string): Board {
  const found = boards.find((candidate) => candidate.id === id);
  expect(found, `board ${id} is missing`).toBeDefined();
  return found!;
}

function rows(id: string): { left: Pin[]; right: Pin[] } {
  const pinout = board(id).pinout;
  expect(pinout?.layout, `${id} layout`).toBe("dual-row");
  return pinout!.pins!;
}

/** First alias of each pin: the MCU port or GPIO the sources name. */
function ports(pins: Pin[]): (string | undefined)[] {
  return pins.map((pin) => pin.aliases?.[0]);
}

const newIds = [
  "arduino-uno-q",
  "arduino-nano-r4",
  "arduino-nano-matter",
  "seeed-xiao-mg24",
  "seeed-xiao-rp2350",
  "seeed-xiao-nrf54l15",
  "seeed-xiao-nrf54lm20a",
  "seeed-xiao-esp32c5",
  "seeed-xiao-ra4m1",
  "raspberry-pi-500-plus",
];

describe("October 2026 boards", () => {
  it("are all in the catalog with a diagram that validates", () => {
    for (const id of newIds) {
      expect(board(id).pinout, `${id} pinout`).toBeDefined();
      expect(boardVisuals[id], `${id} visual`).toBeDefined();
    }
    const { errors, warnings } = validateBoardVisuals();
    expect(errors).toEqual([]);
    expect(warnings.filter((warning) => newIds.some((id) => warning.includes(`"${id}"`)))).toEqual([]);
  });

  it("maps UNO Q JDIGITAL and JANALOG to the datasheet's STM32U585 ports", () => {
    const groups = board("arduino-uno-q").pinout!.groups!;
    expect(groups.map((group) => group.label)).toEqual(["JDIGITAL", "JANALOG"]);
    expect(groups[0].pins.map((pin) => pin.position)).toEqual(
      Array.from({ length: 18 }, (_, i) => i + 1),
    );
    expect(ports(groups[0].pins)).toEqual([
      "PB7", "PB6", "PB3", "PB0", "PA12", "PA11", "PB1", "PB2", "PB4",
      "PB8", "PB9", "PB15", "PB14", "PB13", undefined, undefined, "PB11", "PB10",
    ]);
    expect(groups[1].pins.map((pin) => pin.label)).toEqual([
      "BOOT", "IOREF", "RESET", "3V3", "5V", "GND", "GND", "VIN",
      "A0 / DAC0", "A1 / DAC1", "A2", "A3", "A4", "A5",
    ]);
    expect(groups[1].pins.slice(8).map((pin) => pin.aliases?.[1])).toEqual([
      "PA4", "PA5", "PA6", "PA7", "PC1", "PC0",
    ]);
    // D3 is the one JDIGITAL pad that is not 5 V tolerant even as an input.
    expect(groups[0].pins[3].note).toMatch(/never 5 V/);
  });

  it("keeps the Nano R4 JP1/JP2 order, including BOOT at JP1 pin 13", () => {
    const { left, right } = rows("arduino-nano-r4");
    expect(left.map((pin) => pin.label.split(" / ")[0])).toEqual([
      "D13", "3V3", "AREF", "A0", "A1", "A2", "A3", "A4", "A5", "A6", "A7",
      "5V", "BOOT", "GND", "VIN",
    ]);
    expect(right.map((pin) => pin.label.split(" / ")[0])).toEqual([
      "D12", "D11", "D10", "D9", "D8", "D7", "D6", "D5", "D4", "D3", "D2",
      "GND", "RST", "D0", "D1",
    ]);
    expect(ports(right).filter(Boolean)).toEqual([
      "P110", "P109", "P112", "P303", "P304", "P107", "P106", "P102", "P103",
      "P104", "P105", "P301", "P302",
    ]);
    expect(board("arduino-nano-r4").logicLevel).toBe("5 V GPIO");
  });

  it("keeps Nano Matter's reversed serial pins: D0 is TX at the corner", () => {
    const { left, right } = rows("arduino-nano-matter");
    expect(left[12].label).toBe("NC");
    expect(right.slice(-2).map((pin) => [pin.label, pin.aliases?.[0]])).toEqual([
      ["D1 / RX1", "PA5"],
      ["D0 / TX1", "PA4"],
    ]);
    expect(ports(left.slice(3, 11))).toEqual([
      "D14", "D15", "D16", "D17", "D18", "D19", "D20", "D21",
    ]);
    expect(left.slice(3, 11).map((pin) => pin.aliases?.[1])).toEqual([
      "PB0", "PB2", "PB5", "PC0", "PA6", "PA7", "PB1", "PB3",
    ]);
  });

  // D0-D6 down the left edge (pads 1-7), D7-D10 up the right (pads 8-11).
  it.each([
    ["seeed-xiao-mg24", ["PC00", "PC01", "PC02", "PC03", "PC04", "PC05", "PC06"], ["PC07", "PA03", "PA04", "PA05"]],
    ["seeed-xiao-rp2350", ["GPIO26", "GPIO27", "GPIO28", "GPIO5", "GPIO6", "GPIO7", "GPIO0"], ["GPIO1", "GPIO2", "GPIO4", "GPIO3"]],
    ["seeed-xiao-nrf54l15", ["P1.04", "P1.05", "P1.06", "P1.07", "P1.10", "P1.11", "P2.08"], ["P2.07", "P2.01", "P2.04", "P2.02"]],
    ["seeed-xiao-nrf54lm20a", ["P1.00", "P1.31", "P1.30", "P1.29", "P1.03", "P1.07", "P1.08"], ["P1.09", "P1.04", "P1.05", "P1.06"]],
    ["seeed-xiao-esp32c5", ["GPIO1", "GPIO0", "GPIO25", "GPIO7", "GPIO23", "GPIO24", "GPIO11"], ["GPIO12", "GPIO8", "GPIO9", "GPIO10"]],
    ["seeed-xiao-ra4m1", ["P014", "P000", "P001", "P002", "P206", "P100", "P302"], ["P301", "P111", "P110", "P109"]],
  ])("maps %s D0-D10 to the pins its sources name", (id, leftPorts, rightPorts) => {
    const { left, right } = rows(id);
    expect(left.map((pin) => pin.position)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(right.map((pin) => pin.position)).toEqual([14, 13, 12, 11, 10, 9, 8]);
    expect(ports(left)).toEqual(leftPorts);
    expect(right.slice(0, 3).map((pin) => pin.label)).toEqual(["5V / VBUS", "GND", "3V3"]);
    // Right column runs top to bottom, so pad 8 (D7) is last.
    expect(ports(right.slice(3)).reverse()).toEqual(rightPorts);
  });

  it("flags the XIAO MG24 I2C swap between Seeed and Zephyr", () => {
    const mg24 = board("seeed-xiao-mg24");
    expect(rows("seeed-xiao-mg24").left[4].label).toBe("D4 / SDA");
    expect(mg24.warnings.some((warning) => /Zephyr.*SCL to PC4/.test(warning))).toBe(true);
  });

  it("flags the XIAO ESP32-C5 strapping pins on D2 and D3", () => {
    const { left } = rows("seeed-xiao-esp32c5");
    expect(left[2].note).toMatch(/Strapping/);
    expect(left[3].note).toMatch(/Strapping/);
  });

  it("classifies logic levels the way the records state them", () => {
    expect(getBoardDiscoveryProfile(board("arduino-nano-r4")).logicProfile).toBe("5 V");
    expect(getBoardDiscoveryProfile(board("arduino-uno-q")).logicProfile).toBe("Mixed");
    expect(getBoardDiscoveryProfile(board("seeed-xiao-ra4m1")).logicProfile).toBe("3.3 V");
  });
});
