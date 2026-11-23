import { describe, expect, it } from "vitest";
import { boards, type Board } from "@/lib/boards";
import { buildBoardLink, linkBuses } from "@/lib/board-link";
import { linkChecklist } from "@/lib/link-checklist";

function board(id: string): Board {
  const found = boards.find((entry) => entry.id === id);
  if (!found) throw new Error(`no board ${id}`);
  return found;
}

describe("before-you-connect checklist", () => {
  it("leads with the notes that bear on a Pi 4 to Nucleo-H753ZI UART link", () => {
    // The reported case: ten full sentences, most about pins the link never uses.
    const pi = board("raspberry-pi-4-model-b");
    const nucleo = board("stm32-nucleo-h753zi");
    const list = linkChecklist(buildBoardLink(pi, nucleo, "uart"), pi, nucleo);

    expect(list.essentials.map((check) => check.title)).toEqual(["Ground only", "Match settings"]);
    const shown = list.relevant.map((note) => note.text).join("\n");
    expect(shown).toMatch(/UART overlays/); // the Pi's serial pins 8 and 10
    expect(shown).toMatch(/not 5 V tolerant/); // logic level
    expect(shown).toMatch(/older MB1137/); // revision risk
    expect(shown).not.toMatch(/current-limited/);
    expect(shown).not.toMatch(/RMII/);
    expect(list.relevant.length).toBeLessThan(list.relevant.length + list.more.length);
  });

  it("drops no board warning, only reorders them", () => {
    for (const [a, b] of [
      ["raspberry-pi-4-model-b", "stm32-nucleo-h753zi"],
      ["arduino-uno-rev3", "arduino-uno-rev3"],
      ["raspberry-pi-pico", "arduino-mega-2560-rev3"],
    ] as const) {
      for (const bus of linkBuses) {
        const boardA = board(a);
        const boardB = board(b);
        const list = linkChecklist(buildBoardLink(boardA, boardB, bus), boardA, boardB);
        const expected = [boardA, boardB]
          .filter((item, index, all) => all.findIndex((other) => other.id === item.id) === index)
          .flatMap((item) => item.warnings);
        expect([...list.relevant, ...list.more].map((note) => note.text).sort()).toEqual([...expected].sort());
      }
    }
  });

  it("puts a board's I2C note first only on the I2C link", () => {
    const nucleo = board("stm32-nucleo-h753zi");
    const pico = board("raspberry-pi-pico");
    const note = nucleo.warnings.find((text) => /I2C1/.test(text))!;
    expect(note).toBeTruthy();
    const relevantTo = (bus: (typeof linkBuses)[number]) =>
      linkChecklist(buildBoardLink(pico, nucleo, bus), pico, nucleo).relevant.some((item) => item.text === note);
    expect(relevantTo("i2c")).toBe(true);
    expect(relevantTo("uart")).toBe(false);
  });
});
