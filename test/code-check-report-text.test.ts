import { describe, expect, it } from "vitest";
import { boards, type Board } from "@/lib/boards";
import { checkCode, type CheckReport, type CheckedPin } from "@/lib/code-check/check";
import { plannerClaims, plannerHref, reportMarkdown } from "@/lib/code-check/report-text";
import { maxRefs, maxSourceLength, scanCode, type PinRef } from "@/lib/code-check/scan";
import { maxClaimNameLength, maxClaims } from "@/lib/planner-claims";

function board(id: string): Board {
  const found = boards.find((item) => item.id === id);
  if (!found) throw new Error(`missing board ${id}`);
  return found;
}

const uno = board("arduino-uno-rev3");
const hostile = "a|b`c[d]<e>*_\\";

function ref(text: string, line = 1): PinRef {
  return { spec: { kind: "name", value: text }, usage: { kind: "output", label: "Output" }, text, start: 0, end: text.length, line };
}

function fakePin(index: number, extra: Partial<CheckedPin> = {}): CheckedPin {
  return {
    id: `key:k${index}`,
    pin: { position: index, label: `P${index}`, role: "gpio" },
    places: [{ key: `k${index}`, position: index }],
    usages: [{ kind: "output", label: "Output" }],
    refs: [ref(`P${index}`)],
    findings: [],
    status: "clear",
    ...extra,
  };
}

function report(extra: Partial<CheckReport> = {}): CheckReport {
  return { pins: [], missing: [], unfollowed: [], unfollowedDropped: 0, refsCapped: false, counts: { fix: 0, check: 0, clear: 0 }, numbering: null, ...extra };
}

