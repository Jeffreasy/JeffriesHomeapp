import type { ButtonHTMLAttributes, ReactNode } from "react";
import { APP_ICONS, type AppIconName } from "@/lib/symbols";
import { cn } from "@/lib/utils";

export type SymbolTone =
  | "slate"
  | "amber"
  | "blue"
  | "cyan"
  | "emerald"
  | "green"
  | "indigo"
  | "red"
  | "rose"
  | "violet"
  | "yellow";

type SymbolSize = "xs" | "sm" | "md" | "lg" | "xl";

const iconSizes: Record<SymbolSize, number> = {
  xs: 12,
  sm: 15,
  md: 18,
  lg: 21,
  xl: 24,
};

const frameSizes: Record<SymbolSize, string> = {
  xs: "h-6 w-6 rounded-md",
  sm: "h-8 w-8 rounded-lg",
  md: "h-10 w-10 rounded-lg",
  lg: "h-11 w-11 rounded-xl",
  xl: "h-12 w-12 rounded-xl",
};

const toneClasses: Record<SymbolTone, { icon: string; frame: string; activeFrame: string }> = {
  slate: {
    icon: "text-slate-400",
    frame: "border-[var(--color-border)] bg-[var(--color-surface-hover)] text-slate-500",
    activeFrame: "border-slate-400/25 bg-slate-400/10 text-slate-200",
  },
  amber: {
    icon: "text-amber-300",
    frame: "border-amber-500/20 bg-amber-500/10 text-amber-300",
    activeFrame: "border-amber-500/30 bg-amber-500/15 text-amber-200",
  },
  blue: {
    icon: "text-blue-300",
    frame: "border-blue-500/20 bg-blue-500/10 text-blue-300",
    activeFrame: "border-blue-500/30 bg-blue-500/15 text-blue-200",
  },
  cyan: {
    icon: "text-cyan-300",
    frame: "border-cyan-500/20 bg-cyan-500/10 text-cyan-300",
    activeFrame: "border-cyan-500/30 bg-cyan-500/15 text-cyan-200",
  },
  emerald: {
    icon: "text-emerald-300",
    frame: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
    activeFrame: "border-emerald-500/30 bg-emerald-500/15 text-emerald-200",
  },
  green: {
    icon: "text-green-300",
    frame: "border-green-500/20 bg-green-500/10 text-green-300",
    activeFrame: "border-green-500/30 bg-green-500/15 text-green-200",
  },
  indigo: {
    icon: "text-indigo-300",
    frame: "border-indigo-500/20 bg-indigo-500/10 text-indigo-300",
    activeFrame: "border-indigo-500/30 bg-indigo-500/15 text-indigo-200",
  },
  red: {
    icon: "text-red-300",
    frame: "border-red-500/20 bg-red-500/10 text-red-300",
    activeFrame: "border-red-500/30 bg-red-500/15 text-red-200",
  },
  rose: {
    icon: "text-rose-300",
    frame: "border-rose-500/20 bg-rose-500/10 text-rose-300",
    activeFrame: "border-rose-500/30 bg-rose-500/15 text-rose-200",
  },
  violet: {
    icon: "text-violet-300",
    frame: "border-violet-500/20 bg-violet-500/10 text-violet-300",
    activeFrame: "border-violet-500/30 bg-violet-500/15 text-violet-200",
  },
  yellow: {
    icon: "text-yellow-300",
    frame: "border-yellow-500/20 bg-yellow-500/10 text-yellow-300",
    activeFrame: "border-yellow-500/30 bg-yellow-500/15 text-yellow-200",
  },
};

export function AppIcon({
  name,
  tone = "slate",
  size = "md",
  framed = false,
  active = false,
  className,
  iconClassName,
  "aria-hidden": ariaHidden = true,
}: {
  name: AppIconName;
  tone?: SymbolTone;
  size?: SymbolSize;
  framed?: boolean;
  active?: boolean;
  className?: string;
  iconClassName?: string;
  "aria-hidden"?: boolean;
}) {
  const Icon = APP_ICONS[name];
  const toneClass = toneClasses[tone];
  const icon = (
    <Icon
      aria-hidden={ariaHidden}
      size={iconSizes[size]}
      className={cn("shrink-0", framed ? undefined : toneClass.icon, iconClassName)}
    />
  );

  if (!framed) return icon;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center border",
        frameSizes[size],
        active ? toneClass.activeFrame : toneClass.frame,
        className,
      )}
    >
      {icon}
    </span>
  );
}

export function IconButton({
  icon,
  label,
  tone = "slate",
  active = false,
  className,
  iconClassName,
  children,
  title,
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  icon: AppIconName;
  label: string;
  tone?: SymbolTone;
  active?: boolean;
  iconClassName?: string;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={title ?? label}
      className={cn(
        "inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold transition-colors",
        active
          ? toneClasses[tone].activeFrame
          : "border-[var(--color-border)] bg-[var(--color-surface)] text-slate-400 hover:bg-[var(--color-surface-hover)] hover:text-slate-200",
        className,
      )}
      {...props}
    >
      <AppIcon name={icon} tone={tone} size="sm" iconClassName={iconClassName} />
      {children}
    </button>
  );
}
