import { describe, expect, it } from "vitest";
import { collectionSharePath, parseSharedCollectionIds } from "@/lib/collection-params";

describe("shared collection URLs", () => {
  it("round-trips a named board set", () => {
    const path = collectionSharePath({ name: "ESP32 projects", boardIds: ["esp32-devkit-v1", "pico"] });
    const url = new URL(path, "https://pinhub.test");
    expect(url.searchParams.get("name")).toBe("ESP32 projects");
    expect(parseSharedCollectionIds(url.searchParams.get("boards") ?? undefined)).toEqual(["esp32-devkit-v1", "pico"]);
  });

  it("de-duplicates and bounds hostile board sets", () => {
    const ids = Array.from({ length: 100 }, (_, index) => `board-${index}`).join(",");
    expect(parseSharedCollectionIds(`pico,pico,${ids}`)[0]).toBe("pico");
    expect(parseSharedCollectionIds(ids)).toHaveLength(24);
  });
});

