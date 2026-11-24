import { expect, it } from "vitest";
import { parsePinoutState, serializePinoutState, pinLookupHref } from "@/lib/pinout-state";
const keys = new Set(["g0:0", "g1:0", "pL:2"]);
const roles = new Set(["gpio", "i2c"]);
it("round-trips role and grouped pin selection", () => {
  for (const state of [{ role: "i2c" as const, pin: null }, { role: null, pin: "g1:0" }, { role: "gpio" as const, pin: "pL:2" }]) {
    expect(parsePinoutState(serializePinoutState(state, keys, roles), keys, roles)).toEqual(state);
  }
});
it("drops unknown, duplicate, hostile and oversized values on read and write", () => {
  for (const input of ["?role=evil&pin=g9:0", "?role=i2c&role=gpio&pin=g0:0&pin=g1:0", "?pin=%3Cscript%3E&role=spi", "?" + "x".repeat(256)]) {
    expect(parsePinoutState(input, keys, roles)).toEqual({ role: null, pin: null });
  }
  expect(serializePinoutState({ role: "spi", pin: "x".repeat(1000) }, keys, roles)).toBe("");
  expect(pinLookupHref("../bad", "g0:0")).toBe("/");
  expect(pinLookupHref("pico", "g1:0")).toBe("/boards/pico?pin=g1%3A0#pins");
});

it("round-trips the Show pins filters in display order and drops unknown ones", () => {
  expect(parsePinoutState("?show=spi,i2c", keys, roles)).toEqual({ role: null, pin: null, show: ["i2c", "spi"] });
  expect(serializePinoutState({ role: null, pin: null, show: ["spi", "i2c", "spi"] }, keys, roles)).toBe("show=i2c%2Cspi");
  expect(parsePinoutState("?show=i2c,evil", keys, roles)).toEqual({ role: null, pin: null, show: ["i2c"] });
  expect(parsePinoutState("?show=i2c&show=spi", keys, roles)).toEqual({ role: null, pin: null });
  expect(parsePinoutState(`?show=${Array(11).fill("i2c").join(",")}`, keys, roles)).toEqual({ role: null, pin: null });
  expect(serializePinoutState({ role: null, pin: null, show: [] }, keys, roles)).toBe("");
});
