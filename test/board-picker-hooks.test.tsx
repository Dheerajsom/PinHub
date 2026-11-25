// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { boards } from "@/lib/boards";
import { createBoardSearchIndex } from "@/lib/board-search";
import { summarizeBoard, type BoardSummary } from "@/lib/board-summary";
import type { BoardDetailLoader } from "@/lib/board-detail-loader";
import type { Board } from "@/lib/boards";
import { useBoardCombobox } from "@/components/catalog/useBoardCombobox";
import { useBoardDetail, useBoardDetails } from "@/components/catalog/useBoardDetail";

afterEach(cleanup);

const summaries = boards.map((board, position) => summarizeBoard(board, position));
const index = createBoardSearchIndex(summaries);

function Picker({ onPick, selectable }: { onPick: (id: string) => void; selectable?: (board: BoardSummary) => boolean }) {
  const { listId, results, inputProps, optionProps } = useBoardCombobox({ index, limit: 8, selectable, onPick });
  return (
    <>
      <input aria-label="Search" {...inputProps} />
      <ul id={listId} role="listbox">
        {results.map((board) => (
          <li key={board.id} {...optionProps(board)}>{board.name}</li>
        ))}
      </ul>
    </>
  );
}

describe("useBoardCombobox", () => {
  it("ranks matches and picks the active option with Enter", () => {
    const onPick = vi.fn();
    render(<Picker onPick={onPick} />);
    const input = screen.getByRole("combobox", { name: "Search" });
    fireEvent.change(input, { target: { value: "pico" } });
    const options = screen.getAllByRole("option");
    expect(options.length).toBeGreaterThan(1);
    expect(input.getAttribute("aria-activedescendant")).toBe(options[0].id);
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(input.getAttribute("aria-activedescendant")).toBe(options[1].id);
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onPick).toHaveBeenCalledWith(summaries.find((board) => board.name === options[1].textContent)!.id);
  });

  it("skips boards that cannot be picked, from the keyboard and by click", () => {
    const onPick = vi.fn();
    const blocked = new Set(summaries.filter((board) => /pico/i.test(board.name)).slice(0, 1).map((board) => board.id));
    render(<Picker onPick={onPick} selectable={(board) => !blocked.has(board.id)} />);
    const input = screen.getByRole("combobox", { name: "Search" });
    fireEvent.change(input, { target: { value: "pico" } });
    const disabled = screen.getAllByRole("option").find((option) => option.getAttribute("aria-disabled") === "true")!;
    fireEvent.click(disabled);
    expect(onPick).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: "Enter" });
    expect(blocked.has(onPick.mock.calls[0][0])).toBe(false);
  });

  it("clears the query with Escape", () => {
    render(<Picker onPick={() => {}} />);
    const input = screen.getByRole("combobox", { name: "Search" }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "esp32" } });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(input.value).toBe("");
    expect(screen.queryAllByRole("option")).toHaveLength(0);
  });
});

function deferredLoader() {
  const pending = new Map<string, { resolve: (board: Board) => void; reject: (error: Error) => void }>();
  const loader: BoardDetailLoader = {
    peek: () => undefined,
    load: (id) => new Promise((resolve, reject) => pending.set(id, { resolve, reject })),
  };
  return { loader, pending };
}

describe("useBoardDetail", () => {
  it("drops a slow response for a board the reader has since left", async () => {
    const { loader, pending } = deferredLoader();
    const { result } = renderHook(() => useBoardDetail(loader));
    act(() => result.current.open(boards[0].id));
    act(() => result.current.open(boards[1].id));
    await act(async () => pending.get(boards[1].id)!.resolve(boards[1]));
    await act(async () => pending.get(boards[0].id)!.resolve(boards[0]));
    expect(result.current.detail).toEqual({ status: "ready", board: boards[1] });
    act(() => result.current.reset("No pin map"));
    expect(result.current.detail).toEqual({ status: "idle", notice: "No pin map" });
  });
});

describe("useBoardDetails", () => {
  it("tracks each board and retries a failure", async () => {
    const { loader, pending } = deferredLoader();
    const { result } = renderHook(() => useBoardDetails(loader));
    act(() => result.current.ensure(boards[0].id));
    await act(async () => pending.get(boards[0].id)!.reject(new Error("offline")));
    expect(result.current.details[boards[0].id]).toEqual({ status: "error" });
    act(() => result.current.ensure(boards[0].id, true));
    expect(result.current.details[boards[0].id]).toEqual({ status: "loading" });
    await act(async () => pending.get(boards[0].id)!.resolve(boards[0]));
    expect(result.current.details[boards[0].id]).toEqual({ status: "ready", board: boards[0] });
  });
});

describe("tool pages share one picker, loader, and URL sync", () => {
  // Check, Link, and the planner each carried a copy of the search ranking,
  // combobox keys, ticketed loader, and popstate sync.
  const read = (file: string) => readFileSync(join(process.cwd(), "src", "components", file), "utf8");
  it.each(["check/CheckApp.tsx", "link/LinkBoardSlot.tsx", "planner/PlannerBoardPicker.tsx"])("%s uses useBoardCombobox", (file) => {
    const source = read(file);
    expect(source).toContain("useBoardCombobox(");
    expect(source).not.toMatch(/matchBoardSearchEntry|role="combobox"|key === "ArrowDown"/);
  });

  it.each(["check/CheckApp.tsx", "link/LinkApp.tsx", "planner/PlannerApp.tsx"])("%s uses the shared loader and URL sync", (file) => {
    const source = read(file);
    expect(source).toMatch(/useBoardDetails?\(/);
    expect(source).toContain("useLocationSync(");
    expect(source).not.toMatch(/addEventListener\("popstate"|ticket\.current/);
  });
});
