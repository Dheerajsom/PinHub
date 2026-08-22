import { describe, expect, it } from "vitest";
import {
  catalogUrl,
  defaultCatalogState,
  parseCatalogState,
} from "@/lib/catalog-state";

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
});
