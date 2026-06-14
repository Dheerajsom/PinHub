import type { Metadata, Viewport } from "next";
import { Audiowide, Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
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

export const metadata: Metadata = {
  title: "PinHub",
  description:
    "A searchable pinout catalog for SBCs, microcontrollers, and embedded development boards.",
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PinHub",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0c0f",
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
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${audiowide.variable}`}
    >
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
