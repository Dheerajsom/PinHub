import { describe, expect, it } from "vitest";
import { boards as siteBoards } from "../../src/lib/boards";
import {
  classifySource,
  isSafeExternalUrl,
  verificationSourceFor,
} from "../../src/lib/source-trust";
import { boards } from "../src/catalog.js";
import { generatedBoards } from "../src/boards/generated.js";

describe("generated source provenance", () => {
  it("keeps every CLI source safe and aligned with website provenance rules", () => {
    const siteVendorById = new Map(
      siteBoards.map((board) => [board.id, board.vendor]),
    );
    for (const board of boards) {
      const siteVendor = siteVendorById.get(board.id);
      expect(siteVendor, `${board.id}: missing website vendor`).toBeDefined();
      for (const source of board.sources) {
        expect(isSafeExternalUrl(source.url), `${board.id}: ${source.url}`).toBe(
          true,
        );
        expect(source.title.trim(), `${board.id}: empty source title`).not.toBe("");
        expect(source.official, `${board.id}: ${source.url}`).toBe(
          classifySource(siteVendor ?? "", source.url) === "official",
        );
      }
    }
  });

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
