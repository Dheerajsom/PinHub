// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsMenu } from "@/components/SettingsMenu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getFavoritesSnapshot } from "@/lib/favorites";
import { clearAllPinhubData } from "@/lib/local-data";
import { parseMotionChoice, prefersReducedMotion, scrollBehavior, setMotionChoice } from "@/lib/motion";
import { getPinoutTab, parsePinoutTab, setPinoutTab } from "@/lib/pinout-tab";
import { parseThemeChoice, setThemeChoice } from "@/lib/theme";
import { colorwayBootScript, parseColorway, setColorway } from "@/lib/colorway";

let systemLight = false;

function stubMatchMedia() {
  vi.stubGlobal(
    "matchMedia",
    (query: string) =>
      ({
        matches: query.includes("prefers-color-scheme: light") ? systemLight : false,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList,
  );
}

function resetStores() {
  // The stores cache their snapshot; a null-key storage event makes each
  // re-read, exactly as a cleared store in another tab would.
  act(() => {
    window.dispatchEvent(new StorageEvent("storage", { key: null }));
  });
}

function openSettings() {
  fireEvent.click(screen.getByRole("button", { name: "Settings" }));
  return screen.getByRole("dialog", { name: "Settings" });
}

describe("settings menu", () => {
  beforeEach(() => {
    systemLight = false;
    stubMatchMedia();
    localStorage.clear();
    sessionStorage.clear();
    document.documentElement.dataset.theme = "dark";
    delete document.documentElement.dataset.motion;
    delete document.documentElement.dataset.colorway;
    // Each store caches its snapshot, and a closed dialog has no listener to
    // reset it, so start every test from the defaults explicitly.
    setThemeChoice("system");
    setColorway("workbench");
    setMotionChoice("system");
    setPinoutTab("dynamic");
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    resetStores();
    localStorage.clear();
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("returns to the system theme after the one-tap toggle stored a choice", () => {
    // The toggle used to be the only control, and once pressed there was no
    // way back to following the operating system.
    systemLight = true;
    render(
      <>
        <ThemeToggle />
        <SettingsMenu />
      </>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Use light theme" }));
    fireEvent.click(screen.getByRole("button", { name: "Use dark theme" }));
    expect(localStorage.getItem("pinhub.theme")).toBe("dark");

    const panel = openSettings();
    expect(within(panel).getByRole("radio", { name: "Dark" })).toHaveProperty("checked", true);
    fireEvent.click(within(panel).getByRole("radio", { name: "System" }));

    expect(localStorage.getItem("pinhub.theme")).toBeNull();
    expect(document.documentElement.dataset.theme).toBe("light");
    // The header toggle follows the same store.
    expect(screen.getByRole("button", { name: "Use dark theme" })).toBeTruthy();
  });

  it("stores reduced motion and makes JS scrolling instant", () => {
    render(<SettingsMenu />);
    const panel = openSettings();
    expect(scrollBehavior()).toBe("smooth");
    fireEvent.click(within(panel).getByRole("radio", { name: "Reduce" }));
    expect(localStorage.getItem("pinhub.motion")).toBe("reduce");
    expect(document.documentElement.dataset.motion).toBe("reduce");
    expect(prefersReducedMotion()).toBe(true);
    expect(scrollBehavior()).toBe("auto");

    fireEvent.click(within(panel).getByRole("radio", { name: "Match system" }));
    expect(localStorage.getItem("pinhub.motion")).toBeNull();
    expect(document.documentElement.dataset.motion).toBeUndefined();
  });

  it("sets the pin map view boards open in", () => {
    render(<SettingsMenu />);
    const panel = openSettings();
    expect(within(panel).getByRole("radio", { name: "Dynamic" })).toHaveProperty("checked", true);
    fireEvent.click(within(panel).getByRole("radio", { name: "Static" }));
    expect(localStorage.getItem("pinhub.pinoutTab")).toBe("static");
    expect(getPinoutTab()).toBe("static");
  });

  it("asks before clearing favorites, and Cancel keeps them", () => {
    render(<SettingsMenu />);
    const panel = openSettings();
    localStorage.setItem("pinhub.favorites", JSON.stringify(["esp32-devkitc", "arduino-uno-r3"]));
    resetStores();
    expect(within(panel).getByText("2 boards")).toBeTruthy();

    fireEvent.click(within(panel).getByRole("button", { name: "Clear" }));
    fireEvent.click(within(panel).getByRole("button", { name: "Cancel" }));
    expect(getFavoritesSnapshot().size).toBe(2);

    fireEvent.click(within(panel).getByRole("button", { name: "Clear" }));
    fireEvent.click(within(panel).getByRole("button", { name: "Clear 2 favorites" }));
    expect(getFavoritesSnapshot().size).toBe(0);
    expect(localStorage.getItem("pinhub.favorites")).toBeNull();
    expect(within(panel).getByRole("status").textContent).toBe("Favorites cleared.");
    expect(within(panel).getByRole("button", { name: "Clear" })).toHaveProperty("disabled", true);
  });

  it("clears everything PinHub saved and resets the open stores", () => {
    localStorage.setItem("pinhub.favorites", JSON.stringify(["esp32-devkitc"]));
    localStorage.setItem("pinhub.theme", "light");
    localStorage.setItem("pinhub.motion", "reduce");
    localStorage.setItem("pinhub.pinoutTab", "static");
    localStorage.setItem("pinhub.colorway", "blueprint");
    localStorage.setItem("unrelated.key", "kept");
    sessionStorage.setItem("pinhub.check.draft", "{}");
    render(<SettingsMenu />);
    const panel = openSettings();
    resetStores();
    expect(within(panel).getByText("1 board")).toBeTruthy();
    expect(within(panel).getByRole("radio", { name: "Light" })).toHaveProperty("checked", true);
    expect(within(panel).getByRole("radio", { name: "Static" })).toHaveProperty("checked", true);

    fireEvent.click(within(panel).getByRole("button", { name: "Clear everything PinHub saved" }));
    fireEvent.click(within(panel).getByRole("button", { name: "Clear favorites, collections, and settings" }));

    for (const key of ["pinhub.favorites", "pinhub.theme", "pinhub.motion", "pinhub.pinoutTab", "pinhub.colorway"]) {
      expect(localStorage.getItem(key)).toBeNull();
    }
    expect(sessionStorage.getItem("pinhub.check.draft")).toBeNull();
    expect(localStorage.getItem("unrelated.key")).toBe("kept");
    expect(getFavoritesSnapshot().size).toBe(0);
    expect(within(panel).getByRole("radio", { name: "System" })).toHaveProperty("checked", true);
    expect(within(panel).getByRole("radio", { name: "Match system" })).toHaveProperty("checked", true);
    expect(within(panel).getByRole("radio", { name: "Dynamic" })).toHaveProperty("checked", true);
    expect(within(panel).getByRole("radio", { name: /^Workbench/ })).toHaveProperty("checked", true);
    expect(document.documentElement.dataset.motion).toBeUndefined();
    expect(document.documentElement.dataset.colorway).toBeUndefined();
  });

  it("reports keys the browser refused to remove", () => {
    const removeItem = vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    try {
      expect(clearAllPinhubData().length).toBeGreaterThan(0);
    } finally {
      removeItem.mockRestore();
    }
  });

  it("applies a colorway at once, stores it, and the default removes it", () => {
    render(<SettingsMenu />);
    const panel = openSettings();
    expect(within(panel).getByRole("radio", { name: /^Workbench/ })).toHaveProperty("checked", true);
    fireEvent.click(within(panel).getByRole("radio", { name: /^Fab Purple/ }));
    expect(localStorage.getItem("pinhub.colorway")).toBe("fab-purple");
    expect(document.documentElement.dataset.colorway).toBe("fab-purple");

    fireEvent.click(within(panel).getByRole("radio", { name: /^Workbench/ }));
    expect(localStorage.getItem("pinhub.colorway")).toBeNull();
    expect(document.documentElement.dataset.colorway).toBeUndefined();
  });

  it("keeps the colorway when the theme switches between light and dark", () => {
    render(<SettingsMenu />);
    const panel = openSettings();
    fireEvent.click(within(panel).getByRole("radio", { name: /^Anodized/ }));
    fireEvent.click(within(panel).getByRole("radio", { name: "Light" }));
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(document.documentElement.dataset.colorway).toBe("anodized");
  });

  it("traps Tab inside the dialog", () => {
    render(<SettingsMenu />);
    const panel = openSettings();
    expect(document.activeElement).toBe(panel);
    const close = within(panel).getByRole("button", { name: "Close settings" });
    const privacy = within(panel).getByRole("link", { name: "What PinHub stores and why" });
    privacy.focus();
    fireEvent.keyDown(privacy, { key: "Tab" });
    expect(document.activeElement).toBe(close);
    fireEvent.keyDown(close, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(privacy);
  });

  it("closes from the close button", () => {
    render(<SettingsMenu />);
    const panel = openSettings();
    fireEvent.click(within(panel).getByRole("button", { name: "Close settings" }));
    expect(screen.queryByRole("dialog", { name: "Settings" })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Settings" }));
  });

  it("applies a colorway at once, stores it, and the default removes it", () => {
    render(<SettingsMenu />);
    const panel = openSettings();
    expect(within(panel).getByRole("radio", { name: /^Workbench/ })).toHaveProperty("checked", true);
    fireEvent.click(within(panel).getByRole("radio", { name: /^Fab Purple/ }));
    expect(localStorage.getItem("pinhub.colorway")).toBe("fab-purple");
    expect(document.documentElement.dataset.colorway).toBe("fab-purple");

    fireEvent.click(within(panel).getByRole("radio", { name: /^Workbench/ }));
    expect(localStorage.getItem("pinhub.colorway")).toBeNull();
    expect(document.documentElement.dataset.colorway).toBeUndefined();
  });

  it("keeps the colorway when the theme switches between light and dark", () => {
    render(<SettingsMenu />);
    const panel = openSettings();
    fireEvent.click(within(panel).getByRole("radio", { name: /^Anodized/ }));
    fireEvent.click(within(panel).getByRole("radio", { name: "Light" }));
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(document.documentElement.dataset.colorway).toBe("anodized");
  });

  it("traps Tab inside the dialog", () => {
    render(<SettingsMenu />);
    const panel = openSettings();
    expect(document.activeElement).toBe(panel);
    const close = within(panel).getByRole("button", { name: "Close settings" });
    const privacy = within(panel).getByRole("link", { name: "What PinHub stores and why" });
    privacy.focus();
    fireEvent.keyDown(privacy, { key: "Tab" });
    expect(document.activeElement).toBe(close);
    fireEvent.keyDown(close, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(privacy);
  });

  it("closes from the close button", () => {
    render(<SettingsMenu />);
    const panel = openSettings();
    fireEvent.click(within(panel).getByRole("button", { name: "Close settings" }));
    expect(screen.queryByRole("dialog", { name: "Settings" })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Settings" }));
  });

  it("closes on Escape and returns focus to the trigger", () => {
    render(<SettingsMenu />);
    const panel = openSettings();
    fireEvent.keyDown(within(panel).getByRole("radio", { name: "System" }), { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Settings" })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Settings" }));
  });
});

describe("preference parsing", () => {
  it("drops unknown stored values", () => {
    expect(parseThemeChoice("neon")).toBe("system");
    expect(parseThemeChoice("light")).toBe("light");
    expect(parseMotionChoice("full")).toBe("system");
    expect(parseMotionChoice("reduce")).toBe("reduce");
    expect(parsePinoutTab("<script>")).toBe("dynamic");
    expect(parsePinoutTab("static")).toBe("static");
    expect(parseColorway("neon")).toBe("workbench");
    expect(parseColorway("__proto__")).toBe("workbench");
    expect(parseColorway("blueprint")).toBe("blueprint");
  });

  it("boot script sets only known colorways before paint", () => {
    const run = (stored: string | null) => {
      delete document.documentElement.dataset.colorway;
      if (stored === null) localStorage.removeItem("pinhub.colorway");
      else localStorage.setItem("pinhub.colorway", stored);
      new Function(colorwayBootScript)();
      return document.documentElement.dataset.colorway;
    };
    expect(run("silkscreen")).toBe("silkscreen");
    expect(run("workbench")).toBeUndefined();
    expect(run("\"><img>")).toBeUndefined();
    expect(run(null)).toBeUndefined();
    localStorage.clear();
  });
});
