import type { MetadataRoute } from "next";
import { boards } from "@/lib/boards";
import { siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteUrl.toString(),
      changeFrequency: "weekly",
      priority: 1,
    },
    ...boards.map((board) => ({
      url: new URL(`/pinout/${board.id}`, siteUrl).toString(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
