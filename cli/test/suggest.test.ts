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

  it("treats invalid or non-positive suggestion limits as empty", () => {
    expect(suggestBoards("rasp", 0)).toEqual([]);
    expect(suggestBoards("rasp", -1)).toEqual([]);
    expect(suggestBoards("rasp", Number.NaN)).toEqual([]);
    expect(suggestBoards("rasp", Number.POSITIVE_INFINITY)).toEqual([]);
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

  it("strips terminal controls from parser diagnostics", async () => {
    const escape = String.fromCharCode(0x1b);
    const bell = String.fromCharCode(0x07);
    const hostileOption = `--bad${escape}]52;c;dGVzdA==${bell}`;

    const result = await runCli([hostileOption], {
      env: {},
      isTTY: true,
    });

    expect(result.code).toBe(1);
    expect(result.stderr).toContain("unknown option");
    expect(result.stderr).not.toContain(escape);
    expect(result.stderr).not.toContain(bell);
  });
});
