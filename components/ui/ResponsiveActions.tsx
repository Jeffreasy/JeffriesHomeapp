"use client";

import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { IconButton } from "@/components/ui/IconButton";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";

export interface ResponsiveActionsProps {
  primary?: ReactNode;
  secondary?: ReactNode;
  menuLabel?: string;
  className?: string;
}

export function ResponsiveActions({
  primary,
  secondary,
  menuLabel = "Meer acties",
  className,
}: ResponsiveActionsProps) {
  const [open, setOpen] = useState(false);

  const isDesktop = useMediaQuery("(min-width: 640px)");

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 640px)");
    const closeOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setOpen(false);
    };

    mediaQuery.addEventListener("change", closeOnDesktop);
    return () => mediaQuery.removeEventListener("change", closeOnDesktop);
  }, []);

  const closeAfterAction = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("button, a")) setOpen(false);
  };

  return (
    <>
      <div className={cn("flex min-w-0 items-center gap-2", className)}>
        {primary}
        {secondary ? (
          <div className="hidden items-center gap-2 sm:flex">{open ? null : secondary}</div>
        ) : null}
        {secondary ? (
          <IconButton
            icon={<MoreHorizontal size={18} />}
            label={menuLabel}
            onClick={() => setOpen(true)}
            className="sm:hidden"
          />
        ) : null}
      </div>
      <BottomSheet open={open && !isDesktop} onClose={() => setOpen(false)} title={menuLabel}>
        <div className="grid gap-2 p-4" onClick={closeAfterAction}>
          {open ? secondary : null}
        </div>
      </BottomSheet>
    </>
  );
}
