import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { boards } from "@/lib/boards";
import { siteUrl } from "@/lib/site";

describe("discovery metadata", () => {
  it("publishes every static pinout in the canonical sitemap", () => {
    const entries = sitemap();
    expect(entries).toHaveLength(boards.length * 2 + 2);
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
});
