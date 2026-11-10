import { describe, expect, it } from "vitest";
import { boards, type Board } from "@/lib/boards";
import { checkCode } from "@/lib/code-check/check";
import { detectDialect, maskSource, maxSourceLength, scanCode, type Dialect } from "@/lib/code-check/scan";
import { codeExamples } from "@/lib/code-check/examples";

function board(id: string): Board {
  const found = boards.find((item) => item.id === id);
  if (!found) throw new Error(`missing board ${id}`);
  return found;
}

function check(id: string, code: string, dialect?: Dialect) {
  return checkCode(board(id), scanCode(code, dialect));
}

function pinNamed(report: ReturnType<typeof check>, name: string) {
  const found = report.pins.find((pin) => pin.pin.mcu?.name === name || pin.pin.label === name);
  if (!found) throw new Error(`no checked pin ${name}: ${report.pins.map((pin) => pin.pin.label).join(", ")}`);
  return found;
}

describe("dialect detection", () => {
  it.each<[string, Dialect]>([
    ["void setup() { pinMode(13, OUTPUT); }", "arduino"],
    ["from machine import Pin\nled = Pin(25, Pin.OUT)", "micropython"],
    ["import board\nimport digitalio\nled = digitalio.DigitalInOut(board.LED)", "circuitpython"],
    ["import RPi.GPIO as GPIO\nGPIO.setup(17, GPIO.OUT)", "rpi-python"],
    ["from gpiozero import LED\nled = LED(17)", "rpi-python"],
    ['#include "pico/stdlib.h"\nint main(){ gpio_init(15); }', "pico-sdk"],
    ['#include "driver/gpio.h"\nvoid app_main(void){ gpio_set_level(GPIO_NUM_4, 1); }', "esp-idf"],
  ])("detects %#", (code, dialect) => {
    expect(detectDialect(code)).toBe(dialect);
  });

  it("returns null for text that is not firmware", () => {
    expect(detectDialect("Hello, this is a note about my project.")).toBeNull();
    expect(scanCode("just words").refs).toEqual([]);
  });
});

describe("masking", () => {
  it("ignores pins in comments and strings, keeping offsets", () => {
    const code = 'void setup() {\n  // pinMode(5, OUTPUT);\n  /* digitalWrite(6, HIGH); */\n  Serial.println("pinMode(7, OUTPUT)");\n  pinMode(8, OUTPUT);\n}';
    const masked = maskSource(code, "c");
    expect(masked).toHaveLength(code.length);
    const refs = scanCode(code).refs;
    expect(refs.map((ref) => ref.text)).toEqual(["8"]);
    expect(refs[0].line).toBe(5);
    expect(code.slice(refs[0].start, refs[0].end)).toBe("8");
  });

  it("ignores Python comments and docstrings", () => {
    const code = 'from machine import Pin\n"""Pin(5, Pin.OUT)"""\n# Pin(6, Pin.OUT)\nPin(7, Pin.OUT)';
    expect(scanCode(code).refs.map((ref) => ref.text)).toEqual(["7"]);
  });
});

