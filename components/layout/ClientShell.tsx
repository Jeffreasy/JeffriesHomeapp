"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { FocusModeAutoRedirect } from "@/components/layout/FocusModeControl";

const AUTH_ROUTE_PREFIXES = ["/sign-in", "/sign-up"];
const CHROMELESS_ROUTE_PREFIXES = ["/access-denied", "/focus", "/laventecare/documenten"];

function matchesRoutePrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/**
 * Owns application chrome, responsive navigation offsets and the single main
 * landmark. Route pages only own their content width and internal composition.
 */
export function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = AUTH_ROUTE_PREFIXES.some((prefix) => matchesRoutePrefix(pathname, prefix));
  const isChromelessPage = CHROMELESS_ROUTE_PREFIXES.some((prefix) =>
    matchesRoutePrefix(pathname, prefix),
  );

  if (isAuthPage || isChromelessPage) return <>{children}</>;

  return (
    <>
      <a href="#main" className="app-skip-link">
        Naar inhoud
      </a>
      <div className="app-shell flex w-full overflow-x-hidden bg-[var(--color-background)]">
        <FocusModeAutoRedirect />

        <Sidebar />

        <main
          id="main"
          tabIndex={-1}
          className="app-main app-content-container min-w-0 flex-1"
        >
          {children}
        </main>

        <BottomNav />
      </div>
    </>
  );
}
