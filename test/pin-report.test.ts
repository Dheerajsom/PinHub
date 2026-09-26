import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { boards, type Pin } from "@/lib/boards";
import {
  maxPinReportUrlLength,
  maxPinReportValueLength,
  pinReportContextFor,
  pinReportFields,
  pinReportTemplate,
  pinReportUrl,
} from "@/lib/pin-report";
import { repoUrl } from "@/lib/site";
import { verificationSourceFor } from "@/lib/source-trust";

const pi5 = { id: "raspberry-pi-5", name: "Raspberry Pi 5" };
const connector = "J8 40-pin GPIO header";
const source = "https://www.raspberrypi.com/documentation/computers/raspberry-pi.html";

function params(url: string | null) {
  if (!url) throw new Error("expected a report URL");
  return new URL(url).searchParams;
}

const templateText = readFileSync(
  new URL(`../.github/ISSUE_TEMPLATE/${pinReportTemplate}`, import.meta.url),
  "utf8",
);
// Read as text rather than parsed: the ids are simple `id: value` lines, and
// the check must not need a YAML dependency.
const templateIds = new Set(
  [...templateText.matchAll(/^\s*id:\s*([A-Za-z0-9_-]+)\s*$/gm)].map(
    (match) => match[1],
  ),
);

describe("pin report issue form", () => {
  it("declares every field id the app prefills", () => {
    for (const id of Object.values(pinReportFields)) {
      expect(templateIds, `template is missing id "${id}"`).toContain(id);
    }
  });

  it("only sends query keys the form understands", () => {
    const url = pinReportUrl({
      board: pi5,
      pin: { position: 12, label: "GPIO18", group: "Header" },
      connector,
      source,
    });
    for (const key of params(url).keys()) {
      if (key === "template" || key === "title") continue;
      expect(templateIds).toContain(key);
    }
    expect(params(url).get("template")).toBe(pinReportTemplate);
  });

  it("applies the data-error label and keeps the required fields required", () => {
    expect(templateText).toMatch(/^labels:\s*\["data-error"\]\s*$/m);
    for (const id of ["board", "problem", "expected", "evidence"]) {
      const block = templateText.split(/^\s*- type:/m).find((part) =>
        new RegExp(`^\\s*id:\\s*${id}\\s*$`, "m").test(part),
      );
      expect(block, id).toMatch(/required:\s*true/);
    }
  });
});

