import { describe, expect, it } from "vitest";
import { boards, type Board } from "@/lib/boards";
import { planPins, type PlanAssignment, type PlanRequirements } from "@/lib/pin-planner";
import { planExports, planFilename, planNotice } from "@/lib/pin-plan-export";
import { revisionNotesFor } from "@/lib/board-utilities";
import { verificationSourceFor } from "@/lib/source-trust";

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
        expect(exports.map((item) => item.format)).toEqual(formats);
      });

      it("opens every file with the board, connector, revisions, source, notice, and date", () => {
        const source = verificationSourceFor(target)!;
        for (const item of exports) {
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
          expect(item.filename).toMatch(/^[a-z0-9-]+\.(h|py|json)$/);
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
