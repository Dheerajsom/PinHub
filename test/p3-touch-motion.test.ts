import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(fileURLToPath(new URL(`../${path}`, import.meta.url)), "utf8");

describe("P3 touch targets (44 px)", () => {
  // Each of these was under 44 px tall: a py-1.5 or py-2 box, or min-h-6.
  it.each([
    ["src/components/PricesApp.tsx", "Explore the full pinout catalog"],
    ["src/app/collections/page.tsx", ">Browse boards<"],
    ["src/components/ProjectShelf.tsx", "<span className=\"truncate\">{board.name}</span>"],
  ])("%s: %s", (file, marker) => {
    const source = read(file);
    const at = source.indexOf(marker);
    expect(at, marker).toBeGreaterThanOrEqual(0);
    const tag = source.slice(source.lastIndexOf("<Link", at), at);
    expect(tag).toMatch(/\bmin-h-11\b/);
  });

  it("the detail panel's Try again button", () => {
    const source = read("src/components/BoardDetailPanel.tsx");
    const at = source.indexOf("Try again");
    const tag = source.slice(source.lastIndexOf("<button", at), at);
    expect(tag).toMatch(/\bmin-h-11\b/);
  });
});

describe("P3 reduced motion", () => {
  it("every spinner only spins when motion is allowed", () => {
    for (const file of ["src/app/loading.tsx", "src/components/BoardDetailPanel.tsx", "src/components/DiscoveryApp.tsx", "src/components/PinHubApp.tsx"]) {
      expect(read(file), file).not.toMatch(/(?<!motion-safe:)\banimate-spin\b/);
    }
    expect(read("src/app/loading.tsx")).toContain("motion-safe:animate-spin");
  });
});
