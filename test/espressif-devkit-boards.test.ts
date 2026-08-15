import { describe, expect, it } from "vitest";
import { boards, type Board, type Pin } from "@/lib/boards";
import { boardVisuals } from "@/lib/board-visuals";
import { validateBoardVisuals } from "@/lib/board-visual-validation";

// Spot checks for the two Espressif dev kits added from Espressif's official
// "Header Block" tables. Each expectation below is a row of that table, kept
// here so a future edit to boards.ts cannot quietly move a pin: the header
// order is the whole reason these two boards are separate catalog entries from
// their MINI-module siblings.
//
// ESP32-C3-DevKitC-02 user guide:
//   docs.espressif.com/projects/esp-idf/en/v5.2/esp32c3/hw-reference/esp32c3/
//   user-guide-devkitc-02.html
// ESP32-S2-DevKitM-1 user guide:
//   docs.espressif.com/projects/esp-idf/en/v5.3/esp32s2/hw-reference/esp32s2/
//   user-guide-devkitm-1-v1.html

function board(id: string): Board {
  const found = boards.find((candidate) => candidate.id === id);
  expect(found, `board ${id} is missing`).toBeDefined();
  return found!;
}

function rows(id: string): { left: Pin[]; right: Pin[] } {
  const pinout = board(id).pinout;
  expect(pinout?.layout, `${id} layout`).toBe("dual-row");
  expect(pinout?.pins, `${id} pins`).toBeDefined();
  return pinout!.pins!;
}

function at(pins: Pin[], position: number): Pin {
  const pin = pins.find((candidate) => candidate.position === position);
  expect(pin, `no pin at position ${position}`).toBeDefined();
  return pin!;
}

describe("ESP32-C3-DevKitC-02", () => {
  const id = "esp32-c3-devkitc-02";

  it("carries 15 pins per header, matching J1 and J3", () => {
    const { left, right } = rows(id);
    expect(left).toHaveLength(15);
    expect(right).toHaveLength(15);
    expect(left.map((pin) => pin.position)).toEqual(
      Array.from({ length: 15 }, (_, i) => i + 1),
    );
    expect(right.map((pin) => pin.position)).toEqual(
      Array.from({ length: 15 }, (_, i) => i + 16),
    );
  });

  it("matches the official J1 table row for row", () => {
    const { left } = rows(id);
    // J1 no. -> printed name, from the user guide's Header Block table.
    expect(left.map((pin) => pin.label)).toEqual([
      "GND",
      "3V3",
      "3V3",
      "RST",
      "GND",
      "GPIO4",
      "GPIO5",
      "GPIO6",
      "GPIO7",
      "GND",
      "GPIO8",
      "GPIO9",
      "5V",
      "5V",
      "GND",
    ]);
  });

  it("matches the official J3 table row for row", () => {
    const { right } = rows(id);
    expect(right.map((pin) => pin.label)).toEqual([
      "GND",
      "GPIO0",
      "GPIO1",
      "GPIO2",
      "GPIO3",
      "GND",
      "GPIO10",
      "GND",
      "RX / GPIO20",
      "TX / GPIO21",
      "GND",
      "GPIO18",
      "GPIO19",
      "GND",
      "GND",
    ]);
  });

  it("does not repeat the DevKitM-1 header order", () => {
    // The two boards use the same signals in a different physical order. J1
    // pin 4 is the clearest divergence and the one most likely to damage
    // something if a harness is moved between the boards.
    expect(at(rows(id).left, 4).label).toBe("RST");
    expect(at(rows("esp32-c3-devkitm-1").left, 4).label).toBe("IO2");
  });

  it("flags every documented strapping pin", () => {
    const { left, right } = rows(id);
    for (const pin of [at(left, 11), at(left, 12), at(right, 19)]) {
      expect(pin.role, `${pin.label} role`).toBe("system");
      expect(pin.aliases, `${pin.label} aliases`).toContain("Strapping");
    }
    expect(at(left, 11).label).toBe("GPIO8");
    expect(at(left, 12).label).toBe("GPIO9");
    expect(at(right, 19).label).toBe("GPIO2");
  });

  it("warns about the strapping pins, the RGB LED, and USB-JTAG", () => {
    const warnings = board(id).warnings.join(" ");
    expect(warnings).toMatch(/GPIO2, GPIO8, and GPIO9 are strapping pins/);
    expect(warnings).toMatch(/RGB LED/);
    expect(warnings).toMatch(/USB-JTAG/);
  });

  it("claims no 802.15.4 radio, which the ESP32-C3 does not have", () => {
    expect(board(id).interfaces).not.toContain("Zigbee");
    expect(board(id).interfaces).not.toContain("Thread");
  });
});

