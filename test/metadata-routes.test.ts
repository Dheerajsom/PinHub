import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { boards } from "@/lib/boards";
import { siteUrl } from "@/lib/site";

describe("discovery metadata", () => {
  it("publishes every static pinout in the canonical sitemap", () => {
    const entries = sitemap();
    expect(entries).toHaveLength(boards.length * 2 + 3);
    expect(entries).toContainEqual(expect.objectContaining({ url: new URL("/prices", siteUrl).toString() }));
    expect(entries[0]?.url).toBe(siteUrl.toString());
    expect(entries).toContainEqual(expect.objectContaining({ url: new URL("/compare", siteUrl).toString() }));
    expect(entries).toContainEqual(
      expect.objectContaining({
        url: new URL(`/boards/${boards[0]?.id}`, siteUrl).toString(),
      }),
    );
    expect(entries).toContainEqual(
      expect.objectContaining({
        url: new URL(`/pinout/${boards[0]?.id}`, siteUrl).toString(),
      }),
    );
  });

  it("allows indexing and points crawlers to the sitemap", () => {
    expect(robots()).toEqual(
      expect.objectContaining({
        rules: { userAgent: "*", allow: "/" },
        sitemap: new URL("/sitemap.xml", siteUrl).toString(),
      }),
    );
  });

  it("provides an installable standalone manifest", () => {
    expect(manifest()).toEqual(
      expect.objectContaining({
        name: "PinHub",
        start_url: "/",
        display: "standalone",
      }),
    );
  });

  it("still offers a full-size install icon", () => {
    expect(manifest().icons).toContainEqual(
      expect.objectContaining({ sizes: "512x512" }),
    );
  });
});

describe("icon assets", () => {
  // The tab icon is requested on every page load and is not rendered above a
  // few dozen CSS pixels, so it must stay small. This guards against dropping
  // the 512 px master back in as `app/icon.png` (which cost 172 kB per load).
  it("keeps the browser tab icon small", () => {
    const icon = readFileSync(
      fileURLToPath(new URL("../src/app/icon.png", import.meta.url)),
    );
    expect(icon.byteLength).toBeLessThan(16 * 1024);
    // PNG IHDR: width and height are the two big-endian uint32s at offset 16.
    expect(icon.readUInt32BE(16)).toBeLessThanOrEqual(128);
    expect(icon.readUInt32BE(20)).toBeLessThanOrEqual(128);
  });
});
