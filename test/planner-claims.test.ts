import { describe, expect, it } from "vitest";
import { boards, type Board, type Pin } from "@/lib/boards";
import {
  claimCautions,
  claimNameInput,
  cleanClaimName,
  maxClaimNameLength,
} from "@/lib/planner-claims";

function board(id: string): Board {
  const found = boards.find((item) => item.id === id);
  if (!found) throw new Error(`${id} missing`);
  return found;
}

function pins(target: Board): Pin[] {
  const pinout = target.pinout!;
  return pinout.pins
    ? [...pinout.pins.left, ...pinout.pins.right]
    : (pinout.groups ?? []).flatMap((group) => group.pins);
}

describe("claim names", () => {
  it("keeps the allowed characters and drops everything else", () => {
    expect(cleanClaimName("  OLED <b>SDA</b>  ")).toBe("OLED bSDA/b");
    expect(cleanClaimName("+5V rail #2")).toBe("+5V rail #2");
    expect(cleanClaimName("a\n=cmd|b,c~d:e")).toBe("acmdbcde");
  });

  it("bounds the length and rejects non-strings", () => {
    expect(cleanClaimName("x".repeat(100))).toHaveLength(maxClaimNameLength);
    expect(cleanClaimName(42)).toBe("");
    expect(cleanClaimName(null)).toBe("");
  });

  it("filters while typing without trimming a trailing space", () => {
    expect(claimNameInput("OLED ")).toBe("OLED ");
    expect(claimNameInput("a~b")).toBe("ab");
    expect(claimNameInput("x".repeat(100))).toHaveLength(maxClaimNameLength);
  });
});

describe("claimCautions", () => {
  it("quotes the board's flag notes and never invents one", () => {
    const esp = board("esp32-devkitc");
    const flagged = pins(esp).find((pin) => pin.flags?.includes("strapping"));
    expect(flagged).toBeDefined();
    const cautions = claimCautions(esp, flagged!);
    expect(cautions.map((item) => item.note)).toContain(esp.pinFunctions!.flagNotes.strapping);

    const plain = pins(esp).find((pin) => !pin.flags?.length && pin.role !== "reserved");
    expect(claimCautions(esp, plain!)).toEqual([]);
  });

  it("returns nothing for a board without pin function data", () => {
    const pi4 = board("raspberry-pi-4-model-b");
    const gpio = pins(pi4).find((pin) => pin.role === "gpio")!;
    expect(claimCautions(pi4, gpio)).toEqual([]);
  });
});
