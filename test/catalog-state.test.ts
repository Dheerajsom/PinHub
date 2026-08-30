import { describe, expect, it } from "vitest";
import {
  boundCatalogQuery,
  catalogUrl,
  compareCatalogBoards,
  defaultCatalogState,
  maxCatalogFilterValueLength,
  maxCatalogFilterValues,
  maxCatalogQueryLength,
  maxCatalogSearchLength,
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

  it("round-trips every facet value exposed by the current catalog", () => {
    const catalog = boards.map(summarizeBoard);
    const unique = (values: string[]) => [...new Set(values)];
    const state = {
      ...defaultCatalogState,
      category: unique(catalog.map((board) => board.category)),
      platform: unique(catalog.map((board) => board.discovery.computeClass)),
      vendor: unique(catalog.map((board) => board.vendor)),
      family: unique(catalog.map((board) => board.family)),
      interface: unique(catalog.flatMap((board) => board.interfaces)),
      logic: unique(catalog.map((board) => board.discovery.logicProfile)),
      power: unique(catalog.flatMap((board) => board.discovery.powerInputs)),
      form: unique(catalog.map((board) => board.discovery.formFactorProfile)),
      wireless: unique(catalog.flatMap((board) => board.discovery.wireless)),
      connector: unique(
        catalog.flatMap((board) => board.discovery.connectorEcosystems),
      ),
    };

    expect(state.vendor.length).toBeGreaterThan(32);
    expect(state.family.length).toBeGreaterThan(32);
    const url = catalogUrl(state, "/");
    const search = new URL(url, "https://pinhub.test").search;

    expect(search.slice(1).length).toBeLessThanOrEqual(maxCatalogSearchLength);
    expect(parseCatalogState(search)).toEqual(state);
  });

  it("bounds hostile query text, repeated facets, and serialized state", () => {
    const params = new URLSearchParams();
    params.set("q", "x".repeat(100_000));
    for (let index = 0; index < 5_000; index += 1) {
      params.append("vendor", `vendor-${index}-${"y".repeat(200)}`);
    }

    const parsed = parseCatalogState(params);
    expect(parsed.query).toHaveLength(maxCatalogQueryLength);
    expect(parsed.vendor.length).toBeGreaterThan(0);
    expect(parsed.vendor.length).toBeLessThanOrEqual(maxCatalogFilterValues);
    expect(
      parsed.vendor.every(
        (value) => value.length <= maxCatalogFilterValueLength,
      ),
    ).toBe(true);

    const url = catalogUrl(
      {
        ...defaultCatalogState,
        query: "q".repeat(100_000),
        vendor: Array.from(
          { length: 5_000 },
          (_, index) => `vendor-${index}-${"z".repeat(200)}`,
        ),
      },
      "/",
    );
    const serialized = parseCatalogState(
      new URL(url, "https://pinhub.test").search,
    );
    expect(serialized.query).toHaveLength(maxCatalogQueryLength);
    expect(serialized.vendor.length).toBeGreaterThan(0);
    expect(serialized.vendor.length).toBeLessThanOrEqual(
      maxCatalogFilterValues,
    );
    expect(boundCatalogQuery("x".repeat(100_000))).toHaveLength(
      maxCatalogQueryLength,
    );
  });

  it("reserves singleton controls inside a maximal serialized URL", () => {
    const hostileValues = Array.from(
      { length: 5_000 },
      (_, index) => `facet-${index}-${"z".repeat(200)}`,
    );
    const url = catalogUrl(
      {
        ...defaultCatalogState,
        query: "q".repeat(100_000),
        category: hostileValues,
        platform: hostileValues,
        vendor: hostileValues,
        family: hostileValues,
        interface: hostileValues,
        logic: hostileValues,
        power: hostileValues,
        form: hostileValues,
        wireless: hostileValues,
        connector: hostileValues,
        wirelessCapability: "has",
        pinoutOnly: true,
        favoritesOnly: true,
        officialDocumentation: "has",
        sort: "vendor",
        page: 100,
      },
      "/",
    );
    const search = new URL(url, "https://pinhub.test").search;
    const params = new URLSearchParams(search);
    const parsed = parseCatalogState(search);

    expect(search.slice(1).length).toBeLessThanOrEqual(maxCatalogSearchLength);
    expect(params.get("wireless")).toBe("has");
    expect(params.get("pinout")).toBe("yes");
    expect(params.get("favorites")).toBe("yes");
    expect(params.get("official")).toBe("has");
    expect(params.get("sort")).toBe("vendor");
    expect(params.get("page")).toBe("100");
    expect(parsed).toMatchObject({
      wirelessCapability: "has",
      pinoutOnly: true,
      favoritesOnly: true,
      officialDocumentation: "has",
      sort: "vendor",
      page: 100,
    });
    expect(catalogUrl(parsed, "/")).toBe(url);
    for (const values of [
      parsed.category,
      parsed.platform,
      parsed.vendor,
      parsed.family,
      parsed.interface,
      parsed.logic,
      parsed.power,
      parsed.form,
      parsed.wireless,
      parsed.connector,
    ]) {
      expect(values.length).toBeLessThanOrEqual(maxCatalogFilterValues);
      expect(
        values.every((value) => value.length <= maxCatalogFilterValueLength),
      ).toBe(true);
    }
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
