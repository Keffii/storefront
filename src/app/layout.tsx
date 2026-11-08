import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { CartProvider } from "@/components/cart/CartProvider";
import { CookieBanner } from "@/components/consent/CookieBanner";
import { DemoBar } from "@/components/layout/DemoBar";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { ToastProvider } from "@/components/ui/Toast";
import { InventoryProvider } from "@/components/inventory/InventoryProvider";
import { site } from "@/data/products";
import { getCatalogWithStock } from "@/lib/server/catalog";
import { siteUrl } from "@/lib/site-url";
import "./globals.css";

// Free stand-ins for the reference's commercial faces: Hanken Grotesk for
// SangBleu Sans (text and display), Jost for Gill Sans (captions). Self-hosted
// from the @fontsource-variable packages, so the build never depends on
// downloading from Google Fonts. The latin subset covers å, ä and ö.
const hanken = localFont({
  src: "../../node_modules/@fontsource-variable/hanken-grotesk/files/hanken-grotesk-latin-wght-normal.woff2",
  variable: "--font-hanken",
  weight: "100 900",
  display: "swap",
});

const jost = localFont({
  src: "../../node_modules/@fontsource-variable/jost/files/jost-latin-wght-normal.woff2",
  variable: "--font-jost",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${site.brandName} · ${site.tagline}`,
    template: `%s · ${site.brandName}`,
  },
  description: `${site.tagline} En portfoliobutik: inga riktiga produkter eller betalningar.`,
  openGraph: { type: "website", locale: "sv_SE", siteName: site.brandName },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const catalog = await getCatalogWithStock();
  return (
    <html lang="sv" className={`${hanken.variable} ${jost.variable}`}>
      <body>
        <a href="#main" className="skip-link">
          Hoppa till innehållet
        </a>
        <ToastProvider>
          <InventoryProvider products={catalog}>
          <CartProvider>
            <DemoBar />
            <Header />
            <main id="main">{children}</main>
            <Footer />
            <CartDrawer />
            <CookieBanner />
          </CartProvider>
          </InventoryProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
