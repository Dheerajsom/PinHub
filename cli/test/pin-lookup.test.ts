import { expect, it } from "vitest";
import { runCli } from "../src/run.js";
import { renderPinLookup } from "../src/render/pin-lookup.js";
import { makeChalk } from "../src/render/theme.js";
import { asciiChars } from "../src/render/chars.js";
import { boards } from "../src/boards/index.js";
import { pinIndex } from "../src/boards/pin-index.js";
import { baseLabel, diagramLocation } from "../src/lookup-location.js";
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
  const output = renderPinLookup({ name: "Board\u001b[2J", headers: [{ id: "h", name: "Header\u001b[2J", layout: { rows: 1, columns: 1 }, pins: [] }, { id: "h2", name: "Other", layout: { rows: 1, columns: 1 }, pins: [] }] }, [{ key: "g0:0", position: 1, label: "GP0\u001b[2J", role: "gpio", note: "Line\nspoof" }], { chalk: makeChalk(false), chars: asciiChars, width: 40, compact: false, details: false });
  expect(output).not.toContain("\u001b");
  expect(output).not.toContain("Line\nspoof");
});

// Council review 2026-11-24 (P2): lookups printed the website's whole-board
// numbering ("Pin 18 A4 / SDA") while `ph uno` numbers each header from 1.

const handWritten = ["raspberry-pi-5", "raspberry-pi-pico", "raspberry-pi-pico-w", "arduino-uno-rev3", "esp32-devkit-v1"];

it.each(handWritten)("%s: every lookup pin lands on the same-named pin of its own diagram", (id) => {
  const board = boards.find((item) => item.id === id)!;
  const index = pinIndex.find((entry) => entry.id === id)!;
  expect(index.pins.length).toBeGreaterThan(0);
  const seen = new Set<string>();
  for (const pin of index.pins) {
    const location = diagramLocation(board, pin);
    expect(location, `${id} ${pin.label}`).toBeDefined();
    expect(baseLabel(location!.pin.label)).toBe(baseLabel(pin.label));
    const where = `${location!.header.id}:${location!.pin.physical}`;
    expect(seen.has(where), `${id} ${pin.label} shares ${where}`).toBe(false);
    seen.add(where);
  }
});

it.each(["raspberry-pi-5", "raspberry-pi-pico", "raspberry-pi-pico-w", "esp32-devkit-v1"])(
  "%s: every pin on the main diagram header is a lookup pin at the same number",
  (id) => {
    const board = boards.find((item) => item.id === id)!;
    const index = pinIndex.find((entry) => entry.id === id)!;
    for (const pin of board.headers[0].pins) {
      const match = index.pins.find((item) => item.position === pin.physical);
      expect(match && baseLabel(match.label), `${id} pin ${pin.physical}`).toBe(baseLabel(pin.label));
    }
  },
);

it("UNO's lookup table names only real diagram pins and every index label", () => {
  const board = boards.find((item) => item.id === "arduino-uno-rev3")!;
  const labels = pinIndex.find((entry) => entry.id === board.id)!.pins.map((pin) => pin.label).sort();
  expect(Object.keys(board.lookupLocations!).sort()).toEqual(labels);
});

it("resolves every lookup pin of every board with an index to exactly one diagram pin", () => {
  let checked = 0;
  for (const entry of pinIndex) {
    const board = boards.find((item) => item.id === entry.id);
    if (!board) continue;
    for (const pin of entry.pins) {
      const location = diagramLocation(board, pin);
      expect(location, `${entry.id} ${pin.key} ${pin.label}`).toBeDefined();
      checked += 1;
    }
  }
  expect(checked).toBeGreaterThan(5000);
});

it("prints the UNO lookup with the diagram's header and number", async () => {
  const sda = await runCli(["uno", "sda"], { isTTY: false });
  expect(sda.stdout).toMatch(/Pin 5\s+A4 \/ SDA .*\(Analog input header\)/);
  expect(sda.stdout).not.toContain("Pin 18");
  const sck = await runCli(["uno", "sck", "--json"], { isTTY: false });
  expect(JSON.parse(sck.stdout)[0].diagram).toEqual({ header: "digital-high", pin: 5 });
});
