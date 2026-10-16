import { describe, expect, it } from "vitest";
import {
  CAPTURE_WIDTH,
  captureLanes,
  laneTops,
  levelAt,
  wavePath,
  type Lane,
  type Wave,
} from "@/components/bus-capture";

const lane = (name: string): Lane => {
  const found = captureLanes.find((candidate) => candidate.name === name);
  if (!found) throw new Error(`no lane ${name}`);
  return found;
};

const risingEdges = (wave: Wave) => wave.edges.filter((edge) => edge.level === 1).map((edge) => edge.x);

/** Decodes UART 8N1 (LSB first) by sampling mid-bit from each start edge. */
function decodeUart(wave: Wave, bit = 11): string {
  let text = "";
  let x = 0;
  while (x < CAPTURE_WIDTH) {
    const start = wave.edges.find((edge) => edge.x >= x && edge.level === 0);
    if (!start) break;
    let code = 0;
    for (let i = 0; i < 8; i += 1) code |= levelAt(wave, start.x + (1.5 + i) * bit) << i;
    expect(levelAt(wave, start.x + 9.5 * bit), "stop bit").toBe(1);
    text += String.fromCharCode(code);
    x = start.x + 10 * bit;
  }
  return text;
}

/** Decodes I2C by sampling SDA on every SCL rising edge, framed by START/STOP. */
function decodeI2c(scl: Wave, sda: Wave): string[] {
  const transactions: string[] = [];
  let bits: number[] = [];
  const events = [
    ...sda.edges.filter((edge) => levelAt(scl, edge.x) === 1).map((edge) => ({ x: edge.x, kind: edge.level === 0 ? "start" : "stop" })),
    ...risingEdges(scl).map((x) => ({ x, kind: "clock" })),
  ].sort((a, b) => a.x - b.x);
  for (const event of events) {
    if (event.kind === "start") bits = [];
    if (event.kind === "clock") bits.push(levelAt(sda, event.x));
    if (event.kind === "stop") {
      const bytes: string[] = [];
      for (let i = 0; i + 9 <= bits.length; i += 9) {
        const value = bits.slice(i, i + 8).reduce((acc, bit) => (acc << 1) | bit, 0);
        bytes.push(`${value.toString(16).padStart(2, "0")}${bits[i + 8] ? "N" : "A"}`);
      }
      transactions.push(bytes.join(" "));
    }
  }
  return transactions;
}

/** Decodes SPI mode 0 by sampling MOSI/MISO on SCK rising edges while CS is low. */
function decodeSpi(): Array<{ mosi: number[]; miso: number[] }> {
  const cs = lane("CS").wave;
  const sck = lane("SCK").wave;
  const mosi = lane("MOSI").wave;
  const miso = lane("MISO").wave;
  const frames: Array<{ mosi: number[]; miso: number[] }> = [];
  const selects = cs.edges.filter((edge) => edge.level === 0).map((edge) => edge.x);
  for (const begin of selects) {
    const end = cs.edges.find((edge) => edge.x > begin && edge.level === 1)!.x;
    const clocks = risingEdges(sck).filter((x) => x > begin && x < end);
    expect(clocks.length % 8).toBe(0);
    const pack = (wave: Wave) =>
      Array.from({ length: clocks.length / 8 }, (_, byte) =>
        clocks.slice(byte * 8, byte * 8 + 8).reduce((acc, x) => (acc << 1) | levelAt(wave, x), 0),
      );
    frames.push({ mosi: pack(mosi), miso: pack(miso) });
  }
  return frames;
}

describe("background bus capture", () => {
  it("UART lanes spell out the AT exchange, LSB first with valid stop bits", () => {
    const CR = String.fromCharCode(13);
    const LF = String.fromCharCode(10);
    expect(decodeUart(lane("TX").wave)).toBe(`AT${CR}${LF}PinHub${LF}`);
    expect(decodeUart(lane("RX").wave)).toBe(`OK${CR}${LF}OK${CR}${LF}`);
  });

  it("I2C lanes carry well-formed transactions with correct ACK/NACK", () => {
    const scl = lane("SCL").wave;
    const sda = lane("SDA").wave;
    expect(decodeI2c(scl, sda)).toEqual([
      "78A 00A afA", // 0x3C write: display on
      "91A 19A 60N", // 0x48 read: controller NACKs the last byte
      "78A 00A 8dA 14A", // 0x3C write: charge pump on
    ]);
    // SDA only moves while SCL is high to form START or STOP, never mid-byte.
    const highEdges = sda.edges.filter((edge) => levelAt(scl, edge.x) === 1);
    expect(highEdges).toHaveLength(6);
  });

  it("SPI lanes decode as mode-0 flash commands", () => {
    expect(decodeSpi()).toEqual([
      { mosi: [0x9f, 0, 0, 0], miso: [0xff, 0xef, 0x40, 0x18] },
      { mosi: [0x03, 0, 0, 0, 0, 0, 0], miso: [0xff, 0xff, 0xff, 0xff, 0x50, 0x69, 0x6e] },
      { mosi: [0x05, 0], miso: [0xff, 0x00] },
    ]);
  });

  it("decode labels match the bytes on the wire", () => {
    expect(lane("SDA").decodes.map((decode) => decode.text)).toEqual([
      "0x3C W", "0x00", "0xAF", "0x48 R", "0x19", "0x60", "0x3C W", "0x00", "0x8D", "0x14",
    ]);
    expect(lane("MISO").decodes.map((decode) => decode.text)).toEqual([
      "0xEF", "0x40", "0x18", "0x50", "0x69", "0x6E", "0x00",
    ]);
    expect(lane("TX").decodes.map((decode) => decode.text)).toEqual([
      "'A'", "'T'", "CR", "LF", "'P'", "'i'", "'n'", "'H'", "'u'", "'b'", "LF",
    ]);
  });

  it("every lane loops without a seam and stays inside the strip", () => {
    for (const { name, wave } of captureLanes) {
      const xs = wave.edges.map((edge) => edge.x);
      expect(xs, name).toEqual([...xs].sort((a, b) => a - b));
      expect(Math.min(...xs), name).toBeGreaterThanOrEqual(0);
      expect(Math.max(...xs), name).toBeLessThan(CAPTURE_WIDTH);
      expect(levelAt(wave, CAPTURE_WIDTH), name).toBe(wave.initial);
      expect(wavePath(wave, 0, 10).endsWith(`H${CAPTURE_WIDTH}`), name).toBe(true);
    }
  });

  it("lane positions stay in order inside the viewport", () => {
    const tops = laneTops(captureLanes);
    expect(tops).toHaveLength(captureLanes.length);
    expect(tops[0]).toBe(16);
    expect(tops.at(-1)).toBeCloseTo(94, 1);
    tops.slice(1).forEach((top, i) => expect(top).toBeGreaterThan(tops[i]));
  });
});
