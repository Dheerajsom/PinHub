import { describe, expect, it } from "vitest";
import { runCli } from "../src/run.js";

const ANSI = new RegExp(String.fromCharCode(27) + "\\[");

describe("--json output", () => {
  it("emits only valid JSON on stdout", async () => {
    const result = await runCli(["rpi5", "--json"], { isTTY: true, env: {} });
    expect(result.code).toBe(0);
    expect(result.stderr).toBe("");
    const parsed = JSON.parse(result.stdout);
    expect(parsed.id).toBe("raspberry-pi-5");
    expect(parsed.headers[0].pins).toHaveLength(40);
    expect(result.stdout).not.toMatch(ANSI);
  });

  it("keeps sources and warnings in the JSON payload", async () => {
    const result = await runCli(["esp32", "--json"], { env: {} });
    const parsed = JSON.parse(result.stdout);
    expect(parsed.sources.length).toBeGreaterThanOrEqual(1);
    expect(parsed.sources.some((s: { official: boolean }) => s.official)).toBe(true);
    expect(parsed.warnings.length).toBeGreaterThanOrEqual(1);
  });

  it("supports info --json", async () => {
    const result = await runCli(["info", "pico", "--json"], { env: {} });
    expect(result.code).toBe(0);
    expect(JSON.parse(result.stdout).id).toBe("raspberry-pi-pico");
  });
});
