import type { BoardSummary } from "@/lib/board-summary";

export type CatalogSort = "catalog" | "relevance" | "name" | "vendor";
export type CatalogFilterKey =
  | "category"
  | "platform"
  | "interface"
  | "logic"
  | "power"
  | "form"
  | "wireless"
  | "connector";

export type CatalogState = {
  query: string;
  category: string[];
  platform: string[];
  interface: string[];
  logic: string[];
  power: string[];
  form: string[];
  wireless: string[];
  connector: string[];
  pinoutOnly: boolean;
  favoritesOnly: boolean;
  sort: CatalogSort;
  page: number;
};

export const defaultCatalogState: CatalogState = {
  query: "",
  category: [],
  platform: [],
  interface: [],
  logic: [],
  power: [],
  form: [],
  wireless: [],
  connector: [],
  pinoutOnly: false,
  favoritesOnly: false,
  sort: "catalog",
  page: 1,
};

const arrayKeys: CatalogFilterKey[] = [
  "category",
  "platform",
  "interface",
  "logic",
  "power",
  "form",
  "wireless",
  "connector",
];

export function parseCatalogState(
  search: string | URLSearchParams,
  defaults: CatalogState = defaultCatalogState,
): CatalogState {
  const params =
    typeof search === "string" ? new URLSearchParams(search) : search;
  const sort = params.get("sort");
  const parsedPage = Number.parseInt(params.get("page") ?? "1", 10);
  const state: CatalogState = {
    ...defaults,
    query: params.get("q") ?? "",
    pinoutOnly: params.get("pinout") === "yes",
    favoritesOnly: params.get("favorites") === "yes",
    sort:
      sort === "catalog" || sort === "relevance" || sort === "vendor" || sort === "name"
        ? sort
        : params.get("q")?.trim()
          ? "relevance"
          : defaults.sort,
    page:
      Number.isSafeInteger(parsedPage) && parsedPage > 0
        ? Math.min(parsedPage, 100)
        : 1,
  };
  for (const key of arrayKeys) state[key] = params.getAll(key);
  return state;
}

export function catalogUrl(
  state: CatalogState,
  pathname: string,
  defaultSort: CatalogSort = defaultCatalogState.sort,
): string {
  const params = new URLSearchParams();
  if (state.query.trim()) params.set("q", state.query.trim());
  for (const key of arrayKeys) {
    for (const value of state[key]) params.append(key, value);
  }
  if (state.pinoutOnly) params.set("pinout", "yes");
  if (state.favoritesOnly) params.set("favorites", "yes");
  const naturalSort = state.query.trim() ? "relevance" : defaultSort;
  if (state.sort !== naturalSort) params.set("sort", state.sort);
  if (state.page > 1) params.set("page", String(state.page));
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
    (!state.connector.length ||
      state.connector.some((item) => profile.connectorEcosystems.includes(item)))
  );
}

export function activeCatalogFilterCount(state: CatalogState): number {
  return (
    arrayKeys.reduce((total, key) => total + state[key].length, 0) +
    Number(state.pinoutOnly) +
    Number(state.favoritesOnly)
  );
}
