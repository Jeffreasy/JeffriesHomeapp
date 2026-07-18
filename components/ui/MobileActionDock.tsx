import type { ComponentPropsWithRef } from "react";
import { cn } from "@/lib/utils";

export interface MobileActionDockProps
  extends Omit<ComponentPropsWithRef<"div">, "aria-label" | "role"> {
  label: string;
}

export function MobileActionDock({
  label,
  className,
  children,
  ...props
}: MobileActionDockProps) {
  return (
    <div
      {...props}
      role="region"
      aria-label={label}
      className={cn(
        "fixed inset-x-3 bottom-[calc(var(--app-bottom-nav-clearance)+0.75rem)] z-[var(--layer-action-dock)] flex min-h-[var(--touch-target)] items-center gap-2 rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface-elevated)] p-2 shadow-[var(--shadow-overlay)] backdrop-blur-xl md:absolute md:inset-x-auto md:bottom-auto md:right-0 md:top-full md:mt-2",
        className,
      )}
    >
      {children}
    </div>
  );
}
