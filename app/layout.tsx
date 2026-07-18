import type { Metadata } from "next";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-400-italic.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-700.css";
import "@fontsource/inter/latin-800.css";
import "@fontsource/inter/latin-900.css";
import "./globals.css";
import { Providers } from "./providers";
import { ClientShell } from "@/components/layout/ClientShell";

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
    <html lang="nl" suppressHydrationWarning>
      <body className="min-h-dvh bg-background font-sans text-[var(--color-text)] antialiased">
        <Providers>
          <ClientShell>{children}</ClientShell>
        </Providers>
        <div id="app-toast-root" data-app-toast-root="" />
        <div id="app-overlay-root" data-overlay-root="" />
      </body>
    </html>
  );
}
