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

export const metadata: Metadata = {
  title: "Homeapp — Smart Home Control",
  description: "Control your WiZ smart lights from anywhere on your local network.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className={inter.variable} suppressHydrationWarning>
      <body className="font-sans bg-background text-slate-100">
        <Providers>
          <ClientShell>{children}</ClientShell>
        </Providers>
      </body>
    </html>
  );
}