describe("ESP32-S2-DevKitM-1", () => {
  const id = "esp32-s2-devkitm-1";

  it("carries 21 pins per header, matching J1 and J3", () => {
    const { left, right } = rows(id);
    expect(left).toHaveLength(21);
    expect(right).toHaveLength(21);
    expect(left.map((pin) => pin.position)).toEqual(
      Array.from({ length: 21 }, (_, i) => i + 1),
    );
    expect(right.map((pin) => pin.position)).toEqual(
      Array.from({ length: 21 }, (_, i) => i + 22),
    );
  });

  it("matches the official J1 table row for row", () => {
    const { left } = rows(id);
    expect(left.map((pin) => pin.label)).toEqual([
      "3V3",
      ...Array.from({ length: 18 }, (_, i) => `GPIO${i}`),
      "5V",
      "GND",
    ]);
  });

  it("matches the official J3 table row for row", () => {
    const { right } = rows(id);
    expect(right.map((pin) => pin.label)).toEqual([
      "GND",
      "RST",
      "GPIO46",
      "GPIO45",
      "RX / GPIO44",
      "TX / GPIO43",
      "GPIO42",
      "GPIO41",
      "GPIO40",
      "GPIO39",
      "GPIO38",
      "GPIO37",
      "GPIO36",
      "GPIO35",
      "GPIO34",
      "GPIO33",
      "GPIO26",
      "GPIO21",
      "GPIO20",
      "GPIO19",
      "GPIO18",
    ]);
  });

  it("maps the JTAG pins to the documented GPIOs", () => {
    // ESP-IDF: MTCK/GPIO39, MTDO/GPIO40, MTDI/GPIO41, MTMS/GPIO42.
    const { right } = rows(id);
    const jtag = new Map(
      right
        .filter((pin) => pin.role === "debug")
        .map((pin) => [pin.label, pin.aliases?.[0]]),
    );
    expect(jtag.get("GPIO39")).toBe("MTCK");
    expect(jtag.get("GPIO40")).toBe("MTDO");
    expect(jtag.get("GPIO41")).toBe("MTDI");
    expect(jtag.get("GPIO42")).toBe("MTMS");
  });

  it("marks GPIO26 reserved because it falls in the flash/PSRAM range", () => {
    const pin = at(rows(id).right, 38);
    expect(pin.label).toBe("GPIO26");
    expect(pin.role).toBe("reserved");
    expect(pin.note).toMatch(/PSRAM/);
    expect(board(id).warnings.join(" ")).toMatch(/GPIO26/);
  });

  it("records that GPIO46 is input only", () => {
    const pin = at(rows(id).right, 24);
    expect(pin.label).toBe("GPIO46");
    expect(pin.note).toMatch(/[Ii]nput only/);
    expect(board(id).warnings.join(" ")).toMatch(/input only/);
  });

  it("exposes both DAC outputs on the documented pins", () => {
    const { left, right } = rows(id);
    expect(at(left, 19).aliases).toContain("DAC_1");
    expect(at(right, 42).aliases).toContain("DAC_2");
  });

  it("does not claim Bluetooth, which the ESP32-S2 does not have", () => {
    expect(board(id).interfaces).not.toContain("Bluetooth");
  });
});

describe("catalog additions", () => {
  const added = ["esp32-c3-devkitc-02", "esp32-s2-devkitm-1"];

  it("gives each new board artwork and an official source", () => {
    for (const id of added) {
      expect(boardVisuals[id], `${id} needs a visual`).toBeDefined();
      const official = board(id).sourceLinks.filter((source) =>
        source.url.startsWith("https://docs.espressif.com/") ||
        source.url.startsWith("https://www.espressif.com/") ||
        source.url.startsWith("https://dl.espressif.com/"),
      );
      expect(official.length, `${id} official sources`).toBeGreaterThan(0);
      expect(
        board(id).sourceLinks.some((source) => source.type === "Schematic"),
      ).toBe(true);
    }
  });

  it("keeps the whole visual layer valid, long labels included", () => {
    // The new rows carry the longest labels in the ESP32 family
    // ("RX / GPIO44"), so this also covers label layout for them.
    expect(validateBoardVisuals().errors).toEqual([]);
  });
});
