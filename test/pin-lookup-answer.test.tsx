// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, expect, it, vi } from "vitest";
import { boards } from "@/lib/boards";
import { summarizeBoard } from "@/lib/board-summary";
import { createBoardSearchIndex } from "@/lib/board-search";
import { createPinIndex } from "@/lib/server/pin-index";
import { PinLookupAnswer } from "@/components/catalog/PinLookupAnswer";

const search = createBoardSearchIndex(boards.map(summarizeBoard));
beforeAll(() => vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(createPinIndex())))));
afterEach(cleanup);

it("previews defaults, discloses alternatives, and limits text to the requested function", async () => {
  render(<PinLookupAnswer query="pico sda" search={search} />);
  const matches = await screen.findByRole("region", { name: "Recorded pin matches" });
  expect(fetch).toHaveBeenCalledWith("/api/pins", { cache: "no-cache" });
  const links = within(matches).getAllByRole("link");
  expect(links[0].textContent).toContain("GP4");
  expect(links[0].textContent).toContain("Recorded default");
  expect(links[0].textContent).toContain("SDA");
  expect(links[0].textContent).not.toContain("PWM");
  expect(within(matches).queryAllByRole("link").some((link) => link.textContent?.includes("GP0"))).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: /Show \d+ more pins for Raspberry Pi Pico$/ }));
  const alternate = within(matches).getAllByRole("link").find((link) => link.textContent?.includes("GP0"))!;
  expect(alternate.textContent).toContain("Alternate function");
});

it("lets engineers reveal later boards instead of silently dropping dense-family matches", async () => {
  render(<PinLookupAnswer query="esp32 sda" search={search} />);
  const matches = await screen.findByRole("region", { name: "Recorded pin matches" });
  expect(within(matches).queryByRole("heading", { name: /DOIT ESP32 DevKit V1/ })).toBeNull();
  fireEvent.click(within(matches).getByRole("button", { name: /Show \d+ more boards/ }));
  expect(within(matches).getByRole("heading", { name: /DOIT ESP32 DevKit V1/ })).toBeTruthy();
  expect(matches.textContent).not.toContain("adc-unavailable-with-wifi");
});

it("keeps comparison lookup collapsed until requested", async () => {
  const { container } = render(<PinLookupAnswer query="pico sda" search={search} collapsed />);
  expect(screen.queryByRole("region", { name: "Pin lookup" })).toBeNull();
  const details = container.querySelector("details")!;
  details.open = true;
  fireEvent(details, new Event("toggle"));
  expect(await screen.findByRole("region", { name: "Recorded pin matches" })).toBeTruthy();
});

it("shows the matched numbered net when no structured function describes it", async () => {
  render(<PinLookupAnswer query="teensy 3.2 i2c" search={search} />);
  const matches = await screen.findByRole("region", { name: "Recorded pin matches" });
  fireEvent.click(within(matches).getByRole("button", { name: /Show \d+ more pins for Teensy 3\.2$/ }));
  expect(within(matches).getAllByRole("link").some((link) => link.textContent?.includes("I2C1"))).toBe(true);
});

it("explains alternate I2C and PWM matches using their recorded line and timer names", async () => {
  const { rerender } = render(<PinLookupAnswer query="teensy4.1 i2c" search={search} />);
  let matches = await screen.findByRole("region", { name: "Recorded pin matches" });
  fireEvent.click(within(matches).getByRole("button", { name: /Show \d+ more pins for Teensy 4\.1$/ }));
  const lines = within(matches).getAllByRole("link");
  expect(lines).toHaveLength(6);
  for (const line of lines) expect(line.textContent).toMatch(/SDA|SCL/);
  expect(lines.some((line) => line.textContent?.includes("I2C Wire2 SCL"))).toBe(true);
  rerender(<PinLookupAnswer query="uno r3 pwm" search={search} />);
  matches = await screen.findByRole("region", { name: "Recorded pin matches" });
  fireEvent.click(within(matches).getByRole("button", { name: /Show \d+ more pins for Arduino UNO Rev3$/ }));
  expect(within(matches).getAllByRole("link").some((link) => link.textContent?.includes("PWM TIMER1 B"))).toBe(true);
  expect(within(matches).getAllByRole("link").some((link) => link.textContent?.includes("PWM TIMER2 A"))).toBe(true);
});