describe("Arduino on an UNO", () => {
  it("follows constants and #defines to the pin", () => {
    const report = check(
      "arduino-uno-rev3",
      "#define BUTTON 2\nconst int ledPin = 9;\nvoid setup() {\n  pinMode(ledPin, OUTPUT);\n  pinMode(BUTTON, INPUT_PULLUP);\n  analogWrite(ledPin, 128);\n}",
    );
    const led = pinNamed(report, "D9");
    expect(led.usages.map((use) => use.label)).toEqual(["Output", "PWM"]);
    expect(led.refs[0].via).toBe("ledPin");
    expect(led.status).toBe("clear");
    expect(pinNamed(report, "D2").usages.map((use) => use.label)).toEqual(["Input"]);
  });

  it("flags analogWrite on a pin with no recorded PWM", () => {
    const pin = pinNamed(check("arduino-uno-rev3", "void setup(){ analogWrite(4, 10); }"), "D4");
    expect(pin.status).toBe("check");
    expect(pin.findings[0].title).toBe("No PWM recorded");
  });

  it("reads analogRead(0) as channel A0, the way the Arduino API does", () => {
    const pin = check("arduino-uno-rev3", "void loop(){ int v = analogRead(0); }").pins[0];
    expect(pin.pin.mcu?.arduino).toBe("A0");
    expect(pin.status).toBe("clear");
  });

  it("flags analogRead on a digital-only pin named explicitly", () => {
    const report = check("arduino-uno-rev3", "void loop(){ analogRead(D7); }");
    expect(pinNamed(report, "D7").findings.map((item) => item.title)).toContain("No analog input here");
  });

  it("warns that pins 0 and 1 are the USB serial link, quoting the source", () => {
    const pin = pinNamed(check("arduino-uno-rev3", "void setup(){ pinMode(1, OUTPUT); }"), "D1 / TX");
    expect(pin.status).toBe("check");
    expect(pin.findings[0].quote).toMatch(/pins 0 and 1/);
  });

  it("resolves LED_BUILTIN to the pin the record flags as the onboard LED", () => {
    const pin = check("arduino-uno-rev3", "void setup(){ pinMode(LED_BUILTIN, OUTPUT); }").pins[0];
    expect(pin.pin.label).toBe("D13 / SCK");
    expect(pin.findings.map((item) => item.title)).toEqual(["Onboard LED"]);
    expect(pin.status).toBe("clear");
  });

  it("reports a pin number the board does not have", () => {
    const report = check("arduino-uno-rev3", "void setup(){ pinMode(40, OUTPUT); }");
    expect(report.pins).toEqual([]);
    expect(report.missing[0].reason).toMatch(/No pin is numbered 40/);
  });

  it("lists values it cannot follow instead of guessing", () => {
    const report = check("arduino-uno-rev3", "int pins[] = {2, 3};\nvoid setup(){ for (int i = 0; i < 2; i++) pinMode(pins[i], OUTPUT); }");
    expect(report.pins).toEqual([]);
    expect(report.unfollowed.map((item) => item.text)).toEqual(["pins[i]"]);
  });

  it("finds pins in library constructors", () => {
    const report = check(
      "arduino-uno-rev3",
      "#include <Adafruit_NeoPixel.h>\n#include <Servo.h>\nAdafruit_NeoPixel strip(30, 6, NEO_GRB);\nServo arm;\nvoid setup(){ arm.attach(10); }",
    );
    expect(pinNamed(report, "D6").usages[0].label).toBe("LED strip data");
    expect(pinNamed(report, "D10 / CS").usages[0].label).toBe("Servo");
  });
});

