// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { boards } from "@/lib/boards";
import { findBoards, parseFinderQuery, plannerHref } from "@/lib/board-finder";
import { FindControls } from "@/components/find/FindControls";
import { FindResults, finderVisibleFits } from "@/components/find/FindResults";

const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
afterEach(() => {
  cleanup();
  router.replace.mockReset();
});

const lastUrl = () => router.replace.mock.calls.at(-1)?.[0];

describe("finder controls", () => {
  it("writes each change to the URL the server plans from", () => {
    render(<FindControls query={parseFinderQuery("")}><p>results</p></FindControls>);
    fireEvent.click(screen.getByRole("button", { name: "Add one I2C" }));
    expect(lastUrl()).toBe("/find?plan=i2c1");
    expect(router.replace.mock.calls.at(-1)?.[1]).toEqual({ scroll: false });
  });

  it("keeps the other requirements and filters when one changes", () => {
    render(<FindControls query={parseFinderQuery("plan=i2c1.adc2&logic=3v3")}><p>results</p></FindControls>);
    fireEvent.click(screen.getByRole("button", { name: "Remove one ADC" }));
    expect(lastUrl()).toBe("/find?plan=i2c1.adc1&logic=3v3");
    fireEvent.click(within(screen.getByRole("group", { name: "Wireless" })).getByRole("button", { name: "Wi-Fi" }));
    expect(lastUrl()).toBe("/find?plan=i2c1.adc2&logic=3v3&wireless=wifi");
    fireEvent.click(within(screen.getByRole("group", { name: "Logic level" })).getByRole("button", { name: "Any" }));
    expect(lastUrl()).toBe("/find?plan=i2c1.adc2");
  });

  it("caps each count at the planner's range", () => {
    render(<FindControls query={parseFinderQuery("plan=spi8")}><p>results</p></FindControls>);
    expect((screen.getByRole("button", { name: "Add one SPI" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Remove one UART" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("offers examples only before anything is asked, and Start over clears everything", () => {
    const { unmount } = render(<FindControls query={parseFinderQuery("")}><p>results</p></FindControls>);
    expect(screen.queryByRole("button", { name: "Start over" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "I2C sensor + 2 analog inputs" }));
    expect(lastUrl()).toBe("/find?plan=i2c1.adc2");
    unmount();
    render(<FindControls query={parseFinderQuery("plan=uart1&platform=mcu")}><p>results</p></FindControls>);
    expect(screen.queryByRole("button", { name: "I2C sensor + 2 analog inputs" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Start over" }));
    expect(lastUrl()).toBe("/find");
  });
});

describe("finder results", () => {
  it("links every fit to its plan, its pin map, and states its cautions", () => {
    const query = parseFinderQuery("plan=i2c1.adc2");
    const result = findBoards(boards, query);
    render(<FindResults query={query} result={result} />);
    expect(screen.getByRole("status").textContent).toBe(`Fits on ${result.fits.length} of ${result.checked} boards checked.`);
    const first = result.fits[0];
    const card = screen.getByRole("list", { name: `Pins PinHub assigned on ${first.board.name}` }).closest("li")!;
    expect(within(card).getByRole("link", { name: /Open this plan/ }).getAttribute("href")).toBe(plannerHref(first.board.id, query.requirements));
    expect(within(card).getByRole("link", { name: /Pin map/ }).getAttribute("href")).toBe(`/boards/${first.board.id}#pins`);
    if (first.board.warnings.length) expect(card.textContent).toContain(`${first.board.warnings.length} wiring caution`);
  });

  it("folds fits past the first screenful into a disclosure", () => {
    const query = parseFinderQuery("plan=i2c1");
    const result = findBoards(boards, query);
    expect(result.fits.length).toBeGreaterThan(finderVisibleFits);
    render(<FindResults query={query} result={result} />);
    expect(screen.getByText(`Show ${result.fits.length - finderVisibleFits} more boards that fit`)).toBeTruthy();
  });

  it("warns on a fit that needs pins with recorded cautions", () => {
    const query = parseFinderQuery("plan=i2c1");
    const result = findBoards(boards, query);
    const flagged = { ...result, fits: [{ ...result.fits[0], usedFlaggedPins: true }] };
    render(<FindResults query={query} result={flagged} />);
    expect(screen.getByText(/Fits only by using pins with recorded cautions/)).toBeTruthy();
  });

  it("explains every miss and opens the list when nothing fits", () => {
    const query = parseFinderQuery("plan=i2c8.spi8.uart8.can8.pwm8.adc8.dac8.gpio8");
    const result = findBoards(boards, query);
    expect(result.fits).toEqual([]);
    const { container } = render(<FindResults query={query} result={result} />);
    expect(screen.getByRole("heading", { name: "No board fits all of that" })).toBeTruthy();
    const details = container.querySelector("details")!;
    expect(details.open).toBe(true);
    expect(details.querySelectorAll("li")).toHaveLength(result.misses.length);
  });

  it("never counts a board the search could not settle as one that doesn't fit", () => {
    const query = parseFinderQuery("plan=i2c2.spi2.uart2.pwm4.adc4");
    const result = findBoards(boards, query, 1);
    expect(result.undecided.length).toBeGreaterThan(0);
    const onlyUndecided = { ...result, fits: [], misses: [] };
    render(<FindResults query={query} result={onlyUndecided} />);
    expect(screen.getByRole("heading", { name: "No board confirmed yet" })).toBeTruthy();
    expect(screen.queryByText(/can take all of it at once/)).toBeNull();
    expect(screen.queryByText(/^Doesn.t fit on/)).toBeNull();
    expect(screen.getByText(`Couldn't settle ${result.undecided.length} boards`)).toBeTruthy();
  });

  it("says how many boards it could not check instead of guessing them", () => {
    const query = parseFinderQuery("plan=i2c1");
    const result = findBoards(boards, query);
    expect(result.unchecked.length).toBeGreaterThan(0);
    render(<FindResults query={query} result={result} />);
    expect(screen.getByText(new RegExp(`${result.unchecked.length} more boards have no source-backed pin functions`))).toBeTruthy();
  });
});
