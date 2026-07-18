import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { Tone } from "./DashboardUtils";
import { toneClasses } from "./DashboardUtils";
import { AppIcon } from "@/components/ui/AppIcon";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { FeedbackState } from "@/components/ui/FeedbackState";
import { surfaceVariants } from "@/components/ui/Surface";
import { SurfaceHeader as CoreSurfaceHeader } from "@/components/ui/SurfaceHeader";
import type { AppIconName } from "@/lib/symbols";
import { cn } from "@/lib/utils";

type IconSource = LucideIcon | AppIconName;

function RenderIcon({
  icon,
  size,
  className,
}: {
  icon: IconSource;
  size: number;
  className?: string;
}) {
  if (typeof icon === "string") {
    return <AppIcon name={icon} size={size <= 15 ? "sm" : "md"} iconClassName={className} />;
  }

  const Icon = icon;
  return <Icon size={size} className={className} aria-hidden="true" />;
}

export function SectionHeader({
  icon,
  label,
  title,
  href,
  actionLabel,
  compact,
}: {
  icon: IconSource;
  label: string;
  title: string;
  href?: string;
  actionLabel?: string;
  compact?: boolean;
}) {
  const action = href ? (
    <ButtonLink
      href={href}
      variant="ghost"
      size="sm"
      className="shrink-0 gap-1 text-[var(--color-primary-hover)]"
    >
      {actionLabel ?? "Open"}
      <ChevronRight size={14} aria-hidden="true" />
    </ButtonLink>
  ) : undefined;

  return (
    <CoreSurfaceHeader
      icon={<RenderIcon icon={icon} size={16} className="text-[var(--color-primary-hover)]" />}
      eyebrow={label}
      title={title}
      action={action}
      compact={compact}
    />
  );
}

export function RouteTile({
  href,
  icon,
  label,
  sub,
  tone,
}: {
  href: string;
  icon: IconSource;
  label: string;
  sub: string;
  tone: Tone;
}) {
  const classes = toneClasses[tone];

  return (
    <Link
      href={href}
      className={cn(
        surfaceVariants({ tone: "subtle", radius: "md", padding: "sm" }),
        "group flex min-h-[86px] items-center gap-3 transition-colors hover:bg-[var(--color-surface-hover)]",
      )}
    >
      <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border", classes.border, classes.surface)}>
        <RenderIcon icon={icon} size={18} className={classes.icon} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[var(--color-text)]">{label}</p>
        <p className="mt-1 truncate text-xs text-[var(--color-text-muted)]">{sub}</p>
      </div>
      <ChevronRight
        size={15}
        aria-hidden="true"
        className="shrink-0 text-[var(--color-text-subtle)] transition-colors group-hover:text-[var(--color-text)]"
      />
    </Link>
  );
}

export function StatusRow({
  icon,
  label,
  value,
  tone,
}: {
  icon: IconSource;
  label: string;
  value: string;
  tone: Tone;
}) {
  const classes = toneClasses[tone];

  return (
    <div className={cn(surfaceVariants({ tone: "subtle", radius: "md", padding: "sm" }), "flex items-center gap-3")}>
      <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", classes.surface)}>
        <RenderIcon icon={icon} size={15} className={classes.icon} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-[var(--color-text-muted)]">{label}</p>
        <p className="mt-0.5 truncate text-sm font-semibold text-[var(--color-text)]">{value}</p>
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, text }: { icon: IconSource; title: string; text: string }) {
  return (
    <div
      className={cn(
        surfaceVariants({ tone: "subtle", radius: "md", padding: "md" }),
        "flex min-h-[140px] flex-col items-center justify-center border-dashed text-center",
      )}
    >
      <RenderIcon icon={icon} size={22} className="text-[var(--color-text-subtle)]" />
      <p className="mt-3 text-sm font-semibold text-[var(--color-text)]">{title}</p>
      <p className="mt-1 max-w-sm text-xs leading-5 text-[var(--color-text-muted)]">{text}</p>
    </div>
  );
}

export function ErrorState({
  title = "Kon niet laden",
  text = "Er ging iets mis bij het ophalen van deze gegevens. Probeer het opnieuw.",
  onRetry,
}: {
  title?: string;
  text?: string;
  onRetry?: () => void;
}) {
  return (
    <FeedbackState
      tone="error"
      title={title}
      description={text}
      actionLabel={onRetry ? "Opnieuw proberen" : undefined}
      onAction={onRetry}
      compact
    />
  );
}
