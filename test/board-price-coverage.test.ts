import { describe, expect, it } from "vitest";
import { boards } from "@/lib/boards";
import { boardPrices } from "@/lib/board-prices";
import snapshots from "@/lib/board-prices.json";

// The curated listings cover the most-used SBCs and microcontrollers that the
// price checker can read (Adafruit and the Arduino US store).
//
// The count is stated in docs/pin-check-2026-11-10.md ("Prices: 31 boards").
// Change it here only together with that write-up, so the documented number
// cannot drift.
const documentedPricedBoards = 31;

type RawListing = { boardId?: unknown; primary?: unknown; url?: unknown };
const raw = snapshots as RawListing[];

describe("curated price coverage", () => {
  it("prices exactly the documented number of boards, read straight from the listing file", () => {
    const ids = new Set(raw.map((listing) => listing.boardId));
    expect(ids.size).toBe(documentedPricedBoards);
    // The parsed list drops nothing the file holds.
    expect(new Set(boardPrices.map((price) => price.boardId))).toEqual(ids);
    expect(boardPrices).toHaveLength(raw.length);
  });

  it("prices only catalog boards, each with exactly one primary listing", () => {
    const catalog = new Set(boards.map((board) => board.id));
    const ids = [...new Set(raw.map((listing) => String(listing.boardId)))];
    expect(ids.filter((id) => !catalog.has(id))).toEqual([]);
    for (const id of ids) {
      const primaries = raw.filter((listing) => listing.boardId === id && listing.primary === true);
      expect(primaries, id).toHaveLength(1);
    }
  });

  it("links every listing over HTTPS", () => {
    for (const listing of raw) {
      expect(typeof listing.url).toBe("string");
      expect(new URL(String(listing.url)).protocol, String(listing.url)).toBe("https:");
    }
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