describe("reportMarkdown", () => {
  it("lists every pin, its findings with their sources, and the numbering used", () => {
    const code = "void setup(){ pinMode(1, OUTPUT); pinMode(LED_BUILTIN, OUTPUT); }";
    const text = reportMarkdown(uno, checkCode(uno, scanCode(code)), "arduino");
    expect(text).toContain("## PinHub pin check: Arduino UNO");
    expect(text).toContain("Arduino code. 0 to fix, 1 to check, 1 clear.");
    expect(text).toContain("| Check | D1 (PD1) |");
    expect(text).toContain("- Shared with USB or serial: The record lists D1 as used by the board's USB or serial connection. See the source note. Source: Arduino:");
    expect(text).toContain("Bare numbers are matched to this board's Arduino pin numbers, as its core variant names them.");
    expect(text).toMatch(/Verify against the board's documentation before wiring\.$/);
  });

  it("omits the numbering line when the code names no pin by bare number", () => {
    const text = reportMarkdown(uno, checkCode(uno, scanCode("void setup(){ pinMode(D2, OUTPUT); }")), "arduino");
    expect(text).not.toContain("Bare numbers");
  });

  it("lists references it could not match and values it could not follow", () => {
    const code = "void setup(){ pinMode(40, OUTPUT); pinMode(pins[i], OUTPUT); }";
    const text = reportMarkdown(uno, checkCode(uno, scanCode(code)), "arduino");
    expect(text).toContain("**Not matched to this board's record**\n- Line 1, 40: PinHub's record has no Arduino number 40 for this board, so this use can't be checked.");
    expect(text).toContain("**Not followed (check by hand)**\n- Line 1, pins\\[i\\] (Output)");
  });

  it("says how many unfollowed values were left out", () => {
    const scan = scanCode(`void setup(){\n${"pinMode(x, OUTPUT);\n".repeat(150)}}`);
    const text = reportMarkdown(uno, checkCode(uno, scan), "arduino");
    expect(text).toContain("- …and 50 more not listed");
  });

  it("states that only the start of a cut paste was checked, when asked", () => {
    const checked = checkCode(uno, scanCode("void setup(){ pinMode(2, OUTPUT); }"));
    const line = `Only the first ${maxSourceLength.toLocaleString("en-US")} characters of the code were checked.`;
    expect(line).toBe("Only the first 100,000 characters of the code were checked.");
    expect(reportMarkdown(uno, checked, "arduino", { truncated: true })).toContain(line);
    expect(reportMarkdown(uno, checked, "arduino", {})).not.toContain("Only the first");
    expect(reportMarkdown(uno, checked, "arduino")).not.toContain("Only the first");
  });

  it("states that only the first references were checked when the scanner stopped at its cap", () => {
    // Regression: the copied report said nothing when references past `maxRefs` went unchecked.
    const line = `Only the first ${maxRefs.toLocaleString("en-US")} pin references were checked. The rest of the code was not.`;
    expect(line).toBe("Only the first 400 pin references were checked. The rest of the code was not.");
    const code = (tail: string) => `void setup(){\n${"pinMode(13, OUTPUT);\n".repeat(maxRefs)}${tail}}`;
    const capped = checkCode(uno, scanCode(code("pinMode(99, OUTPUT);\n")));
    expect(capped.refsCapped).toBe(true);
    expect(reportMarkdown(uno, capped, "arduino")).toContain(line);
    expect(reportMarkdown(uno, checkCode(uno, scanCode(code(""))), "arduino")).not.toContain("pin references were checked");
  });

  it("escapes user-controlled text so it cannot break the table or inject markup", () => {
    const pin = fakePin(1, {
      pin: { position: 1, label: `${hostile} / x`, role: "gpio", mcu: { name: `M${hostile}` } },
      usages: [{ kind: "output", label: hostile }],
      findings: [{ severity: "check", title: hostile, detail: `detail ${hostile}\nnext`, quote: `quote ${hostile}` }],
      status: "check",
    });
    const text = reportMarkdown(
      uno,
      report({
        pins: [pin],
        missing: [{ ref: ref(hostile, 3), reason: `reason ${hostile}` }],
        unfollowed: [{ text: hostile, usage: { kind: "output", label: "Output" }, line: 4, start: 0, end: 1 }],
        counts: { fix: 0, check: 1, clear: 0 },
        numbering: `numbering ${hostile}`,
      }),
      "arduino",
    );
    const escaped = "a\\|b\\`c\\[d\\]\\<e\\>\\*\\_\\\\";
    // Every table row keeps exactly its six cell borders.
    for (const row of text.split("\n").filter((line) => line.startsWith("| ") && !line.startsWith("| ---") && !line.startsWith("| Status"))) {
      expect(row.replace(/\\\|/g, "").split("|")).toHaveLength(7);
    }
    expect(text).toContain(`| Check | ${escaped} (M${escaped}) |`);
    expect(text).toContain(`- ${escaped}: detail ${escaped} next Source: quote ${escaped}`);
    expect(text).toContain(`- Line 3, ${escaped}: reason ${escaped}`);
    expect(text).toContain(`- Line 4, ${escaped} (Output)`);
    expect(text).toContain(`numbering ${escaped}`);
    expect(text).not.toMatch(/[^\\][<>]/);
  });

  it("removes control and line-separator characters from user text", () => {
    const pin = fakePin(1, { findings: [{ severity: "fix", title: "T", detail: "a\u0000b c\u0085d\re" }], status: "fix" });
    const text = reportMarkdown(uno, report({ pins: [pin], counts: { fix: 1, check: 0, clear: 0 } }), null);
    expect(text).toContain("- T: a b c d e");
    expect(text.startsWith(`## PinHub pin check: ${uno.name}\n\n1 to fix`)).toBe(true);
  });
});

describe("plannerClaims", () => {
  it("names each claim by the constant the code used, else by its use", () => {
    const code = "const int lamp = 9;\nvoid setup(){ pinMode(lamp, OUTPUT); pinMode(2, INPUT); }";
    const claims = plannerClaims(checkCode(uno, scanCode(code)));
    expect(claims.map((claim) => claim.name)).toEqual(["lamp", "Input"]);
    expect(new Set(claims.map((claim) => claim.key)).size).toBe(2);
  });

  it("filters claim names to the planner's safe set and length", () => {
    const pin = fakePin(1, { refs: [{ ...ref("x"), via: "<script>alert(1)</script>_and_a_very_long_name" }] });
    const [claim] = plannerClaims(report({ pins: [pin] }));
    expect(claim.name).not.toMatch(/[<>()]/);
    expect(claim.name.length).toBeLessThanOrEqual(maxClaimNameLength);
  });

  it("skips power and ground pins and repeated places", () => {
    const pins = [
      fakePin(1),
      fakePin(2, { pin: { position: 2, label: "5V", role: "power" } }),
      fakePin(3, { pin: { position: 3, label: "GND", role: "ground" } }),
      fakePin(4, { places: [{ key: "k1", position: 1 }] }),
      fakePin(5, { places: [] }),
    ];
    expect(plannerClaims(report({ pins })).map((claim) => claim.key)).toEqual(["k1"]);
  });

  it(`stops at ${maxClaims} claims`, () => {
    const pins = Array.from({ length: maxClaims + 10 }, (_, index) => fakePin(index));
    const claims = plannerClaims(report({ pins }));
    expect(claims).toHaveLength(maxClaims);
    expect(claims[maxClaims - 1].key).toBe(`k${maxClaims - 1}`);
  });

  it("builds a planner link for the board", () => {
    const href = plannerHref(uno, checkCode(uno, scanCode("void setup(){ pinMode(2, OUTPUT); }")));
    expect(href.startsWith("/planner?")).toBe(true);
    expect(href).toContain("arduino-uno-rev3");
  });
});
