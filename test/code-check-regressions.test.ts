import { describe, expect, it } from "vitest";
import { boards, type Board } from "@/lib/boards";
import { checkCode } from "@/lib/code-check/check";
import { maxRefs, maxUnfollowed, scanCode, type Dialect, type PinRef } from "@/lib/code-check/scan";

// Regressions from the 2026-11-11 review of Pin check. Each case failed
// before its fix.

function board(id: string): Board {
  const found = boards.find((item) => item.id === id);
  if (!found) throw new Error(`missing board ${id}`);
  return found;
}

function check(id: string, code: string, dialect?: Dialect) {
  return checkCode(board(id), scanCode(code, dialect));
}

function numbers(refs: readonly PinRef[]): number[] {
  return refs.map((ref) => (ref.spec.kind === "number" ? ref.spec.value : Number.NaN));
}

function labels(report: ReturnType<typeof check>): string[] {
  return report.pins.map((pin) => pin.pin.label);
}

describe("bare numbers in Arduino code", () => {
  it("matches an nRF Nano's numbers to its D labels, never to nRF GPIO indexes", () => {
    const report = check("arduino-nano-33-ble-sense-rev2", "void setup(){ pinMode(2, OUTPUT); pinMode(4, OUTPUT); }", "arduino");
    expect(labels(report)).toEqual(["D2", "D4"]);
    expect(report.numbering).not.toMatch(/ESP32|RP2040/);
    expect(report.numbering).toMatch(/label carries it/);
  });

  it("leaves a number the nRF Nano's labels don't carry unchecked, without claiming the pin is absent", () => {
    const report = check("arduino-nano-33-ble-sense-rev2", "void setup(){ pinMode(31, OUTPUT); }", "arduino");
    expect(report.pins).toEqual([]);
    expect(report.missing[0].reason).toBe("PinHub's record has no Arduino number 31 for this board, so this use can't be checked.");
  });

  it("reads analogRead(0) as the A0 label on a board without an Arduino map", () => {
    const report = check("arduino-nano-33-ble-sense-rev2", "void loop(){ analogRead(0); }", "arduino");
    expect(labels(report)).toEqual(["A0"]);
  });

  it("matches nothing on a micro:bit, whose record names no Arduino numbers or D labels", () => {
    const report = check("bbc-microbit-v2", "void setup(){ pinMode(2, OUTPUT); }", "arduino");
    expect(report.pins).toEqual([]);
    expect(report.missing[0].reason).toMatch(/no Arduino number 2 for this board/);
    expect(report.numbering).toMatch(/left unchecked/);
  });

  it("keeps GPIO numbering on ESP32 and RP2040 boards", () => {
    expect(labels(check("esp32-devkitc", "void setup(){ pinMode(4, OUTPUT); }", "arduino"))).toEqual(["IO4"]);
    const pico = check("raspberry-pi-pico", "void setup(){ pinMode(15, OUTPUT); }", "arduino");
    expect(pico.pins[0].pin.mcu?.name).toBe("GPIO15");
    expect(pico.numbering).toMatch(/GPIO numbers/);
    expect(pico.numbering).not.toMatch(/D-numbers/);
  });

  it("warns on a Nano ESP32 that its labels carry a second numbering", () => {
    const bare = check("arduino-nano-esp32", "void setup(){ pinMode(13, OUTPUT); }", "arduino");
    expect(bare.pins[0].pin.mcu?.name).toBe("GPIO13");
    expect(bare.numbering).toMatch(/labels also carry D-numbers/);
    const named = check("arduino-nano-esp32", "void setup(){ pinMode(D13, OUTPUT); }", "arduino");
    expect(named.pins[0].pin.mcu?.name).toBe("GPIO48");
  });

  it("matches an STM32 Nucleo's numbers to the D labels the record carries", () => {
    const report = check("stm32-nucleo-f401re", "void setup(){ pinMode(13, OUTPUT); pinMode(14, OUTPUT); }", "arduino");
    expect(report.pins.map((pin) => pin.pin.mcu?.name)).toEqual(["PA5", "PB9"]);
    expect(report.missing).toEqual([]);
    expect(report.numbering).toMatch(/D-numbers on this board's labels/);
  });

  it("does not guess that 14 is A0 on an UNO, and says why", () => {
    const report = check("arduino-uno-rev3", "void loop(){ analogRead(14); }");
    expect(report.pins).toEqual([]);
    expect(report.missing[0].reason).toBe("PinHub's record has no Arduino number 14 for this board, so this use can't be checked.");
  });

  it("never lets a label's D-number outrank a recorded Arduino number (D1 mini)", () => {
    // The D8 label is GPIO15, recorded as Arduino 15; Arduino 8 is not on the header.
    const report = check("lolin-d1-mini", "void setup(){ pinMode(8, OUTPUT); pinMode(15, OUTPUT); }", "arduino");
    expect(report.pins.map((pin) => pin.pin.mcu?.arduino)).toEqual(["15"]);
    expect(report.missing.map((item) => item.ref.text)).toEqual(["8"]);
  });
});

describe("what counts as a constant", () => {
  it("does not read a loop counter as its first value", () => {
    const scan = scanCode("void setup(){ for (int i = 0; i < 8; i++) pinMode(i, OUTPUT); }", "arduino");
    expect(scan.refs).toEqual([]);
    expect(scan.unfollowed.map((item) => item.text)).toEqual(["i"]);
  });

  it("does not resolve a parameter through a global of the same name", () => {
    const scan = scanCode("const int led = 13;\nvoid blink(int led){ digitalWrite(led, HIGH); }", "arduino");
    expect(scan.refs).toEqual([]);
    expect(scan.unfollowed.map((item) => item.text)).toEqual(["led"]);
  });

  it("does not follow a Python name the loop reassigns", () => {
    const scan = scanCode("from machine import Pin\ni = 0\nwhile i < 8:\n    Pin(i, Pin.OUT)\n    i += 1", "micropython");
    expect(scan.refs).toEqual([]);
    expect(scan.unfollowed.map((item) => item.text)).toEqual(["i"]);
  });

  it("does not follow a Python module constant shadowed by a parameter", () => {
    const scan = scanCode("from machine import Pin\nLED = 25\ndef blink(LED):\n    Pin(LED, Pin.OUT)", "micropython");
    expect(scan.refs).toEqual([]);
    expect(scan.unfollowed.map((item) => item.text)).toEqual(["LED"]);
  });

  it("does not follow a Python for-loop target", () => {
    const scan = scanCode("from machine import Pin\npin = 2\nfor pin in (2, 3):\n    Pin(pin, Pin.OUT)", "micropython");
    expect(scan.refs).toEqual([]);
  });

  it("follows a non-const global assigned once, as Arduino sketches write them", () => {
    const scan = scanCode("int led = 13;\nvoid setup(){ pinMode(led, OUTPUT); }", "arduino");
    expect(numbers(scan.refs)).toEqual([13]);
    expect(scan.refs[0].via).toBe("led");
  });

  it("does not follow a global the code assigns again", () => {
    for (const code of [
      "int led = 13;\nvoid loop(){ led = 12; pinMode(led, OUTPUT); }",
      "int led = 13;\nvoid loop(){ led++; pinMode(led, OUTPUT); }",
      "int led = 13;\nvoid loop(){ led += 1; pinMode(led, OUTPUT); }",
      "int led = 13;\nvoid loop(){ int led = 4; pinMode(led, OUTPUT); }",
    ]) {
      const scan = scanCode(code, "arduino");
      expect(scan.refs, code).toEqual([]);
      expect(scan.unfollowed.map((item) => item.text), code).toEqual(["led"]);
    }
  });

  it("follows a const declared inside a function when nothing else uses the name", () => {
    expect(numbers(scanCode("void setup(){ const int led = 9; pinMode(led, OUTPUT); }", "arduino").refs)).toEqual([9]);
  });

  it("does not follow a non-const local", () => {
    expect(scanCode("void setup(){ int led = 9; pinMode(led, OUTPUT); }", "arduino").refs).toEqual([]);
  });

  it("follows enum values, counting on from the last stated one", () => {
    const scan = scanCode("enum Pins { RED_LED = 9, GREEN_LED };\nvoid setup(){ pinMode(RED_LED, OUTPUT); pinMode(GREEN_LED, OUTPUT); }", "arduino");
    expect(numbers(scan.refs)).toEqual([9, 10]);
  });

  it("follows constants in a namespace", () => {
    expect(numbers(scanCode("namespace pins { constexpr int led = 6; }\nusing namespace pins;\nvoid setup(){ pinMode(led, OUTPUT); }", "arduino").refs)).toEqual([6]);
  });
});

describe("flash, PSRAM and other record wording", () => {
  it("makes a module-memory pin a check that quotes the record, not a fix", () => {
    const report = check("esp32-devkitc", "void setup(){ Serial2.begin(9600, SERIAL_8N1, 16, 17); }", "arduino");
    expect(report.counts.fix).toBe(0);
    for (const name of ["GPIO16", "GPIO17"]) {
      const pin = report.pins.find((item) => item.pin.mcu?.name === name);
      const finding = pin?.findings.find((item) => item.title === "Flash or PSRAM pin");
      expect(finding?.severity).toBe("check");
      expect(finding?.detail).toBe(`The record lists ${pin?.pin.label} as used for flash or PSRAM on some modules. See the source note.`);
      expect(finding?.quote).toMatch(/usually connected to the SPI flash/);
    }
  });

  it("states no consequence the record does not state", () => {
    const cases: Array<[string, string, Dialect]> = [
      ["esp32-devkitc", "void setup(){ Serial2.begin(9600, SERIAL_8N1, 16, 17); pinMode(2, OUTPUT); }", "arduino"],
      ["esp32-s3-devkitc-1", "void setup(){ pinMode(19, OUTPUT); pinMode(26, OUTPUT); }", "arduino"],
      ["esp32-c3-devkitm-1", "void setup(){ pinMode(18, OUTPUT); }", "arduino"],
      ["stm32f103-blue-pill", "void setup(){ pinMode(PA11, OUTPUT); pinMode(PA12, OUTPUT); }", "arduino"],
      ["arduino-uno-rev3", "void setup(){ analogWrite(4, 1); pinMode(1, OUTPUT); }", "arduino"],
      ["raspberry-pi-pico", "from machine import UART, Pin\nUART(0, tx=Pin(2), rx=Pin(3))", "micropython"],
    ];
    for (const [id, code, dialect] of cases) {
      const report = check(id, code, dialect);
      expect(report.pins.length, id).toBeGreaterThan(0);
      for (const finding of report.pins.flatMap((pin) => pin.findings)) {
        expect(finding.detail, `${id}: ${finding.title}`).not.toMatch(/crash|bit-banged|software|interfere|uploads|serial monitor|fall back|Reads fail/i);
      }
    }
  });

  it("names USB-JTAG pins without claiming upload trouble", () => {
    const pin = check("esp32-s3-devkitc-1", "void setup(){ pinMode(19, OUTPUT); }", "arduino").pins[0];
    const usb = pin.findings.find((item) => item.title === "Shared with USB or serial");
    expect(usb?.detail).toBe(`The record lists ${pin.pin.label} as used by the board's USB or serial connection. See the source note.`);
    expect(usb?.quote).toMatch(/USB-JTAG/);
  });
});

describe("scanner details", () => {
  it("prefers the code's own #define over a built-in LED name", () => {
    const report = check("esp32-devkitc", "#define LED_BUILTIN 2\nvoid setup(){ pinMode(LED_BUILTIN, OUTPUT); }", "arduino");
    expect(report.pins[0].pin.mcu?.name).toBe("GPIO2");
    expect(report.pins[0].findings.map((item) => item.title)).toContain("Strapping pin");
  });

  it.each([
    ["I2C(0, freq=400000)", 2],
    ["UART(1, baudrate=9600)", 2],
    ["UART(0, 115200)", 2],
    ["SPI(1, baudrate=1000000)", 3],
  ])("reads %s as a bus on its default pins", (call, count) => {
    const scan = scanCode(`from machine import I2C, SPI, UART\nbus = ${call}`, "micropython");
    expect(scan.refs.map((ref) => ref.spec.kind)).toEqual(Array(count).fill("bus-default"));
    expect(scan.unfollowed).toEqual([]);
  });

  it("does not read pins passed by position as the bus defaults", () => {
    const refs = scanCode("from machine import I2C, Pin\nI2C(0, Pin(5), Pin(4))", "micropython").refs;
    expect(refs.filter((ref) => ref.spec.kind === "bus-default")).toEqual([]);
  });

  it("states a finding once when PWM and a servo share a pin", () => {
    const pin = check("arduino-uno-rev3", "#include <Servo.h>\nServo servo;\nvoid setup(){ analogWrite(7, 1); servo.attach(7); }").pins[0];
    expect(pin.usages.map((use) => use.label)).toEqual(["PWM", "Servo"]);
    const keys = pin.findings.map((item) => `${item.severity}:${item.title}`);
    expect(keys).toEqual([...new Set(keys)]);
    expect(keys.filter((key) => key === "check:No PWM recorded")).toHaveLength(1);
  });

  it("keeps BCM numbers for gpiozero after GPIO.setmode(GPIO.BOARD)", () => {
    const code = "import RPi.GPIO as GPIO\nfrom gpiozero import LED\nGPIO.setmode(GPIO.BOARD)\nGPIO.setup(11, GPIO.OUT)\nLED(17)\nimport lgpio\nlgpio.gpio_write(h, 27, 1)";
    const report = check("raspberry-pi-5", code);
    expect(report.pins.map((pin) => pin.pin.mcu?.name)).toEqual(["GPIO17", "GPIO27"]);
    expect(report.pins.find((pin) => pin.pin.mcu?.name === "GPIO17")?.refs.map((ref) => Boolean(ref.physical))).toEqual([true, false]);
  });
});

describe("masking", () => {
  it("does not read a C++14 digit separator as a character literal", () => {
    expect(numbers(scanCode("void setup(){ delay(1'000); pinMode(5, OUTPUT); }", "arduino").refs)).toEqual([5]);
  });

  it("masks multi-line raw strings, including custom delimiters", () => {
    const code = 'const char* a = R"(\n  pinMode(7, OUTPUT);\n)";\nconst char* b = u8R"x(\n )" pinMode(6, OUTPUT);\n)x";\nvoid setup(){ pinMode(8, OUTPUT); }';
    const scan = scanCode(code, "arduino");
    expect(numbers(scan.refs)).toEqual([8]);
    expect(scan.refs[0].line).toBe(7);
  });

  it("continues a // comment that ends in a backslash", () => {
    expect(numbers(scanCode("// note \\\npinMode(6, OUTPUT);\nvoid setup(){ pinMode(9, OUTPUT); }", "arduino").refs)).toEqual([9]);
  });

  it.each([
    ["LF", "\n"],
    ["CRLF", "\r\n"],
    ["CR", "\r"],
  ])("keeps lines and offsets right with %s line endings", (_name, eol) => {
    const code = ["void setup(){", "  // pinMode(4, OUTPUT);", "  pinMode(5, OUTPUT);", "}", "void loop(){ digitalWrite(6, HIGH); }"].join(eol);
    const scan = scanCode(code, "arduino");
    expect(numbers(scan.refs)).toEqual([5, 6]);
    expect(scan.refs.map((ref) => ref.line)).toEqual([3, 5]);
    expect(scan.refs.map((ref) => code.slice(ref.start, ref.end))).toEqual(["5", "6"]);
  });

  it("keeps Python line numbers right with CR line endings", () => {
    const scan = scanCode("from machine import Pin\r# Pin(4, Pin.OUT)\rPin(5, Pin.OUT)", "micropython");
    expect(numbers(scan.refs)).toEqual([5]);
    expect(scan.refs[0].line).toBe(3);
  });

  it("skips code inside #if 0, honouring nesting and #else", () => {
    const code = [
      "#if 0",
      "pinMode(5, OUTPUT);",
      "#if 1",
      "pinMode(6, OUTPUT);",
      "#endif",
      "#else",
      "void setup(){ pinMode(7, OUTPUT); }",
      "#endif",
      "#if 0 // old wiring",
      "void loop(){ pinMode(9, OUTPUT); }",
      "#endif",
      "void loop(){ pinMode(8, OUTPUT); }",
    ].join("\n");
    const scan = scanCode(code, "arduino");
    expect(numbers(scan.refs)).toEqual([7, 8]);
    expect(scan.refs.map((ref) => ref.line)).toEqual([7, 12]);
  });
});

describe("literals and constants", () => {
  it("reads C octal, hex and binary literals", () => {
    expect(numbers(scanCode("void setup(){ pinMode(010, OUTPUT); pinMode(0x0A, OUTPUT); pinMode(0b11, OUTPUT); pinMode(0, OUTPUT); }", "arduino").refs)).toEqual([8, 10, 3, 0]);
  });

  it("reads Python 0o literals and leaves an invalid 010 unfollowed", () => {
    const scan = scanCode("from machine import Pin\nPin(0o10, Pin.OUT)\nPin(010, Pin.OUT)", "micropython");
    expect(numbers(scan.refs)).toEqual([8]);
    expect(scan.unfollowed.map((item) => item.text)).toEqual(["010"]);
  });

  it("follows a #define redefined after #undef by position", () => {
    const code = "#define LED 3\nvoid a(){ pinMode(LED, OUTPUT); }\n#undef LED\n#define LED 5\nvoid b(){ pinMode(LED, OUTPUT); }";
    expect(numbers(scanCode(code, "arduino").refs)).toEqual([3, 5]);
  });

  it("does not pick between #ifdef alternatives", () => {
    const code = "#ifdef ESP32\n#define LED 2\n#else\n#define LED 13\n#endif\nvoid setup(){ pinMode(LED, OUTPUT); }";
    const scan = scanCode(code, "arduino");
    expect(scan.refs).toEqual([]);
    expect(scan.unfollowed.map((item) => item.text)).toEqual(["LED"]);
  });

  it("follows every declarator in one declaration", () => {
    expect(numbers(scanCode("const int A_PIN = 2, B_PIN = 3;\nvoid setup(){ pinMode(A_PIN, OUTPUT); pinMode(B_PIN, OUTPUT); }", "arduino").refs)).toEqual([2, 3]);
  });

  it("unwraps MicroPython const()", () => {
    expect(numbers(scanCode("from machine import Pin\nfrom micropython import const\nLED = const(15)\nPin(LED, Pin.OUT)", "micropython").refs)).toEqual([15]);
  });

  it("reads an ESP32 I2C target's Wire.begin(address, sda, scl, frequency)", () => {
    const scan = scanCode("void setup(){ Wire.begin(0x42, 21, 22, 100000); }", "arduino");
    expect(scan.refs.map((ref) => [ref.usage.label, ref.spec.kind === "number" ? ref.spec.value : null])).toEqual([
      ["I2C SDA", 21],
      ["I2C SCL", 22],
    ]);
  });

  it("follows import aliases for recognised constructors", () => {
    const aliased = scanCode("from machine import Pin as P\nP(5, P.OUT)", "micropython");
    expect(numbers(aliased.refs)).toEqual([5]);
    expect(aliased.refs[0].usage.label).toBe("Output");
    expect(numbers(scanCode("import machine as m\nled = m.Pin(4, m.Pin.OUT)", "micropython").refs)).toEqual([4]);
    expect(numbers(scanCode("from gpiozero import LED as Light\nLight(17)", "rpi-python").refs)).toEqual([17]);
  });

  it("reads a tuple constant like a list", () => {
    expect(numbers(scanCode("from machine import Pin\nPINS = (2, 3)\nPin(PINS, Pin.OUT)", "micropython").refs)).toEqual([2, 3]);
    expect(numbers(scanCode("from machine import Pin\nPINS = [2, 3]\nPin(PINS, Pin.OUT)", "micropython").refs)).toEqual([2, 3]);
  });

  it("does not read a C comma expression as a pin list", () => {
    expect(scanCode("#define LED (2, 3)\nvoid setup(){ pinMode(LED, OUTPUT); }", "arduino").refs).toEqual([]);
  });
});

describe("bounds", () => {
  it("caps the unfollowed list and says how many were dropped", () => {
    const code = `void setup(){\n${"pinMode(x, OUTPUT);\n".repeat(4000)}}`;
    const scan = scanCode(code, "arduino");
    expect(scan.unfollowed).toHaveLength(maxUnfollowed);
    expect(scan.unfollowedDropped).toBe(4000 - maxUnfollowed);
    const report = checkCode(board("arduino-uno-rev3"), scan);
    expect(report.unfollowedDropped).toBe(4000 - maxUnfollowed);
  });

  it("reports zero dropped when nothing was cut", () => {
    const scan = scanCode("void setup(){ pinMode(x, OUTPUT); }", "arduino");
    expect(scan.unfollowedDropped).toBe(0);
    expect(checkCode(board("arduino-uno-rev3"), scan).unfollowedDropped).toBe(0);
  });
});

describe("the reference cap", () => {
  const writes = (count: number) => "  digitalWrite(13, HIGH);\n".repeat(count);

  it("says so when a reference past the cap went unrecorded", () => {
    // Regression: the scanner stopped recording at `maxRefs` references without
    // saying so, so an input-only GPIO34 driven as an output on line 402 was
    // dropped and the report read "The pin matches the record".
    expect(maxRefs).toBe(400);
    const scan = scanCode(`void setup() {\n${writes(maxRefs)}  pinMode(34, OUTPUT);\n}`, "arduino");
    expect(scan.refs).toHaveLength(maxRefs);
    expect(scan.refsCapped).toBe(true);
    const report = checkCode(board("esp32-devkitc"), scan);
    expect(report.refsCapped).toBe(true);
    // The pin past the cap is still unchecked; the flag is what keeps that honest.
    expect(labels(report)).toEqual(["IO13"]);
  });

  it("is not set at exactly the cap with nothing after it", () => {
    const scan = scanCode(`void setup() {\n${writes(maxRefs)}  delay(10);\n}`, "arduino");
    expect(scan.refs).toHaveLength(maxRefs);
    expect(scan.refsCapped).toBe(false);
    expect(checkCode(board("esp32-devkitc"), scan).refsCapped).toBe(false);
  });

  it("is not set below the cap", () => {
    const scan = scanCode(`void setup() {\n${writes(maxRefs - 1)}  pinMode(34, OUTPUT);\n}`, "arduino");
    expect(scan.refs).toHaveLength(maxRefs);
    expect(scan.refsCapped).toBe(false);
    const input = checkCode(board("esp32-devkitc"), scan).pins.find((pin) => pin.pin.label === "IO34");
    expect(input?.status).toBe("fix");
    expect(input?.findings[0].title).toBe("Input-only pin");
  });

  it("is set when a not-followed value past the cap went unrecorded", () => {
    const scan = scanCode(`void setup() {\n${writes(maxRefs)}  pinMode(x, OUTPUT);\n}`, "arduino");
    expect(scan.unfollowed).toEqual([]);
    expect(scan.refsCapped).toBe(true);
  });

  it("is set when the cap falls inside a list of pins", () => {
    const lines = Array.from({ length: maxRefs - 1 }, (_, i) => `Pin(${i % 2 ? 2 : 4}, Pin.OUT)`);
    const scan = scanCode(["from machine import Pin", "PINS = [12, 13]", ...lines, "Pin(PINS, Pin.OUT)"].join("\n"), "micropython");
    expect(scan.refs).toHaveLength(maxRefs);
    expect(scan.refsCapped).toBe(true);
  });

  it("is never set for input with no dialect", () => {
    expect(scanCode("hello", null).refsCapped).toBe(false);
  });
});
