import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { boards } from "@/lib/boards";
import { pageMetadata, siteUrl } from "@/lib/site";

describe("discovery metadata", () => {
  it("publishes every board page once in the canonical sitemap", () => {
    const entries = sitemap();
    expect(entries).toHaveLength(boards.length + 8);
    expect(entries).toContainEqual(expect.objectContaining({ url: new URL("/privacy", siteUrl).toString() }));
    expect(entries).toContainEqual(expect.objectContaining({ url: new URL("/prices", siteUrl).toString() }));
    expect(entries[0]?.url).toBe(siteUrl.toString());
    expect(entries).toContainEqual(expect.objectContaining({ url: new URL("/compare", siteUrl).toString() }));
    expect(entries).toContainEqual(expect.objectContaining({ url: new URL("/planner", siteUrl).toString() }));
    expect(entries).toContainEqual(expect.objectContaining({ url: new URL("/link", siteUrl).toString() }));
    expect(entries).toContainEqual(expect.objectContaining({ url: new URL("/check", siteUrl).toString() }));
    expect(entries).toContainEqual(expect.objectContaining({ url: new URL("/find", siteUrl).toString() }));
    expect(entries).toContainEqual(
      expect.objectContaining({
        url: new URL(`/boards/${boards[0]?.id}`, siteUrl).toString(),
      }),
    );
    // The standalone pinout page merged into the board page and redirects
    // there, so the sitemap lists each board once.
    expect(entries.some((entry) => entry.url.includes("/pinout/"))).toBe(false);
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

describe("page social metadata", () => {
  // Next merges openGraph and twitter shallowly: a page that set only a title
  // shared the homepage's preview URL ("/") and card title.
  it("gives a page its own preview URL and title", () => {
    const metadata = pageMetadata({ title: "Board finder", description: "Find a board.", path: "/find" });
    expect(metadata.alternates.canonical).toBe("/find");
    expect(metadata.openGraph).toEqual(expect.objectContaining({ url: "/find", title: "Board finder · PinHub", description: "Find a board." }));
    expect(metadata.openGraph.images).toHaveLength(1);
    expect(metadata.twitter).toEqual(expect.objectContaining({ title: "Board finder · PinHub", description: "Find a board." }));
  });

  it.each(readdirSync(fileURLToPath(new URL("../src/app", import.meta.url)), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(fileURLToPath(new URL(`../src/app/${entry.name}/page.tsx`, import.meta.url))))
    .map((entry) => entry.name))("/%s builds its metadata with pageMetadata at its own path", (route) => {
    const source = readFileSync(fileURLToPath(new URL(`../src/app/${route}/page.tsx`, import.meta.url)), "utf8");
    expect(source).toMatch(/pageMetadata\(\{/);
    expect(source).toContain(`path: "/${route}"`);
  });
});
