// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { boards } from "@/lib/boards";
import { buildBoardGeometry } from "@/lib/board-visual-geometry";
import { isReferenceGpio, pinCautionTexts, referenceFunctions } from "@/lib/pin-reference";
import { PrintPinReference } from "@/components/board-visual/PrintPinReference";
import { PinDetails } from "@/components/board-visual/PinDetails";
import { PinoutDiagram } from "@/components/PinoutDiagram";
import { PinoutFullView } from "@/components/board-visual/PinoutFullView";
import { filterPinAnchors } from "@/components/board-visual/PinoutTable";
import { pinAccessibleLabel } from "@/components/board-visual/roles";
import { pinoutToMarkdown, pinoutToCsv } from "@/components/CopyPinTable";
import { pinToText } from "@/components/CopyPinButton";

const navigation = vi.hoisted(() => ({ search: "" }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(navigation.search) }));
vi.mock("@/components/CircuitBackground", () => ({ CircuitBackground: () => null }));
vi.mock("@/components/SiteHeader", () => ({ SiteHeader: () => null }));
beforeAll(() => vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} }));
afterEach(() => { cleanup(); navigation.search = ""; });
const board = (id: string) => boards.find((item) => item.id === id)!;

describe("recorded reference safety", () => {
  it("identifies a linked pin near the page heading with its recorded restrictions", () => {
    const esp = board("esp32-devkit-v1");
    const anchor = buildBoardGeometry(esp)!.anchors.find(({ pin }) => pin.label === "D12")!;
    navigation.search = `pin=${encodeURIComponent(anchor.key)}`;
    render(<PinoutFullView board={esp} />);
    const summary = screen.getByRole("region", { name: "Selected pin" });
    expect(within(summary).getByRole("heading").textContent).toContain(`D12 · Physical pin ${anchor.pin.position}`);
    expect(summary.textContent).toContain("Boot strap: must be low at reset");
    expect(within(summary).getByRole("button", { name: "Show selected pin on diagram" })).toBeTruthy();
  });

  it("does not fabricate a selected-pin summary for an invalid URL key", () => {
    navigation.search = "pin=not-a-pin";
    render(<PinoutFullView board={board("esp32-devkit-v1")} />);
    expect(screen.queryByRole("region", { name: "Selected pin" })).toBeNull();
  });
  it("keeps ESP32 reset restrictions visible in the static map", () => {
    const esp = board("esp32-devkit-v1");
    render(<PinoutDiagram pinout={esp.pinout} board={esp} />);
    expect(screen.getByText("Boot strap: must be low at reset")).toBeTruthy();
    expect(screen.getByText("Boot strap: keep high at reset")).toBeTruthy();
  });

  it("shows the Nano GPIO3 strapping warning and names its flag to assistive technology", () => {
    const nano = board("arduino-nano-esp32");
    const anchor = buildBoardGeometry(nano)!.anchors.find(({ pin }) => pin.aliases?.includes("GPIO3"))!;
    render(<PinDetails anchor={anchor} pinned net={null} netSize={1} flagNotes={nano.pinFunctions?.flagNotes} />);
    const cautions = screen.getByRole("list", { name: `Cautions for ${anchor.pin.label}` });
    expect(cautions.textContent).toContain(nano.pinFunctions!.flagNotes.strapping);
    expect(pinAccessibleLabel(anchor.pin)).toContain("strapping");
  });

  it("renders every board caution and logic level on direct standalone arrival", () => {
    const esp = board("esp32-devkit-v1");
    render(<PinoutFullView board={esp} />);
    const cautions = screen.getByRole("region", { name: "Before you wire" });
    for (const warning of esp.warnings) expect(within(cautions).getByText(warning)).toBeTruthy();
    expect(screen.getByText(`Logic: ${esp.logicLevel}`)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Official board documentation" }).getAttribute("href")).toMatch(/^https:/);
  });

  it("does not invent a flag explanation or duplicate a recorded note", () => {
    const pin = { position: 1, label: "GPIO1", role: "gpio" as const, note: "Verify reset pulls.", flags: ["strapping" as const] };
    expect(pinCautionTexts(pin, { strapping: pin.note })).toEqual([pin.note]);
    expect(pinCautionTexts(pin)[1]).toContain("Recorded flag: strapping");
  });
  it("preserves board and structured pin cautions in text and table exports", () => {
    const nano = board("arduino-nano-esp32");
    const pin = buildBoardGeometry(nano)!.anchors.find(({ pin }) => pin.aliases?.includes("GPIO3"))!.pin;
    const note = nano.pinFunctions!.flagNotes.strapping!;
    expect(pinToText(pin, nano.pinFunctions?.flagNotes)).toContain(note);
    for (const text of [pinoutToMarkdown(nano.pinout!, nano), pinoutToCsv(nano.pinout!, nano)]) {
      expect(text).toContain(note.replaceAll('"', '""'));
      expect(text).toContain(nano.logicLevel);
    }
  });
});

describe("source-backed capability filters", () => {
  it("includes the recorded Teensy secondary I2C/UART pads", () => {
    const teensy = board("teensy-32");
    const i2c = filterPinAnchors(buildBoardGeometry(teensy)!.anchors, { categories: ["i2c"], functionData: teensy.pinFunctions });
    expect(i2c.map(({ pin }) => pin.position).sort((a, b) => a - b)).toEqual([19, 20, 32, 33]);
    const lc = board("teensy-lc");
    const uart = filterPinAnchors(buildBoardGeometry(lc)!.anchors, { categories: ["uart"], functionData: lc.pinFunctions });
    expect(uart).toHaveLength(8);
    expect(uart.map(({ pin }) => pin.position)).toEqual(expect.arrayContaining([5, 6]));
    const lolin = board("lolin-d1-mini");
    expect(filterPinAnchors(buildBoardGeometry(lolin)!.anchors, { categories: ["uart"], functionData: lolin.pinFunctions }).some(({ pin }) => pin.position === 12)).toBe(true);
  });
  it("recognizes Tritium's explicitly recorded TWI aliases as I2C", () => {
    const tritium = board("libre-computer-tritium-h5");
    const matches = filterPinAnchors(buildBoardGeometry(tritium)!.anchors, { categories: ["i2c"], functionData: tritium.pinFunctions });
    for (const position of [27, 28]) {
      const pin = matches.find(({ pin }) => pin.position === position)?.pin;
      expect(pin, `TWI pin ${position}`).toBeTruthy();
      expect(pin!.aliases?.some((alias) => alias.startsWith("TWI1_"))).toBe(true);
    }
  });
  it("recognizes source-recorded numeric, banked and alphabetic-bank GPIO namespaces", () => {
    const orange = board("orange-pi-5");
    const pins = buildBoardGeometry(orange)!.anchors;
    expect(filterPinAnchors(pins, { categories: ["gpio"] })).toHaveLength(17);
    for (const label of ["GPIO1_B7", "GPIO0_23", "GPIOA.14", "GPIOAO_8"]) {
      expect(isReferenceGpio({ position: 1, label, role: "i2c" }), label).toBe(true);
      expect(isReferenceGpio({ position: 1, label: "P8_13", aliases: [label], role: "pwm" }), label).toBe(true);
      expect(isReferenceGpio({ position: 1, label, role: "adc", note: "Analog input only." }), label).toBe(false);
    }
  });

  it("retains the nine Orange Pi PWM aliases without planner metadata", () => {
    const item = board("orange-pi-5");
    expect(item.pinFunctions).toBeUndefined();
    const matches = filterPinAnchors(buildBoardGeometry(item)!.anchors, { categories: ["pwm"] });
    expect(matches.map(({ pin }) => pin.position).sort((a, b) => a - b)).toEqual([3, 7, 11, 15, 16, 18, 23, 24, 26]);
  });
  it("excludes analog-only pads while retaining digital input-only and alternate digital pins", () => {
    for (const [id, labels] of [
      ["arduino-nano", ["A6", "A7"]], ["arduino-pro-mini", ["A6", "A7"]],
      ["lolin-d1-mini", ["A0"]], ["nodemcu-devkit-v1", ["A0"]],
      ["digilent-cmod-a7-35t", ["IO15 / VAUX4", "IO16 / VAUX12"]],
    ] as const) {
      const item = board(id);
      const anchors = buildBoardGeometry(item)!.anchors;
      const analogOnly = anchors.filter(({ pin }) => labels.some((label) => label === pin.label));
      expect(analogOnly.length, id).toBe(labels.length);
      for (const { pin } of analogOnly) expect(isReferenceGpio(pin), `${id} ${pin.label}`).toBe(false);
      const digital = filterPinAnchors(anchors, { categories: ["gpio"] });
      for (const pin of analogOnly) expect(digital).not.toContain(pin);
    }
    const esp = buildBoardGeometry(board("esp32-devkit-v1"))!.anchors;
    for (const { pin } of esp.filter(({ pin }) => pin.flags?.includes("input-only"))) expect(isReferenceGpio(pin)).toBe(true);
    expect(filterPinAnchors(buildBoardGeometry(board("arduino-uno-rev3"))!.anchors, { categories: ["gpio"] })).toHaveLength(20);
    expect(isReferenceGpio({ position: 1, label: "40", role: "adc", mcu: { name: "PIN40" } })).toBe(true);
    expect(isReferenceGpio({ position: 1, label: "IO3", role: "pwm" })).toBe(true);
  });
  it("finds every recorded Pico PWM pin and UNO alternate PWM pin", () => {
    for (const [id, count] of [["raspberry-pi-pico", 26], ["arduino-uno-rev3", 6]] as const) {
      const item = board(id);
      const anchors = buildBoardGeometry(item)!.anchors;
      expect(filterPinAnchors(anchors, { categories: ["pwm"], functionData: item.pinFunctions })).toHaveLength(count);
      expect(filterPinAnchors(anchors, { query: "PWM", functionData: item.pinFunctions })).toHaveLength(count);
    }
  });

  it("includes GPIO aliases and structured strap flags without requiring primary-role text", () => {
    const nano = board("arduino-nano-esp32");
    const anchors = buildBoardGeometry(nano)!.anchors;
    const strap = anchors.find(({ pin }) => pin.aliases?.includes("GPIO3"))!;
    expect(filterPinAnchors(anchors, { categories: ["boot"] })).toContain(strap);
    expect(filterPinAnchors(anchors, { categories: ["gpio"] })).toContain(strap);
  });

  it("honors input-only restrictions when discovering matrix output functions", () => {
    const esp = board("esp32-devkit-v1");
    const pins = buildBoardGeometry(esp)!.anchors;
    const input = pins.find(({ pin }) => pin.flags?.includes("input-only"))!.pin;
    expect(referenceFunctions(input, esp.pinFunctions).some((fn) => fn.peripheral === "PWM")).toBe(false);
    expect(referenceFunctions(input, esp.pinFunctions).some((fn) => fn.signal === "RX")).toBe(true);
    expect(filterPinAnchors(pins, { categories: ["pwm"], functionData: esp.pinFunctions }).length).toBeGreaterThan(15);
  });
});

it("keeps connector orientation and every recorded note in complete paper references", () => {
  for (const id of ["esp32-devkit-v1", "arduino-nano", "digilent-cmod-a7-35t", "milkv-duo-s-v12"]) {
    const item = board(id);
    const { container, unmount } = render(<PrintPinReference board={item} />);
    for (const note of item.pinout!.notes) expect(container.textContent).toContain(note);
    const expected = buildBoardGeometry(item)!.anchors.length;
    expect(container.querySelectorAll("tbody tr")).toHaveLength(expected);
    unmount();
  }
});
