// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SectionNav } from "@/components/SectionNav";

afterEach(cleanup);

describe("SectionNav", () => {
  it("lists Planner next to Pin Maps and marks the current section", () => {
    render(<SectionNav current="/planner" />);
    const links = screen.getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual(["Pin Maps", "Planner", "Compare", "Prices"]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual(["/", "/planner", "/compare", "/prices"]);
    expect(screen.getByRole("link", { name: "Planner" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Pin Maps" }).getAttribute("aria-current")).toBeNull();
  });
});
