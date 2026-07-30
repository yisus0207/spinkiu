import type { Metadata, Viewport } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";
import AppInitializer from "@/components/AppInitializer";
import Navigation from "@/components/Navigation";
import Header from "@/components/Header";

const fontInter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

// Serif display de alto contraste para marca y títulos (look boutique/premium)
const fontDisplay = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Spinkiu - Facturación Acumulativa",
  description: "Plataforma premium para gestión de clientes y facturación acumulativa.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#020617",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${fontInter.variable} ${fontDisplay.variable} h-full antialiased dark`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col font-sans text-slate-100 antialiased selection:bg-blue-500/30 selection:text-white" suppressHydrationWarning>
        {/* Fondo ambiental cinematográfico detrás de toda la app */}
        <div className="ambient-bg" aria-hidden="true" />
        <AppInitializer>
          <div className="flex-1 flex flex-col md:flex-row">
            <Navigation />
            <main className="flex-1 min-w-0 md:pl-64 pb-20 md:pb-0 min-h-screen flex flex-col">
              <Header />
              <div className="flex-1 flex flex-col">
                {children}
              </div>
            </main>
          </div>
        </AppInitializer>
      </body>
    </html>
  );
}
