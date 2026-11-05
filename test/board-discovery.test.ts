import { describe, expect, it } from "vitest";
import { boards } from "@/lib/boards";
import {
  getBoardDiscoveryProfile,
  sharedDiscoveryReasons,
} from "@/lib/board-discovery";
import { summarizeBoard } from "@/lib/board-summary";
import { fiveVoltCaution } from "@/lib/board-utilities";

describe("board discovery profiles", () => {
  it("normalizes every catalog record into filterable factual facets", () => {
    for (const board of boards) {
      const profile = getBoardDiscoveryProfile(board);
      expect(profile.computeClass).toMatch(
        /^(Linux SBC|Microcontroller|FPGA|AI accelerator)$/,
      );
      expect(profile.logicProfile).toMatch(
        /^(1.8 V|3.3 V|5 V|Mixed|Unknown)$/,
      );
      expect(profile.fiveVoltTolerance).toMatch(
        /^(Yes|No|Mixed|Unknown)$/,
      );
      expect(new Set(profile.wireless).size).toBe(profile.wireless.length);
      expect(new Set(profile.connectorEcosystems).size).toBe(
        profile.connectorEcosystems.length,
      );
      expect(new Set(profile.powerInputs).size).toBe(profile.powerInputs.length);
      expect(profile.formFactorProfile).toMatch(
        /^(Breadboard|Credit-card SBC|Compact module|Arduino|Feather|XIAO|MKR|Pmod|Evaluation board|Other)$/,
      );
    }
  });

  it("classifies representative SBC, MCU, FPGA, and AI boards", () => {
    const profile = (id: string) =>
      getBoardDiscoveryProfile(
        boards.find((board) => board.id === id)!,
      ).computeClass;

    expect(profile("raspberry-pi-5")).toBe("Linux SBC");
    expect(profile("raspberry-pi-pico")).toBe("Microcontroller");
    expect(profile("digilent-basys-3")).toBe("FPGA");
    expect(profile("google-coral-dev-board")).toBe("AI accelerator");
  });

  it("does not mistake a 5 V tolerance warning for a 5 V logic rail", () => {
    for (const id of [
      "particle-photon-2",
      "lattice-icestick",
      "nxp-frdm-kl25z",
      "digilent-nexys-a7-100t",
      "digilent-arty-a7",
      "esp32-c5-devkitc-1",
    ]) {
      const board = boards.find((entry) => entry.id === id)!;
      expect(getBoardDiscoveryProfile(board), id).toMatchObject({
        logicProfile: "3.3 V",
        fiveVoltTolerance: "No",
      });
    }
  });

  it("classifies partially 5 V-tolerant GPIO as mixed", () => {
    for (const id of ["stm32f103-blue-pill", "weact-black-pill-stm32f411"]) {
      const board = boards.find((entry) => entry.id === id)!;
      expect(getBoardDiscoveryProfile(board), id).toMatchObject({
        logicProfile: "3.3 V",
        fiveVoltTolerance: "Mixed",
      });
    }
  });

  it("uses explicit warning and connector evidence for comparison tolerance without guessing", () => {
    const byId = (id: string) => boards.find((item) => item.id === id)!;
    for (const id of ["raspberry-pi-pico", "esp32-devkitc", "raspberry-pi-5"]) {
      expect(getBoardDiscoveryProfile(byId(id)).fiveVoltTolerance, id).toBe("No");
    }
    for (const item of boards.filter((item) => fiveVoltCaution(item) === "Not 5 V tolerant")) {
      expect(getBoardDiscoveryProfile(item).fiveVoltTolerance, item.id).toBe("No");
    }
    expect(getBoardDiscoveryProfile(byId("arduino-uno-rev3")).fiveVoltTolerance).toBe("Yes");
    const undocumented = { ...byId("raspberry-pi-pico"), logicLevel: "3.3 V GPIO", warnings: [], pinout: undefined };
    expect(getBoardDiscoveryProfile(undocumented).fiveVoltTolerance).toBe("Unknown");
    expect(getBoardDiscoveryProfile({ ...undocumented, warnings: ["Use an external 5 V tolerant buffer."] }).fiveVoltTolerance).toBe("Unknown");
  });

  it("keeps pin arrays out of homepage summaries", () => {
    const summary = summarizeBoard(boards[0]!);
    expect(summary).not.toHaveProperty("pinout");
    expect(summary).not.toHaveProperty("sourceLinks");
    expect(summary.discovery.computeClass).toBeTruthy();
  });

  it("explains similar-board matches with visible factual reasons", () => {
    const pi5 = boards.find((board) => board.id === "raspberry-pi-5")!;
    const pi4 = boards.find(
      (board) => board.id === "raspberry-pi-4-model-b",
    )!;
    expect(sharedDiscoveryReasons(pi5, pi4).length).toBeGreaterThan(0);
  });
});
