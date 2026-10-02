import { describe, expect, it } from "vitest";
import {
  boardFromSearch,
  claimsFromSearch,
  maxPlanParamLength,
  parsePlanParam,
  parseUseParam,
  planFromSearch,
  searchWithPlan,
  searchWithPlanner,
  serializePlan,
  serializeUse,
} from "@/lib/plan-params";

describe("plan URL parameter", () => {
  it("round-trips the canonical form", () => {
    const value = "i2c2.spi1.pwm3.adc2.gpio4";
    const parsed = parsePlanParam(value);
    expect(parsed).toEqual({ I2C: 2, SPI: 1, PWM: 3, ADC: 2, GPIO: 4 });
    expect(serializePlan(parsed)).toBe(value);
  });

  it("writes tokens in a fixed order and omits zero counts", () => {
    expect(serializePlan({ GPIO: 1, I2C: 0, SPI: 2 })).toBe("spi2.gpio1");
    expect(serializePlan({})).toBe("");
  });

  it("drops unknown keys, out-of-range counts, and repeats", () => {
    expect(parsePlanParam("usb2.i2c9.spi0.pwm10.adc-1.i2c2.i2c3.dac1")).toEqual({ I2C: 2, DAC: 1 });
    expect(parsePlanParam("GPIO3.Uart1")).toEqual({ GPIO: 3, UART: 1 });
    expect(parsePlanParam("i2c2..spi1.")).toEqual({ I2C: 2, SPI: 1 });
    expect(parsePlanParam("<script>")).toEqual({});
  });

  it("ignores oversized values and extra tokens", () => {
    expect(parsePlanParam(`i2c1.${"x".repeat(maxPlanParamLength)}`)).toEqual({});
    expect(parsePlanParam("i2c1.i2c1.i2c1.i2c1.i2c1.i2c1.i2c1.i2c1.spi1")).toEqual({ I2C: 1 });
    expect(parsePlanParam(undefined)).toEqual({});
  });

  it("reads and writes the parameter without disturbing others", () => {
    expect(planFromSearch("?plan=i2c1.gpio2&x=1")).toEqual({ I2C: 1, GPIO: 2 });
    expect(planFromSearch("?x=1")).toEqual({});
    expect(searchWithPlan("?x=1&plan=i2c1", { SPI: 1 })).toBe("?x=1&plan=spi1");
    expect(searchWithPlan("?plan=i2c1", {})).toBe("");
    expect(searchWithPlan("", { UART: 1, GPIO: 3 })).toBe("?plan=uart1.gpio3");
  });
});

describe("planner board and claims parameters", () => {
  const keys = new Set(["pL:0", "pL:1", "pR:0"]);

  it("accepts only board-id-shaped values", () => {
    expect(boardFromSearch("?board=raspberry-pi-pico")).toBe("raspberry-pi-pico");
    expect(boardFromSearch("?board=../etc")).toBeNull();
    expect(boardFromSearch("?board=Raspberry")).toBeNull();
    expect(boardFromSearch("")).toBeNull();
  });

  it("parses claims, dropping unknown keys and repeats", () => {
    expect(parseUseParam("pL:0~OLED SDA,pR:0~,zz:9~nope,pL:0~again", keys)).toEqual([
      { key: "pL:0", name: "OLED SDA" },
      { key: "pR:0", name: "" },
    ]);
  });

  it("filters and bounds names", () => {
    expect(parseUseParam(`pL:1~<script>${"x".repeat(60)}`, keys)).toEqual([
      { key: "pL:1", name: `script${"x".repeat(18)}` },
    ]);
  });

  it("rejects oversized input and caps the claim count", () => {
    expect(parseUseParam(`pL:0~${"a".repeat(3000)}`, keys)).toEqual([]);
    const many = new Set(Array.from({ length: 100 }, (_, index) => `g0:${index}`));
    const value = [...many].map((key) => `${key}~`).join(",");
    expect(parseUseParam(value, many)).toHaveLength(64);
    expect(parseUseParam(null, keys)).toEqual([]);
  });

  it("round-trips through the search string and keeps other parameters", () => {
    const claims = [
      { key: "pL:0", name: "OLED SDA" },
      { key: "pR:0", name: "" },
    ];
    const search = searchWithPlanner("?board=raspberry-pi-pico&x=1", { I2C: 1 }, claims);
    const params = new URLSearchParams(search);
    expect(params.get("board")).toBe("raspberry-pi-pico");
    expect(params.get("x")).toBe("1");
    expect(params.get("plan")).toBe("i2c1");
    expect(claimsFromSearch(search, keys)).toEqual(claims);
    expect(searchWithPlanner(search, {}, [])).toBe("?board=raspberry-pi-pico&x=1");
  });

  it("applies the same limits when writing", () => {
    const claims = Array.from({ length: 100 }, (_, index) => ({ key: `g0:${index}`, name: "n" }));
    expect(serializeUse(claims).split(",")).toHaveLength(64);
    expect(serializeUse([{ key: "pL:0", name: "a~b,c" }])).toBe("pL:0~abc");
  });
});
