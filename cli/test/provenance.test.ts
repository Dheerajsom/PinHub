import { describe, expect, it } from "vitest";
import { boards as siteBoards } from "../../src/lib/boards";
import {
  classifySource,
  verificationSourceFor,
} from "../../src/lib/source-trust";
import { generatedBoards } from "../src/boards/generated.js";

describe("generated source provenance", () => {
  it("matches the website's vendor-specific source classification", () => {
    const generatedById = new Map(
      generatedBoards.map((board) => [board.id, board]),
    );

    for (const siteBoard of siteBoards) {
      const generated = generatedById.get(siteBoard.id);
      if (!generated) continue; // flagship boards are maintained by hand

      expect(
        generated.sources.map(({ url, official, type }) => ({
          url,
          official,
          type,
        })),
        siteBoard.id,
      ).toEqual(
        siteBoard.sourceLinks.map((source) => ({
          url: source.url,
          official:
            classifySource(siteBoard.vendor, source.url) === "official",
          type: source.type,
        })),
      );
    }
  });

  it("uses the exact 30-pin layout source for DOIT wiring verification", () => {
    const board = siteBoards.find((candidate) => candidate.id === "esp32-devkit-v1");
    expect(board).toBeDefined();
    if (!board) return;

    const source = verificationSourceFor(board);
    expect(source?.type).toBe("Pinout");
    expect(source?.url).toContain("lastminuteengineers.com");
    expect(classifySource(board.vendor, source?.url ?? "")).toBe("third-party");
  });
});
