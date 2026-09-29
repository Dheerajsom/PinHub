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
  expect(pinLookupHref("pico", "g1:0")).toBe("/pinout/pico?pin=g1%3A0");
});
