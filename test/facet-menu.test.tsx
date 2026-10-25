// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FacetMenu } from "@/components/catalog/FacetMenu";
import { shownMatchReason } from "@/lib/board-search";

afterEach(cleanup);

const items = ["All", "Adafruit", "Arduino", "Espressif", "Seeed Studio"];
const counts = new Map([
  ["All", 40],
  ["Adafruit", 12],
  ["Arduino", 18],
  ["Espressif", 9],
  ["Seeed Studio", 1],
]);

function renderMenu(active = "All") {
  const onChange = vi.fn();
  render(
    <FacetMenu
      title="Manufacturer"
      icon={null}
      items={items}
      active={active}
      counts={counts}
      allLabel="All manufacturers"
      noun="manufacturers"
      onChange={onChange}
    />,
  );
  const trigger = screen.getByRole("button", { name: /^Manufacturer/ });
  return { onChange, trigger };
}

describe("FacetMenu", () => {
  // Regression: Manufacturer and Processor family were native <select>s whose
  // OS-drawn lists ignored the theme and could not be narrowed.
  it("is a themed listbox with counts, not a native select", () => {
    const { trigger } = renderMenu();
    expect(trigger.tagName).toBe("BUTTON");
    expect(trigger.textContent).toContain("All manufacturers");
    expect(trigger.textContent).toContain("40");
    expect(document.querySelector("select")).toBeNull();
    fireEvent.click(trigger);
    expect(screen.getByRole("listbox").getAttribute("aria-labelledby")).toBeTruthy();
    expect(screen.getByRole("option", { name: /^Arduino/ }).textContent).toContain("18");
  });

  it("narrows by typing, keeps All first, and picks with Enter", () => {
    const { onChange, trigger } = renderMenu();
    fireEvent.click(trigger);
    const field = screen.getByRole("combobox", { name: "Narrow manufacturer list" });
    expect(document.activeElement).toBe(field);
    fireEvent.change(field, { target: { value: "ar" } });
    expect(screen.getAllByRole("option").map((option) => option.textContent?.replace(/\d+/g, ""))).toEqual([
      "All manufacturers",
      "Arduino",
    ]);
    // Typing lands on the first real match, not on "All".
    expect(field.getAttribute("aria-activedescendant")).toBe(screen.getAllByRole("option")[1].id);
    fireEvent.keyDown(field, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("Arduino");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);
  });

  it("says when nothing matches, and Escape clears before it closes", () => {
    const { onChange, trigger } = renderMenu();
    fireEvent.click(trigger);
    const field = screen.getByRole("combobox", { name: "Narrow manufacturer list" });
    fireEvent.change(field, { target: { value: "zzz" } });
    expect(screen.getByRole("status").textContent).toContain("No manufacturers match");
    fireEvent.keyDown(field, { key: "Escape" });
    expect((field as HTMLInputElement).value).toBe("");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    fireEvent.keyDown(field, { key: "Escape" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("opens already narrowed when typing on the trigger, and walks with arrows", () => {
    const { onChange, trigger } = renderMenu("Espressif");
    fireEvent.keyDown(trigger, { key: "s" });
    const field = screen.getByRole("combobox", { name: "Narrow manufacturer list" }) as HTMLInputElement;
    expect(field.value).toBe("s");
    // "s" leaves All, Espressif, Seeed Studio; the highlight starts on Espressif.
    fireEvent.keyDown(field, { key: "ArrowDown" });
    fireEvent.keyDown(field, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("Seeed Studio");
  });

  // Regression: on phones the list opened below the fold behind the sticky
  // command bar, with nothing bringing it into view.
  it("scrolls the opened list out from under the fold and the sticky header", () => {
    const header = document.createElement("div");
    header.setAttribute("data-sticky-header", "");
    header.getBoundingClientRect = () => ({ bottom: 120 }) as DOMRect;
    document.body.append(header);
    window.innerHeight = 390;
    const scrollBy = vi.fn();
    window.scrollBy = scrollBy as typeof window.scrollBy;
    // A landscape phone: the 330 px panel cannot fit below a 120 px header in
    // a 390 px viewport, so its top (the search field) goes just under it.
    const rect = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockImplementation(function (this: HTMLElement) {
        return (this.id.endsWith("-panel")
          ? { top: 300, bottom: 630, height: 330 }
          : { top: 0, bottom: 0, height: 0 }) as DOMRect;
      });
    const { trigger } = renderMenu();
    fireEvent.click(trigger);
    expect(scrollBy).toHaveBeenCalledWith(expect.objectContaining({ top: 300 - 128 }));
    rect.mockRestore();
    header.remove();
  });

  // Regression: keeping the highlighted option visible used scrollIntoView,
  // which also scrolled the page and cancelled the smooth reveal on open.
  it("keeps the highlight visible without scrolling the page", () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    const { trigger } = renderMenu("Seeed Studio");
    fireEvent.click(trigger);
    const field = screen.getByRole("combobox", { name: "Narrow manufacturer list" });
    fireEvent.keyDown(field, { key: "ArrowUp" });
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("marks the active filter on the trigger", () => {
    const { trigger } = renderMenu("Espressif");
    expect(trigger.hasAttribute("data-filtering")).toBe(true);
    expect(trigger.textContent).toContain("Espressif");
    expect(trigger.textContent).toContain("9");
  });
});

describe("shownMatchReason", () => {
  it("hides self-evident name and spec matches and keeps the rest", () => {
    expect(shownMatchReason("name")).toBeNull();
    expect(shownMatchReason("spec")).toBeNull();
    expect(shownMatchReason(null)).toBeNull();
    for (const field of ["vendor", "interface", "warning", "description"] as const) {
      expect(shownMatchReason(field)).toBe(field);
    }
  });
});
