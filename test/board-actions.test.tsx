// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BoardActions } from "@/components/BoardActions";
import { boards } from "@/lib/boards";

const board = boards[0];
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("compact board actions", () => {
  it("keeps collection and comparison visible and moves secondary tools behind a disclosure", () => {
    render(<BoardActions board={board} />);
    expect(screen.queryByRole("button", { name: "Favorite" })).toBeNull();
    expect(screen.getByRole("link", { name: "Compare" }).getAttribute("href")).toContain(board.id);
    expect(screen.getByRole("button", { name: "Collection" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Copy link" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "More board actions" }));
    expect(screen.getByRole("button", { name: "Copy board ID" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Print reference" })).toBeTruthy();
  });

  it("copies the selected board's canonical URL and reports clipboard failure", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    render(<BoardActions board={board} />);
    fireEvent.click(screen.getByRole("button", { name: "More board actions" }));
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Board link copied."));
    expect(writeText).toHaveBeenCalledWith(new URL(`/boards/${board.id}`, location.origin).href);
    writeText.mockRejectedValueOnce(new Error("denied"));
    fireEvent.click(screen.getByRole("button", { name: "Copy board ID" }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("Couldn’t copy"));
  });

  it("closes tools on Escape and returns focus to their trigger", () => {
    render(<BoardActions board={board} />);
    const trigger = screen.getByRole("button", { name: "More board actions" });
    fireEvent.click(trigger);
    const action = screen.getByRole("button", { name: "Copy link" });
    action.focus();
    fireEvent.keyDown(action, { key: "Escape" });
    expect(screen.queryByRole("region", { name: "Copy and print tools" })).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("keeps only one panel open and resets it when the selected board changes", () => {
    const { rerender } = render(<BoardActions board={board} />);
    fireEvent.click(screen.getByRole("button", { name: "Collection" }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "More board actions" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("region", { name: "Copy and print tools" })).toBeTruthy();
    rerender(<BoardActions board={boards[1]} />);
    expect(screen.queryByRole("region", { name: "Copy and print tools" })).toBeNull();
    expect(screen.getByRole("button", { name: "More board actions" }).getAttribute("aria-expanded")).toBe("false");
  });

  it("dismisses the open panel on an outside press and keeps printing available", () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    render(<BoardActions board={board} />);
    fireEvent.click(screen.getByRole("button", { name: "More board actions" }));
    fireEvent.click(screen.getByRole("button", { name: "Print reference" }));
    expect(print).toHaveBeenCalledOnce();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("region", { name: "Copy and print tools" })).toBeNull();
  });
});
