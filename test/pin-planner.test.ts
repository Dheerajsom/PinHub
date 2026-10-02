import { describe, expect, it } from "vitest";
import { boards, type Board, type Pin } from "@/lib/boards";
import {
  normalizePlanRequirements,
  planCapabilities,
  planPins,
  type PlanAssignment,
  type PlanRequirements,
  type PlanResult,
} from "@/lib/pin-planner";

function board(id: string): Board {
  const found = boards.find((item) => item.id === id);
  if (!found) throw new Error(`${id} missing`);
  return found;
}

function ok(result: PlanResult): PlanAssignment[] {
  if (result.status !== "ok") throw new Error(`expected a plan, got ${JSON.stringify(result)}`);
  return result.assignments;
}

const where = (assignments: PlanAssignment[], peripheral: string) =>
  assignments.filter((item) => item.peripheral === peripheral);
const labels = (assignments: PlanAssignment[]) => assignments.map((item) => item.pin.label);
const outputSignals = new Set(["SDA", "SCL", "SCK", "MOSI", "TX", "IO", "A", "B"]);
const isOutput = (item: PlanAssignment) =>
  item.peripheral === "PWM" ||
  item.peripheral === "DAC" ||
  outputSignals.has(item.signal) ||
  /^CS\d*$/.test(item.signal);

/** Invariants every plan must hold, whatever the board. */
function expectSoundPlan(target: Board, assignments: PlanAssignment[]) {
  const pins = assignments.map((item) => item.pin);
  expect(new Set(pins).size, "a pin used twice").toBe(pins.length);
  for (const item of assignments) {
    expect(["power", "ground", "reserved"]).not.toContain(item.pin.role);
    expect(item.pin.mcu, item.pin.label).toBeDefined();
    if (item.pin.role === "system") expect(item.pin.flags?.length).toBeGreaterThan(0);
    if (isOutput(item)) expect(item.pin.flags ?? []).not.toContain("input-only");
    if (!item.routed && item.peripheral !== "GPIO") {
      // A fixed assignment must be a function the data lists for that pin.
      expect(
        item.pin.functions?.some(
          (fn) =>
            fn.peripheral === item.peripheral &&
            fn.instance === item.instance &&
            fn.signal === item.signal,
        ),
        `${item.pin.label} ${item.instance} ${item.signal}`,
      ).toBe(true);
    }
    if (item.routed) expect(target.pinFunctions?.mux.model).toBe("matrix");
  }
  // Buses of one kind use distinct instances, each with a full signal set.
  for (const peripheral of ["I2C", "SPI", "UART"]) {
    const units = new Map<number, PlanAssignment[]>();
    for (const item of where(assignments, peripheral)) {
      units.set(item.unit, [...(units.get(item.unit) ?? []), item]);
    }
    const instances = [...units.values()].map((unit) => unit[0].instance);
    expect(new Set(instances).size).toBe(instances.length);
    for (const unit of units.values()) {
      expect(new Set(unit.map((item) => item.instance)).size).toBe(1);
      const signals = unit.map((item) => item.signal.replace(/^CS\d+$/, "CS"));
      const expected = { I2C: ["SDA", "SCL"], SPI: ["SCK", "MOSI", "MISO", "CS"], UART: ["TX", "RX"] }[
        peripheral
      ]!;
      expect(signals).toEqual(expected);
    }
  }
  // PWM, ADC, and DAC channels are never shared between two assignments.
  for (const peripheral of ["PWM", "ADC", "DAC"]) {
    const channels = where(assignments, peripheral).map((item) => `${item.instance}:${item.signal}`);
    expect(new Set(channels).size).toBe(channels.length);
  }
}

const example: PlanRequirements = { I2C: 2, SPI: 1, PWM: 3, ADC: 2, GPIO: 4 };

