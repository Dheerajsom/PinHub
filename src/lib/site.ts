export const siteName = "PinHub";
export const siteDescription =
  "A searchable, source-backed pinout catalog for SBCs, microcontrollers, and embedded development boards.";
export const siteUrl = new URL("https://pinhub-mauve.vercel.app");
export const repoUrl = "https://github.com/Dheerajsom/PinHub";
export const cliGuideUrl = `${repoUrl}/tree/main/cli#readme`;

type PageMetadataInput = { title: string; description: string; path: `/${string}` };

/**
 * Title, description, canonical URL and social cards for a top-level page.
 * Next merges `openGraph` and `twitter` shallowly, so a page that sets only a
 * title would otherwise share the homepage's preview URL and card title.
 */
export function pageMetadata({ title, description, path }: PageMetadataInput) {
  const fullTitle = `${title} · ${siteName}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website" as const,
      url: path,
      siteName,
      title: fullTitle,
      description,
      images: [{ url: "/pinhub-logo.png", width: 512, height: 512, alt: "PinHub logo" }],
    },
    twitter: {
      card: "summary" as const,
      title: fullTitle,
      description,
      images: ["/pinhub-logo.png"],
    },
  };
}
