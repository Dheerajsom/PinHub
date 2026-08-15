import type { Metadata, Viewport } from "next";
import { Audiowide, Chivo_Mono, Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { siteDescription, siteName, siteUrl } from "@/lib/site";
import { Footer } from "@/components/Footer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const audiowide = Audiowide({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
});

// The pinout drawing's annotation face. Chivo Mono's squared terminals and
// tabular figures read like CAD callouts, which is exactly the register the
// pinout sheet is written in; Geist Mono stays the general-purpose code face.
//
// Not preloaded: the only rule that asks for it is `.pin-tech`, which lives in
// the static pin map — the non-default tab. Preloading it put ~26 kB of font
// at the head of the network queue on every page for type that is not on the
// first screen; it now loads when the static map first renders (font-display
// swap, so that view never blocks on it).
const chivoMono = Chivo_Mono({
  variable: "--font-technical",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: siteName,
    template: `%s · ${siteName}`,
  },
  description: siteDescription,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName,
    title: siteName,
    description: siteDescription,
    images: [
      {
        url: "/pinhub-logo.png",
        width: 512,
        height: 512,
        alt: "PinHub logo",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: siteName,
    description: siteDescription,
    images: ["/pinhub-logo.png"],
  },
  // Icons are intentionally left to the `app/icon.png` and `app/apple-icon.png`
  // file conventions. Naming them here emits a bare href with no `sizes` or
  // `type`; the generated links carry both plus a content hash, so a replaced
  // icon actually reaches returning visitors.
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PinHub",
  },
  applicationName: siteName,
  category: "technology",
};

export const viewport: Viewport = {
  themeColor: "#090b0f",
  colorScheme: "dark",
  // Cover the full screen (under notches/home indicators) so the dark theme
  // extends edge-to-edge; safe-area insets are then applied in the layout.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const analyticsEnabled = Boolean(process.env.VERCEL);

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${audiowide.variable} ${chivoMono.variable}`}
    >
      <body>
        {children}
        <Footer />
        {analyticsEnabled ? <Analytics /> : null}
      </body>
    </html>
  );
}