describe("planPins on the pilot boards", () => {
  it("Raspberry Pi Pico: uses the pico-sdk defaults and fixed ADC pins", () => {
    const target = board("raspberry-pi-pico");
    const result = planPins(target, example);
    const assignments = ok(result);
    expectSoundPlan(target, assignments);
    expect(result.status === "ok" && result.usedFlaggedPins).toBe(false);
    const i2c = where(assignments, "I2C");
    expect(i2c.slice(0, 2).map((item) => [item.instance, item.signal, item.pin.label])).toEqual([
      ["I2C0", "SDA", "GP4"],
      ["I2C0", "SCL", "GP5"],
    ]);
    expect(i2c.slice(0, 2).every((item) => item.isDefault)).toBe(true);
    // The second bus keeps its pins next to each other.
    expect(labels(i2c.slice(2))).toEqual(["GP2", "GP3"]);
    expect(labels(where(assignments, "SPI"))).toEqual(["GP18", "GP19", "GP16", "GP17"]);
    expect(labels(where(assignments, "ADC"))).toEqual(["GP26", "GP27"]);
    expect(where(assignments, "GPIO")).toHaveLength(4);
  });

  it("ESP32-DevKitC: routes buses through the matrix and keeps ADC on fixed pins", () => {
    const target = board("esp32-devkitc");
    const result = planPins(target, { I2C: 2, SPI: 1, UART: 1, ADC: 2, DAC: 1, PWM: 2 });
    const assignments = ok(result);
    expectSoundPlan(target, assignments);
    expect(result.status === "ok" && result.muxModel).toBe("matrix");
    expect(result.status === "ok" && result.muxNote).toMatch(/GPIO matrix/);
    for (const item of [...where(assignments, "ADC"), ...where(assignments, "DAC")]) {
      expect(item.routed).toBe(false);
    }
    expect(where(assignments, "DAC")[0].pin.label).toMatch(/^IO2[56]$/);
    expect(assignments.some((item) => item.routed)).toBe(true);
    // I2C0 keeps its arduino-esp32 default pins.
    expect(labels(where(assignments, "I2C").slice(0, 2))).toEqual(["IO21", "IO22"]);
  });

  it("Arduino UNO Rev3: fixed Wire, SPI, and PWM pins", () => {
    const target = board("arduino-uno-rev3");
    const assignments = ok(planPins(target, { I2C: 1, SPI: 1, PWM: 3, ADC: 2, GPIO: 4 }));
    expectSoundPlan(target, assignments);
    expect(labels(where(assignments, "I2C"))).toEqual(["A4 / SDA", "A5 / SCL"]);
    expect(labels(where(assignments, "SPI"))).toEqual(["D13 / SCK", "D11 / COPI", "D12 / CIPO", "D10 / CS"]);
    expect(labels(where(assignments, "PWM"))).toEqual(["D3", "D5", "D6"]);
    // A0/A1, not A4/A5, which the I2C bus already holds.
    expect(labels(where(assignments, "ADC"))).toEqual(["A0", "A1"]);
  });

  it("Raspberry Pi 5: the documented I2C, SPI, serial, and hardware PWM pins", () => {
    const target = board("raspberry-pi-5");
    const assignments = ok(planPins(target, { I2C: 1, SPI: 2, UART: 1, PWM: 2, GPIO: 3 }));
    expectSoundPlan(target, assignments);
    expect(labels(where(assignments, "I2C"))).toEqual(["GPIO2", "GPIO3"]);
    expect(labels(where(assignments, "UART"))).toEqual(["GPIO14", "GPIO15"]);
    const spi = where(assignments, "SPI");
    expect(new Set(spi.map((item) => item.instance))).toEqual(new Set(["SPI0", "SPI1"]));
    for (const item of where(assignments, "PWM")) {
      expect([12, 13, 18, 19]).toContain(item.pin.mcu?.gpio);
    }
  });
});

