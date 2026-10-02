import { describe, expect, it } from "vitest";
import { boards, type Board } from "@/lib/boards";
import { planPins, type PlanAssignment, type PlanRequirements } from "@/lib/pin-planner";
import { planExports, planFilename, planNotice } from "@/lib/pin-plan-export";
import { revisionNotesFor } from "@/lib/board-utilities";
import { verificationSourceFor } from "@/lib/source-trust";
import type { ClaimedPin } from "@/lib/planner-claims";

const date = "2026-09-26";

function board(id: string): Board {
  const found = boards.find((item) => item.id === id);
  if (!found) throw new Error(`${id} missing`);
  return found;
}

function plan(target: Board, requirements: PlanRequirements): PlanAssignment[] {
  const result = planPins(target, requirements);
  if (result.status !== "ok") throw new Error(JSON.stringify(result));
  return result.assignments;
}

const pilots: [string, PlanRequirements, string[]][] = [
  ["raspberry-pi-pico", { I2C: 1, SPI: 1, UART: 1, PWM: 2, ADC: 1, GPIO: 2 }, ["c-header", "micropython", "json"]],
  ["esp32-devkitc", { I2C: 1, SPI: 1, UART: 1, PWM: 1, ADC: 1, DAC: 1, GPIO: 1 }, ["c-header", "micropython", "json"]],
  ["arduino-uno-rev3", { I2C: 1, SPI: 1, PWM: 2, ADC: 1, GPIO: 2 }, ["c-header", "arduino", "json"]],
  ["raspberry-pi-5", { I2C: 1, SPI: 1, UART: 1, PWM: 2, GPIO: 2 }, ["c-header", "json"]],
];

describe("pin plan exports", () => {
  for (const [id, requirements, formats] of pilots) {
    describe(id, () => {
      const target = board(id);
      const exports = planExports(target, plan(target, requirements), date);

      it("offers only the formats the board's pin naming supports", () => {
        expect(exports.map((item) => item.format)).toEqual([...formats, "csv"]);
      });

      it("opens every file with the board, connector, revisions, source, notice, and date", () => {
        const source = verificationSourceFor(target)!;
        // The CSV carries the board, source, and notice in its closing row.
        for (const item of exports.filter((entry) => entry.format !== "csv")) {
          const opening = item.text.slice(0, item.text.indexOf(date) + date.length);
          expect(opening, item.format).toContain(target.name);
          expect(opening, item.format).toContain(target.id);
          expect(opening, item.format).toContain(target.pinout!.connector);
          expect(opening, item.format).toContain(source.url);
          expect(opening, item.format).toContain(planNotice.replace(".", ""));
          for (const note of revisionNotesFor(target)) {
            expect(item.text, item.format).toContain(note);
          }
        }
      });

      it("uses safe filenames", () => {
        for (const item of exports) {
          expect(item.filename).toMatch(/^[a-z0-9-]+\.(h|py|json|csv)$/);
        }
      });

      for (const format of formats) {
        it(`matches the ${format} snapshot`, () => {
          expect(exports.find((item) => item.format === format)?.text).toMatchSnapshot();
        });
      }
    });
  }

  it("parses as JSON with every assignment", () => {
    const target = board("raspberry-pi-pico");
    const assignments = plan(target, { I2C: 2, GPIO: 1 });
    const json = JSON.parse(planExports(target, assignments, date).find((item) => item.format === "json")!.text);
    expect(json.notice).toBe(planNotice);
    expect(json.assignments).toHaveLength(assignments.length);
    expect(json.assignments[0]).toMatchObject({ peripheral: "I2C", instance: "I2C0", signal: "SDA", mcu: { gpio: 4 } });
  });

  it("keeps catalog text from breaking out of a comment", () => {
    const target = board("raspberry-pi-pico");
    const hostile: Board = { ...target, name: "Pico\n#include <evil.h>\r\n// " };
    const [header] = planExports(hostile, plan(target, { GPIO: 1 }), date);
    for (const line of header.text.split("\n")) {
      if (line.includes("evil")) expect(line.startsWith("//")).toBe(true);
    }
  });

  it("returns nothing for an empty plan, an unsupported board, or a bad date stamp", () => {
    expect(planExports(board("raspberry-pi-pico"), [], date)).toEqual([]);
    expect(planExports(board("raspberry-pi-4-model-b"), [], date)).toEqual([]);
    const target = board("raspberry-pi-pico");
    const [header] = planExports(target, plan(target, { GPIO: 1 }), "2026-09-26T00:00:00Z<");
    expect(header.text).not.toContain("<");
  });

  it("builds filenames from [a-z0-9-] only", () => {
    expect(planFilename({ id: "Raspberry Pi/5" }, "c-header")).toBe("pinhub-plan-aspberry-pi-5.h".replace("aspberry", "raspberry"));
    expect(planFilename({ id: "../../etc" }, "json")).toBe("pinhub-plan-etc.json");
  });
});

