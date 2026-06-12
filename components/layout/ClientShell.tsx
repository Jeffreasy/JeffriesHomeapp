"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { FocusModeAutoRedirect } from "@/components/layout/FocusModeControl";

const AUTH_ROUTES = ["/sign-in", "/sign-up"];
const CHROMELESS_ROUTES = ["/focus"];

/**
 * ClientShell — layout wrapper.
 * - Auth pages: no chrome.
 * - Desktop (md+): left cockpit sidebar.
 * - Mobile (< md): bottom navigation with a More sheet.
 *   The main content gets bottom padding to clear the nav bar.
 */
export function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = AUTH_ROUTES.some((r) => pathname.startsWith(r));
  const isChromelessPage = CHROMELESS_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`));

  if (isAuthPage || isChromelessPage) return <>{children}</>;

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden bg-[var(--color-background)]">
      <FocusModeAutoRedirect />

      {/* Desktop sidebar — hidden on mobile */}
      <Sidebar />

      {/* Main content — min-w-0 prevents flex overflow bug on mobile */}
      <div className="flex-1 min-w-0 pb-28 md:ml-64 md:pb-0">
        {children}
      </div>

      {/* Mobile bottom nav — hidden on desktop */}
      <BottomNav />
    </div>
  );
}
