// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

type LibraryModule = typeof import("@/lib/personal-library");

async function loadLibrary(): Promise<LibraryModule> {
  vi.resetModules();
  return import("@/lib/personal-library");
}

beforeEach(() => window.localStorage.clear());

describe("personal project library", () => {
  it("recovers from corrupt storage and bounds recent boards", async () => {
    window.localStorage.setItem("pinhub.library.v1", "{broken");
    let library = await loadLibrary();
    expect(library.getPersonalLibrarySnapshot().recentBoardIds).toEqual([]);

    window.localStorage.clear();
    library = await loadLibrary();
    for (let index = 0; index < 12; index += 1) {
      library.recordRecentBoard(`board-${index}`);
    }
    expect(library.getPersonalLibrarySnapshot().recentBoardIds).toHaveLength(8);
    expect(library.getPersonalLibrarySnapshot().recentBoardIds[0]).toBe("board-11");
  });

  it("creates collections and adds or removes boards", async () => {
    const library = await loadLibrary();
    const id = library.createCollection(" Robotics ", ["pico"]);
    expect(id).toBeTruthy();
    expect(library.getPersonalLibrarySnapshot().collections[0]).toMatchObject({
      name: "Robotics",
      boardIds: ["pico"],
    });

    library.setBoardInCollection(id!, "uno", true);
    library.setBoardInCollection(id!, "pico", false);
    expect(library.getPersonalLibrarySnapshot().collections[0]?.boardIds).toEqual([
      "uno",
    ]);
  });

  it("defensively normalizes malformed collection records", async () => {
    const library = await loadLibrary();
    const normalized = library.normalizePersonalLibrary({
      recentBoardIds: ["pico", 7, "pico"],
      collections: [
        { id: "one", name: "  Valid  ", boardIds: ["pico", null] },
        { id: "", name: "Invalid", boardIds: [] },
      ],
    }, "2026-01-01T00:00:00.000Z");
    expect(normalized.recentBoardIds).toEqual(["pico"]);
    expect(normalized.collections).toHaveLength(1);
    expect(normalized.collections[0]).toMatchObject({ id: "one", name: "Valid", boardIds: ["pico"] });
  });
});

