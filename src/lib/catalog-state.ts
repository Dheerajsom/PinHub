import type { BoardSummary } from "@/lib/board-summary";

export type CatalogSort =
  | "catalog"
  | "relevance"
  | "name"
  | "vendor"
  | "recentlyAdded"
  | "interfaceCount";
export type WirelessCapability = "any" | "has" | "none";
export type OfficialDocumentationFilter = "any" | "has" | "none";
export type CatalogFilterKey =
  | "category"
  | "platform"
  | "interface"
  | "logic"
  | "power"
  | "form"
  | "wireless"
  | "connector"
  | "vendor"
  | "family";

export type CatalogState = {
  query: string;
  category: string[];
  platform: string[];
  /** Board manufacturer/vendor names. */
  vendor: string[];
  /** MCU/processor family names from the source-backed board record. */
  family: string[];
  interface: string[];
  logic: string[];
  power: string[];
  form: string[];
  wireless: string[];
  /** Whether the board exposes any wireless interface at all. */
  wirelessCapability: WirelessCapability;
  connector: string[];
  pinoutOnly: boolean;
  favoritesOnly: boolean;
  /** Availability of at least one official source-backed reference. */
  officialDocumentation: OfficialDocumentationFilter;
  sort: CatalogSort;
  page: number;
};

export const defaultCatalogState: CatalogState = {
  query: "",
  category: [],
  platform: [],
  vendor: [],
  family: [],
  interface: [],
  logic: [],
  power: [],
  form: [],
  wireless: [],
  wirelessCapability: "any",
  connector: [],
  pinoutOnly: false,
  favoritesOnly: false,
  officialDocumentation: "any",
  sort: "catalog",
  page: 1,
};

const arrayKeys: CatalogFilterKey[] = [
  "category",
  "platform",
  "vendor",
  "family",
  "interface",
  "logic",
  "power",
  "form",
  "wireless",
  "connector",
];

// URL state is attacker-controlled when a catalog link is shared. Bound both
// the raw query and its repeated facets before React stores or scores them.
export const maxCatalogQueryLength = 256;
export const maxCatalogFilterValues = 256;
export const maxCatalogFilterValueLength = 128;
export const maxCatalogSearchLength = 16_384;
const maxCatalogParameters = arrayKeys.length * maxCatalogFilterValues + 16;
const maxScannedCatalogParameters = maxCatalogParameters * 4;
const acceptedCatalogParamNames = new Set([
  ...arrayKeys,
  "q",
  "sort",
  "page",
  "pinout",
  "favorites",
  "manufacturer",
  "processorFamily",
  "processor-family",
  "wirelessCapability",
  "wireless-capability",
  "official",
  "officialDocumentation",
  "official-documentation",
  "docs",
]);

export function boundCatalogQuery(value: string): string {
  return value.slice(0, maxCatalogQueryLength);
}

function appendWithinSearchBudget(
  params: URLSearchParams,
  key: string,
  value: string,
  currentLength: number,
): number | null {
  const entry = new URLSearchParams([[key, value]]).toString();
  const nextLength = currentLength + (currentLength ? 1 : 0) + entry.length;
  if (nextLength > maxCatalogSearchLength) return null;
  params.append(key, value);
  return nextLength;
}

function boundedCatalogParams(
  search: string | URLSearchParams,
): URLSearchParams {
  const source =
    typeof search === "string"
      ? new URLSearchParams(
          (search.startsWith("?") ? search.slice(1) : search).slice(
            0,
            maxCatalogSearchLength,
          ),
        )
      : search;
  const bounded = new URLSearchParams();
  let scanned = 0;
  let accepted = 0;
  let serializedLength = 0;
  for (const [key, value] of source) {
    scanned += 1;
    if (scanned > maxScannedCatalogParameters) break;
    if (!acceptedCatalogParamNames.has(key)) continue;
    if (accepted >= maxCatalogParameters) break;
    const nextLength = appendWithinSearchBudget(
      bounded,
      key,
      boundCatalogQuery(value),
      serializedLength,
    );
    if (nextLength === null) continue;
    serializedLength = nextLength;
    accepted += 1;
  }
  return bounded;
}

