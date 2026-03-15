"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";

const AUTH_ROUTES = ["/sign-in", "/sign-up"];

/**
 * Toont de sidebar layout alleen op app-routes.
 * Auth-pagina's (/sign-in, /sign-up) krijgen geen sidebar.
 */
export function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = AUTH_ROUTES.some((r) => pathname.startsWith(r));

  if (isAuthPage) return <>{children}</>;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 ml-16 md:ml-56">{children}</div>
    </div>
  );
}
