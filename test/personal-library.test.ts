// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

type LibraryModule = typeof import("@/lib/personal-library");

async function loadLibrary(): Promise<LibraryModule> {
  vi.resetModules();
  return import("@/lib/personal-library");
}

beforeEach(() => window.localStorage.clear());

describe("personal project library", () => {
  it("rejects collections that would disappear after reloading", async () => {
    let library = await loadLibrary();
    for (let index = 0; index < library.collectionLimit; index++) {
      expect(library.createCollection(`Project ${index}`)).toBeTruthy();
    }
    const before = library.getPersonalLibrarySnapshot();
    expect(library.createCollection("Overflow")).toBeNull();
    expect(library.getPersonalLibrarySnapshot()).toBe(before);
    library = await loadLibrary();
    expect(library.getPersonalLibrarySnapshot().collections).toEqual(before.collections);
  });

  it("does not evict another collection when undoing into a full library", async () => {
    const library = await loadLibrary();
    for (let index = 0; index < library.collectionLimit; index++) library.createCollection(`Project ${index}`);
    const removed = library.getPersonalLibrarySnapshot().collections[0];
    library.removeCollection(removed.id);
    library.createCollection("Replacement");
    const before = library.getPersonalLibrarySnapshot();
    expect(library.restoreCollection(removed, 0)).toBe(false);
    expect(library.getPersonalLibrarySnapshot()).toBe(before);
    library.removeCollection(before.collections[1].id);
    expect(library.restoreCollection(removed, 0)).toBe(true);
  });

  it("skips writes and subscriber updates when the library is unchanged", async () => {
    const library = await loadLibrary();
    const id = library.createCollection("Robotics", ["pico"])!;
    library.recordRecentBoard("pico");
    const before = library.getPersonalLibrarySnapshot();
    const listener = vi.fn();
    const unsubscribe = library.subscribeToPersonalLibrary(listener);
    const write = vi.spyOn(Storage.prototype, "setItem");
    library.recordRecentBoard("pico");
    library.setBoardInCollection(id, "pico", true);
    library.setBoardInCollection(id, "uno", false);
    library.setBoardInCollection("missing", "uno", true);
    library.removeCollection("missing");
    expect(library.getPersonalLibrarySnapshot()).toBe(before);
    expect(write).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
    write.mockRestore();
  });

  it("deduplicates normalized collection IDs and stops at capacity", async () => {
    const library = await loadLibrary();
    const normalized = library.normalizePersonalLibrary({ collections: [
      { id: "one", name: "First" }, { id: " one ", name: "Duplicate" },
      ...Array.from({ length: 40 }, (_, index) => ({ id: `item-${index}`, name: "Valid" })),
    ] });
    expect(normalized.collections).toHaveLength(library.collectionLimit);
    expect(normalized.collections.filter(({ id }) => id === "one")).toHaveLength(1);
  });

  it("leaves a full collection unchanged when another board is added", async () => {
    const library = await loadLibrary();
    const ids = Array.from({ length: library.collectionBoardLimit }, (_, index) => `board-${index}`);
    const id = library.createCollection("Full", ids)!;
    const before = library.getPersonalLibrarySnapshot();
    library.setBoardInCollection(id, "overflow", true);
    expect(library.getPersonalLibrarySnapshot()).toBe(before);
    library.setBoardInCollection(id, ids[0], false);
    library.setBoardInCollection(id, "replacement", true);
    expect(library.getPersonalLibrarySnapshot().collections[0].boardIds).toContain("replacement");
  });

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

  it("restores a removed collection to its original shelf position", async () => {
    const library = await loadLibrary();
    const firstId = library.createCollection("First", ["pico"]);
    library.createCollection("Second", ["uno"]);
    const first = library.getPersonalLibrarySnapshot().collections[0]!;

    library.removeCollection(firstId!);
    expect(
      library.getPersonalLibrarySnapshot().collections.map(({ name }) => name),
    ).toEqual(["Second"]);

    library.restoreCollection(first, 0);
    expect(
      library.getPersonalLibrarySnapshot().collections.map(({ name }) => name),
    ).toEqual(["First", "Second"]);
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

  it("keeps working when storage reads and writes are unavailable", async () => {
    const getItem = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const library = await loadLibrary();
    expect(library.getPersonalLibrarySnapshot()).toMatchObject({ recentBoardIds: [] });
    expect(() => library.recordRecentBoard("pico")).not.toThrow();
    expect(library.getPersonalLibrarySnapshot().recentBoardIds).toEqual(["pico"]);
    getItem.mockRestore();
    setItem.mockRestore();
  });

  it("re-reads the library after a cross-tab storage event", async () => {
    const library = await loadLibrary();
    const listener = vi.fn();
    library.subscribeToPersonalLibrary(listener);
    window.localStorage.setItem(
      library.personalLibraryStorageKey,
      JSON.stringify({ version: 1, recentBoardIds: ["uno"], collections: [] }),
    );
    window.dispatchEvent(new StorageEvent("storage", { key: library.personalLibraryStorageKey }));
    expect(listener).toHaveBeenCalledTimes(1);
    expect(library.getPersonalLibrarySnapshot().recentBoardIds).toEqual(["uno"]);
  });

});
