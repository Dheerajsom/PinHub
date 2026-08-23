import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Saira_Condensed } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { siteDescription, siteName, siteUrl } from "@/lib/site";
import { Footer } from "@/components/Footer";
import Script from "next/script";
import "./globals.css";

// Three voices, one instrument.
//
// Saira Condensed is the silkscreen legend: condensed industrial caps, the
// register board names are actually printed in. It is used only for board
// names, the wordmark, section legends, and readout values — never for prose.
const sairaCondensed = Saira_Condensed({
  variable: "--font-display-face",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

// IBM Plex Sans is the body: drawn for engineering documentation, which is the
// exact register the warnings and descriptions are written in.
const plexSans = IBM_Plex_Sans({
  variable: "--font-sans-face",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

// IBM Plex Mono carries every number in the product — pin positions, counts,
// addresses — with tabular figures so a column of pin numbers actually columns.
const plexMono = IBM_Plex_Mono({
  variable: "--font-mono-face",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
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
  // file conventions, which emit sizes, type, and a content hash.
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PinHub",
  },
  applicationName: siteName,
  category: "technology",
};

export const viewport: Viewport = {
  // Matches --panel-recess in globals.css for each theme.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e4e6e3" },
    { media: "(prefers-color-scheme: dark)", color: "#131417" },
  ],
  colorScheme: "dark light",
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
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${plexSans.variable} ${plexMono.variable} ${sairaCondensed.variable}`}
    >
      <body>
        {/* Runs before paint so the panel never flashes the wrong finish. */}
        <Script id="pinhub-theme" strategy="beforeInteractive">
          {`try{var t=localStorage.getItem("pinhub.theme");if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t}catch(e){}`}
        </Script>
        {children}
        <Footer />
        {analyticsEnabled ? <Analytics /> : null}
      </body>
    </html>
  );
}
