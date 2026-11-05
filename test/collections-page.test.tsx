// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import CollectionsPage from "@/app/collections/page";
import { boards } from "@/lib/boards";

afterEach(cleanup);

async function renderCollection(ids: string[]) {
  render(
    await CollectionsPage({
      searchParams: Promise.resolve({ name: "Bench", boards: ids.join(",") }),
    }),
  );
}

function boardsParam(href: string | null): string[] {
  const value = new URL(href ?? "", "https://pinhub.test").searchParams.get("boards");
  return value ? value.split(",") : [];
}

describe("shared collection comparison", () => {
  it("labels a larger collection's comparison as its first four and names them", async () => {
    const selected = boards.slice(0, 5);
    await renderCollection(selected.map((board) => board.id));

    const action = screen.getByRole("link", { name: "Compare first 4 of 5" });
    expect(boardsParam(action.getAttribute("href"))).toEqual(selected.slice(0, 4).map((board) => board.id));
    const scope = document.getElementById(action.getAttribute("aria-describedby") ?? "");
    expect(scope?.textContent).toContain("4 boards at a time");
    for (const board of selected.slice(0, 4)) expect(scope?.textContent).toContain(board.name);
    expect(scope?.textContent).not.toContain(selected[4].name);
  });

  it("never gives a card a comparison that leaves its own board out", async () => {
    const selected = boards.slice(0, 5);
    await renderCollection(selected.map((board) => board.id));
    for (const board of selected) {
      const card = screen.getByRole("heading", { name: board.name, level: 2 }).closest("article")!;
      const compare = within(card).getByRole("link", { name: `Compare ${board.name} with other boards` });
      expect(boardsParam(compare.getAttribute("href"))).toEqual([board.id]);
    }
  });

  it("compares a small collection as a whole without a scope note", async () => {
    const selected = boards.slice(0, 3);
    await renderCollection(selected.map((board) => board.id));
    const action = screen.getByRole("link", { name: "Compare these boards" });
    expect(boardsParam(action.getAttribute("href"))).toEqual(selected.map((board) => board.id));
    expect(action.getAttribute("aria-describedby")).toBeNull();
    expect(screen.queryByText(/boards at a time/)).toBeNull();
  });
});
