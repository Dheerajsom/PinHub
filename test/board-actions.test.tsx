// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BoardActions } from "@/components/BoardActions";
import { boards } from "@/lib/boards";

const board = boards[0];
const withPinout = boards.find((item) => item.pinout)!;
const withoutPinout = boards.find((item) => !item.pinout);
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("board action row", () => {
  it("shows only where to go next and keeps every other tool behind More", () => {
    render(<BoardActions board={withPinout} showBoardPage />);
    expect(screen.getByRole("link", { name: "Board page" }).getAttribute("href")).toBe(`/boards/${withPinout.id}`);
    expect(screen.getByRole("link", { name: "Plan pins" }).getAttribute("href")).toBe(`/planner?board=${withPinout.id}`);
    expect(screen.queryByRole("link", { name: /Compare/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /collection/i })).toBeNull();
    expect(screen.queryByRole("button", { name: "Copy link" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "More board actions" }));
    expect(screen.getByRole("link", { name: "Compare with other boards" }).getAttribute("href")).toContain(withPinout.id);
    expect(screen.getByRole("button", { name: "Add to collection" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Copy board ID" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Print reference" })).toBeTruthy();
  });

  it("links the board page only from the preview and the planner only with a pin map", () => {
    render(<BoardActions board={withPinout} />);
    expect(screen.queryByRole("link", { name: "Board page" })).toBeNull();
    cleanup();
    if (!withoutPinout) return;
    render(<BoardActions board={withoutPinout} showBoardPage />);
    expect(screen.queryByRole("link", { name: "Plan pins" })).toBeNull();
  });

  it("opens the collection dialog from More and returns focus there on close", () => {
    render(<BoardActions board={board} />);
    const trigger = screen.getByRole("button", { name: "More board actions" });
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("button", { name: "Add to collection" }));
    const dialog = screen.getByRole("dialog", { name: `Collections for ${board.name}` });
    expect(document.activeElement).toBe(dialog);
    expect(screen.queryByRole("region", { name: "Board tools" })).toBeNull();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
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
    expect(screen.queryByRole("region", { name: "Board tools" })).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("keeps only one panel open and resets it when the selected board changes", () => {
    const { rerender } = render(<BoardActions board={board} />);
    fireEvent.click(screen.getByRole("button", { name: "More board actions" }));
    fireEvent.click(screen.getByRole("button", { name: "Add to collection" }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "More board actions" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("region", { name: "Board tools" })).toBeTruthy();
    rerender(<BoardActions board={boards[1]} />);
    expect(screen.queryByRole("region", { name: "Board tools" })).toBeNull();
    expect(screen.getByRole("button", { name: "More board actions" }).getAttribute("aria-expanded")).toBe("false");
  });

  it("dismisses the open panel on an outside press and keeps printing available", () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    render(<BoardActions board={board} />);
    fireEvent.click(screen.getByRole("button", { name: "More board actions" }));
    fireEvent.click(screen.getByRole("button", { name: "Print reference" }));
    expect(print).toHaveBeenCalledOnce();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("region", { name: "Board tools" })).toBeNull();
  });
});