function boundedFilterValues(values: readonly string[]): string[] {
  const unique = new Set<string>();
  for (const value of values) {
    const bounded = value.slice(0, maxCatalogFilterValueLength);
    if (!bounded || unique.has(bounded)) continue;
    unique.add(bounded);
    if (unique.size >= maxCatalogFilterValues) break;
  }
  return [...unique];
}

const sortAliases: Record<string, CatalogSort> = {
  catalog: "catalog",
  relevance: "relevance",
  name: "name",
  vendor: "vendor",
  recentlyAdded: "recentlyAdded",
  "recently-added": "recentlyAdded",
  recent: "recentlyAdded",
  interfaceCount: "interfaceCount",
  "interface-count": "interfaceCount",
  interfaces: "interfaceCount",
};

const wirelessCapabilityValues = new Set<WirelessCapability>([
  "any",
  "has",
  "none",
]);

const officialDocumentationValues = new Set<OfficialDocumentationFilter>([
  "any",
  "has",
  "none",
]);

function parseWirelessCapability(value: string | null): WirelessCapability {
  if (value === "yes" || value === "true") return "has";
  if (value === "no" || value === "false") return "none";
  return value && wirelessCapabilityValues.has(value as WirelessCapability)
    ? (value as WirelessCapability)
    : "any";
}

function parseOfficialDocumentation(
  value: string | null,
): OfficialDocumentationFilter {
  if (value === "yes" || value === "true") return "has";
  if (value === "no" || value === "false") return "none";
  return value && officialDocumentationValues.has(value as OfficialDocumentationFilter)
    ? (value as OfficialDocumentationFilter)
    : "any";
}

export function parseCatalogState(
  search: string | URLSearchParams,
  defaults: CatalogState = defaultCatalogState,
): CatalogState {
  const params = boundedCatalogParams(search);
  const sort = params.get("sort");
  const parsedPage = Number.parseInt(params.get("page") ?? "1", 10);
  const rawWirelessValues = params.getAll("wireless");
  const wirelessValues = boundedFilterValues(
    rawWirelessValues.filter((value) => value !== "has" && value !== "none"),
  );
  const query = boundCatalogQuery(params.get("q") ?? "");
  const explicitWirelessCapability =
    params.get("wirelessCapability") ?? params.get("wireless-capability");
  const wirelessCapability = explicitWirelessCapability
    ? parseWirelessCapability(explicitWirelessCapability)
    : rawWirelessValues.includes("has")
      ? "has"
      : rawWirelessValues.includes("none")
        ? "none"
        : defaults.wirelessCapability;
  const officialDocumentationParam =
    params.get("official") ??
    params.get("officialDocumentation") ??
    params.get("official-documentation") ??
    params.get("docs");
  const officialDocumentation = officialDocumentationParam
    ? parseOfficialDocumentation(officialDocumentationParam)
    : defaults.officialDocumentation;
  const state: CatalogState = {
    ...defaults,
    query,
    pinoutOnly: params.get("pinout") === "yes",
    favoritesOnly: params.get("favorites") === "yes",
    wirelessCapability,
    officialDocumentation,
    sort:
      sort && sortAliases[sort]
        ? sortAliases[sort]
        : query.trim()
          ? "relevance"
          : defaults.sort,
    page:
      Number.isSafeInteger(parsedPage) && parsedPage > 0
        ? Math.min(parsedPage, 100)
        : 1,
  };
  for (const key of arrayKeys) {
    const values =
      key === "vendor"
        ? [...params.getAll("vendor"), ...params.getAll("manufacturer")]
        : key === "family"
          ? [
              ...params.getAll("family"),
              ...params.getAll("processorFamily"),
              ...params.getAll("processor-family"),
            ]
          : key === "wireless"
            ? wirelessValues
            : params.getAll(key);
    state[key] = boundedFilterValues(values);
  }
  return state;
}

