import type { LucideIcon } from "lucide-react";
import {
  BriefcaseBusiness,
  Calendar,
  CalendarClock,
  Home,
  Landmark,
  Lightbulb,
  LogIn,
  MoreHorizontal,
  Radar,
  Settings,
  StickyNote,
  Target,
  Users,
  Zap,
} from "lucide-react";
import { uiToneClasses, type UiTone } from "@/lib/ui/tones";
import { cn } from "@/lib/utils";

const NAVIGATION_ICONS = {
  agenda: CalendarClock,
  automations: Zap,
  business: BriefcaseBusiness,
  finance: Landmark,
  habit: Target,
  home: Home,
  lights: Lightbulb,
  login: LogIn,
  more: MoreHorizontal,
  notes: StickyNote,
  radar: Radar,
  relations: Users,
  roster: Calendar,
  settings: Settings,
} as const satisfies Record<string, LucideIcon>;

export type NavigationIconName = keyof typeof NAVIGATION_ICONS;

type NavigationIconSize = "xs" | "sm" | "md" | "lg";

const iconSizes: Record<NavigationIconSize, number> = {
  xs: 12,
  sm: 15,
  md: 18,
  lg: 21,
};

const frameSizes: Record<NavigationIconSize, string> = {
  xs: "h-6 w-6 rounded-md",
  sm: "h-8 w-8 rounded-lg",
  md: "h-10 w-10 rounded-lg",
  lg: "h-11 w-11 rounded-xl",
};

export interface NavigationIconProps {
  name: NavigationIconName;
  tone?: UiTone;
  size?: NavigationIconSize;
  framed?: boolean;
  active?: boolean;
  label?: string;
  className?: string;
  iconClassName?: string;
}

export function NavigationIcon({
  name,
  tone = "neutral",
  size = "md",
  framed = false,
  active = false,
  label,
  className,
  iconClassName,
}: NavigationIconProps) {
  const Icon = NAVIGATION_ICONS[name];
  const toneClasses = uiToneClasses[tone];
  const icon = (
    <Icon
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
      focusable="false"
      size={iconSizes[size]}
      className={cn("shrink-0", framed ? undefined : toneClasses.icon, iconClassName)}
    />
  );

  if (!framed) return icon;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center border",
        frameSizes[size],
        toneClasses.border,
        toneClasses.surface,
        active ? toneClasses.text : toneClasses.icon,
        active && "shadow-[var(--shadow-surface)] ring-1 ring-inset ring-current/20",
        className,
      )}
    >
      {icon}
    </span>
  );
}
