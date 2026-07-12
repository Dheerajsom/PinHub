import { describe, expect, it } from "vitest";
import { runCli } from "../src/run.js";
import { suggestBoards } from "../src/catalog.js";

describe("unknown board handling", () => {
  it("suggests close matches and exits non-zero", async () => {
    const result = await runCli(["rpi6"], { env: {} });
    expect(result.code).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain('Board "rpi6" was not found.');
    expect(result.stderr).toContain("Did you mean:");
    expect(result.stderr).toContain("ph rpi5");
    expect(result.stderr).not.toContain("at "); // no stack trace
  });

  it("suggests boards for prefix queries", () => {
    const suggestions = suggestBoards("rasp");
    expect(suggestions.length).toBeGreaterThanOrEqual(1);
    expect(suggestions[0].board.id).toContain("raspberry");
  });

  it("exits non-zero for unmatched search", async () => {
    const result = await runCli(["search", "zzzz"], { env: {} });
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("No boards matched");
  });

  it("rejects an invalid --width without a stack trace", async () => {
    const result = await runCli(["rpi5", "--width", "banana"], { env: {} });
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("Invalid --width");
  });
});
