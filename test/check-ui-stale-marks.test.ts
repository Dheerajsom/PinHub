import { describe, expect, it } from "vitest";
import { diffEdit, shiftLines, shiftSpans } from "@/components/check/stale-marks";

describe("stale pin marks", () => {
  it("finds the one replaced region", () => {
    expect(diffEdit("abc", "abc")).toBeNull();
    expect(diffEdit("pinMode(13);", "pinMode(132);")).toMatchObject({ from: 10, oldEnd: 10, delta: 1, lineDelta: 0 });
    expect(diffEdit("a\nb\nc", "a\nX\nY\nb\nc")).toMatchObject({ fromLine: 2, lineDelta: 2 });
  });

  it("keeps marks before an edit, moves the ones after it, and drops the ones it touched", () => {
    const before = "pinMode(2); pinMode(3); pinMode(4);";
    const after = "pinMode(2); pinMode(17); pinMode(4);";
    const marks = [
      { start: 8, end: 9, id: "2" },
      { start: 20, end: 21, id: "3" },
      { start: 32, end: 33, id: "4" },
    ];
    const edit = diffEdit(before, after);
    const shifted = shiftSpans(marks, edit);
    expect(shifted.map((mark) => mark.id)).toEqual(["2", "4"]);
    expect(after.slice(shifted[1].start, shifted[1].end)).toBe("4");
    expect(shiftSpans(marks, null)).toBe(marks);
  });

  it("moves hints with their lines and keeps the same map when no line moved", () => {
    const hints = new Map([
      [1, "first"],
      [3, "third"],
    ]);
    const added = shiftLines(hints, diffEdit("a\nb\nc", "a\nb\nnew\nc"));
    expect([...added.entries()]).toEqual([
      [1, "first"],
      [4, "third"],
    ]);
    expect(shiftLines(hints, diffEdit("a\nb\nc", "a\nbb\nc"))).toBe(hints);
    const removed = shiftLines(hints, diffEdit("a\nb\nc", "a\nc"));
    expect([...removed.entries()]).toEqual([
      [1, "first"],
      [2, "third"],
    ]);
  });
});