describe("ESP32 DevKitC", () => {
  it("matches Arduino numbers to GPIO numbers and says so", () => {
    const report = check("esp32-devkitc", "void setup(){ pinMode(12, OUTPUT); }", "arduino");
    expect(pinNamed(report, "GPIO12").status).toBe("check");
    expect(report.numbering).toMatch(/names no Arduino pin numbers/);
  });

  it("stops an output on an input-only pin", () => {
    const pin = pinNamed(check("esp32-devkitc", "void setup(){ pinMode(34, OUTPUT); digitalWrite(34, HIGH); }", "arduino"), "GPIO34");
    expect(pin.status).toBe("fix");
    expect(pin.findings[0]).toMatchObject({ title: "Input-only pin" });
    expect(pin.findings[0].detail).toMatch(/lines? 1/);
    expect(pin.findings[0].quote).toMatch(/GPIO34-39 can only be set as input/);
  });

  it("does not flag reading an input-only pin", () => {
    const pin = pinNamed(check("esp32-devkitc", "void loop(){ analogRead(34); }", "arduino"), "GPIO34");
    expect(pin.status).toBe("clear");
  });

  it("flags ADC2 reads, and makes them a fix when the code starts Wi-Fi", () => {
    const pinout = board("esp32-devkitc").pinout!;
    const all = pinout.pins ? [...pinout.pins.left, ...pinout.pins.right] : pinout.groups!.flatMap((group) => group.pins);
    const adc2 = all.find((pin) => pin.flags?.includes("adc-unavailable-with-wifi"));
    expect(adc2?.mcu?.gpio).toBeTypeOf("number");
    const gpio = adc2!.mcu!.gpio!;
    const quiet = check("esp32-devkitc", `void loop(){ analogRead(${gpio}); }`, "arduino");
    expect(quiet.pins[0].findings.find((item) => /Wi-Fi/.test(item.title))?.severity).toBe("check");
    const wifi = check("esp32-devkitc", `void setup(){ WiFi.begin("a", "b"); }\nvoid loop(){ analogRead(${gpio}); }`, "arduino");
    expect(wifi.pins[0].findings.find((item) => /Wi-Fi/.test(item.title))?.severity).toBe("fix");
  });

  it("reads ESP32 Wire.begin(sda, scl) and Serial2.begin pins", () => {
    const report = check("esp32-devkitc", "void setup(){ Wire.begin(21, 22); Serial2.begin(9600, SERIAL_8N1, 16, 17); }", "arduino");
    expect(pinNamed(report, "GPIO21").usages[0].label).toBe("I2C SDA");
    expect(pinNamed(report, "GPIO22").usages[0].label).toBe("I2C SCL");
    expect(pinNamed(report, "GPIO16").usages[0].label).toBe("UART RX");
    expect(pinNamed(report, "GPIO17").usages[0].label).toBe("UART TX");
  });

  it("follows GPIO_NUM_ constants and struct fields in ESP-IDF", () => {
    const code = [
      '#include "driver/gpio.h"',
      "#define LED GPIO_NUM_2",
      "void app_main(void) {",
      "  gpio_set_direction(LED, GPIO_MODE_OUTPUT);",
      "  i2c_config_t conf = { .sda_io_num = 21, .scl_io_num = GPIO_NUM_22 };",
      "}",
    ].join("\n");
    const report = check("esp32-devkitc", code);
    expect(pinNamed(report, "GPIO2").status).toBe("check");
    expect(pinNamed(report, "GPIO21").usages[0].label).toBe("I2C SDA");
    expect(pinNamed(report, "GPIO22").usages[0].label).toBe("I2C SCL");
  });

  it("flags pins wired to the module's flash", () => {
    const report = check("esp32-devkitc", "from machine import Pin\nPin(6, Pin.OUT)", "micropython");
    const flash = report.pins[0] ?? null;
    if (flash) expect(flash.status).toBe("fix");
    else expect(report.missing[0].reason).toMatch(/GPIO6/);
  });
});

describe("MicroPython on a Pico", () => {
  it("reads Pin modes, ADC and PWM wrappers, and keyword bus pins", () => {
    const code = [
      "from machine import Pin, ADC, PWM, I2C",
      "led = Pin(15, Pin.OUT)",
      "pot = ADC(Pin(26))",
      "servo = PWM(Pin(16))",
      "i2c = I2C(0, sda=Pin(4), scl=Pin(5))",
    ].join("\n");
    const report = check("raspberry-pi-pico", code);
    expect(pinNamed(report, "GPIO15").usages.map((use) => use.label)).toEqual(["Output"]);
    expect(pinNamed(report, "GPIO26").usages.map((use) => use.label)).toEqual(["Analog read"]);
    expect(pinNamed(report, "GPIO16").usages.map((use) => use.label)).toEqual(["PWM"]);
    expect(pinNamed(report, "GPIO4").usages.map((use) => use.label)).toEqual(["I2C SDA"]);
    expect(report.counts.fix).toBe(0);
  });

  it("flags analog reads on a pin without an ADC channel", () => {
    const pin = pinNamed(check("raspberry-pi-pico", "from machine import ADC, Pin\nADC(Pin(2))"), "GPIO2");
    expect(pin.status).toBe("fix");
  });

  it("flags hardware UART on pins without that signal, but not a soft bus", () => {
    const hard = check("raspberry-pi-pico", `from machine import UART, Pin
UART(0, tx=Pin(2), rx=Pin(3))`);
    expect(pinNamed(hard, "GPIO2").findings.map((item) => item.title)).toContain("No hardware UART TX");
    const soft = check("raspberry-pi-pico", `from machine import SoftI2C, Pin
SoftI2C(sda=Pin(2), scl=Pin(3))`);
    expect(pinNamed(soft, "GPIO2").status).toBe("clear");
  });

  it("names the right bus when the pin belongs to the other controller", () => {
    const report = check("raspberry-pi-pico", `from machine import I2C, Pin
I2C(0, sda=Pin(2), scl=Pin(3))`);
    const sda = pinNamed(report, "GPIO2").findings[0];
    expect(sda).toMatchObject({ severity: "fix", title: "Wrong bus for this pin" });
    expect(sda.detail).toMatch(/carries I2C1 SDA.*I2C\(0\), which is I2C0\. Use I2C\(1\)/);
    expect(check("raspberry-pi-pico", `from machine import I2C, Pin
I2C(1, sda=Pin(2), scl=Pin(3))`).counts.fix).toBe(0);
  });

  it("resolves a bus opened by id alone to the record's default pins", () => {
    const report = check("raspberry-pi-pico", "from machine import I2C\ni2c = I2C(0)");
    const signals = report.pins.flatMap((pin) => pin.usages.map((use) => use.label)).sort();
    expect(signals.length + report.missing.length).toBe(2);
    if (signals.length) expect(signals).toEqual(["I2C SCL", "I2C SDA"]);
  });

  it("names a pin used for two different things", () => {
    const pin = pinNamed(check("raspberry-pi-pico", "from machine import Pin, ADC, I2C\nADC(Pin(26))\nI2C(1, sda=Pin(26), scl=Pin(27))"), "GPIO26");
    expect(pin.findings.map((item) => item.title)).toContain("Used for two things");
  });

  it("matches string pin names", () => {
    const report = check("raspberry-pi-pico", 'from machine import Pin\nPin("GP15", Pin.OUT)');
    expect(report.pins[0].pin.mcu?.name).toBe("GPIO15");
  });
});

