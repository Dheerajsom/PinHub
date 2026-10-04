// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { priceForBoard, stockValidForMs } from "@/lib/board-prices";

const feed = vi.hoisted(() => ({ now: null as number | null }));
vi.mock("@/components/useLivePrices", () => ({ useLivePrices: () => ({ prices: null, source: "shared", now: feed.now }) }));

import { BoardPriceLink } from "@/components/BoardPriceLink";
import { BoardPriceReference } from "@/components/BoardPriceReference";

const price = priceForBoard("raspberry-pi-5")!;
const checked = Date.parse(price.checkedAt);

afterEach(() => { cleanup(); feed.now = null; });

describe("stock before clicking out", () => {
  it.each([
    ["board price card", () => render(<BoardPriceLink boardId={price.boardId} />)],
    ["compare price cell", () => render(<BoardPriceReference boardId={price.boardId} />)],
  ])("the %s shows stock from a recent check and expires it", (_name, mount) => {
    const expected = price.stock === "in-stock" ? "In stock at check" : price.stock === "out-of-stock" ? "Out of stock at check" : "Check with seller";
    feed.now = checked + 60_000;
    mount();
    expect(screen.getByText(expected)).toBeTruthy();
    cleanup();
    feed.now = checked + stockValidForMs;
    mount();
    expect(screen.getByText("Check with seller")).toBeTruthy();
    expect(screen.queryByText(/stock at check/)).toBeNull();
  });

  it("claims nothing before the clock is known", () => {
    render(<BoardPriceReference boardId={price.boardId} />);
    expect(screen.getByText("Check with seller")).toBeTruthy();
  });
});
