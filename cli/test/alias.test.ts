import { describe, expect, it } from "vitest";
import { normalizeQuery, resolveBoard } from "../src/catalog.js";

describe("alias resolution", () => {
  it.each([
    "rpi5",
    "pi5",
    "raspberry-pi-5",
    "raspberry pi 5",
    "Raspberry Pi 5",
    "RASPBERRY_PI_5",
    "raspberry--pi--5",
  ])("resolves %j to raspberry-pi-5", (query) => {
    expect(resolveBoard(query)?.id).toBe("raspberry-pi-5");
  });

  it.each([
    ["pico", "raspberry-pi-pico"],
    ["raspberry pi pico", "raspberry-pi-pico"],
    ["picow", "raspberry-pi-pico-w"],
    ["pico-w", "raspberry-pi-pico-w"],
    ["uno", "arduino-uno-rev3"],
    ["arduino uno r3", "arduino-uno-rev3"],
    ["arduino-uno-r3", "arduino-uno-rev3"],
    ["esp32", "esp32-devkit-v1"],
    ["esp32 devkit v1", "esp32-devkit-v1"],
    ["esp32-devkit-v1", "esp32-devkit-v1"],
    ["esp32 devkitc", "esp32-devkitc"],
  ])("resolves %j to %s", (query, id) => {
    expect(resolveBoard(query)?.id).toBe(id);
  });

  it("returns undefined for unknown boards", () => {
    expect(resolveBoard("rpi6")).toBeUndefined();
    expect(resolveBoard("")).toBeUndefined();
  });

  it("normalizes case, spaces, underscores, and hyphen runs", () => {
    expect(normalizeQuery("  Raspberry  Pi_5 ")).toBe("raspberry-pi-5");
  });
});
