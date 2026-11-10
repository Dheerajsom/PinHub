// Finds the pins a piece of firmware uses, without knowing the board. The
// scanner is a small, deliberately conservative reader: it masks comments and
// string contents, follows simple constants (`#define LED 13`,
// `const int led = 13;`, `LED = 25`), and recognises the calls each toolchain
// uses to take a pin. Anything it cannot follow is reported as such rather
// than guessed. Resolving a reference to a physical pin is `check.ts`'s job.

export type Dialect =
  | "arduino"
  | "micropython"
  | "circuitpython"
  | "rpi-python"
  | "pico-sdk"
  | "esp-idf";

export const dialects: readonly Dialect[] = [
  "arduino",
  "micropython",
  "circuitpython",
  "rpi-python",
  "pico-sdk",
  "esp-idf",
];

export const dialectLabels: Record<Dialect, string> = {
  arduino: "Arduino",
  micropython: "MicroPython",
  circuitpython: "CircuitPython",
  "rpi-python": "Raspberry Pi Python",
  "pico-sdk": "Pico SDK",
  "esp-idf": "ESP-IDF",
};

export type BusPeripheral = "I2C" | "SPI" | "UART";

/** What the code does with a pin, in the code's own terms. */
export type Usage =
  | { kind: "output" | "input" | "gpio" | "adc" | "dac" | "pwm" | "touch"; label: string }
  | {
      kind: "bus";
      peripheral: BusPeripheral;
      signal: string;
      soft: boolean;
      label: string;
      /** MicroPython bus id (`I2C(0, ...)`), when the code names one. */
      busId?: number;
    };

/** A pin value as written in the code, before it is matched to a board. */
export type PinSpec =
  | { kind: "number"; value: number }
  | { kind: "name"; value: string }
  /** `LED_BUILTIN`, MicroPython `Pin("LED")`, CircuitPython `board.LED`. */
  | { kind: "onboard-led" }
  /** A bus constructed by id with no pins named (`I2C(0)`), resolved to its recorded defaults. */
  | { kind: "bus-default"; peripheral: BusPeripheral; id: number; signal: string };

export type PinRef = {
  spec: PinSpec;
  usage: Usage;
  /** The pin argument's text, trimmed, as written. */
  text: string;
  /** Offsets into the source of the pin argument. */
  start: number;
  end: number;
  /** 1-based line of the pin argument. */
  line: number;
  /** The constant the value came through, when it came through one. */
  via?: string;
  /** Raspberry Pi `GPIO.setmode(GPIO.BOARD)` / gpiozero `BOARD11`: a physical header position. */
  physical?: boolean;
  /** Arduino `analogRead(n)` with a bare channel number. */
  analogChannel?: boolean;
};

export type Unfollowed = { text: string; usage: Usage; line: number; start: number; end: number };

export type ScanResult = {
  dialect: Dialect | null;
  refs: PinRef[];
  unfollowed: Unfollowed[];
  /** The code also brings up Wi-Fi (for the ADC2 caution). */
  usesWifi: boolean;
  /** Input was cut to `maxSourceLength`. */
  truncated: boolean;
};

export const maxSourceLength = 100_000;
const maxRefs = 400;
const maxConstantDepth = 8;

// ---------------------------------------------------------------------------
// Masking

export type Family = "c" | "python";

export type SourceRange = { start: number; end: number; kind: "comment" | "string" };

/** Comments and string literals (quotes included), in order. */
export function sourceRanges(source: string, family: Family): SourceRange[] {
  const ranges: SourceRange[] = [];
  let i = 0;
  const n = source.length;
  const lineEnd = (from: number) => {
    const end = source.indexOf("\n", from);
    return end === -1 ? n : end;
  };
  while (i < n) {
    const c = source[i];
    const next = source[i + 1];
    let stop = -1;
    let kind: SourceRange["kind"] = "comment";
    if (family === "c" && c === "/" && next === "/") {
      stop = lineEnd(i);
    } else if (family === "c" && c === "/" && next === "*") {
      const end = source.indexOf("*/", i + 2);
      stop = end === -1 ? n : end + 2;
    } else if (family === "python" && c === "#") {
      stop = lineEnd(i);
    } else if (family === "python" && (source.startsWith('"""', i) || source.startsWith("'''", i))) {
      // Docstrings read as comments: nothing in them configures a pin.
      const end = source.indexOf(source.slice(i, i + 3), i + 3);
      stop = end === -1 ? n : end + 3;
    } else if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n && source[j] !== c && source[j] !== "\n") j += source[j] === "\\" ? 2 : 1;
      stop = Math.min(j + 1, n);
      kind = "string";
    }
    if (stop === -1) {
      i += 1;
      continue;
    }
    ranges.push({ start: i, end: stop, kind });
    i = stop;
  }
  return ranges;
}

/**
 * Replaces comments with spaces and string *contents* with spaces, keeping
 * every offset and newline, so structure can be read from the mask and values
 * from the original text at the same offsets.
 */
