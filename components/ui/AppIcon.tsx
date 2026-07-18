import { uiToneClasses, type UiTone } from "@/lib/ui/tones";
import { APP_ICONS, type AppIconName } from "@/lib/symbols";
import { cn } from "@/lib/utils";

export type AppIconTone = UiTone;
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

function resolveToneClasses(tone: AppIconTone) {
  const classes = uiToneClasses[tone];
  return {
    icon: classes.icon,
    frame: cn(classes.border, classes.surface, classes.icon),
    activeFrame: cn(
      classes.border,
      classes.surface,
      classes.text,
      "shadow-[var(--shadow-surface)] ring-1 ring-inset ring-current/20",
    ),
  };
}

export function AppIcon({
  name,
  tone = "neutral",
  size = "md",
  framed = false,
  active = false,
  className,
  iconClassName,
  "aria-hidden": ariaHidden = true,
}: {
  name: AppIconName;
  tone?: AppIconTone;
  size?: SymbolSize;
  framed?: boolean;
  active?: boolean;
  className?: string;
  iconClassName?: string;
  "aria-hidden"?: boolean;
}) {
  const Icon = APP_ICONS[name];
  const toneClass = resolveToneClasses(tone);
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
