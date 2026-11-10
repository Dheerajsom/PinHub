import { describe, expect, it } from "vitest";
import { boards } from "@/lib/boards";
import { boardPrices } from "@/lib/board-prices";

// The curated listings cover the most-used SBCs and microcontrollers that the
// price checker can read (Adafruit and the Arduino US store).
describe("curated price coverage", () => {
  it("prices each listed board exactly once as its primary offer, and only catalog boards", () => {
    const ids = new Set(boards.map((board) => board.id));
    expect(boardPrices.filter((price) => !ids.has(price.boardId))).toEqual([]);
    const primaries = boardPrices.filter((price) => price.primary).map((price) => price.boardId);
    expect(new Set(primaries).size).toBe(primaries.length);
    expect(new Set(boardPrices.map((price) => price.boardId)).size).toBeGreaterThanOrEqual(25);
  });

  it.each([
    "raspberry-pi-5",
    "raspberry-pi-4-model-b",
    "raspberry-pi-zero-2-w",
    "raspberry-pi-pico",
    "arduino-uno-rev3",
    "arduino-nano",
    "arduino-mega-2560-rev3",
    "bbc-microbit-v2",
    "esp32-s3-devkitc-1",
  ])("prices %s", (id) => {
    expect(boardPrices.some((price) => price.boardId === id && price.primary)).toBe(true);
  });
});
