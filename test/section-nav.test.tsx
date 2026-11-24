// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { SectionNav } from "@/components/SectionNav";
import { siteTools } from "@/components/site-sections";

afterEach(cleanup);

describe("SectionNav", () => {
  it("shows the three browsing sections and marks the current one", () => {
    render(<SectionNav current="/compare" />);
    const nav = screen.getByRole("navigation", { name: "PinHub sections" });
    const links = within(nav).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual(["Pin Maps", "Compare", "Prices"]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual(["/", "/compare", "/prices"]);
    expect(screen.getByRole("link", { name: "Compare" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Pin Maps" }).getAttribute("aria-current")).toBeNull();
  });

  it("lists every tool with a plain description behind the Tools button", () => {
    render(<SectionNav current="/" />);
    const button = screen.getByRole("button", { name: /^Tools/ });
    expect(button.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(button);
    expect(button.getAttribute("aria-expanded")).toBe("true");
    for (const tool of siteTools) {
      const link = screen.getByRole("link", { name: new RegExp(tool.label) });
      expect(link.getAttribute("href")).toBe(tool.href);
      expect(link.textContent).toContain(tool.summary);
    }
  });

  it("closes the tool list on Escape and returns focus to the button", () => {
    render(<SectionNav current="/" />);
    const button = screen.getByRole("button", { name: /^Tools/ });
    fireEvent.click(button);
    fireEvent.keyDown(screen.getByRole("link", { name: /Code check/ }), { key: "Escape" });
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("link", { name: /Code check/ })).toBeNull();
    expect(document.activeElement).toBe(button);
  });

  it("closes the tool list on a click outside it", () => {
    render(<div><SectionNav current="/" /><p>Outside</p></div>);
    fireEvent.click(screen.getByRole("button", { name: /^Tools/ }));
    fireEvent.pointerDown(screen.getByText("Outside"));
    expect(screen.queryByRole("link", { name: /Code check/ })).toBeNull();
  });

  it("marks Tools and the current tool when a tool page is open", () => {
    render(<SectionNav current="/planner" />);
    const button = screen.getByRole("button", { name: /^Tools.*current: Pin planner/ });
    fireEvent.click(button);
    expect(screen.getByRole("link", { name: /Pin planner/ }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: /Code check/ }).getAttribute("aria-current")).toBeNull();
  });

  it("keeps hover fills out of bg-white utilities the light theme paints at rest", () => {
    for (const file of ["SectionNav.tsx", "ToolsMenu.tsx"]) {
      const source = readFileSync(join(process.cwd(), "src", "components", file), "utf8");
      expect(source, file).not.toMatch(/hover:bg-white\//);
    }
  });
});
