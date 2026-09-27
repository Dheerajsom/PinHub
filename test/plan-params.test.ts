import { describe, expect, it } from "vitest";
import {
  maxPlanParamLength,
  parsePlanParam,
  planFromSearch,
  searchWithPlan,
  serializePlan,
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
