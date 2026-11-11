// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { boards } from "@/lib/boards";
import { checkCode, type CheckReport as Report } from "@/lib/code-check/check";
import { maxRefs, maxUnfollowed, scanCode } from "@/lib/code-check/scan";
import { CheckReport } from "@/components/check/CheckReport";

const uno = boards.find((board) => board.id === "arduino-uno-rev3");
if (!uno) throw new Error("arduino-uno-rev3 missing");

function report(code: string): Report {
  return checkCode(uno!, scanCode(code, "arduino"));
}

function show(value: Report, truncated = false) {
  return render(
    <CheckReport report={value} dialect="Arduino" selectedPin={null} onSelect={() => {}} onLine={() => {}} truncated={truncated} />,
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("CheckReport", () => {
  it("keys findings that share a title without collisions", () => {
    // Regression: `analogWrite(7, x)` + `servo.attach(7)` gave two "No PWM recorded"
    // findings keyed by title alone, a duplicate React key.
    const base = report("#include <Servo.h>\nServo servo;\nvoid setup() { analogWrite(7, 10); servo.attach(7); }");
    const pin = base.pins.find((item) => item.findings.length);
    expect(pin).toBeDefined();
    const finding = pin!.findings[0];
    const doubled: Report = {
      ...base,
      pins: base.pins.map((item) => (item === pin ? { ...item, findings: [finding, { ...finding }] } : item)),
    };
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    show(doubled);
    expect(errors.mock.calls.some((call) => String(call[0]).includes("same key"))).toBe(false);
    const titles = screen.getAllByText(finding.title, { selector: ".ph-check-finding-title" });
    expect(titles.length).toBeGreaterThanOrEqual(2);
  });

  it("does not read as clear when the only reference is not matched to the record", () => {
    const value = report("void setup() { pinMode(99, OUTPUT); }");
    show(value);
    const region = screen.getByRole("region", { name: "Check report" });
    const heading = within(region).getByRole("heading", { level: 2 });
    expect(heading.textContent).toBe("The pin reference could not be checked");
    expect(region.querySelector(".ph-check-summary")?.getAttribute("data-tone")).toBe("check");
    expect(region.querySelector(".ph-check-tally")?.textContent).toContain("1 not matched");
    // The aside names what failed, not a claim that the pin is absent from the board.
    expect(within(region).getByRole("heading", { level: 3, name: "Not matched to this board's record" })).toBeTruthy();
    expect(region.textContent).not.toMatch(/not on this board/i);
  });

  it("says how many not-followed values are past the listed ones", () => {
    const calls = Array.from({ length: maxUnfollowed + 7 }, (_, i) => `  pinMode(pins[${i % 2}] + ${i}, OUTPUT);`);
    const value = report(["int pins[] = {2, 3};", "void setup() {", ...calls, "}"].join("\n"));
    expect(value.unfollowedDropped).toBe(7);
    show(value);
    const aside = screen.getByRole("heading", { level: 3, name: "Values PinHub couldn't follow" }).closest("section")!;
    expect(within(aside).getAllByRole("listitem")).toHaveLength(maxUnfollowed);
    expect(aside.textContent).toContain("and 7 more not listed");
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(`None of the ${maxUnfollowed + 7} pin references could be checked`);
  });

  it("adds nothing under the not-followed list when none were dropped", () => {
    const value = report("int pins[] = {2, 3};\nvoid setup() { pinMode(pins[0] + 1, OUTPUT); pinMode(13, OUTPUT); }");
    expect(value.unfollowed).toHaveLength(1);
    expect(value.unfollowedDropped).toBe(0);
    show(value);
    expect(screen.queryByText(/more not listed/)).toBeNull();
  });

  it("is not clear while the input was cut", () => {
    const value = report("void setup() { pinMode(13, OUTPUT); }");
    expect(value.counts.fix + value.counts.check).toBe(0);
    show(value, true);
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("Only part of the code was checked");
  });

  it("is not clear when the scanner stopped at its reference cap", () => {
    // Regression: 400 clean references followed by an unmatched one read
    // "The pin matches the record"; the reference past the cap was never seen.
    const value = report(`void setup() {\n${"  pinMode(13, OUTPUT);\n".repeat(maxRefs)}  pinMode(99, OUTPUT);\n}`);
    expect(value.refsCapped).toBe(true);
    expect(value.counts.fix + value.counts.check).toBe(0);
    expect(value.missing).toEqual([]);
    show(value);
    const region = screen.getByRole("region", { name: "Check report" });
    expect(within(region).getByRole("heading", { level: 2 }).textContent).toBe("Only part of the code was checked");
    expect(region.querySelector(".ph-check-summary")?.getAttribute("data-tone")).toBe("check");
  });

  it("marks each status with its own glyph, not colour alone", () => {
    const value = report("void setup() { pinMode(13, OUTPUT); }");
    show(value);
    const strip = screen.getByRole("list", { name: "Pins your code uses" });
    expect(within(strip).getAllByRole("button")[0].textContent).toBe("✓");
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("The pin matches the record");
  });
});
