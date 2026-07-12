import { describe, expect, it } from "vitest";
import { runCli } from "../src/run.js";

const ANSI = new RegExp(String.fromCharCode(27) + "\\[");
const WIDE = { columns: 100, env: {} };

describe("rendering", () => {
  it("renders the Raspberry Pi 5 header with unicode borders by default", async () => {
    const result = await runCli(["rpi5"], WIDE);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Raspberry Pi 5");
    expect(result.stdout).toContain("┌");
    expect(result.stdout).toContain("GPIO2 / SDA1");
    expect(result.stdout).toContain("3.3 V logic");
  });

  it("renders ASCII-only output with --ascii", async () => {
    const result = await runCli(["rpi5", "--ascii"], WIDE);
    expect(result.stdout).toContain("+--");
    expect(result.stdout).not.toMatch(/[┌┐└┘─│┬┴⚠ℹ•]/);
  });

  it("emits no ANSI codes when piped (non-TTY)", async () => {
    const result = await runCli(["rpi5"], { ...WIDE, isTTY: false });
    expect(result.stdout).not.toMatch(ANSI);
  });

  it("emits color when attached to a TTY", async () => {
    const result = await runCli(["rpi5"], { ...WIDE, isTTY: true });
    expect(result.stdout).toMatch(ANSI);
  });

  it("honors NO_COLOR even on a TTY", async () => {
    const result = await runCli(["rpi5"], { ...WIDE, isTTY: true, env: { NO_COLOR: "1" } });
    expect(result.stdout).not.toMatch(ANSI);
  });

  it("honors --no-color even on a TTY", async () => {
    const result = await runCli(["rpi5", "--no-color"], { ...WIDE, isTTY: true });
    expect(result.stdout).not.toMatch(ANSI);
  });

  it("drops to a compact layout with --compact", async () => {
    const result = await runCli(["pico", "--compact"], WIDE);
    expect(result.code).toBe(0);
    expect(result.stdout).not.toContain("┌");
    expect(result.stdout).toContain("GP0 / UART0 TX");
  });

  it("falls back to a vertical list on very narrow terminals without dropping warnings", async () => {
    const result = await runCli(["rpi5", "--width", "44"], { env: {} });
    expect(result.code).toBe(0);
    expect(result.stdout).not.toContain("┌");
    expect(result.stdout).toContain("3.3 V logic");
    expect(result.stdout).toContain("Source:");
  });

  it("prints source links with --source, marking third-party sources", async () => {
    const rpi = await runCli(["rpi5", "--source"], WIDE);
    expect(rpi.stdout).toContain("(official)");
    expect(rpi.stdout).toContain("https://www.raspberrypi.com/");
    const esp = await runCli(["esp32", "--source"], WIDE);
    expect(esp.stdout).toContain("(third-party)");
  });

  it("lists all boards with `ph list`", async () => {
    const result = await runCli(["list"], WIDE);
    expect(result.code).toBe(0);
    for (const id of [
      "raspberry-pi-5",
      "raspberry-pi-pico",
      "raspberry-pi-pico-w",
      "arduino-uno-r3",
      "esp32-devkit-v1",
    ]) {
      expect(result.stdout).toContain(id);
    }
  });

  it("finds boards with `ph search`", async () => {
    const result = await runCli(["search", "raspberry"], WIDE);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("raspberry-pi-5");
    expect(result.stdout).not.toContain("arduino-uno-r3");
  });

  it("renders board metadata with `ph info`", async () => {
    const result = await runCli(["info", "esp32"], WIDE);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Headers");
    expect(result.stdout).toContain("Warnings");
    expect(result.stdout).toContain("boot-strapping");
    expect(result.stdout).toContain("(third-party)");
  });

  it("prints the version", async () => {
    const result = await runCli(["--version"], WIDE);
    expect(result.code).toBe(0);
    expect(result.stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("prints help when run with no arguments", async () => {
    const result = await runCli([], WIDE);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Usage: ph");
    expect(result.stdout).toContain("Examples:");
  });

  it("prints help for `ph help`", async () => {
    const result = await runCli(["help"], WIDE);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Usage: ph");
  });

  it("renders generated dual-row boards (Raspberry Pi 4 via alias)", async () => {
    const result = await runCli(["rpi4"], WIDE);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Raspberry Pi 4 Model B");
    expect(result.stdout).toContain("┌");
    expect(result.stdout).toContain("GPIO2");
  });

  it("renders generated grouped boards (Arduino Nano via alias)", async () => {
    const result = await runCli(["nano"], WIDE);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Arduino Nano");
    expect(result.stdout).toContain("Source:");
  });

  it("renders boards without pinout data gracefully", async () => {
    const result = await runCli(["arduino-portenta-h7"], WIDE);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("No pinout data for this board yet");
    expect(result.stdout).toContain("--source");
  });

  it("matches the Raspberry Pi 5 output snapshot", async () => {
    const result = await runCli(["rpi5", "--width", "100"], { env: {}, isTTY: false });
    expect(result.stdout).toMatchSnapshot();
  });

  it("matches the Raspberry Pi 5 ASCII snapshot", async () => {
    const result = await runCli(["rpi5", "--ascii", "--width", "100"], { env: {}, isTTY: false });
    expect(result.stdout).toMatchSnapshot();
  });
});
