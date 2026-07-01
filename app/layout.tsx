import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { ClientShell } from "@/components/layout/ClientShell";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  preload: true,
  variable: "--font-sans",
});

export const viewport = {
  themeColor: "#0a0a0f",
  // Let content extend into the notch/home-indicator zone so env(safe-area-inset-*)
  // resolves to real values in the standalone PWA (otherwise it's 0).
  viewportFit: "cover" as const,
};

export const metadata: Metadata = {
  title: "Jeffries Dashboard",
  description:
    "Persoonlijk dashboard: rooster, agenda, notities, habits, financiën, smart home en LaventeCare.",
  icons: {
    apple: "/icon-192x192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Jeffries",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className={inter.variable} suppressHydrationWarning>
      <body className="font-sans bg-background text-slate-100">
        {/* Skip-link (M8): first tab stop jumps keyboard/screen-reader users
            past the navigation straight to the page content. */}
        <a
          href="#main"
          className="visually-hidden focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[120] focus:rounded-lg focus:border focus:border-amber-500/30 focus:bg-[#12121a] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-amber-300"
        >
          Naar inhoud
        </a>
        <Providers>
          <ClientShell>{children}</ClientShell>
        </Providers>
      </body>
    </html>
  );
}