describe("Raspberry Pi Python", () => {
  it("uses BCM numbers by default and physical numbers under GPIO.BOARD", () => {
    const bcm = check("raspberry-pi-5", "import RPi.GPIO as GPIO\nGPIO.setmode(GPIO.BCM)\nGPIO.setup(17, GPIO.OUT)");
    expect(bcm.pins[0].pin.mcu?.name).toBe("GPIO17");
    const physical = check("raspberry-pi-5", "import RPi.GPIO as GPIO\nGPIO.setmode(GPIO.BOARD)\nGPIO.setup(11, GPIO.OUT)");
    expect(physical.pins[0].pin.mcu?.name).toBe("GPIO17");
    expect(physical.numbering).toMatch(/physical/);
  });

  it("flags a power pin used as a signal under BOARD numbering", () => {
    const report = check("raspberry-pi-5", "import RPi.GPIO as GPIO\nGPIO.setmode(GPIO.BOARD)\nGPIO.setup(2, GPIO.OUT)");
    expect(report.pins[0].status).toBe("fix");
    expect(report.pins[0].findings[0].title).toBe("Power pin");
  });

  it("reads gpiozero devices, including keyword pins and BOARD strings", () => {
    const report = check(
      "raspberry-pi-5",
      'from gpiozero import LED, Button, DistanceSensor\nLED(17)\nButton("BOARD13")\nDistanceSensor(echo=24, trigger=23)',
    );
    expect(pinNamed(report, "GPIO17").usages[0].label).toBe("Output");
    expect(pinNamed(report, "GPIO27").usages[0].label).toBe("Input");
    expect(pinNamed(report, "GPIO24").usages[0].label).toBe("Input");
    expect(pinNamed(report, "GPIO23").usages[0].label).toBe("Output");
  });

  it("flags the HAT EEPROM pins as reserved", () => {
    const report = check("raspberry-pi-5", "from gpiozero import LED\nLED(0)");
    expect(report.pins[0].status).toBe("fix");
    expect(report.pins[0].findings[0].title).toBe("Reserved pin");
  });
});

describe("CircuitPython", () => {
  it("reads board names, busio pin order, and DigitalInOut direction", () => {
    const code = [
      "import board, digitalio, busio, analogio",
      "led = digitalio.DigitalInOut(board.GP15)",
      "led.direction = digitalio.Direction.OUTPUT",
      "i2c = busio.I2C(board.GP5, board.GP4)",
      "knob = analogio.AnalogIn(board.GP26)",
    ].join("\n");
    const report = check("raspberry-pi-pico", code);
    expect(pinNamed(report, "GPIO15").usages[0].label).toBe("Output");
    expect(pinNamed(report, "GPIO5").usages[0].label).toBe("I2C SCL");
    expect(pinNamed(report, "GPIO4").usages[0].label).toBe("I2C SDA");
    expect(pinNamed(report, "GPIO26").usages[0].label).toBe("Analog read");
  });
});

