// Finds the pins a piece of firmware uses, without knowing the board. The
// scanner is a small, deliberately conservative reader: it masks comments,
// string contents and `#if 0` blocks, follows simple constants (`#define LED
// 13`, `const int led = 13;`, an enum, `LED = 25` at module level), and
// recognises the calls each toolchain uses to take a pin. A name that is also
// a loop variable, a function parameter, or assigned more than once is not a
// constant. Anything it cannot follow is reported as such rather than
// guessed. Resolving a reference to a physical pin is `check.ts`'s job.
//
// Every pass is linear (or bounded per item) in the input, so a pathological
// paste cannot stall the page.

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
  /** At most `maxUnfollowed` values the scanner could not follow, in source order. */
  unfollowed: Unfollowed[];
  /** How many more unfollowed values there were past `maxUnfollowed` (0 when none). */
  unfollowedDropped: number;
  /** The code also brings up Wi-Fi (for the ADC2 caution). */
  usesWifi: boolean;
  /** Input was cut to `maxSourceLength`. */
  truncated: boolean;
  /**
   * The scan reached `maxRefs` pin references and then met a further
   * reference or not-followed value it did not record, so the rest of the
   * code was not checked.
   */
  refsCapped: boolean;
};

export const maxSourceLength = 100_000;
export const maxUnfollowed = 100;
/** The scanner records at most this many pin references. */
export const maxRefs = 400;
const maxConstantDepth = 8;
/** A list constant with more pins than this is not followed. */
const maxListItems = 64;
/** A pin value longer than this is not an expression the scanner follows. */
const maxValueLength = 512;

// ---------------------------------------------------------------------------
// Characters

function isIdentStart(code: number): boolean {
  return (code >= 65 && code <= 90) || (code >= 97 && code <= 122) || code === 95;
}

function isIdentChar(code: number): boolean {
  return isIdentStart(code) || (code >= 48 && code <= 57);
}

function isDigit(code: number): boolean {
  return code >= 48 && code <= 57;
}

function isSpace(code: number): boolean {
  return code === 32 || code === 9 || code === 10 || code === 13 || code === 11 || code === 12;
}

function isLineBreak(char: string | undefined): boolean {
  return char === "\n" || char === "\r";
}

function isOpener(char: string): boolean {
  return char === "(" || char === "[" || char === "{";
}

function isCloser(char: string): boolean {
  return char === ")" || char === "]" || char === "}";
}

/** Offset of the line break that ends the line holding `from` (LF, CRLF or CR), or the length. */
function lineEndOf(text: string, from: number): number {
  for (let i = from; i < text.length; i += 1) if (isLineBreak(text[i])) return i;
  return text.length;
}

/** Offset just past the line break at `end`. */
function nextLineStart(text: string, end: number): number {
  if (end >= text.length) return text.length;
  return text[end] === "\r" && text[end + 1] === "\n" ? end + 2 : end + 1;
}

// ---------------------------------------------------------------------------
// Masking

export type Family = "c" | "python";

export type SourceRange = { start: number; end: number; kind: "comment" | "string" };

/** C++14 `1'000`: a quote inside a number literal, not a character literal. */
function isDigitSeparator(source: string, at: number): boolean {
  if (!isIdentChar(source.charCodeAt(at + 1))) return false;
  let k = at - 1;
  const limit = Math.max(0, at - 64);
  while (k >= limit && (isIdentChar(source.charCodeAt(k)) || source[k] === "'" || source[k] === ".")) k -= 1;
  return k + 1 < at && isDigit(source.charCodeAt(k + 1));
}