export function maskSource(source: string, family: Family): string {
  const out = source.split("");
  for (const range of sourceRanges(source, family)) {
    const from = range.kind === "string" ? range.start + 1 : range.start;
    const to = range.kind === "string" && source[range.end - 1] === source[range.start] && range.end - range.start > 1 ? range.end - 1 : range.end;
    for (let i = from; i < to; i += 1) if (out[i] !== "\n") out[i] = " ";
  }
  return out.join("");
}

// ---------------------------------------------------------------------------
// Dialect detection

const dialectSignals: Array<{ dialect: Dialect; pattern: RegExp; weight: number }> = [
  { dialect: "circuitpython", pattern: /^\s*import\s+(?:board|digitalio|busio|analogio|pwmio)\b/m, weight: 4 },
  { dialect: "circuitpython", pattern: /\bboard\.[A-Z][A-Z0-9_]*\b/, weight: 2 },
  { dialect: "rpi-python", pattern: /\b(?:RPi\.GPIO|gpiozero|lgpio)\b/, weight: 5 },
  { dialect: "micropython", pattern: /^\s*(?:from\s+machine\s+import|import\s+machine\b)/m, weight: 5 },
  { dialect: "micropython", pattern: /\b(?:Pin\.(?:OUT|IN)|SoftI2C|neopixel\.NeoPixel\(\s*Pin)\b/, weight: 2 },
  { dialect: "pico-sdk", pattern: /#include\s*[<"](?:pico\/|hardware\/)/, weight: 5 },
  { dialect: "pico-sdk", pattern: /\b(?:gpio_init|gpio_put|gpio_set_dir|gpio_set_function|adc_gpio_init)\s*\(/, weight: 3 },
  { dialect: "esp-idf", pattern: /#include\s*[<"](?:driver\/|freertos\/|esp_)/, weight: 4 },
  { dialect: "esp-idf", pattern: /\b(?:GPIO_NUM_\d+|gpio_set_direction|gpio_set_level|gpio_config|app_main)\b/, weight: 3 },
  { dialect: "arduino", pattern: /\b(?:pinMode|digitalWrite|digitalRead|analogRead|analogWrite)\s*\(/, weight: 4 },
  { dialect: "arduino", pattern: /\bvoid\s+(?:setup|loop)\s*\(/, weight: 4 },
  { dialect: "arduino", pattern: /#include\s*[<"](?:Arduino|Wire|SPI|Servo|Adafruit_)/, weight: 3 },
];

export function detectDialect(source: string): Dialect | null {
  const text = source.slice(0, maxSourceLength);
  const scores = new Map<Dialect, number>();
  for (const { dialect, pattern, weight } of dialectSignals) {
    if (pattern.test(text)) scores.set(dialect, (scores.get(dialect) ?? 0) + weight);
  }
  let best: Dialect | null = null;
  let bestScore = 0;
  for (const dialect of dialects) {
    const score = scores.get(dialect) ?? 0;
    if (score > bestScore) {
      best = dialect;
      bestScore = score;
    }
  }
  return best;
}

export function dialectFamily(dialect: Dialect): Family {
  return dialect === "micropython" || dialect === "circuitpython" || dialect === "rpi-python" ? "python" : "c";
}

// ---------------------------------------------------------------------------
// Calls

type Arg = { text: string; start: number; end: number; keyword?: string };
export type Call = { callee: string; args: Arg[]; start: number; /** Constructor declared as `Type name(args)`. */ declared?: boolean };

const calleePattern = /([A-Za-z_][\w]*(?:\s*(?:\.|::|->)\s*[A-Za-z_]\w*)*)\s*\(/g;
const declarationPattern = /\b([A-Z][A-Za-z0-9_]*)[ \t]+[A-Za-z_]\w*[ \t]*\(/g;

/** Finds the `)` matching the `(` at `open`, in the masked text. */
function closingParen(masked: string, open: number): number {
  let depth = 0;
  for (let i = open; i < masked.length; i += 1) {
    const c = masked[i];
    if (c === "(" || c === "[" || c === "{") depth += 1;
    else if (c === ")" || c === "]" || c === "}") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function splitArgs(source: string, masked: string, open: number, close: number): Arg[] {
  const args: Arg[] = [];
  let depth = 0;
  let from = open + 1;
  const push = (to: number) => {
    let start = from;
    let end = to;
    while (start < end && /\s/.test(masked[start])) start += 1;
    while (end > start && /\s/.test(masked[end - 1])) end -= 1;
    if (start === end) return;
    let text = source.slice(start, end);
    let keyword: string | undefined;
    const kw = /^([A-Za-z_]\w*)\s*=(?!=)\s*/.exec(masked.slice(start, end));
    if (kw) {
      keyword = kw[1];
      start += kw[0].length;
      text = source.slice(start, end);
    }
    args.push({ text, start, end, keyword });
  };
  for (let i = open + 1; i < close; i += 1) {
    const c = masked[i];
    if (c === "(" || c === "[" || c === "{") depth += 1;
    else if (c === ")" || c === "]" || c === "}") depth -= 1;
    else if (c === "," && depth === 0) {
      push(i);
      from = i + 1;
    }
  }
  push(close);
  return args;
}

export function findCalls(source: string, masked: string, family: Family = "c"): Call[] {
  const calls: Call[] = [];
  const add = (callee: string, start: number, open: number, declared: boolean) => {
    const close = closingParen(masked, open);
    if (close === -1) return;
    calls.push({ callee: callee.replace(/\s+/g, ""), args: splitArgs(source, masked, open, close), start, declared });
  };
  for (const match of masked.matchAll(calleePattern)) {
    const open = (match.index ?? 0) + match[0].length - 1;
    add(match[1], match.index ?? 0, open, false);
  }
  // `Type name(args)` declares an object in C++ only.
  for (const match of family === "c" ? masked.matchAll(declarationPattern) : []) {
    const open = (match.index ?? 0) + match[0].length - 1;
    add(match[1], match.index ?? 0, open, true);
  }
  return calls.sort((a, b) => a.start - b.start);
}

// ---------------------------------------------------------------------------
// Constants

type Constant = { text: string; start: number };

const cConstantPatterns = [
  /^[ \t]*#define[ \t]+([A-Za-z_]\w*)[ \t]+([^\n]+?)[ \t]*$/gm,
  /\b(?:(?:static|const|constexpr|volatile|unsigned|signed|uint8_t|uint16_t|uint32_t|int8_t|int16_t|int32_t|int|byte|short|long|gpio_num_t|uint|pin_size_t|PinName)\s+)+([A-Za-z_]\w*)\s*=\s*([^;,\n]+?)\s*[;,]/g,
];
const pythonConstantPattern = /^[ \t]*([A-Za-z_]\w*)\s*=(?!=)\s*([^\n]+?)\s*$/gm;

function collectConstants(source: string, masked: string, family: Family): Map<string, Constant> {
  const constants = new Map<string, Constant>();
  const patterns = family === "c" ? cConstantPatterns : [pythonConstantPattern];
  for (const pattern of patterns) {
    for (const match of masked.matchAll(pattern)) {
      const valueStart = (match.index ?? 0) + match[0].lastIndexOf(match[2]);
      const text = source.slice(valueStart, valueStart + match[2].length).trim();
      // The first definition wins; a later reassignment is a variable, not a pin constant.
      if (!constants.has(match[1])) constants.set(match[1], { text, start: valueStart });
    }
  }
  return constants;
}

// ---------------------------------------------------------------------------
// Values

type Value =
  | { kind: "spec"; spec: PinSpec; via?: string; physical?: boolean }
  | { kind: "list"; items: Value[] }
  | { kind: "unfollowed" };

const quoted = /^(?:[rbuRBUfF]{0,2})(["'])([\s\S]*)\1$/;
const onboardLedNames = new Set(["LED_BUILTIN", "PICO_DEFAULT_LED_PIN", "BUILTIN_LED"]);
// Names a pin can go by on its own. A lower-case identifier is a variable.
const pinNamePattern = /^(?:A\d{1,2}|D\d{1,3}|P[A-K]\d{1,2}|GP\d{1,2}|GPIO\d{1,2}|IO\d{1,2}|P\d_\d{1,2}|PIN_[A-Z0-9_]+)$/;

type Context = {
  source: string;
  masked: string;
  dialect: Dialect;
  constants: Map<string, Constant>;
  rpiBoardNumbering: boolean;
};

function stripWrapping(text: string): string {
  let value = text.trim();
  for (;;) {
    const before = value;
    value = value
      .replace(/^\((?:const\s+)?[A-Za-z_][\w\s]*\*?\)\s*/, "") // C cast
      .replace(/^static_cast<[^>]+>\(([\s\S]*)\)$/, "$1")
      .replace(/^(?:uint8_t|int|gpio_num_t|pin_size_t)\(([\s\S]*)\)$/, "$1")
      .trim();
    if (/^\([\s\S]*\)$/.test(value) && closingBalanced(value)) value = value.slice(1, -1).trim();
    if (value === before) return value;
  }
}

function closingBalanced(value: string): boolean {
  let depth = 0;
  for (let i = 0; i < value.length; i += 1) {
    if (value[i] === "(") depth += 1;
    else if (value[i] === ")") {
      depth -= 1;
      if (depth === 0 && i < value.length - 1) return false;
    }
  }
  return depth === 0;
}

function evaluate(text: string, ctx: Context, depth = 0, via?: string): Value {
  const value = stripWrapping(text);
  if (!value || depth > maxConstantDepth) return { kind: "unfollowed" };

  if (/^\[[\s\S]*\]$/.test(value) || /^\([\s\S]*,[\s\S]*\)$/.test(value)) {
    const inner = value.slice(1, -1);
    const items = inner.split(",").map((item) => item.trim()).filter(Boolean);
    return { kind: "list", items: items.map((item) => evaluate(item, ctx, depth + 1, via)) };
  }

  const number = /^(0x[0-9a-f]+|\d+)[uUlL]*$/i.exec(value);
  if (number) {
    const parsed = Number(number[1]);
    return { kind: "spec", spec: { kind: "number", value: parsed }, via, physical: ctx.rpiBoardNumbering || undefined };
  }

  const idfNum = /^GPIO_NUM_(\d+)$/.exec(value);
  if (idfNum) return { kind: "spec", spec: { kind: "number", value: Number(idfNum[1]) }, via };

  const string = quoted.exec(value);
  if (string) return stringSpec(string[2], ctx, via);

  // MicroPython Pin(...) / machine.Pin(...): the pin is its first argument.
  const pinCall = /^(?:machine\.)?Pin\s*\(([\s\S]*)\)$/.exec(value);
  if (pinCall && ctx.dialect === "micropython") {
    const first = topLevelFirst(pinCall[1]);
    return first ? evaluate(first, ctx, depth + 1, via) : { kind: "unfollowed" };
  }

  // MicroPython named pins: Pin.cpu.A5 is PA5; Pin.board.X1 is the board's name.
  const cpu = /^(?:machine\.)?Pin\.cpu\.([A-K])(\d{1,2})$/.exec(value);
  if (cpu) return { kind: "spec", spec: { kind: "name", value: `P${cpu[1]}${cpu[2]}` }, via };
  const boardPin = /^(?:machine\.)?Pin\.board\.([A-Za-z_]\w*)$/.exec(value);
  if (boardPin) return nameSpec(boardPin[1], via);

  // CircuitPython board.D13 / board.LED / board.GP15.
  const cpBoard = /^board\.([A-Za-z_]\w*)$/.exec(value);
  if (cpBoard) return nameSpec(cpBoard[1], via);

  if (/^[A-Za-z_]\w*$/.test(value)) {
    if (onboardLedNames.has(value)) return { kind: "spec", spec: { kind: "onboard-led" }, via };
    const constant = ctx.constants.get(value);
    if (constant) return evaluate(constant.text, ctx, depth + 1, via ?? value);
    if (pinNamePattern.test(value)) return { kind: "spec", spec: { kind: "name", value }, via };
  }
  return { kind: "unfollowed" };
}

function nameSpec(name: string, via?: string): Value {
  if (name === "LED" || onboardLedNames.has(name)) return { kind: "spec", spec: { kind: "onboard-led" }, via };
  return { kind: "spec", spec: { kind: "name", value: name }, via };
}

function stringSpec(text: string, ctx: Context, via?: string): Value {
  const value = text.trim();
  if (!value || value.length > 24) return { kind: "unfollowed" };
  if (ctx.dialect === "rpi-python") {
    const board = /^(?:BOARD|J8:)(\d{1,2})$/i.exec(value);
    if (board) return { kind: "spec", spec: { kind: "number", value: Number(board[1]) }, via, physical: true };
    const bcm = /^(?:BCM|GPIO)(\d{1,2})$/i.exec(value);
    if (bcm) return { kind: "spec", spec: { kind: "number", value: Number(bcm[1]) }, via };
  }
  return nameSpec(value, via);
}

function topLevelFirst(text: string): string | null {
  let depth = 0;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (c === "(" || c === "[" || c === "{") depth += 1;
    else if (c === ")" || c === "]" || c === "}") depth -= 1;
    else if (c === "," && depth === 0) return text.slice(0, i).trim();
  }
  return text.trim() || null;
}

// ---------------------------------------------------------------------------
// Rules: which arguments of which calls are pins, and how they are used.

const usage = {
  output: { kind: "output", label: "Output" },
  input: { kind: "input", label: "Input" },
  gpio: { kind: "gpio", label: "Digital I/O" },
  adc: { kind: "adc", label: "Analog read" },
  dac: { kind: "dac", label: "Analog out" },
  pwm: { kind: "pwm", label: "PWM" },
  servo: { kind: "pwm", label: "Servo" },
  touch: { kind: "touch", label: "Touch" },
  pixel: { kind: "output", label: "LED strip data" },
  oneWire: { kind: "gpio", label: "1-Wire bus" },
  sensorData: { kind: "gpio", label: "Sensor data line" },
} satisfies Record<string, Usage>;

function bus(peripheral: BusPeripheral, signal: string, soft = false, busId?: number): Usage {
  const use: Usage = { kind: "bus", peripheral, signal, soft, label: `${soft ? "Soft " : ""}${peripheral} ${signal}` };
  if (busId !== undefined) use.busId = busId;
  return use;
}

function busIdOf(call: Call): number | undefined {
  const id = positional(call, 0) ?? keyword(call, "id");
  return id && /^\d$/.test(id.text.trim()) ? Number(id.text.trim()) : undefined;
}

type Pick = { arg: Arg; usage: Usage; analogChannel?: boolean };

function modeUsage(text: string | undefined): Usage {
  if (!text) return usage.gpio;
  if (/OUTPUT|\bOUT\b|OPEN_DRAIN|GPIO_OUT\b|GPIO_MODE_OUTPUT|^(?:true|1)$/i.test(text)) return usage.output;
  if (/INPUT|\bIN\b|GPIO_IN\b|GPIO_MODE_INPUT|^(?:false|0)$/i.test(text)) return usage.input;
  return usage.gpio;
}

function positional(call: Call, index: number): Arg | undefined {
  return call.args.filter((arg) => !arg.keyword)[index];
}

function keyword(call: Call, ...names: string[]): Arg | undefined {
  return call.args.find((arg) => arg.keyword && names.includes(arg.keyword));
}

function picks(...items: Array<[Arg | undefined, Usage]>): Pick[] {
  return items.flatMap(([arg, use]) => (arg ? [{ arg, usage: use }] : []));
}

function tail(callee: string): string {
  const parts = callee.split(/\.|::|->/);
  return parts[parts.length - 1];
}

/** True when a call's receiver looks like an Arduino Wire/SPI/Serial object. */
function receiver(callee: string, pattern: RegExp): boolean {
  const parts = callee.split(/\.|::|->/);
  return parts.length >= 2 && pattern.test(parts[parts.length - 2]);
}

function arduinoRules(call: Call, servos: ReadonlySet<string>): Pick[] {
  const name = tail(call.callee);
  const a = (i: number) => positional(call, i);
  if (call.declared) {
    switch (call.callee) {
      case "Adafruit_NeoPixel":
        return picks([a(1), usage.pixel]);
      case "DHT":
        return picks([a(0), usage.sensorData]);
      case "OneWire":
        return picks([a(0), usage.oneWire]);
      case "SoftwareSerial":
        return picks([a(0), bus("UART", "RX", true)], [a(1), bus("UART", "TX", true)]);
      case "LiquidCrystal":
        return call.args.map((arg) => ({ arg, usage: usage.output }));
      default:
        return [];
    }
  }
  switch (name) {
    case "pinMode":
      return picks([a(0), modeUsage(a(1)?.text)]);
    case "digitalWrite":
    case "tone":
    case "noTone":
      return picks([a(0), usage.output]);
    case "digitalRead":
    case "pulseIn":
    case "digitalPinToInterrupt":
      return picks([a(0), usage.input]);
    case "analogRead": {
      const arg = a(0);
      return arg ? [{ arg, usage: usage.adc, analogChannel: true }] : [];
    }
    case "analogWrite":
    case "ledcAttachPin":
    case "ledcAttach":
    case "ledcAttachChannel":
      return picks([a(0), usage.pwm]);
    case "dacWrite":
      return picks([a(0), usage.dac]);
    case "touchRead":
      return picks([a(0), usage.touch]);
    case "shiftOut":
      return picks([a(0), usage.output], [a(1), usage.output]);
    case "shiftIn":
      return picks([a(0), usage.input], [a(1), usage.output]);
    case "attach":
      // Only objects declared as `Servo name;` (or named like one): many other
      // libraries have an attach().
      return receiver(call.callee, /servo/i) || servos.has(call.callee.split(/\.|->/)[0]) ? picks([a(0), usage.servo]) : [];
    case "begin":
      if (receiver(call.callee, /^Wire\d?$/) && call.args.length >= 2) {
        return picks([a(0), bus("I2C", "SDA")], [a(1), bus("I2C", "SCL")]);
      }
      if (receiver(call.callee, /^(?:SPI|hspi|vspi|spi)\d?$/i) && call.args.length >= 3) {
        return picks([a(0), bus("SPI", "SCK")], [a(1), bus("SPI", "MISO")], [a(2), bus("SPI", "MOSI")], [a(3), bus("SPI", "CS")]);
      }
      if (receiver(call.callee, /^Serial\d$/) && call.args.length >= 4) {
        return picks([a(2), bus("UART", "RX")], [a(3), bus("UART", "TX")]);
      }
      return [];
    case "setPins":
      if (receiver(call.callee, /^Wire\d?$/)) return picks([a(0), bus("I2C", "SDA")], [a(1), bus("I2C", "SCL")]);
      if (receiver(call.callee, /^Serial\d?$/)) return picks([a(0), bus("UART", "RX")], [a(1), bus("UART", "TX")]);
      return [];
    case "setSDA":
      return picks([a(0), bus("I2C", "SDA")]);
    case "setSCL":
      return picks([a(0), bus("I2C", "SCL")]);
    case "setSCK":
      return picks([a(0), bus("SPI", "SCK")]);
    case "setMOSI":
      return picks([a(0), bus("SPI", "MOSI")]);
    case "setMISO":
      return picks([a(0), bus("SPI", "MISO")]);
    case "setCS":
      return picks([a(0), bus("SPI", "CS")]);
    case "setTX":
      return receiver(call.callee, /^SPI\d?$/) ? picks([a(0), bus("SPI", "MOSI")]) : picks([a(0), bus("UART", "TX")]);
    case "setRX":
      return receiver(call.callee, /^SPI\d?$/) ? picks([a(0), bus("SPI", "MISO")]) : picks([a(0), bus("UART", "RX")]);
    default:
      return [];
  }
}

const picoFunctionUsage: Record<string, Usage> = {
  GPIO_FUNC_I2C: { kind: "gpio", label: "I2C" },
  GPIO_FUNC_SPI: { kind: "gpio", label: "SPI" },
  GPIO_FUNC_UART: { kind: "gpio", label: "UART" },
  GPIO_FUNC_PWM: usage.pwm,
  GPIO_FUNC_SIO: usage.gpio,
};

function picoSdkRules(call: Call): Pick[] {
  const a = (i: number) => positional(call, i);
  switch (call.callee) {
    case "gpio_init":
      return picks([a(0), usage.gpio]);
    case "gpio_set_dir":
      return picks([a(0), modeUsage(a(1)?.text)]);
    case "gpio_put":
      return picks([a(0), usage.output]);
    case "gpio_get":
    case "gpio_pull_up":
    case "gpio_pull_down":
    case "gpio_set_irq_enabled":
    case "gpio_set_irq_enabled_with_callback":
      return picks([a(0), usage.input]);
    case "gpio_set_function": {
      const fn = a(1)?.text.trim() ?? "";
      return picks([a(0), picoFunctionUsage[fn] ?? usage.gpio]);
    }
    case "adc_gpio_init":
      return picks([a(0), usage.adc]);
    case "pwm_gpio_to_slice_num":
    case "pwm_gpio_to_channel":
      return picks([a(0), usage.pwm]);
    default:
      return [];
  }
}

function espIdfRules(call: Call): Pick[] {
  const a = (i: number) => positional(call, i);
  switch (call.callee) {
    case "gpio_reset_pin":
      return picks([a(0), usage.gpio]);
    case "gpio_set_direction":
      return picks([a(0), modeUsage(a(1)?.text)]);
    case "gpio_set_level":
      return picks([a(0), usage.output]);
    case "gpio_get_level":
    case "gpio_set_pull_mode":
    case "gpio_pullup_en":
    case "gpio_pulldown_en":
    case "gpio_isr_handler_add":
      return picks([a(0), usage.input]);
    case "uart_set_pin":
      return picks([a(1), bus("UART", "TX")], [a(2), bus("UART", "RX")]);
    default:
      return [];
  }
}

const idfFields: Record<string, Usage> = {
  gpio_num: usage.pwm, // ledc_channel_config_t; other structs use pin_bit_mask
  sda_io_num: bus("I2C", "SDA"),
  scl_io_num: bus("I2C", "SCL"),
  mosi_io_num: bus("SPI", "MOSI"),
  miso_io_num: bus("SPI", "MISO"),
  sclk_io_num: bus("SPI", "SCK"),
  spics_io_num: bus("SPI", "CS"),
  tx_io_num: bus("UART", "TX"),
  rx_io_num: bus("UART", "RX"),
};

function micropythonRules(call: Call): Pick[] {
  const name = tail(call.callee);
  const a = (i: number) => positional(call, i);
  const soft = name.startsWith("Soft");
  switch (name) {
    case "Pin":
      // Pin.board.X / machine.Pin(...) — a plain Pin(...) states its mode.
      return picks([a(0), modeUsage(keyword(call, "mode")?.text ?? a(1)?.text)]);
    case "Signal":
      return picks([a(0), usage.gpio]);
    case "ADC":
      return picks([a(0), usage.adc]);
    case "DAC":
      return picks([a(0), usage.dac]);
    case "PWM":
      return picks([a(0), usage.pwm]);
    case "TouchPad":
      return picks([a(0), usage.touch]);
    case "NeoPixel":
      return picks([a(0), usage.pixel]);
    case "DHT11":
    case "DHT22":
      return picks([a(0), usage.sensorData]);
    case "OneWire":
      return picks([a(0), usage.oneWire]);
    case "I2C":
    case "SoftI2C": {
      const id = soft ? undefined : busIdOf(call);
      const named = picks([keyword(call, "sda"), bus("I2C", "SDA", soft, id)], [keyword(call, "scl"), bus("I2C", "SCL", soft, id)]);
      return named.length || soft ? named : busDefaults(call, "I2C", ["SDA", "SCL"]);
    }
    case "SPI":
    case "SoftSPI": {
      const id = soft ? undefined : busIdOf(call);
      const named = picks(
        [keyword(call, "sck"), bus("SPI", "SCK", soft, id)],
        [keyword(call, "mosi"), bus("SPI", "MOSI", soft, id)],
        [keyword(call, "miso"), bus("SPI", "MISO", soft, id)],
      );
      return named.length || soft ? named : busDefaults(call, "SPI", ["SCK", "MOSI", "MISO"]);
    }
    case "UART": {
      const id = busIdOf(call);
      const named = picks([keyword(call, "tx"), bus("UART", "TX", false, id)], [keyword(call, "rx"), bus("UART", "RX", false, id)]);
      return named.length ? named : busDefaults(call, "UART", ["TX", "RX"]);
    }
    default:
      return [];
  }
}

/** `I2C(0)` with no pins: the bus id stands for the port's default pins. */
function busDefaults(call: Call, peripheral: BusPeripheral, signals: string[]): Pick[] {
  const id = positional(call, 0) ?? keyword(call, "id");
  if (!id || !/^\d$/.test(id.text.trim()) || call.args.length !== 1) return [];
  return signals.map((signal) => ({
    arg: { ...id, text: `${peripheral}(${id.text.trim()}) ${signal}` },
    usage: bus(peripheral, signal),
  }));
}

function circuitpythonRules(call: Call): Pick[] {
  const name = tail(call.callee);
  const a = (i: number) => positional(call, i);
  switch (name) {
    case "DigitalInOut":
      return picks([a(0), usage.gpio]);
    case "AnalogIn":
      return picks([a(0), usage.adc]);
    case "AnalogOut":
      return picks([a(0), usage.dac]);
    case "PWMOut":
      return picks([a(0), usage.pwm]);
    case "TouchIn":
      return picks([a(0), usage.touch]);
    case "NeoPixel":
      return picks([a(0), usage.pixel]);
    case "I2C":
      return /^busio\.|^bitbangio\./.test(call.callee) || call.callee === "I2C"
        ? picks([keyword(call, "scl") ?? a(0), bus("I2C", "SCL", call.callee.startsWith("bitbangio"))], [keyword(call, "sda") ?? a(1), bus("I2C", "SDA", call.callee.startsWith("bitbangio"))])
        : [];
    case "SPI":
      return picks([keyword(call, "clock") ?? a(0), bus("SPI", "SCK")], [keyword(call, "MOSI") ?? a(1), bus("SPI", "MOSI")], [keyword(call, "MISO") ?? a(2), bus("SPI", "MISO")]);
    case "UART":
      return picks([keyword(call, "tx") ?? a(0), bus("UART", "TX")], [keyword(call, "rx") ?? a(1), bus("UART", "RX")]);
    default:
      return [];
  }
}

const gpiozeroOutputs = new Set(["LED", "Buzzer", "OutputDevice", "DigitalOutputDevice"]);
const gpiozeroPwm = new Set(["PWMLED", "PWMOutputDevice"]);
const gpiozeroServo = new Set(["Servo", "AngularServo"]);
const gpiozeroInputs = new Set(["Button", "MotionSensor", "LineSensor", "LightSensor", "InputDevice", "DigitalInputDevice"]);

function rpiRules(call: Call): Pick[] {
  const name = tail(call.callee);
  const a = (i: number) => positional(call, i);
  if (/^GPIO\./.test(call.callee)) {
    switch (name) {
      case "setup":
        return picks([a(0), modeUsage(a(1)?.text)]);
      case "output":
        return picks([a(0), usage.output]);
      case "input":
      case "add_event_detect":
      case "wait_for_edge":
      case "event_detected":
        return picks([a(0), usage.input]);
      case "PWM":
        return picks([a(0), usage.pwm]);
      default:
        return [];
    }
  }
  if (/^lgpio\./.test(call.callee)) {
    switch (name) {
      case "gpio_claim_output":
      case "gpio_write":
        return picks([a(1), usage.output]);
      case "gpio_claim_input":
      case "gpio_read":
      case "gpio_claim_alert":
        return picks([a(1), usage.input]);
      case "tx_pwm":
      case "tx_servo":
        return picks([a(1), usage.pwm]);
      default:
        return [];
    }
  }
  if (gpiozeroOutputs.has(name)) return picks([keyword(call, "pin") ?? a(0), usage.output]);
  if (gpiozeroPwm.has(name)) return picks([keyword(call, "pin") ?? a(0), usage.pwm]);
  if (gpiozeroServo.has(name)) return picks([keyword(call, "pin") ?? a(0), usage.servo]);
  if (gpiozeroInputs.has(name)) return picks([keyword(call, "pin") ?? a(0), usage.input]);
  if (name === "DistanceSensor") {
    return picks([keyword(call, "echo") ?? a(0), usage.input], [keyword(call, "trigger") ?? a(1), usage.output]);
  }
  if (name === "RGBLED") {
    return picks([keyword(call, "red") ?? a(0), usage.pwm], [keyword(call, "green") ?? a(1), usage.pwm], [keyword(call, "blue") ?? a(2), usage.pwm]);
  }
  if (name === "Motor") {
    return picks([keyword(call, "forward") ?? a(0), usage.pwm], [keyword(call, "backward") ?? a(1), usage.pwm]);
  }
  return [];
}

function rulesFor(dialect: Dialect, call: Call, servos: ReadonlySet<string>): Pick[] {
  switch (dialect) {
    case "arduino":
      return arduinoRules(call, servos);
    case "pico-sdk":
      return picoSdkRules(call);
    case "esp-idf":
      return espIdfRules(call);
    case "micropython":
      return micropythonRules(call);
    case "circuitpython":
      return circuitpythonRules(call);
    case "rpi-python":
      return rpiRules(call);
  }
}

// ---------------------------------------------------------------------------
// Scan

function lineStarts(source: string): number[] {
  const starts = [0];
  for (let i = 0; i < source.length; i += 1) if (source[i] === "\n") starts.push(i + 1);
  return starts;
}

export function lineOf(starts: readonly number[], offset: number): number {
  let lo = 0;
  let hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (starts[mid] <= offset) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1;
}

const wifiPattern = /\b(?:WiFi\.begin|WiFi\.softAP|network\.WLAN|esp_wifi_start|esp_wifi_init|wifi\.radio)\b/;

export function scanCode(input: string, chosen?: Dialect | null): ScanResult {
  const truncated = input.length > maxSourceLength;
  const source = truncated ? input.slice(0, maxSourceLength) : input;
  const dialect = chosen ?? detectDialect(source);
  if (!dialect) return { dialect: null, refs: [], unfollowed: [], usesWifi: false, truncated };

  const family = dialectFamily(dialect);
  const masked = maskSource(source, family);
  const constants = collectConstants(source, masked, family);
  const rpiBoardNumbering = dialect === "rpi-python" && /GPIO\.setmode\s*\(\s*GPIO\.BOARD\s*\)/.test(masked);
  const ctx: Context = { source, masked, dialect, constants, rpiBoardNumbering };
  const starts = lineStarts(source);

  const refs: PinRef[] = [];
  const unfollowed: Unfollowed[] = [];
  const seen = new Set<string>();

  const record = (arg: Arg, use: Usage, analogChannel = false) => {
    if (refs.length >= maxRefs) return;
    const key = `${arg.start}:${use.label}`;
    if (seen.has(key)) return;
    seen.add(key);
    const line = lineOf(starts, arg.start);
    if (arg.text.includes(") ") && use.kind === "bus" && /^(I2C|SPI|UART)\(\d\) /.test(arg.text)) {
      const [, peripheral, id] = /^(I2C|SPI|UART)\((\d)\)/.exec(arg.text) ?? [];
      refs.push({
        spec: { kind: "bus-default", peripheral: peripheral as BusPeripheral, id: Number(id), signal: use.signal },
        usage: use,
        text: arg.text,
        start: arg.start,
        end: arg.end,
        line,
      });
      return;
    }
    const value = evaluate(arg.text, ctx);
    const emit = (item: Value) => {
      if (item.kind === "list") {
        for (const entry of item.items) emit(entry);
        return;
      }
      if (item.kind === "unfollowed") {
        if (!unfollowed.some((entry) => entry.start === arg.start)) {
          unfollowed.push({ text: arg.text.trim().slice(0, 48), usage: use, line, start: arg.start, end: arg.end });
        }
        return;
      }
      refs.push({
        spec: item.spec,
        usage: use,
        text: arg.text.trim().slice(0, 48),
        start: arg.start,
        end: arg.end,
        line,
        via: item.via,
        physical: item.physical,
        analogChannel: analogChannel && item.spec.kind === "number" ? true : undefined,
      });
    };
    emit(value);
  };

  const servos = new Set<string>();
  for (const match of masked.matchAll(/\bServo[ \t]+([A-Za-z_]\w*(?:[ \t]*\[[^\]]*\])?(?:[ \t]*,[ \t]*[A-Za-z_]\w*)*)/g)) {
    for (const name of match[1].split(",")) servos.add(name.replace(/\[.*$/, "").trim());
  }
  for (const call of findCalls(source, masked, family)) {
    for (const pick of rulesFor(dialect, call, servos)) record(pick.arg, pick.usage, pick.analogChannel);
  }

  if (dialect === "esp-idf") {
    for (const match of masked.matchAll(/\.([a-z_]+)\s*=\s*([^,;}\n]+)/g)) {
      const use = idfFields[match[1]];
      if (!use) continue;
      const start = (match.index ?? 0) + match[0].lastIndexOf(match[2]);
      record({ text: source.slice(start, start + match[2].length).trim(), start, end: start + match[2].trimEnd().length }, use);
    }
    for (const match of masked.matchAll(/\.pin_bit_mask\s*=\s*([^;}\n]+)/g)) {
      const base = (match.index ?? 0) + match[0].lastIndexOf(match[1]);
      for (const bit of match[1].matchAll(/(?:1ULL\s*<<\s*|BIT64\s*\(\s*)([A-Za-z_0-9]+)/g)) {
        const start = base + (bit.index ?? 0) + bit[0].lastIndexOf(bit[1]);
        record({ text: bit[1], start, end: start + bit[1].length }, usage.gpio);
      }
    }
  }

  if (dialect === "circuitpython") {
    // `led.direction = digitalio.Direction.OUTPUT` sets the mode of a DigitalInOut.
    const directions = new Map<string, Usage>();
    for (const match of masked.matchAll(/^[ \t]*([A-Za-z_]\w*)\.(?:direction\s*=\s*[\w.]*Direction\.(OUTPUT|INPUT)|switch_to_(output|input)\s*\()/gm)) {
      const which = (match[2] ?? match[3]).toUpperCase();
      directions.set(match[1], which === "OUTPUT" ? usage.output : usage.input);
    }
    for (const [name, use] of directions) {
      const constant = constants.get(name);
      if (!constant || !/DigitalInOut\s*\(/.test(constant.text)) continue;
      const ref = refs.find((item) => item.start >= constant.start && item.start < constant.start + constant.text.length);
      if (ref && ref.usage.kind === "gpio") ref.usage = use;
    }
  }

  // `ADC(Pin(26))` reads as one use: drop the bare Pin(...) inside a wrapper's argument.
  const kept = refs.filter(
    (ref) => ref.usage.kind !== "gpio" || !refs.some((outer) => outer !== ref && outer.start <= ref.start && outer.end >= ref.end && outer.end - outer.start > ref.end - ref.start),
  );
  refs.length = 0;
  refs.push(...kept);
  refs.sort((a, b) => a.start - b.start);
  unfollowed.sort((a, b) => a.start - b.start);
  return { dialect, refs, unfollowed, usesWifi: wifiPattern.test(masked), truncated };
}
