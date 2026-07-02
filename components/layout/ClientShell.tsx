"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { FocusModeAutoRedirect } from "@/components/layout/FocusModeControl";

const AUTH_ROUTES = ["/sign-in", "/sign-up"];
// /laventecare/documenten/[documentKey] is an immersive document/PDF viewer with
// its own back-link — render it shell-free so the bottom nav doesn't overlap it.
const CHROMELESS_ROUTES = ["/focus", "/laventecare/documenten"];

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

      {/* Main content — min-w-0 prevents flex overflow bug on mobile.
          id="main" is the skip-link target from app/layout.tsx (M8). */}
      <div id="main" className="flex-1 min-w-0 pb-28 md:ml-64 md:pb-0">
        {children}
      </div>

      {/* Mobile bottom nav — hidden on desktop */}
      <BottomNav />
    </div>
  );
}
