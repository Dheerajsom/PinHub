// @vitest-environment jsdom

import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DiscoveryApp } from "@/components/DiscoveryApp";
import { useCatalogUrlState } from "@/components/catalog/useCatalogUrlState";
import { summarizeBoard } from "@/lib/board-summary";
import { boards } from "@/lib/boards";

function Harness({ compareIds }: { compareIds: string[] }) {
  const ownedSearch = compareIds.length
    ? new URLSearchParams({ boards: compareIds.join(",") }).toString()
    : "";
  const [state] = useCatalogUrlState("/compare", undefined, ownedSearch);

  return <output>{state.query}</output>;
}

let scheduledFrame: FrameRequestCallback | undefined;

beforeEach(() => {
  history.replaceState(null, "", "/compare?boards=board-a&q=raspberry");
  scheduledFrame = undefined;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    scheduledFrame = callback;
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("useCatalogUrlState owned parameters", () => {
  it("retains a one-board deep link and removes the parameter when cleared", async () => {
    const view = render(<Harness compareIds={["board-a"]} />);

    await act(async () => scheduledFrame?.(0));
    await waitFor(() => {
      expect(screen.getByText("raspberry")).toBeTruthy();
    });
    expect(new URLSearchParams(location.search).get("boards")).toBe("board-a");

    view.rerender(<Harness compareIds={["board-a", "board-b"]} />);
    await waitFor(() => {
      expect(new URLSearchParams(location.search).get("boards")).toBe(
        "board-a,board-b",
      );
    });

    view.rerender(<Harness compareIds={[]} />);
    await waitFor(() => {
      expect(new URLSearchParams(location.search).has("boards")).toBe(false);
    });
    expect(new URLSearchParams(location.search).get("q")).toBe("raspberry");
  });

  it("restores a validated comparison selection on popstate", async () => {
    const catalog = boards.slice(0, 2).map(summarizeBoard);
    const first = catalog[0];
    const second = catalog[1];
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    if (!first || !second) return;

    history.replaceState(null, "", `/compare?boards=${first.id}`);
    render(
      <DiscoveryApp
        catalog={catalog}
        sourceCount={2}
        initialCompareIds={[first.id]}
      />,
    );
    await act(async () => scheduledFrame?.(0));

    history.pushState(
      null,
      "",
      `/compare?boards=${second.id},not-in-the-catalog`,
    );
    act(() => dispatchEvent(new PopStateEvent("popstate")));

    await waitFor(() => {
      expect(new URLSearchParams(location.search).get("boards")).toBe(second.id);
    });
    const secondCard = screen
      .getAllByRole("link", { name: second.name })
      .map((link) => link.closest("article"))
      .find((article): article is HTMLElement => article instanceof HTMLElement);
    expect(secondCard).toBeDefined();
    if (!secondCard) return;
    expect(
      within(secondCard).getByRole("button", { name: "Selected" }),
    ).toBeTruthy();
  });
});
