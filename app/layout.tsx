import type { Metadata } from "next";
import { Karla, Playfair_Display } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

const karla = Karla({
  variable: "--font-karla",
  subsets: ["latin"],
  display: "swap",
});

const title = "Shelf Life — Weekly Meal Plan";
const description =
  "High-protein lunches and dinners for two. Cooked Sunday, still good Thursday — with a Saturday shopping list, a Sunday prep plan, and a weekly cost breakdown in CAD.";

// Same switch as next.config.ts. Metadata icon paths are NOT basePath-aware
// — verified by building with GITHUB_PAGES=true and diffing the emitted
// <link rel="icon">, which came out as plain "/icon.png" either way. Left
// alone, that 404s in production, where the file actually lives under
// "/ShelfLife/icon.png". og:image/twitter:image don't need this: those go
// through metadataBase instead (see below), which does resolve correctly.
const basePath = process.env.GITHUB_PAGES === "true" ? "/ShelfLife" : "";

export const metadata: Metadata = {
  // Needed so og:image/twitter:image resolve to absolute URLs — link-preview
  // crawlers won't follow a relative one. Those two are given without a
  // leading slash on purpose: resolved against a base ending in
  // "/ShelfLife/", a leading slash would drop that path segment and point
  // at the repo root instead.
  metadataBase: new URL("https://finnwilsondevane.github.io/ShelfLife/"),
  title,
  description,
  icons: {
    icon: `${basePath}/icon.png`,
    apple: `${basePath}/apple-touch-icon.png`,
  },
  openGraph: {
    title,
    description,
    siteName: "Shelf Life",
    type: "website",
    locale: "en_CA",
    images: [{ url: "og-image.png", width: 1200, height: 630, alt: title }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${karla.variable} h-full antialiased`}
    >
      <body className="grain min-h-full flex flex-col">{children}</body>
    </html>
  );
}
