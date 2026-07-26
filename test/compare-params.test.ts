import { describe, expect, it } from "vitest";
import {
  maxComparedBoards,
  parseComparedIds,
} from "@/lib/compare-params";

describe("parseComparedIds", () => {
  it("returns nothing for a missing or empty parameter", () => {
    expect(parseComparedIds(undefined)).toEqual([]);
    expect(parseComparedIds("")).toEqual([]);
    expect(parseComparedIds(",,")).toEqual([]);
    expect(parseComparedIds([])).toEqual([]);
  });

  it("splits a comma-separated value and preserves order", () => {
    expect(parseComparedIds("raspberry-pi-5,pico,uno")).toEqual([
      "raspberry-pi-5",
      "pico",
      "uno",
    ]);
  });

  it("drops duplicates before applying the limit", () => {
    expect(parseComparedIds("pico,pico,uno,esp32")).toEqual([
      "pico",
      "uno",
      "esp32",
    ]);
  });

  it("caps the result at the number of comparable boards", () => {
    expect(parseComparedIds("a,b,c,d,e")).toHaveLength(maxComparedBoards);
  });

  it("accepts a repeated parameter as separate values", () => {
    expect(parseComparedIds(["pico", "uno"])).toEqual(["pico", "uno"]);
  });

  it("bounds a hostile query string instead of parsing all of it", () => {
    const hostile = Array.from({ length: 50_000 }, (_, i) => `b${i}`).join(",");

    const fromString = parseComparedIds(hostile);
    expect(fromString).toHaveLength(maxComparedBoards);
    // Only the bounded prefix of the value is ever examined.
    expect(fromString[0]).toBe("b0");

    const fromArray = parseComparedIds(Array(50_000).fill(hostile));
    expect(fromArray).toHaveLength(maxComparedBoards);
  });
});
