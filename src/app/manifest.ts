import type { MetadataRoute } from "next";
import { siteDescription, siteName } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteName,
    short_name: siteName,
    description: siteDescription,
    start_url: "/",
    display: "standalone",
    background_color: "#090b0f",
    theme_color: "#090b0f",
    // Browsers fetch a manifest icon on ordinary page loads, not only at
    // install time, so every entry here is on the wire budget. The tab icon is
    // 64 px; the install/splash sizes are resampled from the 512 px master
    // (`/pinhub-logo.png`, 172 kB) rather than pointing at it directly, which
    // is visually identical at these sizes for a third of the bytes.
    icons: [
      {
        src: "/icon.png",
        sizes: "64x64",
        type: "image/png",
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
