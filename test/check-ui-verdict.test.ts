import { describe, expect, it } from "vitest";
import { boards } from "@/lib/boards";
import { checkCode } from "@/lib/code-check/check";
import { maxRefs, maxUnfollowed, scanCode } from "@/lib/code-check/scan";
import { headline, tally } from "@/components/check/verdict";

const uno = boards.find((board) => board.id === "arduino-uno-rev3");
if (!uno) throw new Error("arduino-uno-rev3 missing");

function report(code: string) {
  const scan = scanCode(code, "arduino");
  return checkCode(uno!, scan);
}

type Counted = Parameters<typeof headline>[0];

/** A report shape with the given counts; the verdict reads only lengths and counts. */
function counted({ fix = 0, check = 0, clear = 0, missing = 0, unfollowed = 0, dropped = 0 }): Counted {
  const pins = Array.from({ length: fix + check + clear }, () => ({}) as Counted["pins"][number]);
  return {
    pins,
    missing: Array.from({ length: missing }, () => ({}) as Counted["missing"][number]),
    unfollowed: Array.from({ length: unfollowed }, () => ({}) as Counted["unfollowed"][number]),
    unfollowedDropped: dropped,
    counts: { fix, check, clear },
  };
}

describe("pin check verdict", () => {
  it("never reads as all clear for a pin that is not on the board", () => {
    // Regression: `pinMode(99, OUTPUT)` on an UNO read "All 0 pins match the record" in green.
    const only = report("void setup() { pinMode(99, OUTPUT); }");
    expect(only.pins).toHaveLength(0);
    expect(only.missing.length).toBeGreaterThan(0);
    const verdict = headline(only);
    expect(verdict.tone).not.toBe("clear");
    expect(verdict.text).not.toMatch(/match the record/);
    expect(verdict.text).toBe("The pin reference could not be checked");
  });

  it("never reads as all clear for a value it could not follow", () => {
    const only = report("int pins[] = {2, 3};\nvoid setup() { for (int i = 0; i < 2; i++) pinMode(pins[i], OUTPUT); }");
    expect(only.pins).toHaveLength(0);
    expect(only.unfollowed.length).toBeGreaterThan(0);
    expect(headline(only).tone).toBe("check");
    expect(headline(only).text).not.toMatch(/match the record/);
  });

  it.each([
    [{}, "No pin references found", "none"],
    [{ missing: 1 }, "The pin reference could not be checked", "check"],
    [{ unfollowed: 1 }, "The pin reference could not be checked", "check"],
    [{ missing: 2, unfollowed: 1 }, "None of the 3 pin references could be checked", "check"],
    [{ fix: 2, missing: 1 }, "2 pins to fix", "fix"],
    [{ fix: 1, check: 3 }, "1 pin to fix", "fix"],
    [{ check: 2, clear: 1, unfollowed: 1 }, "2 pins to check", "check"],
    [{ clear: 2, missing: 1 }, "1 reference not matched to this board's record", "check"],
    [{ clear: 1, missing: 1, unfollowed: 1 }, "1 reference not matched to this board's record", "check"],
    [{ clear: 3, unfollowed: 2 }, "2 values to check by hand", "check"],
    [{ clear: 1 }, "The pin matches the record", "clear"],
    [{ clear: 4 }, "All 4 pins match the record", "clear"],
  ] as const)("%o reads %s", (counts, text, tone) => {
    expect(headline(counted(counts))).toEqual({ text, tone });
  });

  it("is never clear while part of the input was cut", () => {
    expect(headline(counted({ clear: 2 }), { truncated: true })).toEqual({ text: "Only part of the code was checked", tone: "check" });
    expect(headline(counted({ fix: 1 }), { truncated: true }).tone).toBe("fix");
  });

  it.each([
    [{ clear: 1 }, "Only part of the code was checked", "check"],
    [{ clear: 4 }, "Only part of the code was checked", "check"],
    [{ fix: 1, clear: 2 }, "1 pin to fix", "fix"],
    [{ check: 2, clear: 1 }, "2 pins to check", "check"],
    [{ clear: 2, missing: 1 }, "1 reference not matched to this board's record", "check"],
    [{ clear: 3, unfollowed: 2 }, "2 values to check by hand", "check"],
    [{ missing: 2 }, "None of the 2 pin references could be checked", "check"],
  ] as const)("past the reference cap, %o reads %s", (counts, text, tone) => {
    expect(headline({ ...counted(counts), refsCapped: true })).toEqual({ text, tone });
    expect(headline({ ...counted(counts), refsCapped: true }, { truncated: true })).toEqual({ text, tone });
  });

  it("is never clear when a reference past the scanner's cap went unchecked", () => {
    // Regression: 400 clean references and then an input-only pin driven as an
    // output read "The pin matches the record"; the 401st was never recorded.
    const esp32 = boards.find((board) => board.id === "esp32-devkitc")!;
    const code = `void setup() {\n${"  digitalWrite(13, HIGH);\n".repeat(maxRefs)}  pinMode(34, OUTPUT);\n}`;
    const capped = checkCode(esp32, scanCode(code, "arduino"));
    expect(headline(capped)).toEqual({ text: "Only part of the code was checked", tone: "check" });
    const exact = checkCode(esp32, scanCode(`void setup() {\n${"  digitalWrite(13, HIGH);\n".repeat(maxRefs)}}`, "arduino"));
    expect(headline(exact)).toEqual({ text: "The pin matches the record", tone: "clear" });
  });

  it("tallies the references it could not check", () => {
    expect(tally(counted({ clear: 2 })).map((item) => item.text)).toEqual(["0 to fix", "0 to check", "2 clear"]);
    expect(tally(counted({ fix: 1, clear: 1, missing: 2, unfollowed: 1 })).map((item) => item.text)).toEqual([
      "1 to fix",
      "0 to check",
      "1 clear",
      "2 not matched",
      "1 not followed",
    ]);
  });

  it("counts the not-followed values past the scanner's cap", () => {
    // Regression: the scanner lists at most `maxUnfollowed` values and counts the
    // rest in `unfollowedDropped`; the verdict and tally counted only the list.
    const calls = Array.from({ length: maxUnfollowed + 20 }, (_, i) => `  pinMode(pins[${i % 2}] + ${i}, OUTPUT);`);
    const many = report(["int pins[] = {2, 3};", "void setup() {", ...calls, "  pinMode(13, OUTPUT);", "}"].join("\n"));
    expect(many.unfollowed).toHaveLength(maxUnfollowed);
    expect(many.unfollowedDropped).toBe(20);
    expect(headline(many)).toEqual({ text: `${maxUnfollowed + 20} values to check by hand`, tone: "check" });
    expect(tally(many).find((item) => item.status === "unfollowed")).toEqual({
      status: "unfollowed",
      count: maxUnfollowed + 20,
      text: `${maxUnfollowed + 20} not followed`,
    });
    expect(headline(counted({ unfollowed: 1, dropped: 2 })).text).toBe("None of the 3 pin references could be checked");
  });
});
