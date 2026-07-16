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

export const metadata: Metadata = {
  title: "Shelf Life — Weekly Meal Plan",
  description:
    "High-protein lunches and dinners for two. Cooked Sunday, still good Thursday — with a Saturday shopping list, a Sunday prep plan, and a weekly cost breakdown in CAD.",
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
