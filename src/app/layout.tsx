import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk, Jost } from "next/font/google";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { CartProvider } from "@/components/cart/CartProvider";
import { CookieBanner } from "@/components/consent/CookieBanner";
import { DemoBar } from "@/components/layout/DemoBar";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { ToastProvider } from "@/components/ui/Toast";
import { InventoryProvider } from "@/components/inventory/InventoryProvider";
import { site } from "@/data/products";
import { getStockMap } from "@/lib/server/inventory";
import { siteUrl } from "@/lib/site-url";
import "./globals.css";

// Free stand-ins for the reference's commercial faces:
// Hanken Grotesk for SangBleu Sans (text and display), Jost for Gill Sans (captions).
const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  display: "swap",
});

const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
  weight: ["400", "500"],
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
  const stock = await getStockMap();
  return (
    <html lang="sv" className={`${hanken.variable} ${jost.variable}`}>
      <body>
        <a href="#main" className="skip-link">
          Hoppa till innehållet
        </a>
        <ToastProvider>
          <InventoryProvider stock={stock}>
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
