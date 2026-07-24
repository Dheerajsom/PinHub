import { describe, expect, it } from "vitest";
import { runCli } from "../src/run.js";
import { boards } from "../src/catalog.js";
import {
  COMPLETION_SHELLS,
  boardCompletionTokens,
  completionCandidates,
  resolveCompletionShell,
} from "../src/complete.js";

/** Runs the wire protocol the emitted shell scripts actually speak. */
async function complete(prefix: string, ...words: string[]): Promise<string[]> {
  const result = await runCli(["__complete", `--prefix=${prefix}`, ...words], { env: {} });
  expect(result.code).toBe(0);
  expect(result.stderr).toBe("");
  return result.stdout === "" ? [] : result.stdout.trimEnd().split("\n");
}

describe("completion candidates", () => {
  it("offers every board id and alias for a bare first word", () => {
    const tokens = boardCompletionTokens();
    for (const board of boards) {
      expect(tokens).toContain(board.id);
      for (const alias of board.aliases) expect(tokens).toContain(alias);
    }
    expect(new Set(tokens).size).toBe(tokens.length);
  });

  it("completes a partial board name", async () => {
    const matches = await complete("rpi");
    expect(matches).toContain("rpi5");
    expect(matches).toContain("rpi4");
    expect(matches.every((match) => match.startsWith("rpi"))).toBe(true);
  });

  it("completes ids as well as short aliases", async () => {
    expect(await complete("raspberry-pi-5")).toContain("raspberry-pi-5");
    expect(await complete("pico-w")).toContain("pico-w");
  });

  it("ignores the case of the typed prefix", async () => {
    expect(await complete("RPI5")).toEqual(await complete("rpi5"));
    expect(await complete("RPI5")).toContain("rpi5");
  });

  it("offers subcommands only while the first word is open", async () => {
    const first = await complete("");
    for (const subcommand of ["list", "search", "info", "completion", "help"]) {
      expect(first).toContain(subcommand);
    }
    const second = await complete("", "rpi5");
    expect(second).not.toContain("list");
    expect(second).toContain("rpi5");
  });

  it("completes board names after info and search", async () => {
    expect(await complete("pic", "info")).toContain("pico");
    expect(await complete("rpi", "search")).toContain("rpi5");
  });

  it("offers nothing after list, which takes no operands", async () => {
    expect(await complete("", "list")).toEqual([]);
  });

  it("completes flags and drops ones already typed", async () => {
    expect(await complete("--as")).toEqual(["--ascii"]);
    const afterAscii = await complete("--", "rpi5", "--ascii");
    expect(afterAscii).not.toContain("--ascii");
    expect(afterAscii).toContain("--compact");
  });

  it("withholds single-board flags from list and search", async () => {
    const listFlags = await complete("--", "list");
    expect(listFlags).not.toContain("--source");
    expect(listFlags).not.toContain("--details");
    expect(listFlags).toContain("--json");
    const boardFlags = await complete("--", "rpi5");
    expect(boardFlags).toContain("--source");
  });

  it("offers --version only as the first word", async () => {
    expect(await complete("--v")).toEqual(["--version"]);
    expect(await complete("--v", "rpi5")).toEqual([]);
  });

  it("offers nothing for the value of --width", async () => {
    expect(await complete("", "rpi5", "--width")).toEqual([]);
  });

  it("completes shell names for the completion command, then stops", async () => {
    expect(await complete("", "completion")).toEqual([...COMPLETION_SHELLS].sort());
    expect(await complete("b", "completion")).toEqual(["bash"]);
    expect(await complete("", "completion", "bash")).toEqual([]);
  });

  it("completes subcommand names for help", async () => {
    expect(await complete("l", "help")).toEqual(["list"]);
  });

  it("returns nothing rather than failing on an unmatched prefix", async () => {
    expect(await complete("zzzz")).toEqual([]);
  });

  it("tolerates flags among the preceding words", async () => {
    // commander would treat these as its own; __complete must not.
    expect(await complete("rpi", "--json")).toContain("rpi5");
    expect(completionCandidates(["--ascii", "--no-color"], "pic")).toContain("pico");
  });

  it("accepts the spaced --prefix form as well", async () => {
    const result = await runCli(["__complete", "--prefix", "rpi5"], { env: {} });
    expect(result.stdout.trimEnd().split("\n")).toContain("rpi5");
  });
});

describe("completion scripts", () => {
  it("prints an installable script for every supported shell", async () => {
    for (const shell of COMPLETION_SHELLS) {
      const result = await runCli(["completion", shell], { env: {} });
      expect(result.code).toBe(0);
      expect(result.stderr).toBe("");
      // Each script must invoke the protocol this CLI actually implements.
      expect(result.stdout).toContain("ph __complete");
      expect(result.stdout).toContain("--prefix=");
    }
  });

  it("registers a completion hook per shell", async () => {
    const bash = await runCli(["completion", "bash"], { env: {} });
    expect(bash.stdout).toContain("complete -F _ph_complete ph");
    const zsh = await runCli(["completion", "zsh"], { env: {} });
    expect(zsh.stdout).toContain("compdef _ph_complete ph");
    const fish = await runCli(["completion", "fish"], { env: {} });
    expect(fish.stdout).toContain("complete -c ph");
    const powershell = await runCli(["completion", "powershell"], { env: {} });
    expect(powershell.stdout).toContain("Register-ArgumentCompleter");
  });

  it("accepts pwsh as a spelling of powershell", async () => {
    const pwsh = await runCli(["completion", "pwsh"], { env: {} });
    const powershell = await runCli(["completion", "powershell"], { env: {} });
    expect(pwsh.stdout).toBe(powershell.stdout);
    expect(resolveCompletionShell("PowerShell")).toBe("powershell");
    expect(resolveCompletionShell("tcsh")).toBeUndefined();
  });

  it("rejects an unknown shell with an actionable message", async () => {
    const result = await runCli(["completion", "tcsh"], { env: {} });
    expect(result.code).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain('Unknown shell "tcsh"');
    expect(result.stderr).toContain("bash, zsh, fish, powershell");
  });

  it("lists completion in the top-level help", async () => {
    const result = await runCli(["--help"], { env: {} });
    expect(result.stdout).toContain("completion");
  });
});
