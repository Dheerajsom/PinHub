import { describe, expect, it } from "vitest";
import {
  catalogUrl,
  compareCatalogBoards,
  defaultCatalogState,
  matchesCatalogFilters,
  parseCatalogState,
} from "@/lib/catalog-state";
import { boards, type BoardInterface } from "@/lib/boards";
import { summarizeBoard } from "@/lib/board-summary";

describe("catalog URL state", () => {
  it("round-trips filters, sort, and pagination", () => {
    const state = {
      ...defaultCatalogState,
      query: "esp32 c6",
      logic: ["3.3 V"],
      power: ["USB", "Header rail"],
      form: ["Breadboard"],
      favoritesOnly: true,
      sort: "vendor" as const,
      page: 3,
    };
    const url = catalogUrl(state, "/");
    expect(parseCatalogState(new URL(url, "https://pinhub.test").search)).toEqual(state);
  });

  it("bounds invalid page values", () => {
    expect(parseCatalogState("?page=-2").page).toBe(1);
    expect(parseCatalogState("?page=9999").page).toBe(100);
  });

  it("round-trips vendor, processor family, wireless, and documentation filters", () => {
    const state = {
      ...defaultCatalogState,
      vendor: ["Espressif"],
      family: ["ESP32-C6"],
      wireless: ["Wi-Fi"],
      wirelessCapability: "has" as const,
      officialDocumentation: "has" as const,
      sort: "recentlyAdded" as const,
    };

    const url = catalogUrl(state, "/");
    expect(url).toContain("vendor=Espressif");
    expect(url).toContain("family=ESP32-C6");
    expect(url).toContain("wireless=Wi-Fi");
    expect(url).toContain("wireless=has");
    expect(url).toContain("official=has");
    expect(url).toContain("sort=recentlyAdded");
    expect(parseCatalogState(new URL(url, "https://pinhub.test").search)).toEqual(
      state,
    );
  });

  it("accepts descriptive URL aliases and keeps wireless capability separate from interface filters", () => {
    expect(
      parseCatalogState(
        "?manufacturer=Acme&processor-family=RP2040&wireless=none&docs=no&sort=interfaces",
      ),
    ).toMatchObject({
      vendor: ["Acme"],
      family: ["RP2040"],
      wireless: [],
      wirelessCapability: "none",
      officialDocumentation: "none",
      sort: "interfaceCount",
    });
  });
});

describe("catalog filters and sorting", () => {
  it("matches boards with or without wireless capability", () => {
    const wireless = boards.find((board) => board.interfaces.includes("Wi-Fi"));
    const wired = boards.find((board) => !board.interfaces.includes("Wi-Fi"));
    expect(wireless).toBeDefined();
    expect(wired).toBeDefined();
    if (!wireless || !wired) return;

    const hasWireless = summarizeBoard(wireless, 1);
    const noWireless = summarizeBoard(wired, 2);
    expect(
      matchesCatalogFilters(
        hasWireless,
        { ...defaultCatalogState, wirelessCapability: "has" },
        new Set(),
      ),
    ).toBe(true);
    expect(
      matchesCatalogFilters(
        noWireless,
        { ...defaultCatalogState, wirelessCapability: "has" },
        new Set(),
      ),
    ).toBe(false);
    expect(
      matchesCatalogFilters(
        noWireless,
        { ...defaultCatalogState, wirelessCapability: "none" },
        new Set(),
      ),
    ).toBe(true);
  });

  it("matches official-documentation availability without guessing at missing metadata", () => {
    const documented = summarizeBoard(boards[0], 0);
    const undocumented = { ...documented, id: "undocumented", hasOfficialDocumentation: false };

    expect(
      matchesCatalogFilters(
        documented,
        { ...defaultCatalogState, officialDocumentation: "has" },
        new Set(),
      ),
    ).toBe(true);
    expect(
      matchesCatalogFilters(
        undocumented,
        { ...defaultCatalogState, officialDocumentation: "has" },
        new Set(),
      ),
    ).toBe(false);
    expect(
      matchesCatalogFilters(
        undocumented,
        { ...defaultCatalogState, officialDocumentation: "none" },
        new Set(),
      ),
    ).toBe(true);
    expect(
      matchesCatalogFilters(
        { ...undocumented, hasOfficialDocumentation: undefined },
        { ...defaultCatalogState, officialDocumentation: "none" },
        new Set(),
      ),
    ).toBe(false);
  });

  it("sorts recent boards by insertion index and then by interface count", () => {
    const first = summarizeBoard(boards[0], 0);
    const second = summarizeBoard(boards[1], 1);
    expect(compareCatalogBoards(second, first, "recentlyAdded")).toBeLessThan(0);

    const fewer = { ...first, id: "fewer", interfaces: ["GPIO"] as BoardInterface[] };
    const more = {
      ...second,
      id: "more",
      interfaces: ["GPIO", "I2C", "SPI"] as BoardInterface[],
    };
    expect(compareCatalogBoards(more, fewer, "interfaceCount")).toBeLessThan(0);
  });
});