function pinByLabel(target: Board, label: string) {
  const pinout = target.pinout!;
  const all = pinout.pins
    ? [...pinout.pins.left, ...pinout.pins.right]
    : (pinout.groups ?? []).flatMap((group) => group.pins);
  const pin = all.find((item) => item.label === label);
  if (!pin) throw new Error(`${label} missing on ${target.id}`);
  return pin;
}

describe("exports with manual claims", () => {
  const pico = board("raspberry-pi-pico");
  const claims: ClaimedPin[] = [
    { name: "OLED SDA", pin: pinByLabel(pico, "GP2"), cautions: [] },
    { name: "+5V rail", pin: pinByLabel(pico, "VBUS"), cautions: [] },
    { name: "OLED SDA", pin: pinByLabel(pico, "GP3"), cautions: [] },
  ];

  it("leaves a plan with no claims byte-identical", () => {
    const assignments = plan(pico, { I2C: 1 });
    expect(planExports(pico, assignments, date, [])).toEqual(planExports(pico, assignments, date));
  });

  it("adds claims as constants where the pin has an MCU identity", () => {
    const exports = planExports(pico, plan(pico, { I2C: 1 }), date, claims);
    const header = exports.find((item) => item.format === "c-header")!.text;
    expect(header).toContain("#define PINHUB_USER_OLED_SDA 2");
    expect(header).toContain("#define PINHUB_USER_OLED_SDA_2 3");
    expect(header).toContain("// In use (no MCU pin): physical pin 40, VBUS: +5V rail");
    const python = exports.find((item) => item.format === "micropython")!.text;
    expect(python).toContain("user_oled_sda = Pin(2)");
  });

  it("carries a claimed pin's cautions into the files", () => {
    const esp = board("esp32-devkitc");
    const all = esp.pinout!.pins
      ? [...esp.pinout!.pins.left, ...esp.pinout!.pins.right]
      : (esp.pinout!.groups ?? []).flatMap((group) => group.pins);
    const flagged = all.find((pin) => pin.flags?.includes("strapping") && pin.mcu)!;
    const note = esp.pinFunctions!.flagNotes.strapping!;
    const exports = planExports(esp, [], date, [
      { name: "Button", pin: flagged, cautions: [{ label: "strapping", note }] },
    ]);
    for (const format of ["c-header", "json", "csv"] as const) {
      const text = exports.find((item) => item.format === format)!.text;
      expect(text, format).toContain(note.slice(0, 30).replace(/"/g, ""));
    }
  });

  it("offers code exports for claims alone on a board with pin functions", () => {
    const exports = planExports(pico, [], date, claims);
    expect(exports.map((item) => item.format)).toEqual(["c-header", "micropython", "json", "csv"]);
    expect(exports[0].text).not.toContain("avr/io.h");
  });

  it("writes a formula-safe CSV", () => {
    const text = planExports(pico, plan(pico, { I2C: 1 }), date, claims).find(
      (item) => item.format === "csv",
    )!.text;
    expect(text).toContain(`"Manual","'+5V rail"`);
    expect(text).toContain(`"Auto","I2C 1"`);
    expect(text).toContain(planNotice);
    for (const line of text.slice(1).split("\r\n")) {
      for (const cell of line.slice(1, -1).split('","')) expect(cell).not.toMatch(/^[=+\-@]/);
    }
  });

  it("gives a board without pin functions JSON and CSV only", () => {
    const pi4 = board("raspberry-pi-4-model-b");
    const exports = planExports(pi4, [], date, [
      { name: "LED", pin: pinByLabel(pi4, "GPIO2"), cautions: [] },
    ]);
    expect(exports.map((item) => item.format)).toEqual(["json", "csv"]);
    expect(JSON.parse(exports[0].text).claims[0].name).toBe("LED");
    expect(exports[1].filename).toBe("pinhub-plan-raspberry-pi-4-model-b.csv");
    expect(planExports(pi4, [], date, [])).toEqual([]);
  });
});
