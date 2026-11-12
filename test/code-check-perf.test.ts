import { describe, expect, it } from "vitest";
import { detectDialect, maxSourceLength, scanCode, type Dialect } from "@/lib/code-check/scan";

// Pathological pastes at the input limit. Before the scanner was made linear
// each of these took between 0.5 s and 48 s; the budget is generous so a slow
// CI machine does not flake, but any quadratic pass blows straight through it.
const budgetMs = 1000;
const n = maxSourceLength;

function timed(run: () => void): number {
  const start = performance.now();
  run();
  return performance.now() - start;
}

describe("scanner time on pathological input", () => {
  const cases: Array<[string, string, Dialect | null]> = [
    ["one long identifier", `void setup(){}\n${"a".repeat(n - 20)}`, "arduino"],
    ["a long member chain", `void setup(){}\n${"a.".repeat((n - 20) / 2)}`, "arduino"],
    ["a #define padded with spaces", `#define A b${" ".repeat(n - 20)}x`, "arduino"],
    ["a Python assignment padded with spaces", `x = a${" ".repeat(n - 10)}b`, "micropython"],
    ["a C declaration padded with spaces", `int x = a${" ".repeat(n - 20)}`, "arduino"],
    ["repeated type words", "int ".repeat(n / 4), "arduino"],
    ["blank lines, dialect detected", "\n".repeat(n), null],
    ["blank lines then code, dialect detected", `${"\n".repeat(n - 40)}void setup(){ pinMode(2, OUTPUT); }`, null],
    ["unclosed calls", "f(".repeat(n / 2), "arduino"],
    ["deeply nested calls", `${"pinMode(".repeat(n / 18)}2${")".repeat(n / 18)}`, "arduino"],
    ["nested brackets", `${"(".repeat(n / 2)}${")".repeat(n / 2)}`, "arduino"],
    ["nested braces", `${"{".repeat(n / 2)}${"}".repeat(n / 2)}`, "arduino"],
    ["many constants and uses", "#define A 1\nconst int b = A;\nvoid f(){ pinMode(A, OUTPUT); }\n".repeat(n / 70), "arduino"],
    ["one long Python line of assignments", `from machine import Pin\n${"a = b; ".repeat((n - 40) / 7)}`, "micropython"],
    ["many for loops", "for for ".repeat(n / 8), "micropython"],
    ["many parameter lists", "void f(int a) {}\n".repeat(n / 17), "arduino"],
    ["CR-only line endings", `void setup(){\r${"// x\r".repeat((n - 20) / 5)}}`, "arduino"],
    ["digit separators", `void setup(){ delay(${"1'".repeat((n - 30) / 2)}0); }`, "arduino"],
    ["nested #if 0", `${"#if 0\n".repeat(n / 14)}${"#endif\n".repeat(n / 14)}`, "arduino"],
    ["many unfollowed values", `void setup(){\n${"pinMode(x, OUTPUT);\n".repeat((n - 20) / 20)}}`, "arduino"],
  ];

  it.each(cases)("%s", (_name, code, dialect) => {
    expect(code.length).toBeLessThanOrEqual(n);
    const ms = timed(() => {
      if (dialect === null) {
        detectDialect(code);
        scanCode(code);
      } else scanCode(code, dialect);
    });
    expect(ms).toBeLessThan(budgetMs);
  });
});

describe("list constants", () => {
  it("does not explode on a list that refers to itself", () => {
    const code = `from machine import Pin\nP = [${Array(100).fill("P").join(",")}]\nPin(P, Pin.OUT)`;
    let refs = -1;
    const ms = timed(() => {
      refs = scanCode(code, "micropython").refs.length;
    });
    expect(ms).toBeLessThan(500);
    expect(refs).toBe(0);
  });

  it("does not follow an indirect cycle", () => {
    const scan = scanCode("from machine import Pin\nA = [B, 2]\nB = [A, 3]\nPin(A, Pin.OUT)", "micropython");
    expect(scan.refs).toEqual([]);
    expect(scan.unfollowed.map((item) => item.text)).toEqual(["A"]);
  });

  it("does not follow lists that nest into more pins than it lists", () => {
    const code = `from machine import Pin\nA = [${Array(8).fill("2").join(",")}]\nB = [${Array(8).fill("A").join(",")}]\nC = [${Array(8).fill("B").join(",")}]\nPin(C, Pin.OUT)`;
    let scan: ReturnType<typeof scanCode> | null = null;
    expect(timed(() => (scan = scanCode(code, "micropython")))).toBeLessThan(500);
    expect(scan!.refs).toEqual([]);
    expect(scan!.unfollowed).toHaveLength(1);
  });

  it("keeps the reference cap on a long list", () => {
    const scan = scanCode(`from machine import Pin\nP = [${Array(5000).fill("2").join(",")}]\nPin(P, Pin.OUT)`, "micropython");
    expect(scan.refs.length).toBeLessThanOrEqual(400);
  });
});
