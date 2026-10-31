import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { boards, type Board } from "@/lib/boards";
import { shareCardMaxPadsPerRow, shareCardMaxRows, shareCardModel } from "@/lib/share-card";

function board(id: string): Board {
  const found = boards.find((item) => item.id === id);
  if (!found) throw new Error(`${id} missing`);
  return found;
}

describe("board share card", () => {
  it("draws one pad per catalog pin, in catalog order, on its own side", () => {
    const pi = board("raspberry-pi-5");
    const model = shareCardModel(pi);
    expect(model.rows.map((row) => row.label)).toEqual(["Left", "Right"]);
    expect(model.rows[0].roles).toEqual(pi.pinout!.pins!.left.map((pin) => pin.role));
    expect(model.rows[1].roles).toEqual(pi.pinout!.pins!.right.map((pin) => pin.role));
    expect(model.pinCount).toBe(40);
  });

  it("names grouped connectors by their catalog group label", () => {
    const esp = board("esp32-devkitc");
    const model = shareCardModel(esp);
    expect(model.rows.map((row) => row.label)).toEqual(
      esp.pinout!.groups!.slice(0, shareCardMaxRows).map((group) => group.label),
    );
  });

  it("caps rows and pads and says how many it left out", () => {
    for (const item of boards) {
      const model = shareCardModel(item);
      expect(model.rows.length).toBeLessThanOrEqual(shareCardMaxRows);
      const drawn = model.rows.reduce((sum, row) => sum + row.roles.length + row.more, 0);
      for (const row of model.rows) expect(row.roles.length).toBeLessThanOrEqual(shareCardMaxPadsPerRow);
      if (!model.moreRows) expect(drawn, item.id).toBe(model.pinCount);
    }
  });

  it("explains every pad color in the legend, with catalog counts", () => {
    for (const item of boards) {
      const model = shareCardModel(item);
      const drawn = new Set(model.rows.flatMap((row) => row.roles));
      const explained = new Set(model.legend.map((entry) => entry.role));
      for (const role of drawn) expect(explained.has(role), `${item.id} ${role}`).toBe(true);
      for (const entry of model.legend) {
        const roles = [
          ...(item.pinout?.pins?.left ?? []),
          ...(item.pinout?.pins?.right ?? []),
          ...(item.pinout?.groups ?? []).flatMap((group) => group.pins),
        ].filter((pin) => pin.role === entry.role);
        expect(entry.count, `${item.id} ${entry.role}`).toBe(roles.length);
      }
    }
  });

  it("gives both board routes a prerendered large preview image", () => {
    for (const segment of ["pinout", "boards"]) {
      const file = join(process.cwd(), "src", "app", segment, "[id]", "opengraph-image.tsx");
      expect(existsSync(file), file).toBe(true);
      const source = readFileSync(file, "utf8");
      expect(source).toContain("dynamicParams = false");
      expect(source).toContain("generateStaticParams");
      const page = readFileSync(join(process.cwd(), "src", "app", segment, "[id]", "page.tsx"), "utf8");
      expect(page).toContain('card: "summary_large_image"');
    }
  });
});
