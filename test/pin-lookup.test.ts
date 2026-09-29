import { describe, expect, it } from "vitest";
import { boards } from "@/lib/boards";
import { summarizeBoard } from "@/lib/board-summary";
import { createBoardSearchIndex } from "@/lib/board-search";
import { lookupPins } from "@/lib/pin-lookup";
import { createPinIndex } from "@/lib/server/pin-index";
import { isPinLikeQuery, matchesPin, pinQueryTokens } from "@/lib/pin-match";
import { parsePinIndex } from "@/lib/pin-index-boundary";
import { GET, POST, OPTIONS } from "@/app/api/pins/route";

const search = createBoardSearchIndex(boards.map(summarizeBoard));
const index = createPinIndex();
describe("pin lookup", () => {
  it("answers recorded aliases, shorthand board names and roles", () => {
    for (const query of ["pico sda", "rpi5 spi", "esp32 gpio27", "uno pwm", "pico gp26"]) {
      expect(lookupPins(query, search, index).boards.length, query).toBeGreaterThan(0);
    }
    const result = lookupPins("pico sda", search, index);
    expect(result.boards[0].id).toBe("raspberry-pi-pico");
    expect(result.boards[0].pins.every((pin) => matchesPin(pin, "sda"))).toBe(true);
  });
  it("keeps exact cross-board labels ambiguous and capped", () => {
    const result = lookupPins("D13", search, index);
    expect(result.boards.length).toBeGreaterThan(1);
    expect(result.boards.length).toBeLessThanOrEqual(8);
    expect(result.boards.flatMap((board) => board.pins).every((pin) => matchesPin(pin, "d13", true))).toBe(true);
    expect(matchesPin({ key: "e:1", position: 1, label: "GP26", role: "gpio" }, "gp2", true)).toBe(false);
  });
  it("preserves distinct grouped anchor keys, even with reused positions", () => {
    const grouped = index.find((board) => board.pins.some((pin, i) => board.pins.some((other, j) => j !== i && pin.position === other.position)));
    expect(grouped).toBeDefined();
    expect(new Set(grouped!.pins.map((pin) => pin.key)).size).toBe(grouped!.pins.length);
    expect(grouped!.pins.some((pin) => pin.group)).toBe(true);
  });
  it("does not guess, and bounds work on pasted queries", () => {
    expect(lookupPins("pico gpio999", search, index).boards).toEqual([]);
    expect(pinQueryTokens("pico ".repeat(10000))).toHaveLength(32);
    expect(pinQueryTokens("x".repeat(10000))[0]).toHaveLength(256);
    expect(isPinLikeQuery("strap pins")).toBe(false);
    expect(isPinLikeQuery("RP2040")).toBe(false);
    expect(isPinLikeQuery("GP26")).toBe(true);
  });
  it("validates the index and follows catalog API boundaries", async () => {
    expect(parsePinIndex(index)).toEqual(index);
    expect(() => parsePinIndex([{ id: "bad/id", pins: [] }])).toThrow();
    expect(() => parsePinIndex([{ id: "pico", pins: [{ key: "evil" }] }])).toThrow();
    expect(GET(new Request("http://localhost/api/pins?x=1")).status).toBe(400);
    expect(POST().status).toBe(405);
    expect(OPTIONS().headers.get("Allow")).toBe("GET, HEAD, OPTIONS");
    const response = GET(new Request("http://localhost/api/pins"));
    expect(response.headers.get("Cache-Control")).toContain("s-maxage=86400");
    expect(await response.json()).toEqual(index);
  });
});
