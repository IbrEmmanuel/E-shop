import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import Script from "next/script";
import { ThemeProvider, themeInitScript } from "@/components/theme-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "E-Shop — Phones, Inverters, Batteries & Fashion",
    template: "%s · E-Shop",
  },
  description:
    "Buy phones, solar inverters, lithium batteries, headphones, smart watches, amplifiers, and unisex fashion. Live inventory, bank-transfer checkout, and monthly shop rentals.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  ),
  applicationName: "E-Shop",
  keywords: [
    "online shop Nigeria",
    "buy phones",
    "solar inverter",
    "lithium battery",
    "headphones",
    "smart watch",
    "unisex fashion",
    "amplifiers",
    "E-Shop marketplace",
  ],
  openGraph: {
    siteName: "E-Shop",
    type: "website",
    title: "E-Shop — Phones, Inverters, Batteries & Fashion",
    description:
      "Curated multi-vendor marketplace with live catalog, search, and secure bank-transfer checkout.",
  },
  twitter: {
    card: "summary_large_image",
    title: "E-Shop Marketplace",
    description:
      "Shop phones, power gear, audio, watches, and fashion — search by name for images and prices.",
  },
  appleWebApp: {
    capable: true,
    title: "E-Shop",
    statusBarStyle: "default",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable} light`}
      data-theme="light"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className="flex min-h-dvh flex-col bg-[var(--color-bg)] text-[var(--color-text)]">
        <Script
          id="eshop-theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
