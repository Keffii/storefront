import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk, Jost } from "next/font/google";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { CartProvider } from "@/components/cart/CartProvider";
import { CookieBanner } from "@/components/consent/CookieBanner";
import { DemoBar } from "@/components/layout/DemoBar";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { ToastProvider } from "@/components/ui/Toast";
import { site } from "@/data/products";
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
  title: {
    default: `${site.brandName} · ${site.tagline}`,
    template: `%s · ${site.brandName}`,
  },
  description: `${site.tagline} En portfoliobutik: inga riktiga produkter eller betalningar.`,
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="sv" className={`${hanken.variable} ${jost.variable}`}>
      <body>
        <a href="#main" className="skip-link">
          Hoppa till innehållet
        </a>
        <ToastProvider>
          <CartProvider>
            <DemoBar />
            <Header />
            <main id="main">{children}</main>
            <Footer />
            <CartDrawer />
            <CookieBanner />
          </CartProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
