import type { Metadata, Viewport } from "next";
import { Inter, Manrope, JetBrains_Mono } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";
import AppChrome from "@/components/app-chrome";
import GalaxyBackground from "@/components/galaxy-background";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL("https://z9earthscope.app"),
  title: {
    default: "Z9 EarthScope — Discover What Is Changing on Our Planet",
    template: "%s · Z9 EarthScope",
  },
  description:
    "Z9 EarthScope helps users investigate seven NASA POWER environmental variables, visualize historical changes by location, and test trend direction, magnitude and statistical significance. Built for the NASA Space Apps Challenge 2026.",
  keywords: [
    "NASA POWER", "Earth observation", "climate trends", "Mann-Kendall", "Sen's slope",
    "environmental monitoring", "time series analysis", "NASA Space Apps 2026",
  ],
  openGraph: {
    title: "Z9 EarthScope — Discover What Is Changing on Our Planet",
    description: "Detect statistically supported environmental trends from real NASA data.",
    type: "website",
    siteName: "Z9 EarthScope",
  },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#071426",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${manrope.variable} ${jetbrains.variable}`}>
      <body className="bg-abyss text-ice antialiased">
        <GalaxyBackground />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-cyan focus:px-4 focus:py-2 focus:text-[#03211d] focus:font-semibold"
        >
          Skip to main content
        </a>
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}
