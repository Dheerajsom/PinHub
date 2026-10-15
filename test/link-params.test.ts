import { describe, expect, it } from "vitest";
import { linkSearch, linkStateFromSearch, linkUrl, maxPortIdLength } from "@/lib/link-params";

describe("link URL state", () => {
  it("reads two boards, the bus, and chosen ports", () => {
    expect(linkStateFromSearch("?a=raspberry-pi-5&b=arduino-uno-rev3&bus=i2c&pa=I2C1&pb=Wire")).toEqual({
      a: "raspberry-pi-5",
      b: "arduino-uno-rev3",
      bus: "i2c",
      pa: "I2C1",
      pb: "Wire",
    });
  });

  it("drops malformed ids, unknown buses, and oversized port ids", () => {
    expect(
      linkStateFromSearch(`?a=Raspberry_Pi&b=../x&bus=spi&pa=${"U".repeat(maxPortIdLength + 1)}&pb=%00x`),
    ).toEqual({ a: null, b: null, bus: "uart", pa: null, pb: null });
  });

  it("bounds how much of the query it reads", () => {
    expect(linkStateFromSearch(`?pad=${"x".repeat(5000)}&a=raspberry-pi-5`).a).toBeNull();
  });

  it("round-trips through the canonical query", () => {
    const state = { a: "raspberry-pi-pico", b: "esp32-devkitc", bus: "uart" as const, pa: "UART~J2 / CN5", pb: null };
    expect(linkStateFromSearch(linkSearch(state))).toEqual(state);
    expect(linkSearch({})).toBe("");
    expect(linkUrl("raspberry-pi-5", "arduino-uno-rev3")).toBe("/link?a=raspberry-pi-5&b=arduino-uno-rev3&bus=uart");
  });
});
