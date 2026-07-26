// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type FavoritesModule = typeof import("@/lib/favorites");

// The store keeps a module-level snapshot, so each test imports a fresh copy.
async function loadFavorites(): Promise<FavoritesModule> {
  vi.resetModules();
  return import("@/lib/favorites");
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  window.localStorage.clear();
});

describe("favorites store", () => {
  it("reads previously stored ids and persists toggles", async () => {
    window.localStorage.setItem(
      "pinhub.favorites",
      JSON.stringify(["raspberry-pi-5"]),
    );
    const favorites = await loadFavorites();

    expect([...favorites.getFavoritesSnapshot()]).toEqual(["raspberry-pi-5"]);

    favorites.toggleFavorite("pico");
    expect([...favorites.getFavoritesSnapshot()].sort()).toEqual([
      "pico",
      "raspberry-pi-5",
    ]);
    expect(
      JSON.parse(window.localStorage.getItem("pinhub.favorites") ?? "[]"),
    ).toEqual(["raspberry-pi-5", "pico"]);

    favorites.toggleFavorite("raspberry-pi-5");
    expect([...favorites.getFavoritesSnapshot()]).toEqual(["pico"]);
  });

  it("returns a new snapshot per change so useSyncExternalStore re-renders", async () => {
    const favorites = await loadFavorites();

    const before = favorites.getFavoritesSnapshot();
    expect(favorites.getFavoritesSnapshot()).toBe(before);

    favorites.toggleFavorite("pico");
    expect(favorites.getFavoritesSnapshot()).not.toBe(before);
  });

  it("notifies subscribers and detaches the storage listener on cleanup", async () => {
    const favorites = await loadFavorites();
    const listener = vi.fn();

    const unsubscribe = favorites.subscribeToFavorites(listener);
    favorites.toggleFavorite("pico");
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    favorites.toggleFavorite("uno");
    expect(listener).toHaveBeenCalledTimes(1);

    // With no subscribers left the storage listener is removed, so a cross-tab
    // event must not resurrect notifications.
    window.dispatchEvent(
      new StorageEvent("storage", { key: "pinhub.favorites" }),
    );
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("re-reads storage when another tab writes the same key", async () => {
    const favorites = await loadFavorites();
    const listener = vi.fn();
    favorites.subscribeToFavorites(listener);

    window.localStorage.setItem("pinhub.favorites", JSON.stringify(["uno"]));
    window.dispatchEvent(
      new StorageEvent("storage", { key: "pinhub.favorites" }),
    );

    expect(listener).toHaveBeenCalledTimes(1);
    expect([...favorites.getFavoritesSnapshot()]).toEqual(["uno"]);
  });

  it("ignores storage events for unrelated keys", async () => {
    const favorites = await loadFavorites();
    const listener = vi.fn();
    favorites.subscribeToFavorites(listener);

    window.dispatchEvent(
      new StorageEvent("storage", { key: "pinhub.pinoutTab" }),
    );
    expect(listener).not.toHaveBeenCalled();
  });

  it("treats corrupt or non-string stored values as empty", async () => {
    window.localStorage.setItem("pinhub.favorites", "{not json");
    expect([...(await loadFavorites()).getFavoritesSnapshot()]).toEqual([]);

    window.localStorage.setItem(
      "pinhub.favorites",
      JSON.stringify(["pico", 7, null, { id: "uno" }]),
    );
    expect([...(await loadFavorites()).getFavoritesSnapshot()]).toEqual([
      "pico",
    ]);
  });

  it("renders nothing as favorited on the server", async () => {
    const favorites = await loadFavorites();
    expect(favorites.getServerFavoritesSnapshot().size).toBe(0);
  });
});
