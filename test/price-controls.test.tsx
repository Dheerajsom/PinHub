// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { PricesApp } from "@/components/PricesApp";

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
  fireEvent.click(screen.getByRole("checkbox", { name: "In stock at check" }));
  expect(location.search).toBe("?q=N8R8&sort=price-asc&stock=in");
});
