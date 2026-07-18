import type { LucideIcon } from "lucide-react";
import { Surface, type SurfaceProps } from "@/components/ui/Surface";
import { uiToneClasses, type UiTone } from "@/lib/ui/tones";
import { cn } from "@/lib/utils";

export interface MetricCardProps
  extends Omit<SurfaceProps, "children" | "tone"> {
  icon: LucideIcon;
  label: string;
  value: string | number;
  description?: string;
  tone?: UiTone;
  iconPosition?: "leading" | "trailing";
  appearance?: "neutral" | "tinted";
}

function MetricIcon({ icon: Icon, tone }: { icon: LucideIcon; tone: UiTone }) {
  const classes = uiToneClasses[tone];

  return (
    <span
      className={cn(
        "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border",
        classes.border,
        classes.surface,
      )}
    >
      <Icon size={18} className={classes.icon} aria-hidden="true" />
    </span>
  );
}

export function MetricCard({
  icon,
  label,
  value,
  description,
  tone = "neutral",
  iconPosition = "trailing",
  appearance = "tinted",
  radius = "sm",
  padding = "sm",
  className,
  ...surfaceProps
}: MetricCardProps) {
  const classes = uiToneClasses[tone];
  const surfaceTone = appearance === "neutral"
    ? "default"
    : tone === "neutral"
      ? "subtle"
      : tone;
  const metricIcon = <MetricIcon icon={icon} tone={tone} />;

  return (
    <Surface
      {...surfaceProps}
      tone={surfaceTone}
      radius={radius}
      padding={padding}
      className={cn("h-full", className)}
    >
      <div className="flex items-start gap-3">
        {iconPosition === "leading" ? metricIcon : null}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">
            {label}
          </p>
          <p className={cn("mt-1.5 truncate text-xl font-bold leading-tight sm:text-2xl", classes.text)}>
            {value}
          </p>
          {description ? (
            <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-[var(--color-text-muted)]">
              {description}
            </p>
          ) : null}
        </div>
        {iconPosition === "trailing" ? metricIcon : null}
      </div>
    </Surface>
  );
}
