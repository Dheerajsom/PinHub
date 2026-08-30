import stringWidth from "string-width";
import { describe, expect, it } from "vitest";
import { runCli } from "../src/run.js";

const ANSI = new RegExp(String.fromCharCode(27) + "\\[");

function expectWidthSafe(output: string, width: number): void {
  for (const line of output.trimEnd().split("\n")) {
    expect(stringWidth(line), line).toBeLessThanOrEqual(width);
  }
}

describe("global output flags", () => {
  it("applies --no-color to list and search", async () => {
    const list = await runCli(["list", "--no-color"], { isTTY: true, columns: 80, env: {} });
    const search = await runCli(["search", "raspberry", "--no-color"], {
      isTTY: true,
      columns: 80,
      env: {},
    });
    expect(list.stdout).not.toMatch(ANSI);
    expect(search.stdout).not.toMatch(ANSI);
  });

  it("emits pure JSON arrays for list and search", async () => {
    const list = await runCli(["list", "--json"], { isTTY: true, env: {} });
    const search = await runCli(["search", "raspberry", "--json"], {
      isTTY: true,
      env: {},
    });
    const listPayload = JSON.parse(list.stdout) as Array<{ id: string }>;
    const searchPayload = JSON.parse(search.stdout) as Array<{ manufacturer: string }>;
    expect(listPayload.length).toBeGreaterThanOrEqual(125);
    expect(searchPayload.length).toBeGreaterThan(0);
    expect(list.stdout).not.toMatch(ANSI);
    expect(search.stdout).not.toMatch(ANSI);
  });

  it("applies --width to list, search, info, source, and board output", async () => {
    const cases = [
      ["list"],
      ["search", "raspberry"],
      ["info", "rpi5"],
      ["rpi5", "--source"],
      ["rpi5"],
    ];
    for (const argv of cases) {
      const result = await runCli([...argv, "--width", "32"], { isTTY: false, env: {} });
      expect(result.code, argv.join(" ")).toBe(0);
      expectWidthSafe(result.stdout, 32);
    }
  });

  it.each(["40px", "40.5", "1e2", "19", "1001", "9007199254740992"])(
    "strictly rejects invalid width %s",
    async (width) => {
      const result = await runCli(["rpi5", "--width", width], { env: {} });
      expect(result.code).toBe(1);
      expect(result.stdout).toBe("");
      expect(result.stderr).toContain("Invalid --width");
      expect(result.stderr).not.toMatch(/\n\s+at /);
    },
  );

  it.each(["--source", "--details"])(
    "rejects %s for multi-board commands instead of ignoring it",
    async (flag) => {
      const result = await runCli(["list", flag], { env: {} });
      expect(result.code).toBe(1);
      expect(result.stderr).toContain("needs one board");
    },
  );

  it.each(["--ascii", "--compact", "--details", "--source", "--width"])(
    "rejects JSON combined with presentation/view flag %s",
    async (flag) => {
      const argv = flag === "--width" ? ["rpi5", "--json", flag, "80"] : ["rpi5", "--json", flag];
      const result = await runCli(argv, { env: {} });
      expect(result.code).toBe(1);
      expect(result.stdout).toBe("");
      expect(result.stderr).toContain("`--json` cannot be combined with");
      expect(result.stderr).toContain(flag);
    },
  );

  it.each(["list", "search"])(
    "rejects one-board flags for %s even when JSON is requested",
    async (command) => {
      const argv = command === "search"
        ? [command, "raspberry", "--json", "--source"]
        : [command, "--json", "--source"];
      const result = await runCli(argv, { env: {} });
      expect(result.code).toBe(1);
      expect(result.stdout).toBe("");
      expect(result.stderr).toContain("`--source` needs one board");
    },
  );

  it.each([["rpi5"], ["info", "rpi5"]])(
    "rejects source and detail views together for %s",
    async (command) => {
      const result = await runCli([...command, "--source", "--details"], { env: {} });
      expect(result.code).toBe(1);
      expect(result.stdout).toBe("");
      expect(result.stderr).toContain("separate one-board views");
    },
  );

  it("does not place executable animation controls in runCli output", async () => {
    const result = await runCli(["rpi5", "--no-motion"], { isTTY: true, env: {} });
    expect(result.code).toBe(0);
    expect(result.stdout).not.toContain("\u001b[2K");
    expect(result.stdout).not.toContain("Mapping pin signals");
    expect(result.stderr).toBe("");
  });

  it("sanitizes control characters when echoing an unknown query", async () => {
    const result = await runCli(
      ["missing\u001b[2Jboard\nforged\u0085line\u202etext"],
      { env: {} },
    );
    expect(result.code).toBe(1);
    expect(result.stderr).not.toContain("\u001b");
    expect(result.stderr).not.toContain("\u0085");
    expect(result.stderr).not.toContain("\u202e");
    expect(result.stderr).toContain("missingboard");
    expect(result.stderr).not.toContain("\nforged");
  });
});
