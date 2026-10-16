// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it } from "vitest";
import {
  HIDDEN_MESSAGE,
  I2C_DEVICES,
  LOGO_EXCLUDED_VENDORS,
  buildHexField,
  logoPlacements,
  type HexToken,
} from "@/components/background-field";
import { CircuitBackground, isBareBackground, mergeRuns } from "@/components/CircuitBackground";
import { boards } from "@/lib/boards";
import { vendorDomains } from "@/lib/vendor-domains";

describe("background vendor marks", () => {
  const catalogVendors = new Set(boards.map((board) => board.vendor));

  it("only shows vendors that are in the catalog, each with its own site", () => {
    for (const logo of logoPlacements) {
      expect(catalogVendors.has(logo.vendor), logo.vendor).toBe(true);
      expect(vendorDomains[logo.vendor]).toBe(logo.domain);
      expect(LOGO_EXCLUDED_VENDORS.has(logo.vendor)).toBe(false);
    }
  });

  it("shows every vendor that has a working mark at least once", () => {
    const shown = new Set(logoPlacements.map((logo) => logo.vendor));
    for (const vendor of Object.keys(vendorDomains)) {
      if (!LOGO_EXCLUDED_VENDORS.has(vendor)) expect(shown.has(vendor), vendor).toBe(true);
    }
  });

  it("keeps marks in the gutters beside the 1560px content column, without overlaps", () => {
    for (const logo of logoPlacements) expect(Math.abs(logo.x) - logo.size / 2).toBeGreaterThanOrEqual(740);
    for (let i = 0; i < logoPlacements.length; i += 1) {
      for (let j = i + 1; j < logoPlacements.length; j += 1) {
        const a = logoPlacements[i];
        const b = logoPlacements[j];
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan((a.size + b.size) / 2);
      }
    }
  });
});

describe("background byte field", () => {
  const field = buildHexField(96, 54);
  const tokens = field.flat();

  it("is the requested size and deterministic", () => {
    expect(field).toHaveLength(54);
    for (const row of field) expect(row).toHaveLength(96);
    expect(buildHexField(96, 54)).toEqual(field);
  });

  it("hides the message as ASCII bytes", () => {
    const decode = (run: HexToken[]) => run.map((token) => String.fromCharCode(parseInt(token.text, 16))).join("");
    const runs: HexToken[][] = [];
    for (const row of field) {
      let current: HexToken[] = [];
      for (const token of row) {
        if (token.kind === "msg") current.push(token);
        else if (current.length) {
          runs.push(current);
          current = [];
        }
      }
      if (current.length) runs.push(current);
    }
    expect(runs.length).toBeGreaterThanOrEqual(3);
    for (const run of runs) expect(decode(run)).toBe(HIDDEN_MESSAGE);
  });

  it("carries well-formed I2C writes to known parts", () => {
    const addresses = new Set(I2C_DEVICES.map((device) => (device.address << 1) | 0));
    let frames = 0;
    for (const row of field) {
      row.forEach((token, i) => {
        if (token.text !== " S") return;
        frames += 1;
        const address = row[i + 1];
        expect(address.kind).toBe("addr");
        expect(addresses.has(parseInt(address.text, 16))).toBe(true);
        // Every byte after the address is followed by an ACK, then a STOP.
        let j = i + 2;
        while (row[j].text === " A" && row[j + 1].kind === "byte") j += 2;
        expect(row[j].text).toBe(" A");
        expect(row[j + 1].text).toBe(" P");
      });
    }
    expect(frames).toBeGreaterThan(10);
    expect(tokens.filter((token) => token.kind === "addr")).toHaveLength(frames);
  });

  it("merges neighbouring tokens of one kind into a run", () => {
    expect(
      mergeRuns([
        { text: "0A", kind: "byte" },
        { text: "FF", kind: "byte" },
        { text: " S", kind: "mark" },
        { text: "78", kind: "addr" },
      ]),
    ).toEqual([
      { text: "0A FF", kind: "byte" },
      { text: "  S", kind: "mark" },
      { text: " 78", kind: "addr" },
    ]);
  });
});

describe("cursor probe", () => {
  afterEach(() => {
    cleanup();
    document.body.innerHTML = "";
  });

  it("renders without matchMedia and leaves the probe off", () => {
    // jsdom has no matchMedia, like some embedded browsers.
    expect(typeof window.matchMedia).not.toBe("function");
    const { container } = render(createElement(CircuitBackground));
    expect(container.querySelector(".ph-probe")?.getAttribute("data-lit")).toBe("false");
    expect(container.querySelector(".ph-hex-field")).toBeNull();
  });

  it("lights only over bare background, never over a panel", () => {
    document.body.innerHTML = `
      <main>
        <div id="layout"><p id="heading">Privacy</p></div>
        <section style="background-color: rgb(20, 22, 29)"><span id="in-panel">card</span></section>
        <div style="background-color: rgba(0, 0, 0, 0)"><span id="clear">gap</span></div>
      </main>`;
    expect(isBareBackground(document.getElementById("heading"))).toBe(true);
    expect(isBareBackground(document.getElementById("clear"))).toBe(true);
    expect(isBareBackground(document.getElementById("in-panel"))).toBe(false);
    expect(isBareBackground(null)).toBe(false);
  });
});