export function catalogUrl(
  state: CatalogState,
  pathname: string,
  defaultSort: CatalogSort = defaultCatalogState.sort,
): string {
  const params = new URLSearchParams();
  let serializedLength = 0;
  const append = (key: string, value: string) => {
    const nextLength = appendWithinSearchBudget(
      params,
      key,
      value,
      serializedLength,
    );
    if (nextLength === null) return false;
    serializedLength = nextLength;
    return true;
  };

  // Reserve the bounded URL budget for the singleton controls first. Facets
  // can be trimmed without changing the search mode, pagination, or boolean
  // controls represented by an otherwise maximal share URL.
  const query = boundCatalogQuery(state.query.trim());
  if (query) append("q", query);
  if (state.wirelessCapability && state.wirelessCapability !== "any") {
    // Keep the short `wireless=has|none` spelling compatible with the original
    // interface-specific `wireless=` facet while still allowing both in one URL.
    append("wireless", state.wirelessCapability);
  }
  if (state.pinoutOnly) append("pinout", "yes");
  if (state.favoritesOnly) append("favorites", "yes");
  if (
    state.officialDocumentation &&
    state.officialDocumentation !== "any"
  ) {
    append("official", state.officialDocumentation);
  }
  const naturalSort = query ? "relevance" : defaultSort;
  if (state.sort !== naturalSort) append("sort", state.sort);
  const page = Number.isSafeInteger(state.page)
    ? Math.min(Math.max(state.page, 1), 100)
    : 1;
  if (page > 1) append("page", String(page));

  for (const key of arrayKeys) {
    for (const value of boundedFilterValues(state[key] ?? [])) {
      append(key, value);
    }
  }
  return params.size ? `${pathname}?${params.toString()}` : pathname;
}

export function matchesCatalogFilters(
  board: BoardSummary,
  state: CatalogState,
  favorites: ReadonlySet<string>,
): boolean {
  const profile = board.discovery;
  return (
    (!state.favoritesOnly || favorites.has(board.id)) &&
    (!state.pinoutOnly || board.hasPinout) &&
    (!state.category.length || state.category.includes(board.category)) &&
    (!state.vendor.length || state.vendor.includes(board.vendor)) &&
    (!state.family.length || state.family.includes(board.family)) &&
    (!state.platform.length || state.platform.includes(profile.computeClass)) &&
    (!state.interface.length ||
      state.interface.every((item) =>
        board.interfaces.some((entry) => entry === item),
      )) &&
    (!state.logic.length || state.logic.includes(profile.logicProfile)) &&
    (!state.power.length ||
      state.power.every((item) =>
        profile.powerInputs.some((entry) => entry === item),
      )) &&
    (!state.form.length || state.form.includes(profile.formFactorProfile)) &&
    (!state.wireless.length ||
      state.wireless.every((item) =>
        profile.wireless.some((entry) => entry === item),
      )) &&
    (state.wirelessCapability === "any" ||
      (state.wirelessCapability === "has" && profile.wireless.length > 0) ||
      (state.wirelessCapability === "none" && profile.wireless.length === 0)) &&
    (!state.connector.length ||
      state.connector.some((item) => profile.connectorEcosystems.includes(item))) &&
    (state.officialDocumentation === "any" ||
      (state.officialDocumentation === "has" &&
        board.hasOfficialDocumentation === true) ||
      (state.officialDocumentation === "none" &&
        board.hasOfficialDocumentation === false))
  );
}

export function activeCatalogFilterCount(state: CatalogState): number {
  return (
    arrayKeys.reduce((total, key) => total + state[key].length, 0) +
    Number(state.pinoutOnly) +
    Number(state.favoritesOnly) +
    Number(state.wirelessCapability !== "any") +
    Number(state.officialDocumentation !== "any")
  );
}

/**
 * Compares two catalog summaries for the non-search sort keys. `scoreA` and
 * `scoreB` are supplied by the search layer when relevance ordering is active.
 * Returning zero for catalog order preserves the static array's insertion
 * order, while the explicit recent key uses the source array index exposed by
 * `summarizeBoard`.
 */
export function compareCatalogBoards(
  a: BoardSummary,
  b: BoardSummary,
  sort: CatalogSort,
  scoreA = 0,
  scoreB = 0,
): number {
  if (sort === "relevance") {
    return scoreB - scoreA || a.name.localeCompare(b.name);
  }
  if (sort === "vendor") {
    return a.vendor.localeCompare(b.vendor) || a.name.localeCompare(b.name);
  }
  if (sort === "name") {
    return a.name.localeCompare(b.name);
  }
  if (sort === "recentlyAdded") {
    return (
      (b.catalogIndex ?? 0) - (a.catalogIndex ?? 0) ||
      a.name.localeCompare(b.name)
    );
  }
  if (sort === "interfaceCount") {
    return (
      b.interfaces.length - a.interfaces.length ||
      a.name.localeCompare(b.name)
    );
  }
  return 0;
}
