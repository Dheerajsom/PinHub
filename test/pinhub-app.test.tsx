// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Board } from "@/lib/boards";
import { summarizeBoard } from "@/lib/board-summary";
import { PinHubApp } from "@/components/PinHubApp";

// The detail panel is exercised by its own tests; here it is stubbed so these
// cases stay about the result list, its empty states, and its paging.
vi.mock("@/components/PinoutTabs", () => ({
  PinoutTabs: () => <div>Pin map</div>,
}));

function board(overrides: Partial<Board> = {}): Board {
  return {
    id: "test-board",
    name: "Test Board",
    vendor: "Test Vendor",
    category: "Microcontroller",
    family: "Test",
    processor: "Test MCU",
    logicLevel: "3.3 V",
    power: "USB",
    formFactor: "Test",
    description: "Fixture board",
    tags: ["test"],
    interfaces: ["GPIO"],
    highlights: ["Fixture"],
    warnings: ["Verify before wiring."],
    sourceLinks: [
      { label: "Vendor documentation", url: "https://example.com", type: "Docs" },
    ],
    ...overrides,
  };
}

const pi5 = board({ id: "raspberry-pi-5", name: "Raspberry Pi 5", vendor: "Raspberry Pi" });
const hat = board({
  id: "sensor-hat",
  name: "Sensor HAT",
  vendor: "Acme",
  description: "Stacks onto the Raspberry Pi 5 and Raspberry Pi 4.",
});
const extras = Array.from({ length: 30 }, (_, index) =>
  board({ id: `filler-${index}`, name: `Filler Board ${index}` }),
);
const catalog = [pi5, hat, ...extras].map(summarizeBoard);

function setViewport(desktop: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: query.includes("min-width: 1024px") ? desktop : false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

function renderApp() {
  return render(
    <PinHubApp catalog={catalog} initialBoard={pi5} sourceCount={2} />,
  );
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(pi5))),
  );
  window.HTMLElement.prototype.scrollIntoView = () => {};
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.unstubAllGlobals();
});

describe("PinHubApp result list", () => {
  it("discloses a board's details inline on a phone, and hides them again", () => {
    setViewport(false);
    renderApp();

    const open = screen.getByRole("button", { name: "Show Sensor HAT details" });
    expect(open.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(open);

    const toggle = screen.getByRole("button", { name: "Hide Sensor HAT details" });
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    const detail = screen.getByRole("region", { name: "Sensor HAT details" });
    // The detail belongs to the row it was opened from, not the end of the list.
    expect(detail.previousElementSibling?.id).toBe("board-result-sensor-hat");

    fireEvent.click(toggle);
    expect(
      screen.getByRole("button", { name: "Show Sensor HAT details" }).getAttribute("aria-expanded"),
    ).toBe("false");
    expect(screen.queryByRole("region", { name: "Sensor HAT details" })).toBeNull();
  });

  it("returns focus to the mobile result after closing its details", () => {
    setViewport(false);
    renderApp();

    fireEvent.click(
      screen.getByRole("button", { name: "Show Sensor HAT details" }),
    );
    const back = screen.getByRole("button", { name: "Back to results" });
    back.focus();
    fireEvent.click(back);

    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Show Sensor HAT details" }),
    );
  });

  it("keeps the desktop layout selecting a board rather than disclosing one", () => {
    setViewport(true);
    renderApp();

    const select = screen.getByRole("button", { name: "Select Sensor HAT" });
    expect(select.getAttribute("aria-expanded")).toBeNull();
    fireEvent.click(select);
    expect(select.getAttribute("aria-pressed")).toBe("true");
  });

  it("ranks an exact board name first and says what matched", () => {
    setViewport(true);
    renderApp();

    fireEvent.change(screen.getByLabelText("Search boards"), {
      target: { value: "Raspberry Pi 5" },
    });

    const results = screen
      .getByRole("region", { name: "Board results" })
      .querySelectorAll('article[id^="board-result-"]');
    expect(results[0].id).toBe("board-result-raspberry-pi-5");
    expect(
      within(results[0] as HTMLElement).getByText("Matched by name"),
    ).toBeTruthy();
    expect(
      within(results[1] as HTMLElement).getByText("Matched by description"),
    ).toBeTruthy();
  });

  it("offers a favorites-specific empty state, not the filter one", () => {
    setViewport(true);
    renderApp();

    fireEvent.click(screen.getByRole("button", { name: /Favorites/ }));

    expect(screen.getByText("No saved boards yet")).toBeTruthy();
    expect(screen.queryByText("No boards match that filter")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Browse the catalog" }));
    expect(screen.queryByText("No saved boards yet")).toBeNull();
    expect(
      within(screen.getByRole("region", { name: "Board results" })).getByRole(
        "heading",
        { name: "Raspberry Pi 5" },
      ),
    ).toBeTruthy();
  });

  it("pages in more results and keeps the count honest", () => {
    setViewport(true);
    renderApp();

    const status = screen
      .getAllByRole("status")
      .find((node) => node.textContent?.startsWith("Showing"));
    expect(status?.textContent).toContain(`Showing 16 of ${catalog.length}`);

    fireEvent.click(screen.getByRole("button", { name: /Show \d+ more/ }));

    expect(status?.textContent).toContain(
      `Showing ${catalog.length} of ${catalog.length}`,
    );
    // Everything is on screen, so the control retires rather than no-opping.
    expect(screen.queryByRole("button", { name: /Show \d+ more/ })).toBeNull();
  });
});