/** `R"delim( … )delim"`, optionally prefixed u8R, uR, UR or LR: returns the range end, or -1. */
function rawStringEnd(source: string, at: number): number {
  if (source[at - 1] !== "R") return -1;
  let k = at - 2;
  if (source[k] === "8" && source[k - 1] === "u") k -= 2;
  else if (source[k] === "u" || source[k] === "U" || source[k] === "L") k -= 1;
  if (k >= 0 && isIdentChar(source.charCodeAt(k))) return -1;
  let j = at + 1;
  while (j < source.length && j - at <= 17 && source[j] !== "(") {
    if (/[\s()\\"]/.test(source[j])) return -1;
    j += 1;
  }
  if (source[j] !== "(") return -1;
  const close = `)${source.slice(at + 1, j)}"`;
  const end = source.indexOf(close, j + 1);
  return end === -1 ? source.length : end + close.length;
}

const ifZeroPattern = /^#[ \t]*if[ \t]+0[ \t]*(?:\/\/.*|\/\*.*)?$/;
const conditionalPattern = /^[ \t]*#[ \t]*(if|ifdef|ifndef|elif|else|endif)\b/;

/** End of the code an `#if 0` at `from` switches off: its `#endif` line, or its `#else`/`#elif`. */
function ifZeroEnd(source: string, from: number): number {
  let depth = 0;
  let pos = nextLineStart(source, lineEndOf(source, from));
  while (pos < source.length) {
    const end = lineEndOf(source, pos);
    const directive = conditionalPattern.exec(source.slice(pos, Math.min(end, pos + 64)));
    if (directive) {
      const word = directive[1];
      if (word.startsWith("if")) depth += 1;
      else if (word === "endif") {
        if (depth === 0) return end;
        depth -= 1;
      } else if (depth === 0) return pos;
    }
    pos = nextLineStart(source, end);
  }
  return source.length;
}

/** Comments, `#if 0` blocks (as comments) and string literals (quotes included), in order. */
export function sourceRanges(source: string, family: Family): SourceRange[] {
  const ranges: SourceRange[] = [];
  const n = source.length;
  let i = 0;
  let lineStart = true;
  while (i < n) {
    const c = source[i];
    if (isLineBreak(c)) {
      lineStart = true;
      i += 1;
      continue;
    }
    const next = source[i + 1];
    const raw = family === "c" && c === '"' ? rawStringEnd(source, i) : -1;
    let stop = -1;
    let kind: SourceRange["kind"] = "comment";
    if (family === "c" && c === "/" && next === "/") {
      stop = lineEndOf(source, i);
      // A backslash at the end of a // comment continues it onto the next line.
      while (stop < n && source[stop - 1] === "\\") stop = lineEndOf(source, nextLineStart(source, stop));
    } else if (family === "c" && c === "/" && next === "*") {
      const end = source.indexOf("*/", i + 2);
      stop = end === -1 ? n : end + 2;
    } else if (family === "c" && c === "#" && lineStart && ifZeroPattern.test(source.slice(i, lineEndOf(source, i)).trimEnd())) {
      stop = ifZeroEnd(source, i);
    } else if (family === "python" && c === "#") {
      stop = lineEndOf(source, i);
    } else if (family === "python" && (source.startsWith('"""', i) || source.startsWith("'''", i))) {
      // Docstrings read as comments: nothing in them configures a pin.
      const end = source.indexOf(source.slice(i, i + 3), i + 3);
      stop = end === -1 ? n : end + 3;
    } else if (raw !== -1) {
      stop = raw;
      kind = "string";
    } else if (c === '"' || (c === "'" && !(family === "c" && isDigitSeparator(source, i)))) {
      let j = i + 1;
      while (j < n && source[j] !== c && !isLineBreak(source[j])) j += source[j] === "\\" ? 2 : 1;
      stop = j < n && source[j] === c ? j + 1 : Math.min(j, n);
      kind = "string";
    }
    if (stop === -1) {
      if (c !== " " && c !== "\t") lineStart = false;
      i += 1;
      continue;
    }
    ranges.push({ start: i, end: stop, kind });
    lineStart = isLineBreak(source[stop - 1]);
    i = stop;
  }
  return ranges;
}

/**
 * Replaces comments with spaces and string *contents* with spaces, keeping
 * every offset and line break, so structure can be read from the mask and
 * values from the original text at the same offsets.
 */
export function maskSource(source: string, family: Family): string {
  const out = source.split("");
  for (const range of sourceRanges(source, family)) {
    const from = range.kind === "string" ? range.start + 1 : range.start;
    const to = range.kind === "string" && source[range.end - 1] === source[range.start] && range.end - range.start > 1 ? range.end - 1 : range.end;
    for (let i = from; i < to; i += 1) if (!isLineBreak(out[i])) out[i] = " ";
  }
  return out.join("");
}

// ---------------------------------------------------------------------------
// Dialect detection

const dialectSignals: Array<{ dialect: Dialect; pattern: RegExp; weight: number }> = [
  { dialect: "circuitpython", pattern: /^[ \t]*import[ \t]+(?:board|digitalio|busio|analogio|pwmio)\b/m, weight: 4 },
  { dialect: "circuitpython", pattern: /\bboard\.[A-Z][A-Z0-9_]*\b/, weight: 2 },
  { dialect: "rpi-python", pattern: /\b(?:RPi\.GPIO|gpiozero|lgpio)\b/, weight: 5 },
  { dialect: "micropython", pattern: /^[ \t]*(?:from[ \t]+machine[ \t]+import|import[ \t]+machine\b)/m, weight: 5 },
  { dialect: "micropython", pattern: /\b(?:Pin\.(?:OUT|IN)|SoftI2C|neopixel\.NeoPixel\([ \t]*Pin)\b/, weight: 2 },
  { dialect: "pico-sdk", pattern: /#include[ \t]*[<"](?:pico\/|hardware\/)/, weight: 5 },
  { dialect: "pico-sdk", pattern: /\b(?:gpio_init|gpio_put|gpio_set_dir|gpio_set_function|adc_gpio_init)[ \t]*\(/, weight: 3 },
  { dialect: "esp-idf", pattern: /#include[ \t]*[<"](?:driver\/|freertos\/|esp_)/, weight: 4 },
  { dialect: "esp-idf", pattern: /\b(?:GPIO_NUM_\d+|gpio_set_direction|gpio_set_level|gpio_config|app_main)\b/, weight: 3 },
  { dialect: "arduino", pattern: /\b(?:pinMode|digitalWrite|digitalRead|analogRead|analogWrite)[ \t]*\(/, weight: 4 },
  { dialect: "arduino", pattern: /\bvoid[ \t]+(?:setup|loop)[ \t]*\(/, weight: 4 },
  { dialect: "arduino", pattern: /#include[ \t]*[<"](?:Arduino|Wire|SPI|Servo|Adafruit_)/, weight: 3 },
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
// Brackets

/** For each opening bracket in the masked text, the offset of its closer (-1 when unclosed). */
function bracketPairs(masked: string): Int32Array {
  const close = new Int32Array(masked.length).fill(-1);
  const stack: number[] = [];
  for (let i = 0; i < masked.length; i += 1) {
    const c = masked[i];
    if (isOpener(c)) stack.push(i);
    else if (isCloser(c)) {
      const open = stack.pop();
      if (open !== undefined) close[open] = i;
    }
  }
  return close;
}

/** Bracket depth at each offset (the depth before that character). */
function bracketDepths(masked: string): Int32Array {
  const depth = new Int32Array(masked.length + 1);
  let current = 0;
  for (let i = 0; i < masked.length; i += 1) {
    depth[i] = current;
    if (isOpener(masked[i])) current += 1;
    else if (isCloser(masked[i]) && current > 0) current -= 1;
  }
  depth[masked.length] = current;
  return depth;
}

/** Splits masked[from, to) at top-level commas, skipping nested brackets. */
function topLevelParts(masked: string, pairs: Int32Array, from: number, to: number): Array<[number, number]> {
  const parts: Array<[number, number]> = [];
  let start = from;
  let i = from;
  while (i < to) {
    const c = masked[i];
    if (isOpener(c)) {
      const end = pairs[i];
      i = end === -1 || end >= to ? to : end + 1;
      continue;
    }
    if (c === ",") {
      parts.push([start, i]);
      start = i + 1;
    }
    i += 1;
  }
  parts.push([start, to]);
  return parts;
}

// ---------------------------------------------------------------------------
// Calls

type Arg = { text: string; start: number; end: number; keyword?: string };
export type Call = { callee: string; args: Arg[]; start: number; /** Constructor declared as `Type name(args)`. */ declared?: boolean };

function splitArgs(source: string, masked: string, pairs: Int32Array, open: number, close: number): Arg[] {
  const args: Arg[] = [];
  for (const [from, to] of topLevelParts(masked, pairs, open + 1, close)) {
    let start = from;
    let end = to;
    while (start < end && isSpace(masked.charCodeAt(start))) start += 1;
    while (end > start && isSpace(masked.charCodeAt(end - 1))) end -= 1;
    if (start === end) continue;
    let keyword: string | undefined;
    const kw = /^([A-Za-z_]\w*)\s*=(?!=)\s*/.exec(masked.slice(start, Math.min(end, start + 128)));
    if (kw && start + kw[0].length < end) {
      keyword = kw[1];
      start += kw[0].length;
    }
    args.push({ text: source.slice(start, end), start, end, keyword });
  }
  return args;
}

function readIdent(masked: string, from: number): number {
  let i = from;
  while (i < masked.length && isIdentChar(masked.charCodeAt(i))) i += 1;
  return i;
}

function skipSpace(masked: string, from: number, lineOnly = false): number {
  let i = from;
  while (i < masked.length) {
    const code = masked.charCodeAt(i);
    if (lineOnly ? code !== 32 && code !== 9 : !isSpace(code)) break;
    i += 1;
  }
  return i;
}

function findCallsIn(source: string, masked: string, pairs: Int32Array, family: Family): Call[] {
  const calls: Call[] = [];
  const add = (callee: string, start: number, open: number, declared: boolean) => {
    const close = pairs[open];
    if (close === -1) return;
    calls.push({ callee: callee.replace(/\s+/g, ""), args: splitArgs(source, masked, pairs, open, close), start, declared });
  };
  const n = masked.length;
  let i = 0;
  while (i < n) {
    const code = masked.charCodeAt(i);
    if (!isIdentStart(code)) {
      // A number (or a name glued to one) is not a callee.
      i = isDigit(code) ? readIdent(masked, i) : i + 1;
      continue;
    }
    const start = i;
    const firstEnd = readIdent(masked, i);
    let chainEnd = firstEnd;
    // a.b, a::b, a->b
    for (;;) {
      let k = skipSpace(masked, chainEnd);
      const sep = masked[k] === "." ? 1 : (masked[k] === ":" && masked[k + 1] === ":") || (masked[k] === "-" && masked[k + 1] === ">") ? 2 : 0;
      if (!sep) break;
      k = skipSpace(masked, k + sep);
      if (k >= n || !isIdentStart(masked.charCodeAt(k))) break;
      chainEnd = readIdent(masked, k);
    }
    const after = skipSpace(masked, chainEnd);
    if (masked[after] === "(") add(masked.slice(start, chainEnd), start, after, false);
    else if (family === "c" && chainEnd === firstEnd && code >= 65 && code <= 90) {
      // `Type name(args)` declares an object in C++.
      const nameStart = skipSpace(masked, firstEnd, true);
      if (nameStart > firstEnd && isIdentStart(masked.charCodeAt(nameStart))) {
        const open = skipSpace(masked, readIdent(masked, nameStart), true);
        if (masked[open] === "(") add(masked.slice(start, firstEnd), start, open, true);
      }
    }
    i = chainEnd;
  }
  return calls.sort((a, b) => a.start - b.start);
}

export function findCalls(source: string, masked: string, family: Family = "c"): Call[] {
  return findCallsIn(source, masked, bracketPairs(masked), family);
}

// ---------------------------------------------------------------------------
// Constants

type Constant = { text: string; start: number };

/** A `#define` or `#undef`, in source order. */
type MacroEvent = { at: number; constant?: Constant; conflicted?: boolean };

type Constants = {
  /** File-scope (or unique local `const`) values, and Python module-level names. */
  values: Map<string, Constant>;
  macros: Map<string, MacroEvent[]>;
  /** Names that look like constants but cannot be followed. */
  unfollowed: Set<string>;
};

/** What a name resolves to at a point in the code. */
function lookupConstant(constants: Constants, name: string, at: number): Constant | "unfollowed" | undefined {
  if (constants.unfollowed.has(name)) return "unfollowed";
  const events = constants.macros.get(name);
  if (events) {
    // The last #define or #undef before `at` (events are in source order).
    let lo = 0;
    let hi = events.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (events[mid].at <= at) lo = mid + 1;
      else hi = mid;
    }
    const last: MacroEvent | undefined = events[lo - 1];
    if (last?.constant) return last.conflicted ? "unfollowed" : last.constant;
    if (last) return undefined; // #undef
  }
  return constants.values.get(name);
}

const cTypeWords =
  "static|const|constexpr|volatile|unsigned|signed|inline|auto|uint8_t|uint16_t|uint32_t|uint64_t|int8_t|int16_t|int32_t|int64_t|int|byte|short|long|size_t|gpio_num_t|uint|pin_size_t|PinName";
const cDeclarationPattern = new RegExp(`^\\s*((?:(?:${cTypeWords})\\s+)+)([A-Za-z_][\\s\\S]*)$`);
const maxStatementLength = 4000;

type Tally = {
  /** Assignments, increments and initialisers per name. */
  writes: Map<string, number>;
  /** Names declared as a parameter, a loop variable, or an alias. */
  declared: Set<string>;
};

function addWrite(tally: Tally, name: string) {
  tally.writes.set(name, (tally.writes.get(name) ?? 0) + 1);
}

/** Identifiers a for-header or Python `for` target declares or writes. */
function markLoopNames(text: string, tally: Tally) {
  for (const match of text.matchAll(/([A-Za-z_]\w*)\s*(?:[-+*/%&|^]|<<|>>)?(?:=(?!=)|:(?!:)|\+\+|--)|(?:\+\+|--)\s*([A-Za-z_]\w*)/g)) {
    tally.declared.add(match[1] ?? match[2]);
  }
}

/** The name a parameter declares: `int led`, `const int& led = 3`, `uint8_t *p` (C); `led`, `*args`, `led: int = 3` (Python). */
function parameterName(text: string, family: Family): string | null {
  if (family === "python") {
    const name = /^\s*\**\s*([A-Za-z_]\w*)/.exec(text);
    return name ? name[1] : null;
  }
  const head = text.split("=")[0].replace(/\[[^\]]*\]\s*$/, "").trim();
  const words = head.match(/[A-Za-z_]\w*/g) ?? [];
  if (words.length >= 2 || (words.length === 1 && /[*&]\s*[A-Za-z_]\w*$/.test(head))) return words[words.length - 1];
  return null;
}

const notFunctions = new Set(["if", "for", "while", "switch", "return", "sizeof", "else", "do", "case", "catch"]);

function markParameters(masked: string, pairs: Int32Array, open: number, family: Family, tally: Tally) {
  const close = pairs[open];
  if (close === -1 || close - open > 1000) return;
  for (const [from, to] of topLevelParts(masked, pairs, open + 1, close)) {
    const name = parameterName(masked.slice(from, to), family);
    if (name) tally.declared.add(name);
  }
}

/** Name ending just before `end` (skipping spaces), or null. */
function identBefore(masked: string, end: number): string | null {
  let k = end - 1;
  const limit = Math.max(0, end - 100);
  while (k >= limit && (masked[k] === " " || masked[k] === "\t")) k -= 1;
  const last = k;
  while (k >= limit && isIdentChar(masked.charCodeAt(k))) k -= 1;
  return last > k ? masked.slice(k + 1, last + 1) : null;
}

/** Writes, parameters and loop variables in C-family code. */
function cTally(masked: string, pairs: Int32Array): Tally {
  const tally: Tally = { writes: new Map(), declared: new Set() };
  for (const match of masked.matchAll(/(?<![\w.>:])([A-Za-z_]\w*)\s*(?:(?:[-+*/%&|^]|<<|>>)?=(?!=)|\+\+|--)|(?<![\w+-])(?:\+\+|--)\s*([A-Za-z_]\w*)/g)) {
    addWrite(tally, match[1] ?? match[2]);
  }
  for (let open = masked.indexOf("("); open !== -1; open = masked.indexOf("(", open + 1)) {
    const close = pairs[open];
    if (close === -1) continue;
    const before = identBefore(masked, open);
    if (before === "for") {
      markLoopNames(masked.slice(open + 1, Math.min(close, open + 500)), tally);
      continue;
    }
    if (!(before && !notFunctions.has(before)) && masked[skipSpaceBack(masked, open)] !== "]") continue;
    // A parameter list is followed by the body (or a constructor's initialiser list).
    let k = skipSpace(masked, close + 1);
    for (let guard = 0; guard < 4; guard += 1) {
      const word = /^(?:const|override|final|noexcept|mutable)\b/.exec(masked.slice(k, k + 10));
      if (!word) break;
      k = skipSpace(masked, k + word[0].length);
    }
    if (masked[k] === "{" || (masked[k] === ":" && masked[k + 1] !== ":")) markParameters(masked, pairs, open, "c", tally);
  }
  return tally;
}

function skipSpaceBack(masked: string, end: number): number {
  let k = end - 1;
  while (k >= 0 && end - k < 100 && isSpace(masked.charCodeAt(k))) k -= 1;
  return k;
}

function addConstant(target: Map<string, Constant>, conflicts: Set<string>, name: string, constant: Constant) {
  const existing = target.get(name);
  if (existing && existing.text !== constant.text) conflicts.add(name);
  else if (!existing) target.set(name, constant);
}

function valueOf(source: string, masked: string, from: number, to: number): Constant | null {
  let start = from;
  let end = to;
  while (start < end && isSpace(masked.charCodeAt(start))) start += 1;
  while (end > start && isSpace(masked.charCodeAt(end - 1))) end -= 1;
  return start < end ? { text: source.slice(start, end), start } : null;
}

function collectMacros(source: string, masked: string, constants: Constants) {
  const pattern = /^[ \t]*#[ \t]*(define|undef)[ \t]+([A-Za-z_]\w*)([^\r\n]*)/gm;
  for (const match of masked.matchAll(pattern)) {
    const [, directive, name, rest] = match;
    const at = match.index ?? 0;
    const events = constants.macros.get(name) ?? [];
    constants.macros.set(name, events);
    if (directive === "undef") {
      events.push({ at });
      continue;
    }
    // Object-like macros only: `#define PIN(x)` takes arguments.
    if (rest && !/^[ \t]/.test(rest)) continue;
    const from = at + match[0].length - rest.length;
    let to = at + match[0].length;
    // `\` at the end of a line continues the definition.
    while (masked[to - 1] === "\\" && to < masked.length) to = lineEndOf(masked, nextLineStart(masked, to));
    const value = valueOf(source, masked, from, to);
    if (!value) {
      events.push({ at });
      continue;
    }
    events.push({ at, constant: { text: value.text.replace(/\\(?:\r\n|\r|\n)/g, " "), start: value.start } });
  }
  // Two different definitions with no #undef between them are alternatives
  // (an #ifdef choosing one), so neither is followed.
  for (const events of constants.macros.values()) {
    let segment: MacroEvent[] = [];
    const close = () => {
      const texts = new Set(segment.map((event) => event.constant?.text));
      if (texts.size > 1) for (const event of segment) event.conflicted = true;
      segment = [];
    };
    for (const event of events) {
      if (event.constant) segment.push(event);
      else close();
    }
    close();
  }
}

type CDefinition = { name: string; constant: Constant; writes: number; local: boolean; isConst: boolean };

function collectCDeclarations(source: string, masked: string, pairs: Int32Array): CDefinition[] {
  const found: CDefinition[] = [];
  type Scope = { kind: "scope" | "type" | "enum" | "block"; open: number };
  const stack: Scope[] = [];
  let blocks = 0;
  let types = 0;
  let statementStart = 0;
  const n = masked.length;
  let lineStart = true;

  const statement = (from: number, to: number) => {
    if (types > 0 || to - from > maxStatementLength) return;
    const text = masked.slice(from, to);
    const declaration = cDeclarationPattern.exec(text);
    if (!declaration) return;
    const isConst = /\b(?:const|constexpr)\b/.test(declaration[1]);
    const local = blocks > 0;
    // Inside a function only a `const` declaration is a constant.
    if (local && !isConst) return;
    const restStart = from + text.length - declaration[2].length;
    for (const [partFrom, partTo] of topLevelParts(masked, pairs, restStart, to)) {
      const head = /^\s*([A-Za-z_]\w*)\s*=(?!=)/.exec(masked.slice(partFrom, Math.min(partTo, partFrom + 200)));
      if (!head) continue;
      const constant = valueOf(source, masked, partFrom + head[0].length, partTo);
      if (constant) found.push({ name: head[1], constant, writes: 1, local, isConst });
    }
  };

  const enumBody = (from: number, to: number) => {
    let next: number | null = 0;
    for (const [partFrom, partTo] of topLevelParts(masked, pairs, from, to)) {
      const entry = /^\s*([A-Za-z_]\w*)\s*(=(?!=))?/.exec(masked.slice(partFrom, Math.min(partTo, partFrom + 200)));
      if (!entry) continue;
      if (entry[2]) {
        const constant = valueOf(source, masked, partFrom + entry[0].length, partTo);
        if (!constant) continue;
        found.push({ name: entry[1], constant, writes: 1, local: false, isConst: true });
        const literal = parseNumber(constant.text, "c");
        next = literal === null ? null : literal + 1;
      } else if (next !== null) {
        found.push({ name: entry[1], constant: { text: String(next), start: partFrom }, writes: 0, local: false, isConst: true });
        next += 1;
      }
    }
  };

  for (let i = 0; i < n; i += 1) {
    const c = masked[i];
    if (isLineBreak(c)) {
      lineStart = true;
      continue;
    }
    if (c === "#" && lineStart) {
      // Preprocessor lines (and their continuations) are not statements.
      let end = lineEndOf(masked, i);
      while (masked[end - 1] === "\\" && end < n) end = lineEndOf(masked, nextLineStart(masked, end));
      i = end - 1;
      statementStart = end;
      continue;
    }
    if (c !== " " && c !== "\t") lineStart = false;
    if (c === "{") {
      const prefix = masked.slice(Math.max(statementStart, i - 200), i);
      let kind: Scope["kind"] = "block";
      if (types === 0 && blocks === 0 && (/\bnamespace\b[\w\s:]*$/.test(prefix) || /\bextern\s*"\s*"\s*$/.test(prefix))) kind = "scope";
      else if (/\benum\b(?:\s+(?:class|struct))?[\w\s:]*$/.test(prefix)) kind = "enum";
      else if (/\b(?:struct|class|union)\b[^;{}()=]*$/.test(prefix)) kind = "type";
      stack.push({ kind, open: i });
      if (kind === "block") blocks += 1;
      else if (kind !== "scope") types += 1;
      if (kind === "scope" || kind === "block") statementStart = i + 1;
      continue;
    }
    if (c === "}") {
      const scope = stack.pop();
      if (!scope) continue;
      if (scope.kind === "block") blocks -= 1;
      else if (scope.kind !== "scope") types -= 1;
      if (scope.kind === "enum" && types === 0) enumBody(scope.open + 1, i);
      if (scope.kind === "scope" || scope.kind === "block") statementStart = i + 1;
      continue;
    }
    if (c === ";") {
      // `for (int i = 0; …)` is not a declaration statement.
      statement(statementStart, i);
      statementStart = i + 1;
    }
  }
  return found;
}

function collectCConstants(source: string, masked: string, pairs: Int32Array): Constants {
  const constants: Constants = { values: new Map(), macros: new Map(), unfollowed: new Set() };
  collectMacros(source, masked, constants);
  const tally = cTally(masked, pairs);
  const definitions = collectCDeclarations(source, masked, pairs);
  const expected = new Map<string, number>();
  for (const definition of definitions) {
    expected.set(definition.name, (expected.get(definition.name) ?? 0) + definition.writes);
    addConstant(constants.values, constants.unfollowed, definition.name, definition.constant);
  }
  const names = new Set([...constants.values.keys(), ...constants.macros.keys()]);
  for (const name of names) {
    const writes = tally.writes.get(name) ?? 0;
    // One initialiser is the definition; any other write makes it a variable.
    if (tally.declared.has(name) || writes > Math.min(expected.get(name) ?? 0, 1) || (expected.get(name) ?? 0) > 1) {
      constants.unfollowed.add(name);
    }
  }
  return constants;
}

function collectPythonConstants(source: string, masked: string, pairs: Int32Array): Constants {
  const constants: Constants = { values: new Map(), macros: new Map(), unfollowed: new Set() };
  const depth = bracketDepths(masked);
  const tally: Tally = { writes: new Map(), declared: new Set() };

  // Statements (and walrus) at bracket depth 0 write a name; `f(x=1)` does not.
  for (const match of masked.matchAll(/(?<![\w.])([A-Za-z_]\w*)[ \t]*(?:(?:\*\*|\/\/|>>|<<|[-+*/%&|^@])?=(?!=)|:=)/g)) {
    const at = match.index ?? 0;
    if (depth[at] === 0 || match[0].endsWith(":=")) addWrite(tally, match[1]);
  }
  // `a, b = 1, 2` writes both names.
  for (const match of masked.matchAll(/^[ \t]*([A-Za-z_]\w*(?:[ \t]*,[ \t]*[A-Za-z_]\w*)+)[ \t]*,?[ \t]*=(?!=)/gm)) {
    for (const name of match[1].split(",")) addWrite(tally, name.trim());
  }
  for (const match of masked.matchAll(/\bfor\b/g)) {
    const at = (match.index ?? 0) + 3;
    const segment = masked.slice(at, at + 300).split(/[\r\n]/, 1)[0];
    const target = /^([\s\S]*?)\bin\b/.exec(segment);
    if (target) for (const name of target[1].match(/[A-Za-z_]\w*/g) ?? []) tally.declared.add(name);
  }
  for (const match of masked.matchAll(/\bdef[ \t]+[A-Za-z_]\w*[ \t]*\(/g)) {
    markParameters(masked, pairs, (match.index ?? 0) + match[0].length - 1, "python", tally);
  }
  for (const match of masked.matchAll(/\blambda\b([^:\r\n]{0,200}):/g)) {
    for (const part of match[1].split(",")) {
      const name = parameterName(part, "python");
      if (name) tally.declared.add(name);
    }
  }
  for (const match of masked.matchAll(/\b(?:as|global|nonlocal)[ \t]+([A-Za-z_]\w*)/g)) tally.declared.add(match[1]);

  // Module-level `NAME = value`, the value running on through open brackets.
  for (const match of masked.matchAll(/^([A-Za-z_]\w*)[ \t]*=(?!=)/gm)) {
    const at = match.index ?? 0;
    if (depth[at] !== 0) continue;
    const from = at + match[0].length;
    let to = from;
    while (to < masked.length && !isLineBreak(masked[to])) {
      const close = isOpener(masked[to]) ? pairs[to] : -1;
      to = close > to ? close + 1 : to + 1;
    }
    const constant = valueOf(source, masked, from, to);
    if (constant) addConstant(constants.values, constants.unfollowed, match[1], constant);
  }
  for (const name of constants.values.keys()) {
    if (tally.declared.has(name) || (tally.writes.get(name) ?? 0) > 1) constants.unfollowed.add(name);
  }
  return constants;
}

/** `from machine import Pin as P`, `import machine as m`: alias → the name it stands for. */
function pythonAliases(masked: string): Map<string, string> {
  const aliases = new Map<string, string>();
  const add = (original: string, alias: string) => {
    const name = original.split(".").pop() ?? original;
    if (alias !== name && aliases.size < 64) aliases.set(alias, name);
  };
  for (const match of masked.matchAll(/^[ \t]*from[ \t]+[\w.]+[ \t]+import[ \t]+([^\r\n]+)/gm)) {
    for (const part of match[1].replace(/[()]/g, "").split(",")) {
      const alias = /^\s*([\w.]+)\s+as\s+([A-Za-z_]\w*)\s*$/.exec(part);
      if (alias) add(alias[1], alias[2]);
    }
  }
  for (const match of masked.matchAll(/^[ \t]*import[ \t]+([^\r\n]+)/gm)) {
    for (const part of match[1].split(",")) {
      const alias = /^\s*([\w.]+)\s+as\s+([A-Za-z_]\w*)\s*$/.exec(part);
      if (alias) add(alias[1], alias[2]);
    }
  }
  return aliases;
}

function unalias(text: string, aliases: ReadonlyMap<string, string>): string {
  if (!aliases.size) return text;
  const head = /^[A-Za-z_]\w*/.exec(text)?.[0];
  const original = head ? aliases.get(head) : undefined;
  return head && original ? original + text.slice(head.length) : text;
}

// ---------------------------------------------------------------------------
// Values

type Value =
  | { kind: "spec"; spec: PinSpec; via?: string; physical?: boolean }
  | { kind: "list"; items: Value[]; size: number }
  /** `cycle`: a constant that refers back to itself, which spoils any list holding it. */
  | { kind: "unfollowed"; cycle?: boolean };

const unfollowedValue: Value = { kind: "unfollowed" };
const cycleValue: Value = { kind: "unfollowed", cycle: true };
const quoted = /^(?:[rbuRBUfF]{0,2})(["'])([\s\S]*)\1$/;
const onboardLedNames = new Set(["LED_BUILTIN", "PICO_DEFAULT_LED_PIN", "BUILTIN_LED"]);
// Names a pin can go by on its own. A lower-case identifier is a variable.
const pinNamePattern = /^(?:A\d{1,2}|D\d{1,3}|P[A-K]\d{1,2}|GP\d{1,2}|GPIO\d{1,2}|IO\d{1,2}|P\d_\d{1,2}|PIN_[A-Z0-9_]+)$/;

type Context = {
  dialect: Dialect;
  family: Family;
  constants: Constants;
  aliases: ReadonlyMap<string, string>;
  /** Values already worked out for a definition, by definition and options. */
  memo: Map<Constant, Map<string, Value | "visiting">>;
};

/** Where the value is read (for `#define` order) and whether bare numbers are header positions. */
type ReadAt = { at: number; physical: boolean };

/** Parses an integer literal: C hex/binary/octal/decimal with suffixes; Python hex/octal/binary/decimal. */
function parseNumber(text: string, family: Family): number | null {
  if (family === "python") {
    const literal = /^(?:0[xX][0-9a-fA-F]+|0[oO][0-7]+|0[bB][01]+|0+|[1-9]\d*)$/.exec(text);
    if (!literal) return null;
    return /^0+$/.test(text) ? 0 : Number(text);
  }
  const literal = /^(0[xX][0-9a-fA-F]+|0[bB][01]+|0[0-7]*|[1-9]\d*)[uUlL]*$/.exec(text);
  if (!literal) return null;
  const digits = literal[1];
  if (/^0[0-7]+$/.test(digits)) return parseInt(digits, 8);
  return Number(digits);
}

/** True when the text has a comma outside any brackets. */
function hasTopLevelComma(text: string): boolean {
  let depth = 0;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (isOpener(c)) depth += 1;
    else if (isCloser(c)) depth -= 1;
    else if (c === "," && depth === 0) return true;
  }
  return false;
}

function splitTopLevel(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let from = 0;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (isOpener(c)) depth += 1;
    else if (isCloser(c)) depth -= 1;
    else if (c === "," && depth === 0) {
      parts.push(text.slice(from, i));
      from = i + 1;
    }
  }
  parts.push(text.slice(from));
  return parts.map((part) => part.trim()).filter(Boolean);
}

function stripWrapping(text: string, family: Family): string {
  let value = text.trim();
  for (;;) {
    const before = value;
    value = value
      .replace(/^\((?:const\s+)?[A-Za-z_][\w\s]*\*?\)\s*(?=\S)/, "") // C cast
      .replace(/^static_cast<[^>]+>\(([\s\S]*)\)$/, "$1")
      .replace(/^(?:uint8_t|int|gpio_num_t|pin_size_t)\(([\s\S]*)\)$/, "$1")
      .trim();
    // MicroPython `const(15)`.
    if (family === "python") value = value.replace(/^(?:micropython\.)?const\(([\s\S]*)\)$/, "$1").trim();
    // Not a tuple (Python) or a comma expression (C).
    if (/^\([\s\S]*\)$/.test(value) && closingBalanced(value) && !hasTopLevelComma(value.slice(1, -1))) value = value.slice(1, -1).trim();
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

function withVia(value: Value, via: string | undefined): Value {
  if (!via) return value;
  if (value.kind === "spec") return value.via ? value : { ...value, via };
  if (value.kind === "list") return { ...value, items: value.items.map((item) => withVia(item, via)) };
  return value;
}

function sizeOf(value: Value): number {
  return value.kind === "list" ? value.size : 1;
}

function list(texts: string[], ctx: Context, read: ReadAt, depth: number): Value {
  if (texts.length > maxListItems) return unfollowedValue;
  const items: Value[] = [];
  let size = 0;
  for (const text of texts) {
    const item = evaluate(text, ctx, read, depth + 1);
    if (item.kind === "unfollowed" && item.cycle) return cycleValue;
    size += sizeOf(item);
    if (size > maxListItems) return unfollowedValue;
    items.push(item);
  }
  return { kind: "list", items, size };
}

function constantValue(name: string, ctx: Context, read: ReadAt, depth: number): Value | undefined {
  const found = lookupConstant(ctx.constants, name, read.at);
  if (found === undefined) return undefined;
  if (found === "unfollowed") return unfollowedValue;
  let memo = ctx.memo.get(found);
  if (!memo) {
    memo = new Map();
    ctx.memo.set(found, memo);
  }
  const key = `${read.at}:${read.physical}`;
  const known = memo.get(key);
  // A constant that refers back to itself, directly or through others.
  if (known === "visiting") return cycleValue;
  if (known) return withVia(known, name);
  memo.set(key, "visiting");
  const value = evaluate(found.text, ctx, read, depth + 1);
  memo.set(key, value);
  return withVia(value, name);
}

function evaluate(text: string, ctx: Context, read: ReadAt, depth = 0): Value {
  if (text.length > maxValueLength || depth > maxConstantDepth) return unfollowedValue;
  let value = stripWrapping(text, ctx.family);
  if (!value) return unfollowedValue;
  if (ctx.family === "python") value = unalias(value, ctx.aliases);

  if (ctx.family === "python") {
    if (/^\[[\s\S]*\]$/.test(value) && closingBalanced(value.replace(/[[\]]/g, (c) => (c === "[" ? "(" : ")")))) {
      return list(splitTopLevel(value.slice(1, -1)), ctx, read, depth);
    }
    if (/^\([\s\S]*\)$/.test(value) && closingBalanced(value) && hasTopLevelComma(value.slice(1, -1))) {
      return list(splitTopLevel(value.slice(1, -1)), ctx, read, depth);
    }
    if (hasTopLevelComma(value)) return list(splitTopLevel(value), ctx, read, depth);
  }

  const number = parseNumber(value, ctx.family);
  if (number !== null) {
    return { kind: "spec", spec: { kind: "number", value: number }, physical: read.physical || undefined };
  }

  const idfNum = /^GPIO_NUM_(\d+)$/.exec(value);
  if (idfNum) return { kind: "spec", spec: { kind: "number", value: Number(idfNum[1]) } };

  const string = quoted.exec(value);
  if (string) return stringSpec(string[2], ctx);

  // MicroPython Pin(...) / machine.Pin(...): the pin is its first argument.
  const pinCall = /^(?:machine\.)?Pin\s*\(([\s\S]*)\)$/.exec(value);
  if (pinCall && ctx.dialect === "micropython") {
    const first = splitTopLevel(pinCall[1])[0];
    return first && !/^[A-Za-z_]\w*\s*=/.test(first) ? evaluate(first, ctx, read, depth + 1) : unfollowedValue;
  }

  // MicroPython named pins: Pin.cpu.A5 is PA5; Pin.board.X1 is the board's name.
  const cpu = /^(?:machine\.)?Pin\.cpu\.([A-K])(\d{1,2})$/.exec(value);
  if (cpu) return { kind: "spec", spec: { kind: "name", value: `P${cpu[1]}${cpu[2]}` } };
  const boardPin = /^(?:machine\.)?Pin\.board\.([A-Za-z_]\w*)$/.exec(value);
  if (boardPin) return nameSpec(boardPin[1]);

  // CircuitPython board.D13 / board.LED / board.GP15.
  const cpBoard = /^board\.([A-Za-z_]\w*)$/.exec(value);
  if (cpBoard) return nameSpec(cpBoard[1]);

  if (/^[A-Za-z_]\w*$/.test(value)) {
    // The code's own definition wins over a toolchain name (`#define LED_BUILTIN 2`).
    const constant = constantValue(value, ctx, read, depth);
    if (constant) return constant;
    if (onboardLedNames.has(value)) return { kind: "spec", spec: { kind: "onboard-led" } };
    if (pinNamePattern.test(value)) return { kind: "spec", spec: { kind: "name", value } };
  }
  return unfollowedValue;
}

function nameSpec(name: string): Value {
  if (name === "LED" || onboardLedNames.has(name)) return { kind: "spec", spec: { kind: "onboard-led" } };
  return { kind: "spec", spec: { kind: "name", value: name } };
}

function stringSpec(text: string, ctx: Context): Value {
  const value = text.trim();
  if (!value || value.length > 24) return unfollowedValue;
  if (ctx.dialect === "rpi-python") {
    const board = /^(?:BOARD|J8:)(\d{1,2})$/i.exec(value);
    if (board) return { kind: "spec", spec: { kind: "number", value: Number(board[1]) }, physical: true };
    const bcm = /^(?:BCM|GPIO)(\d{1,2})$/i.exec(value);
    if (bcm) return { kind: "spec", spec: { kind: "number", value: Number(bcm[1]) } };
  }
  return nameSpec(value);
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

type Pick = {
  arg: Arg;
  usage: Usage;
  analogChannel?: boolean;
  /** `I2C(0)` with no pins: the port's default pin for `usage.signal`. */
  busDefault?: { peripheral: BusPeripheral; id: number };
  /** An RPi.GPIO call, numbered by `GPIO.setmode`. */
  rpiGpio?: boolean;
};

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
        // ESP32 `Wire.begin(address, sda, scl, frequency)` starts an I2C target.
        const first = call.args.length >= 4 ? 1 : 0;
        return picks([a(first), bus("I2C", "SDA")], [a(first + 1), bus("I2C", "SCL")]);
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

/**
 * `I2C(0)`, `I2C(0, freq=400000)`, `UART(1, 9600)`: a bus opened by id with
 * no pins named uses the port's default pins.
 */
function busDefaults(call: Call, peripheral: BusPeripheral, signals: string[]): Pick[] {
  const idArg = positional(call, 0) ?? keyword(call, "id");
  if (!idArg || !/^\d$/.test(idArg.text.trim())) return [];
  // Pins passed by position are not the defaults (and are not read here).
  if (call.args.some((arg) => arg !== idArg && !arg.keyword && /\bPin\s*\(|^board\./.test(arg.text))) return [];
  const id = Number(idArg.text.trim());
  return signals.map((signal) => ({ arg: idArg, usage: bus(peripheral, signal), busDefault: { peripheral, id } }));
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

function rpiGpioRules(call: Call): Pick[] {
  const a = (i: number) => positional(call, i);
  switch (tail(call.callee)) {
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

function rpiRules(call: Call): Pick[] {
  const name = tail(call.callee);
  const a = (i: number) => positional(call, i);
  // Only RPi.GPIO follows GPIO.setmode; gpiozero and lgpio always take BCM numbers.
  if (/^GPIO\./.test(call.callee)) return rpiGpioRules(call).map((pick) => ({ ...pick, rpiGpio: true }));
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

/** Offsets where each line starts, for LF, CRLF and CR line endings. */
function lineStarts(source: string): number[] {
  const starts = [0];
  for (let i = 0; i < source.length; i += 1) {
    const c = source[i];
    if (c === "\n" || (c === "\r" && source[i + 1] !== "\n")) starts.push(i + 1);
  }
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
  if (!dialect) return { dialect: null, refs: [], unfollowed: [], unfollowedDropped: 0, usesWifi: false, truncated, refsCapped: false };

  const family = dialectFamily(dialect);
  const masked = maskSource(source, family);
  const pairs = bracketPairs(masked);
  const constants = family === "c" ? collectCConstants(source, masked, pairs) : collectPythonConstants(source, masked, pairs);
  const aliases = family === "python" ? pythonAliases(masked) : new Map<string, string>();
  const rpiBoardNumbering = dialect === "rpi-python" && /GPIO\.setmode\s*\(\s*GPIO\.BOARD\s*\)/.test(masked);
  const ctx: Context = { dialect, family, constants, aliases, memo: new Map() };
  const starts = lineStarts(source);

  const refs: PinRef[] = [];
  const unfollowed: Unfollowed[] = [];
  const unfollowedStarts = new Set<number>();
  const seen = new Set<string>();
  let refsCapped = false;

  const record = (pick: Pick) => {
    const { arg, usage: use } = pick;
    // Once the cap has cost a value, nothing after it is recorded.
    if (refsCapped) return;
    // At the cap nothing more is recorded, but the pick is still read far
    // enough to tell whether it would have added something.
    const full = refs.length >= maxRefs;
    const key = `${arg.start}:${use.label}`;
    if (seen.has(key)) return;
    seen.add(key);
    const line = lineOf(starts, arg.start);
    if (pick.busDefault && use.kind === "bus") {
      if (full) {
        refsCapped = true;
        return;
      }
      const { peripheral, id } = pick.busDefault;
      refs.push({
        spec: { kind: "bus-default", peripheral, id, signal: use.signal },
        usage: use,
        text: `${peripheral}(${id}) ${use.signal}`,
        start: arg.start,
        end: arg.end,
        line,
      });
      return;
    }
    const text = arg.text.trim().slice(0, 48);
    const value = evaluate(arg.text, ctx, { at: arg.start, physical: Boolean(pick.rpiGpio && rpiBoardNumbering) });
    const emit = (item: Value) => {
      if (item.kind === "list") {
        for (const entry of item.items) emit(entry);
        return;
      }
      if (item.kind === "unfollowed") {
        if (unfollowedStarts.has(arg.start)) return;
        if (full) {
          refsCapped = true;
          return;
        }
        unfollowedStarts.add(arg.start);
        if (unfollowed.length < maxUnfollowed) unfollowed.push({ text, usage: use, line, start: arg.start, end: arg.end });
        return;
      }
      if (refs.length >= maxRefs) {
        refsCapped = true;
        return;
      }
      refs.push({
        spec: item.spec,
        usage: use,
        text,
        start: arg.start,
        end: arg.end,
        line,
        via: item.via,
        physical: item.physical,
        analogChannel: pick.analogChannel && item.spec.kind === "number" ? true : undefined,
      });
    };
    emit(value);
  };

  const servos = new Set<string>();
  for (const match of masked.matchAll(/\bServo[ \t]+([A-Za-z_]\w*(?:[ \t]*\[[^\]\r\n]{0,32}\])?(?:[ \t]*,[ \t]*[A-Za-z_]\w*)*)/g)) {
    for (const name of match[1].split(",")) servos.add(name.replace(/\[.*$/, "").trim());
  }
  for (const found of findCallsIn(source, masked, pairs, family)) {
    const call = family === "python" ? { ...found, callee: unalias(found.callee, aliases) } : found;
    for (const pick of rulesFor(dialect, call, servos)) record(pick);
  }

  if (dialect === "esp-idf") {
    for (const match of masked.matchAll(/\.([a-z_]+)[ \t]*=[ \t]*([^,;}\r\n]+)/g)) {
      const use = idfFields[match[1]];
      if (!use) continue;
      const start = (match.index ?? 0) + match[0].length - match[2].length;
      const text = source.slice(start, start + match[2].length).trimEnd();
      record({ arg: { text, start, end: start + text.length }, usage: use });
    }
    for (const match of masked.matchAll(/\.pin_bit_mask[ \t]*=[ \t]*([^;}\r\n]+)/g)) {
      const base = (match.index ?? 0) + match[0].length - match[1].length;
      for (const bit of match[1].matchAll(/(?:1ULL\s*<<\s*|BIT64\s*\(\s*)([A-Za-z_0-9]+)/g)) {
        const start = base + (bit.index ?? 0) + bit[0].length - bit[1].length;
        record({ arg: { text: bit[1], start, end: start + bit[1].length }, usage: usage.gpio });
      }
    }
  }

  if (dialect === "circuitpython") {
    // `led.direction = digitalio.Direction.OUTPUT` sets the mode of a DigitalInOut.
    const directions = new Map<string, Usage>();
    for (const match of masked.matchAll(/^[ \t]*([A-Za-z_]\w*)\.(?:direction[ \t]*=[ \t]*[\w.]*Direction\.(OUTPUT|INPUT)|switch_to_(output|input)[ \t]*\()/gm)) {
      const which = (match[2] ?? match[3]).toUpperCase();
      directions.set(match[1], which === "OUTPUT" ? usage.output : usage.input);
    }
    for (const [name, use] of directions) {
      const constant = constants.values.get(name);
      if (!constant || !/DigitalInOut\s*\(/.test(constant.text)) continue;
      const ref = refs.find((item) => item.start >= constant.start && item.start < constant.start + constant.text.length);
      if (ref && ref.usage.kind === "gpio") ref.usage = use;
    }
  }

  // `ADC(Pin(26))` reads as one use: drop the bare Pin(...) inside a wrapper's argument.
  const kept = refs.filter(
    (ref) => ref.usage.kind !== "gpio" || !refs.some((outer) => outer !== ref && outer.start <= ref.start && outer.end >= ref.end && outer.end - outer.start > ref.end - ref.start),
  );
  kept.sort((a, b) => a.start - b.start);
  unfollowed.sort((a, b) => a.start - b.start);
  return {
    dialect,
    refs: kept,
    unfollowed,
    unfollowedDropped: unfollowedStarts.size - unfollowed.length,
    usesWifi: wifiPattern.test(masked),
    truncated,
    refsCapped,
  };
}
