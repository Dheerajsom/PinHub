// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SortMenu, sortOptionsFor } from "@/components/catalog/SortMenu";
import type { CatalogSort } from "@/lib/catalog-state";

afterEach(cleanup);

const sorts: CatalogSort[] = ["relevance", "catalog", "name", "vendor", "recentlyAdded"];

function renderMenu(value: CatalogSort = "catalog", hasQuery = false) {
  const onChange = vi.fn();
  render(<SortMenu value={value} options={sortOptionsFor(sorts, hasQuery)} onChange={onChange} />);
  return { onChange, trigger: screen.getByRole("combobox", { name: "Sort boards" }) };
}

describe("SortMenu", () => {
  // Regression: the sort was a native <select>, whose OS-drawn list ignored
  // the theme and whose click focus ring floated away from the control.
  it("is a themed listbox, not a native select", () => {
    const { trigger } = renderMenu();
    expect(trigger.tagName).toBe("BUTTON");
    expect(trigger).toHaveProperty("textContent", "Catalog order");
    expect(document.querySelector("select")).toBeNull();
    expect(screen.getByRole("listbox", { hidden: true }).hidden).toBe(true);
  });

  it("offers Best match only once there is a query", () => {
    renderMenu("catalog", false);
    expect(screen.queryByRole("option", { name: "Best match", hidden: true })).toBeNull();
    cleanup();
    renderMenu("relevance", true);
    expect(screen.getByRole("option", { name: "Best match", hidden: true })).toBeTruthy();
  });

  it("chooses a sort by click and closes", () => {
    const { onChange, trigger } = renderMenu();
    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(screen.getByRole("option", { name: "Recently added" }));
    expect(onChange).toHaveBeenCalledWith("recentlyAdded");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("supports arrow keys, Enter, and Escape", () => {
    const { onChange, trigger } = renderMenu("catalog");
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    const selected = screen.getByRole("option", { name: "Catalog order" });
    expect(trigger.getAttribute("aria-activedescendant")).toBe(selected.id);
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    fireEvent.keyDown(trigger, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("name");

    fireEvent.keyDown(trigger, { key: "Enter" });
    fireEvent.keyDown(trigger, { key: "Escape" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("closes on an outside pointer press without changing the sort", () => {
    const { onChange, trigger } = renderMenu();
    fireEvent.click(trigger);
    fireEvent.pointerDown(document.body);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(onChange).not.toHaveBeenCalled();
  });

  // Regression: on an 844x390 landscape phone the open list ran past the
  // bottom of the viewport, hiding "Most interfaces".
  it("caps the open list to the space below the trigger", () => {
    const { trigger } = renderMenu();
    const height = window.innerHeight;
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 390 });
    trigger.getBoundingClientRect = () => ({ top: 150, bottom: 194, left: 16, right: 186, width: 170, height: 44, x: 16, y: 150, toJSON: () => ({}) });
    try {
      fireEvent.click(trigger);
      expect(screen.getByRole("listbox").style.maxHeight).toBe(`${390 - 194 - 14}px`);
    } finally {
      Object.defineProperty(window, "innerHeight", { configurable: true, value: height });
    }
  });

  it("labels a sort the menu does not list instead of mislabeling it", () => {
    const onChange = vi.fn();
    render(<SortMenu value="catalog" options={sortOptionsFor(["name", "vendor"], false)} onChange={onChange} />);
    expect(screen.getByRole("combobox", { name: "Sort boards" }).textContent).toBe("Catalog order");
  });
});