describe("pinReportUrl", () => {
  it("prefills the board, pin, connector, and cited source for a pinned pin", () => {
    const url = pinReportUrl({
      board: pi5,
      pin: { position: 12, label: "GPIO18" },
      connector,
      source,
    });
    expect(url?.startsWith(`${repoUrl}/issues/new?`)).toBe(true);
    const query = params(url);
    expect(query.get("title")).toBe("Pin data: Raspberry Pi 5 pin 12 (GPIO18)");
    expect(query.get(pinReportFields.board)).toBe("raspberry-pi-5");
    expect(query.get(pinReportFields.pin)).toBe("12 · GPIO18");
    expect(query.get(pinReportFields.connector)).toBe(connector);
    expect(query.get(pinReportFields.source)).toBe(source);
  });

  it("builds a board-level report without a pin", () => {
    const query = params(pinReportUrl({ board: pi5, connector, source }));
    expect(query.get("title")).toBe("Board data: Raspberry Pi 5");
    expect(query.has(pinReportFields.pin)).toBe(false);
    expect(query.get(pinReportFields.board)).toBe("raspberry-pi-5");
  });

  it("encodes separators so a value can never split into another parameter", () => {
    const url = pinReportUrl({
      board: { id: "test-board", name: "A&B + C/D" },
      pin: { position: 3, label: "SDA/SCL & +5V" },
      connector: "J1 · top",
    });
    expect(url).not.toBeNull();
    const rawQuery = url!.split("?")[1];
    expect(rawQuery).toContain("%C2%B7");
    expect(rawQuery).toContain("%2B");
    expect(rawQuery).toContain("%2F");
    expect(rawQuery).toContain("%26");
    expect(rawQuery).not.toContain("+");
    expect(rawQuery).not.toMatch(/ /);
    const query = params(url);
    expect([...query.keys()]).toEqual(["template", "title", "board", "pin", "connector"]);
    expect(query.get("title")).toBe("Pin data: A&B + C/D pin 3 (SDA/SCL & +5V)");
    expect(query.get(pinReportFields.pin)).toBe("3 · SDA/SCL & +5V");
    expect(query.get(pinReportFields.connector)).toBe("J1 · top");
  });

  it("strips control, newline, and bidi characters from values", () => {
    const query = params(
      pinReportUrl({
        board: { id: "test-board", name: "Board\u202e\nName" },
        pin: { position: 1, label: "GPIO\r\n18\u0000\t" },
      }),
    );
    expect(query.get(pinReportFields.pin)).toBe("1 · GPIO 18");
    expect(query.get("title")).toBe("Pin data: Board Name pin 1 (GPIO 18)");
  });

  it("caps each value and keeps the URL under the length limit", () => {
    const long = "x".repeat(900);
    const url = pinReportUrl({
      board: { id: "test-board", name: long },
      pin: { position: 1, label: long },
      connector: long,
    });
    expect(url).not.toBeNull();
    expect(url!.length).toBeLessThan(maxPinReportUrlLength);
    const query = params(url);
    for (const key of ["title", pinReportFields.pin, pinReportFields.connector]) {
      const value = query.get(key) ?? "";
      expect(Array.from(value).length).toBeLessThanOrEqual(maxPinReportValueLength);
      expect(value.endsWith("…")).toBe(true);
    }
  });

  it("drops optional context before exceeding the URL limit, and gives up past it", () => {
    // Four-byte characters triple in size when percent-encoded.
    const trimmed = pinReportUrl({
      board: { id: "test-board", name: "Board" },
      pin: { position: 1, label: "🔌".repeat(40) },
      connector: "🔌".repeat(120),
      source,
    });
    expect(trimmed).not.toBeNull();
    expect(trimmed!.length).toBeLessThan(maxPinReportUrlLength);
    expect(params(trimmed).has(pinReportFields.source)).toBe(false);
    expect(params(trimmed).has(pinReportFields.connector)).toBe(false);

    const impossible = pinReportUrl({
      board: { id: "test-board", name: "🔌".repeat(400) },
      pin: { position: 1, label: "🔌".repeat(400) },
    });
    expect(impossible).toBeNull();
  });

  it("rejects ids that are not catalog-shaped", () => {
    for (const id of ["", "Raspberry-Pi", "../etc", "pi 5", "a".repeat(129)]) {
      expect(pinReportUrl({ board: { id, name: "Board" } })).toBeNull();
    }
    expect(
      pinReportUrl({ board: pi5, pin: { position: Number.NaN, label: "GPIO18" } }),
    ).toBeNull();
    expect(
      pinReportUrl({ board: pi5, pin: { position: -1, label: "GPIO18" } }),
    ).toBeNull();
  });

  it("drops a cited source that is not a safe external URL", () => {
    for (const unsafe of [
      "javascript:alert(1)",
      "http://www.raspberrypi.com/",
      "https://localhost/pinout",
      "https://user:secret@example.com/",
      "https://example.com:8443/",
      `https://example.com/${"a".repeat(300)}`,
      "https://example.com/\u202epdf",
    ]) {
      const query = params(pinReportUrl({ board: pi5, source: unsafe }));
      expect(query.has(pinReportFields.source), unsafe).toBe(false);
    }
  });

  it("carries a grouped layout's group so reused positions stay distinct", () => {
    const uno = boards.find((board) => board.id === "arduino-uno-rev3");
    const pins = (uno?.pinout?.groups ?? []).flatMap((group) =>
      group.pins.map((pin) => ({ pin, group: group.label })),
    );
    const clashing = pins.filter(({ pin }) => pin.position === 14);
    expect(clashing.length).toBeGreaterThan(1);
    const connectors = clashing.map(({ pin, group }) =>
      params(
        pinReportUrl({
          ...pinReportContextFor(uno!),
          pin: { ...pin, group },
        }),
      ).get(pinReportFields.connector),
    );
    expect(new Set(connectors).size).toBe(clashing.length);
    expect(connectors[0]).toContain(uno!.pinout!.connector);
  });

  it("links every catalog pin within the limit, with full context", () => {
    for (const board of boards) {
      const context = pinReportContextFor(board);
      expect(context.source).toBe(verificationSourceFor(board)?.url);
      const pins: { pin: Pin; group?: string }[] = board.pinout?.pins
        ? [...board.pinout.pins.left, ...board.pinout.pins.right].map((pin) => ({ pin }))
        : (board.pinout?.groups ?? []).flatMap((group) =>
            group.pins.map((pin) => ({ pin, group: group.label })),
          );
      for (const { pin, group } of [{ pin: undefined, group: undefined }, ...pins]) {
        const url = pinReportUrl({ ...context, pin: pin && { ...pin, group } });
        expect(url, `${board.id} ${pin?.position}`).not.toBeNull();
        expect(url!.length).toBeLessThan(maxPinReportUrlLength);
        const query = params(url);
        expect(query.get(pinReportFields.board)).toBe(board.id);
        expect(query.get(pinReportFields.source)).toBe(context.source);
        if (board.pinout) expect(query.get(pinReportFields.connector)).toBeTruthy();
      }
    }
  });
});
