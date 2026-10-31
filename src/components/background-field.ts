import { vendorDomains } from "@/lib/vendor-domains";

/**
 * Data for the page background (CircuitBackground): where each vendor mark
 * sits, and the field of bytes the cursor probe reveals. Everything here is
 * deterministic, so the server and client agree and tests can pin it down.
 */

/** Small seeded PRNG (mulberry32): the same seed always gives the same layout. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------------ */
/* Vendor marks                                                              */
/* ------------------------------------------------------------------------ */

export interface LogoPlacement {
  vendor: string;
  domain: string;
  /** Horizontal offset of the mark's centre from the viewport centre, in px. */
  x: number;
  /** Distance of the mark's centre from the top of the viewport, in px. */
  y: number;
  size: number;
  rotate: number;
}

/**
 * Marks fill the two gutters beside the 1560px content column: four columns
 * a side, starting just inside the column edge so a 1920px screen shows two
 * and a 2560px screen shows all four. Rows run down a 1440px-tall screen.
 */
export const LOGO_COLUMNS = [790, 925, 1060, 1195];
export const LOGO_ROWS = Array.from({ length: 9 }, (_, i) => 70 + i * 165);

/**
 * Vendors left out of the background: the catalog has no M5Stack board, so
 * showing its mark would claim a vendor the catalog does not carry, and
 * "BeagleBoard.org" shares BeagleBoard's mark.
 */
export const LOGO_EXCLUDED_VENDORS = new Set(["M5Stack", "BeagleBoard.org"]);

export function buildLogoPlacements(seed = 7): LogoPlacement[] {
  const random = seededRandom(seed);
  const vendors = Object.entries(vendorDomains).filter(([vendor]) => !LOGO_EXCLUDED_VENDORS.has(vendor));
  // Shuffle once, then deal round-robin so every vendor appears before any repeats.
  for (let i = vendors.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [vendors[i], vendors[j]] = [vendors[j], vendors[i]];
  }
  const placements: LogoPlacement[] = [];
  let next = 0;
  for (const row of LOGO_ROWS) {
    for (const side of [-1, 1]) {
      for (const column of LOGO_COLUMNS) {
        // Stagger alternate rows so the marks read as scattered, not gridded.
        const stagger = (LOGO_ROWS.indexOf(row) % 2) * 55;
        const [vendor, domain] = vendors[next % vendors.length];
        next += 1;
        placements.push({
          vendor,
          domain,
          x: side * (column + stagger + Math.round((random() - 0.5) * 40)),
          y: row + Math.round((random() - 0.5) * 60),
          size: 34 + Math.round(random() * 14),
          rotate: Math.round((random() - 0.5) * 24),
        });
      }
    }
  }
  return placements;
}

export const logoPlacements = buildLogoPlacements();

/* ------------------------------------------------------------------------ */
/* The byte field the probe reveals                                          */
/* ------------------------------------------------------------------------ */

/**
 * - `byte`: filler traffic.
 * - `addr`: an I2C address byte (7-bit address shifted left, R/W in bit 0).
 * - `mark`: an I2C START, ACK, NACK or STOP marker.
 * - `msg`: part of the hidden ASCII message.
 */
export type HexKind = "byte" | "addr" | "mark" | "msg";
export interface HexToken {
  text: string;
  kind: HexKind;
}

/** The puzzle: these bytes are ASCII. */
export const HIDDEN_MESSAGE = "READ THE DATASHEET";

/** Common I2C parts, by 7-bit address, with a register write each would accept. */
export const I2C_DEVICES: Array<{ name: string; address: number; data: number[] }> = [
  { name: "SSD1306 OLED", address: 0x3c, data: [0x00, 0xaf] },
  { name: "MPU-6050 IMU", address: 0x68, data: [0x6b, 0x00] },
  { name: "BME280 sensor", address: 0x76, data: [0xf4, 0x27] },
  { name: "TMP102 temperature", address: 0x48, data: [0x01, 0x60] },
  { name: "PCF8574 I/O expander", address: 0x27, data: [0xff] },
  { name: "INA219 current monitor", address: 0x40, data: [0x00, 0x39, 0x9f] },
  { name: "AT24C32 EEPROM", address: 0x50, data: [0x00, 0x10, 0x42] },
  { name: "BH1750 light sensor", address: 0x23, data: [0x10] },
];

const hex = (byte: number) => byte.toString(16).toUpperCase().padStart(2, "0");

/** One I2C write as tokens: S, address+W, A, then each data byte and its ACK, then P. */
export function i2cFrame(address: number, data: number[]): HexToken[] {
  return [
    { text: " S", kind: "mark" },
    { text: hex((address << 1) | 0), kind: "addr" },
    { text: " A", kind: "mark" },
    ...data.flatMap((byte) => [
      { text: hex(byte), kind: "byte" as const },
      { text: " A", kind: "mark" as const },
    ]),
    { text: " P", kind: "mark" },
  ];
}

/**
 * A field of `rows` x `cols` two-character tokens. Filler bytes are random;
 * I2C writes to common parts are scattered through it, and the hidden message
 * is laid in at a few places so the probe is likely to cross one.
 */
export function buildHexField(cols: number, rows: number, seed = 1983): HexToken[][] {
  const random = seededRandom(seed);
  const field: HexToken[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ text: hex(Math.floor(random() * 256)), kind: "byte" as const })),
  );
  const taken = Array.from({ length: rows }, () => new Array<boolean>(cols).fill(false));

  const place = (tokens: HexToken[], row: number, col: number) => {
    if (row < 0 || row >= rows || col < 0 || col + tokens.length > cols) return false;
    for (let i = 0; i < tokens.length; i += 1) if (taken[row][col + i]) return false;
    tokens.forEach((token, i) => {
      field[row][col + i] = token;
      taken[row][col + i] = true;
    });
    return true;
  };

  const message = [...HIDDEN_MESSAGE].map((char) => ({ text: hex(char.charCodeAt(0)), kind: "msg" as const }));
  // One copy in each quarter of the field.
  for (const [fy, fx] of [[0.22, 0.08], [0.3, 0.62], [0.68, 0.14], [0.78, 0.58]]) {
    place(message, Math.floor(rows * fy), Math.floor(cols * fx));
  }

  for (let row = 1; row < rows; row += 2) {
    const device = I2C_DEVICES[Math.floor(random() * I2C_DEVICES.length)];
    const frame = i2cFrame(device.address, device.data);
    place(frame, row, Math.floor(random() * Math.max(1, cols - frame.length)));
  }
  return field;
}

/** Token pitch for the field's 11px Geist Mono: two glyphs plus a space, and line height. */
export const HEX_TOKEN_WIDTH = 20;
export const HEX_LINE_HEIGHT = 20;