describe("Pico SDK", () => {
  it("reads gpio_init, gpio_set_dir, gpio_set_function, and adc_gpio_init", () => {
    const code = [
      '#include "pico/stdlib.h"',
      "#define LED_PIN 15",
      "int main() {",
      "  gpio_init(LED_PIN);",
      "  gpio_set_dir(LED_PIN, GPIO_OUT);",
      "  gpio_set_function(4, GPIO_FUNC_I2C);",
      "  adc_gpio_init(27);",
      "}",
    ].join("\n");
    const report = check("raspberry-pi-pico", code);
    expect(pinNamed(report, "GPIO15").usages.map((use) => use.label)).toEqual(["Output"]);
    expect(pinNamed(report, "GPIO27").usages[0].label).toBe("Analog read");
    expect(report.counts.fix).toBe(0);
  });
});

describe("report shape", () => {
  it("sorts fixes first and counts each status", () => {
    const report = check("esp32-devkitc", "void setup(){ pinMode(4, OUTPUT); pinMode(12, OUTPUT); pinMode(35, OUTPUT); }", "arduino");
    expect(report.pins.map((pin) => pin.status)).toEqual(["fix", "check", "clear"]);
    expect(report.counts).toEqual({ fix: 1, check: 1, clear: 1 });
  });

  it("marks every place a signal appears on a board with two connectors", () => {
    const nucleo = check("stm32-nucleo-f401re", "void setup(){ pinMode(PA5, OUTPUT); }");
    expect(nucleo.pins).toHaveLength(1);
    expect(nucleo.pins[0].places.length).toBeGreaterThanOrEqual(1);
    expect(new Set(nucleo.pins[0].places.map((place) => place.key)).size).toBe(nucleo.pins[0].places.length);
  });

  it("bounds the input it reads", () => {
    const long = `void setup(){ pinMode(2, OUTPUT); }\n${" ".repeat(maxSourceLength)}pinMode(3, OUTPUT);`;
    const scan = scanCode(long);
    expect(scan.truncated).toBe(true);
    expect(scan.refs.map((ref) => ref.text)).toEqual(["2"]);
  });

  it("caps the number of references on pathological input", () => {
    const code = `void setup(){\n${"digitalWrite(2, HIGH);\n".repeat(2000)}}`;
    expect(scanCode(code).refs.length).toBeLessThanOrEqual(400);
  });
});

describe("examples", () => {
  it.each(codeExamples.map((example) => [example.title, example] as const))("%s checks against its board", (_title, example) => {
    const report = check(example.boardId, example.code);
    expect(report.pins.length).toBeGreaterThan(0);
    expect(report.missing).toEqual([]);
    expect(report.unfollowed).toEqual([]);
    expect(report.counts.fix + report.counts.check).toBeGreaterThan(0);
  });
});

describe("library calls", () => {
  it("reads attach() only on Servo objects", () => {
    const code = "#include <Servo.h>\n#include <Ticker.h>\nServo arm, claw;\nTicker blink;\nvoid setup(){ arm.attach(9); claw.attach(10); blink.attach(0.5, toggle); }";
    const report = check("arduino-uno-rev3", code);
    expect(report.pins.map((pin) => pin.pin.mcu?.arduino).sort()).toEqual(["10", "9"]);
    expect(report.unfollowed).toEqual([]);
  });

  it("states a finding once when two uses of a pin share it", () => {
    const pin = pinNamed(check("arduino-uno-rev3", "Servo s;\nvoid setup(){ analogWrite(4, 1); s.attach(4); }"), "D4");
    expect(pin.findings.filter((item) => item.title === "No PWM recorded")).toHaveLength(1);
  });
});

describe("wording", () => {
  it("names bus signals as written and other uses with an article", () => {
    const pin = pinNamed(
      check("raspberry-pi-pico", "from machine import Pin, ADC, I2C\nADC(Pin(26))\nI2C(1, sda=Pin(26), scl=Pin(27))"),
      "GPIO26",
    );
    expect(pin.findings.find((item) => item.title === "Used for two things")?.detail).toBe(
      "GP26 is used as an analog read and I2C SDA.",
    );
  });
});
