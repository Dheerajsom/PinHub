import { describe, expect, it, vi } from "vitest";
import {
  MIN_SIGNAL_PULSE_COLUMNS,
  playSignalPulse,
  shouldAnimateSignalPulse,
  signalPulseLabel,
} from "../src/status.js";

const INTERACTIVE = { stdoutIsTTY: true, stderrIsTTY: true, env: {} };

describe("signal pulse", () => {
  it("runs only for an interactive, color-capable board command", () => {
    expect(shouldAnimateSignalPulse(["rpi5"], INTERACTIVE)).toBe(true);
    expect(shouldAnimateSignalPulse(["search", "pico"], INTERACTIVE)).toBe(true);

    for (const argv of [
      [],
      ["help"],
      ["rpi5", "--help"],
      ["--version"],
      ["rpi5", "--json"],
      ["rpi5", "--no-motion"],
      ["rpi5", "--no-color"],
    ]) {
      expect(shouldAnimateSignalPulse(argv, INTERACTIVE), argv.join(" ")).toBe(false);
    }
  });

  it("respects stream and environment capabilities", () => {
    expect(
      shouldAnimateSignalPulse(["rpi5"], { ...INTERACTIVE, stdoutIsTTY: false }),
    ).toBe(false);
    expect(
      shouldAnimateSignalPulse(["rpi5"], { ...INTERACTIVE, stderrIsTTY: false }),
    ).toBe(false);
    expect(
      shouldAnimateSignalPulse(["rpi5"], { ...INTERACTIVE, env: { CI: "1" } }),
    ).toBe(false);
    expect(
      shouldAnimateSignalPulse(["rpi5"], { ...INTERACTIVE, env: { TERM: "dumb" } }),
    ).toBe(false);
    expect(
      shouldAnimateSignalPulse(["rpi5"], { ...INTERACTIVE, env: { NO_COLOR: "1" } }),
    ).toBe(false);
    expect(
      shouldAnimateSignalPulse(["rpi5"], { ...INTERACTIVE, env: { NO_COLOR: "" } }),
    ).toBe(false);
    expect(
      shouldAnimateSignalPulse(["rpi5"], {
        ...INTERACTIVE,
        env: { PINHUB_NO_MOTION: "1" },
      }),
    ).toBe(false);
  });

  it("does not draw into a terminal too narrow for the complete pulse", () => {
    expect(
      shouldAnimateSignalPulse(["list"], {
        ...INTERACTIVE,
        stderrColumns: MIN_SIGNAL_PULSE_COLUMNS - 1,
      }),
    ).toBe(false);
    expect(
      shouldAnimateSignalPulse(["list"], {
        ...INTERACTIVE,
        stderrColumns: MIN_SIGNAL_PULSE_COLUMNS,
      }),
    ).toBe(true);
  });

  it("cycles four colored frames and erases itself", async () => {
    let output = "";
    const write = vi.fn((chunk: string) => {
      output += chunk;
    });
    const sleep = vi.fn(async () => undefined);

    await playSignalPulse(
      { write },
      { ascii: false, label: "Mapping pin signals", intervalMs: 1, sleep },
    );

    expect(sleep).toHaveBeenCalledTimes(4);
    expect(write).toHaveBeenCalledTimes(5);
    expect(output).toContain("◇");
    expect(output).toContain("◈");
    expect(output).toContain("◆");
    expect(output).toContain("Mapping pin signals");
    expect(output).toContain("\u001b[");
    expect(write.mock.calls.at(-1)?.[0]).toBe("\r\u001b[2K");
  });

  it("erases the pulse when frame timing is interrupted", async () => {
    const write = vi.fn();
    const interrupted = new Error("interrupted");
    const sleep = vi.fn(async () => {
      throw interrupted;
    });

    await expect(
      playSignalPulse(
        { write },
        { ascii: true, label: "Mapping pin signals", intervalMs: 1, sleep },
      ),
    ).rejects.toBe(interrupted);

    expect(write).toHaveBeenCalledTimes(2);
    expect(write.mock.calls.at(-1)?.[0]).toBe("\r\u001b[2K");
  });

  it("has command-specific status labels", () => {
    expect(signalPulseLabel(["list"])).toBe("Scanning board catalog");
    expect(signalPulseLabel(["search", "pico"])).toBe("Tuning board search");
    expect(signalPulseLabel(["info", "pico"])).toBe("Reading board signals");
  });
});