describe("unsatisfiable requirements name the binding constraint", () => {
  it("counts instances", () => {
    expect(planPins(board("raspberry-pi-5"), { I2C: 2 })).toEqual({
      status: "unsatisfiable",
      reason: "Only one I2C instance is routable on this board.",
      steps: 0,
    });
    expect(planPins(board("arduino-uno-rev3"), { UART: 2 })).toMatchObject({
      reason: "Only one UART instance is routable on this board.",
    });
  });

  it("counts channels", () => {
    expect(planPins(board("raspberry-pi-pico"), { ADC: 4 })).toMatchObject({
      status: "unsatisfiable",
      reason: "Only three ADC channels are available on this board.",
    });
    expect(planPins(board("raspberry-pi-5"), { PWM: 5 })).toMatchObject({
      reason: "Only four PWM channels are available on this board.",
    });
  });

  it("names the requirement that collides with earlier ones", () => {
    // D10 and D11 are both PWM outputs and SPI pins on the UNO.
    expect(planPins(board("arduino-uno-rev3"), { SPI: 1, PWM: 6 })).toMatchObject({
      status: "unsatisfiable",
      reason: "6× PWM doesn't fit alongside 1× SPI: they need the same pins.",
    });
  });

  it("counts pins when every unit fits on its own", () => {
    expect(
      planPins(board("arduino-uno-rev3"), { I2C: 1, SPI: 1, UART: 1, ADC: 4, PWM: 2, GPIO: 8 }),
    ).toMatchObject({ status: "unsatisfiable", reason: expect.stringMatching(/needs \d+ pins|doesn't fit/) });
  });
});

describe("risky pins", () => {
  it("avoids strapping and other flagged pins when enough plain pins exist", () => {
    const result = planPins(board("esp32-devkitc"), { GPIO: 6, I2C: 1 });
    const assignments = ok(result);
    expect(result.status === "ok" && result.usedFlaggedPins).toBe(false);
    for (const item of assignments) {
      expect(item.cautions, item.pin.label).toEqual([]);
      expect(item.pin.flags ?? []).not.toContain("strapping");
    }
  });

  it("uses a flagged pin only when nothing else fits, and quotes why", () => {
    const target = board("arduino-uno-rev3");
    const result = planPins(target, { SPI: 1 });
    const sck = ok(result).find((item) => item.signal === "SCK")!;
    expect(result.status === "ok" && result.usedFlaggedPins).toBe(true);
    expect(sck.cautions).toEqual([
      { flag: "onboard-led", note: target.pinFunctions!.flagNotes["onboard-led"] },
    ]);
  });

  it("spends the least consequential flagged pins first", () => {
    // Fourteen output signals exceed the DevKitC's eleven unflagged output pins.
    const assignments = ok(planPins(board("esp32-devkitc"), example));
    const flagged = assignments.filter((item) => item.cautions.length);
    expect(flagged.map((item) => item.cautions.map((caution) => caution.flag))).toEqual([
      ["input-only"],
      ["input-only"],
      ["jtag"],
      ["jtag"],
      ["strapping"],
      ["strapping"],
    ]);
    for (const item of assignments) {
      expect(item.pin.flags ?? []).not.toContain("usb");
      expect(item.pin.flags ?? []).not.toContain("boot");
    }
  });

  it("warns about ADC2 and Wi-Fi only when the pin is used as an ADC", () => {
    const adc = ok(planPins(board("esp32-devkitc"), { ADC: 8 }));
    const adc2 = adc.filter((item) => item.instance === "ADC2");
    expect(adc2.length).toBeGreaterThan(0);
    for (const item of adc2) {
      expect(item.cautions.map((caution) => caution.flag)).toContain("adc-unavailable-with-wifi");
    }
    const dac = ok(planPins(board("esp32-devkitc"), { DAC: 2 }));
    for (const item of dac) {
      expect(item.cautions.map((caution) => caution.flag)).not.toContain("adc-unavailable-with-wifi");
    }
  });

  it("never gives an input-only pin an output, even when asked for many", () => {
    const target = board("esp32-devkitc");
    for (const requirements of [
      { GPIO: 8, PWM: 8 },
      { GPIO: 8, SPI: 2, I2C: 2, UART: 2 },
      { UART: 3, ADC: 4 },
    ] satisfies PlanRequirements[]) {
      const result = planPins(target, requirements);
      if (result.status === "ok") expectSoundPlan(target, result.assignments);
    }
    const inputs = ok(planPins(target, { UART: 2, SPI: 2, GPIO: 8, I2C: 2 })).filter(
      (item) => item.pin.flags?.includes("input-only"),
    );
    expect(inputs.length).toBeGreaterThan(0);
    for (const item of inputs) expect(["MISO", "RX"]).toContain(item.signal);
  });
});

describe("determinism, bounds, and support", () => {
  it("returns the same plan for the same input, regardless of key order", () => {
    const target = board("esp32-devkitc");
    const first = planPins(target, example);
    expect(planPins(target, example)).toEqual(first);
    expect(planPins(target, { GPIO: 4, ADC: 2, PWM: 3, SPI: 1, I2C: 2 })).toEqual(first);
  });

  it("stops at the step budget instead of guessing", () => {
    expect(planPins(board("esp32-devkitc"), example, 5)).toEqual({
      status: "unsatisfiable",
      reason:
        "PinHub stopped after checking 5 combinations without finding a plan. Remove a requirement and try again.",
      steps: 5,
    });
  });

  it("clamps counts to 0 through 8 and drops unknown keys", () => {
    expect(
      normalizePlanRequirements({
        GPIO: 99,
        I2C: -2,
        SPI: 1.8,
        PWM: Number.NaN,
        USB: 3,
      } as PlanRequirements),
    ).toEqual({ SPI: 1, GPIO: 8 });
    expect(normalizePlanRequirements({ I2C: 8, SPI: 8, GPIO: 8 }, 10)).toEqual({ I2C: 8, SPI: 2 });
  });

  it("reports an empty request and unsupported boards without guessing", () => {
    expect(planPins(board("raspberry-pi-pico"), {})).toEqual({ status: "empty" });
    expect(planPins(board("raspberry-pi-4-model-b"), { I2C: 1 })).toEqual({ status: "unsupported" });
    expect(planPins(board("raspberry-pi-pico-w"), { I2C: 1 })).toEqual({ status: "unsupported" });
    expect(planCapabilities(board("raspberry-pi-4-model-b"))).toEqual([]);
  });

  it("offers only the peripherals each pilot board can supply", () => {
    expect(planCapabilities(board("raspberry-pi-5"))).toEqual([
      { peripheral: "I2C", max: 1 },
      { peripheral: "SPI", max: 2 },
      { peripheral: "UART", max: 1 },
      { peripheral: "PWM", max: 4 },
      { peripheral: "GPIO", max: 8 },
    ]);
    expect(planCapabilities(board("arduino-uno-rev3")).map((item) => item.peripheral)).toEqual([
      "I2C", "SPI", "UART", "PWM", "ADC", "GPIO",
    ]);
  });
});

function allPins(target: Board): Pin[] {
  const pinout = target.pinout!;
  return pinout.pins
    ? [...pinout.pins.left, ...pinout.pins.right]
    : (pinout.groups ?? []).flatMap((group) => group.pins);
}

describe("excluded pins", () => {
  const pico = board("raspberry-pi-pico");

  it("never assigns a pin the user already claimed", () => {
    const taken = new Set(ok(planPins(pico, { I2C: 1 })).map((item) => item.pin));
    const second = ok(planPins(pico, { I2C: 1 }, undefined, taken));
    expect(second).toHaveLength(2);
    for (const item of second) expect(taken.has(item.pin)).toBe(false);
  });

  it("shrinks what the board can supply", () => {
    const adcPins = new Set(
      allPins(pico).filter((pin) => pin.functions?.some((item) => item.peripheral === "ADC")),
    );
    expect(planCapabilities(pico).some((item) => item.peripheral === "ADC")).toBe(true);
    expect(planCapabilities(pico, adcPins).some((item) => item.peripheral === "ADC")).toBe(false);
    expect(planCapabilities(pico, new Set(allPins(pico)))).toEqual([]);
  });

  it("gives the same plan with no exclusion as before", () => {
    expect(planPins(pico, { SPI: 1, PWM: 2 }, undefined, new Set())).toEqual(
      planPins(pico, { SPI: 1, PWM: 2 }),
    );
  });
});
