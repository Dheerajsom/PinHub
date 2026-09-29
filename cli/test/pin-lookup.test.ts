import { expect, it } from "vitest";
import { runCli } from "../src/run.js";
import { renderPinLookup } from "../src/render/pin-lookup.js";
import { makeChalk } from "../src/render/theme.js";
import { asciiChars } from "../src/render/chars.js";
it("prints only recorded matching rows for signals and roles", async () => {
  const pico = await runCli(["pico", "sda"]);
  expect(pico.code).toBe(0);
  expect(pico.stdout).toContain("SDA");
  expect(pico.stdout).not.toContain("VBUS");
  const spi = await runCli(["rpi5", "--role", "spi", "--json"]);
  expect(spi.code).toBe(0);
  expect(JSON.parse(spi.stdout).every((pin: { role: string }) => pin.role === "spi")).toBe(true);
});
it("reports missing records and invalid roles without guessing", async () => {
  expect((await runCli(["pico", "gpio999"])).stderr).toContain("No recorded pins");
  expect((await runCli(["pico", "--role", "evil"])).code).toBe(1);
  expect((await runCli(["pico", "sda", "--source"])).code).toBe(1);
});
it("sanitizes terminal text and wraps lookup notes", () => {
  const output = renderPinLookup("Board\u001b[2J", [{ key: "g0:0", position: 1, label: "GP0\u001b[2J", role: "gpio", note: "Line\nspoof" }], { chalk: makeChalk(false), chars: asciiChars, width: 40, compact: false, details: false });
  expect(output).not.toContain("\u001b");
  expect(output).not.toContain("Line\nspoof");
});
