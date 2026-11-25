import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { storedItems } from "@/lib/privacy-storage";

const srcRoot = fileURLToPath(new URL("../src", import.meta.url));

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

describe("privacy page storage list", () => {
  // The page named only favorites, though PinHub also stores the theme, the
  // personal library, the pinout tab and the Code check draft.
  it("lists every browser storage key the app writes", () => {
    const listed = new Set<string>(storedItems.map((item) => item.key));
    const used = new Set<string>();
    for (const file of sourceFiles(srcRoot)) {
      if (file.endsWith("privacy-storage.ts")) continue;
      for (const match of readFileSync(file, "utf8").matchAll(/["'`](pinhub\.[A-Za-z0-9_.-]+)["'`]/g)) used.add(match[1]);
    }
    expect(used.size).toBeGreaterThanOrEqual(5);
    expect([...used].filter((key) => !listed.has(key))).toEqual([]);
    expect([...listed].filter((key) => !used.has(key))).toEqual([]);
  });

  it("says which storage each key lives in", () => {
    expect(storedItems.find((item) => item.key === "pinhub.check.draft")?.storage).toBe("sessionStorage");
    expect(storedItems.filter((item) => item.key !== "pinhub.check.draft").every((item) => item.storage === "localStorage")).toBe(true);
  });
});
