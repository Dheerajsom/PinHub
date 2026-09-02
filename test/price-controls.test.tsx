// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { PricesApp } from "@/components/PricesApp";
import { boardPrices, stockValidForMs, priceFreshForMs, priceStaleAfterMs } from "@/lib/board-prices";

// Keep the router snapshot behind history to reproduce fast consecutive actions.
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("category=SBC"),
}));

afterEach(() => { cleanup(); history.replaceState(null, "", "/"); });

it("preserves reset, sorting, and search when router rendering lags behind input", () => {
  history.replaceState(null, "", "/prices?category=SBC");
  render(<PricesApp listings={[]} now={Date.now()} />);
  fireEvent.click(screen.getAllByRole("button", { name: "Show all boards" })[0]);
  fireEvent.change(screen.getByRole("combobox", { name: "Sort by" }), { target: { value: "price-asc" } });
  expect(location.search).toBe("?sort=price-asc");
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "N8R8" } });
  expect(location.search).toBe("?q=N8R8&sort=price-asc");
  expect((screen.getByRole("searchbox") as HTMLInputElement).value).toBe("N8R8");
  expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe("price-asc");
  fireEvent.click(screen.getByRole("checkbox", { name: "In stock at recent check" }));
  expect(location.search).toBe("?q=N8R8&sort=price-asc&stock=in");
});

const price = { ...boardPrices[0], amount: 13000, stock: "in-stock" as const, checkedAt: "2026-09-02T14:00:00Z", name: "Raspberry Pi 5", vendor: "Raspberry Pi", category: "SBC" };
const checked = Date.parse(price.checkedAt);

it("keeps board-scoped search explicit and removes only the board constraint", () => {
  history.replaceState(null, "", `/prices?board=${price.boardId}&q=4+GB&category=SBC&sort=price-asc&stock=in`);
  render(<PricesApp listings={[price]} now={checked} />);
  expect(screen.getByText(/Search is limited to this board/)).toBeTruthy();
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Adafruit" } });
  expect(new URLSearchParams(location.search).get("board")).toBe(price.boardId);
  fireEvent.click(screen.getByRole("button", { name: "Remove board filter: Raspberry Pi 5" }));
  expect(location.search).toBe("?q=Adafruit&category=SBC&sort=price-asc&stock=in");
  expect(screen.queryByText(/Search is limited/)).toBeNull();
});

it("lets users dismiss an unknown board and restores controls on Back/Forward events", () => {
  history.replaceState(null, "", "/prices?board=missing");
  render(<PricesApp listings={[price]} now={checked} />);
  fireEvent.click(screen.getByRole("button", { name: "Remove board filter: missing" }));
  expect(screen.getByRole("status").textContent).toContain("1 of 1");
  act(() => {
    history.replaceState(null, "", "/prices?q=restored&category=SBC&sort=name&stock=in");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  expect((screen.getByRole("searchbox") as HTMLInputElement).value).toBe("restored");
  expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe("name");
  expect((screen.getByRole("checkbox") as HTMLInputElement).checked).toBe(true);
});

it.each([
  [stockValidForMs, "Recent check"],
  [priceFreshForMs + 1, "Older check"],
  [priceStaleAfterMs + 1, "Needs new check"],
])("retains reference amounts but expires stock at age %i", (elapsed, label) => {
  history.replaceState(null, "", "/prices");
  render(<PricesApp listings={[price]} now={checked + Number(elapsed)} />);
  expect(screen.getByText("$130.00")).toBeTruthy();
  expect(screen.getByText(String(label))).toBeTruthy();
  expect(screen.getByText("Check with seller")).toBeTruthy();
  fireEvent.click(screen.getByRole("checkbox"));
  expect(screen.getByRole("status").textContent).toContain("0 of 1");
});

it("rechecks freshness while the page remains open", () => {
  vi.useFakeTimers();
  try {
    history.replaceState(null, "", "/prices");
    vi.setSystemTime(checked + priceFreshForMs - 1);
    render(<PricesApp listings={[price]} now={checked + priceFreshForMs - 1} />);
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(screen.getByText("Older check")).toBeTruthy();
  } finally { cleanup(); vi.useRealTimers(); }
});
