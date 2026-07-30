import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import AppInitializer from "@/components/AppInitializer";
import Navigation from "@/components/Navigation";
import Header from "@/components/Header";

const fontOutfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
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
  themeColor: "#09090b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${fontOutfit.variable} h-full antialiased dark`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-zinc-950 font-sans text-zinc-100 antialiased selection:bg-blue-600/30" suppressHydrationWarning>
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
