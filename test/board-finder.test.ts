import { describe, expect, it } from "vitest";
import { boards } from "@/lib/boards";
import { getBoardDiscoveryProfile } from "@/lib/board-discovery";
import {
  assignmentLines,
  findBoards,
  maxFinderSearchLength,
  parseFinderQuery,
  plannerHref,
  serializeFinderQuery,
} from "@/lib/board-finder";
import { planFromSearch, boardFromSearch } from "@/lib/plan-params";
import { planCapabilities, planPeripherals, planPins } from "@/lib/pin-planner";

describe("finder query", () => {
  it("round-trips requirements and filters in canonical order", () => {
    const query = parseFinderQuery("wireless=wifi&plan=adc2.i2c1&logic=3v3");
    expect(query).toEqual({ requirements: { I2C: 1, ADC: 2 }, filters: { logic: "3v3", wireless: "wifi" } });
    expect(serializeFinderQuery(query)).toBe("plan=i2c1.adc2&logic=3v3&wireless=wifi");
    expect(parseFinderQuery(serializeFinderQuery(query))).toEqual(query);
  });

  it("drops unknown keys, unknown values, repeats, and out-of-range counts", () => {
    expect(parseFinderQuery("plan=i2c9.spi0.evil3.uart2&platform=toaster&logic=5v&logic=3v3&x=1")).toEqual({
      requirements: { UART: 2 },
      filters: {},
    });
    expect(parseFinderQuery({ plan: ["i2c1", "spi1"], platform: "mcu" })).toEqual({ requirements: {}, filters: { platform: "mcu" } });
  });

  it("reads an oversized query as empty instead of trimming it into something else", () => {
    const long = `plan=i2c1&pad=${"x".repeat(maxFinderSearchLength)}`;
    expect(parseFinderQuery(long)).toEqual({ requirements: {}, filters: {} });
    expect(parseFinderQuery(new URLSearchParams(long))).toEqual({ requirements: {}, filters: {} });
  });

  it("never writes a count or filter the reader could not have chosen", () => {
    expect(serializeFinderQuery({ requirements: { I2C: 12, SPI: -1 }, filters: { logic: "12v" } })).toBe("plan=i2c8");
  });
});

describe("findBoards", () => {
  const query = parseFinderQuery("plan=i2c1.spi1.adc3");
  const result = findBoards(boards, query);

  it("accounts for every board exactly once", () => {
    const seen = [
      ...result.fits.map((fit) => fit.board.id),
      ...result.misses.map((miss) => miss.board.id),
      ...result.undecided.map((board) => board.id),
      ...result.unchecked.map((board) => board.id),
    ];
    expect(new Set(seen).size).toBe(seen.length);
    expect(seen.length).toBe(boards.length);
    expect(result.checked).toBe(boards.filter((board) => board.pinFunctions && board.pinout).length);
    expect(result.unchecked.every((board) => !board.pinFunctions || !board.pinout)).toBe(true);
  });

  it("lists exactly the plans the pin planner itself would make", () => {
    expect(result.fits.length).toBeGreaterThan(0);
    for (const fit of result.fits) {
      const plan = planPins(fit.board, query.requirements);
      expect(plan.status, fit.board.id).toBe("ok");
      if (plan.status === "ok") expect(fit.assignments).toEqual(plan.assignments);
    }
    for (const miss of result.misses) {
      const plan = planPins(miss.board, query.requirements);
      expect(plan.status, miss.board.id).toBe("unsatisfiable");
      expect(miss.reason).toBeTruthy();
    }
  });

  it("puts clean fits before fits that need cautioned pins, each in catalog order", () => {
    const flagged = result.fits.findIndex((fit) => fit.usedFlaggedPins);
    if (flagged !== -1) expect(result.fits.slice(flagged).every((fit) => fit.usedFlaggedPins)).toBe(true);
    const order = (fits: typeof result.fits) => fits.map((fit) => boards.indexOf(fit.board));
    const clean = order(result.fits.filter((fit) => !fit.usedFlaggedPins));
    expect(clean).toEqual([...clean].sort((a, b) => a - b));
  });

  it("applies each filter from the board's discovery profile", () => {
    const fiveVolt = findBoards(boards, parseFinderQuery("plan=uart1&logic=5v"));
    const all = [...fiveVolt.fits.map((fit) => fit.board), ...fiveVolt.misses.map((miss) => miss.board), ...fiveVolt.unchecked];
    expect(all.length).toBeGreaterThan(0);
    for (const board of all) expect(getBoardDiscoveryProfile(board).logicProfile).toBe("5 V");

    const wifi = findBoards(boards, parseFinderQuery("plan=i2c1&wireless=wifi&platform=mcu"));
    for (const { board } of wifi.fits) {
      const profile = getBoardDiscoveryProfile(board);
      expect(profile.wireless).toContain("Wi-Fi");
      expect(profile.computeClass).toBe("Microcontroller");
    }
  });

  it("reports a search that ran out of steps as undecided, never as a miss", () => {
    const tight = findBoards(boards, parseFinderQuery("plan=i2c2.spi2.uart2.pwm4.adc4"), 1);
    expect(tight.undecided.length).toBeGreaterThan(0);
    for (const board of tight.undecided) {
      expect(tight.misses.some((miss) => miss.board === board)).toBe(false);
      expect(tight.fits.some((fit) => fit.board === board)).toBe(false);
    }
  });

  it("plans nothing until something is asked for", () => {
    const empty = findBoards(boards, parseFinderQuery(""));
    expect(empty.fits).toEqual([]);
    expect(empty.misses).toEqual([]);
    expect(empty.checked).toBeGreaterThan(100);
  });
});

describe("handing a fit to the planner", () => {
  it("never promises a count the planner would lower when the link opens", () => {
    // The planner clamps each count to planCapabilities, proven with a smaller
    // step budget than a whole plan; every fit must sit inside those limits.
    for (const peripheral of planPeripherals) {
      for (const count of [1, 4, 8]) {
        for (const fit of findBoards(boards, { requirements: { [peripheral]: count }, filters: {} }).fits) {
          const max = planCapabilities(fit.board).find((item) => item.peripheral === peripheral)?.max ?? 0;
          expect(max, `${fit.board.id} ${peripheral}${count}`).toBeGreaterThanOrEqual(count);
        }
      }
    }
  });

  it("opens the planner on that board with the same requirements", () => {
    const href = plannerHref("raspberry-pi-pico", { I2C: 1, ADC: 2 });
    const search = href.slice(href.indexOf("?"));
    expect(href.startsWith("/planner?")).toBe(true);
    expect(boardFromSearch(search)).toBe("raspberry-pi-pico");
    expect(planFromSearch(search)).toEqual({ I2C: 1, ADC: 2 });
  });

  it("names each unit's instance and the pin for each signal", () => {
    const pico = boards.find((board) => board.id === "raspberry-pi-pico")!;
    const plan = planPins(pico, { I2C: 1, GPIO: 1 });
    expect(plan.status).toBe("ok");
    if (plan.status !== "ok") return;
    const lines = assignmentLines(plan.assignments);
    expect(lines[0]).toMatch(/^I2C\d · SDA \S+ · SCL \S+$/);
    expect(lines[1]).toMatch(/^GPIO 1 · \S+$/);
  });
});
