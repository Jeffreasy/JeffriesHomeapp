import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Inbox, LoaderCircle } from "lucide-react";
import type { ElementType, ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Surface } from "@/components/ui/Surface";
import { cn } from "@/lib/utils";

export type FeedbackTone = "empty" | "error" | "loading";

const defaults: Record<FeedbackTone, { icon: LucideIcon; iconClass: string }> = {
  empty: { icon: Inbox, iconClass: "text-[var(--color-text-subtle)]" },
  error: { icon: AlertTriangle, iconClass: "text-[var(--color-danger)]" },
  loading: { icon: LoaderCircle, iconClass: "animate-spin text-[var(--color-warning)] motion-reduce:animate-none" },
};

export interface FeedbackStateProps {
  tone?: FeedbackTone;
  title: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
  headingLevel?: 2 | 3 | 4;
}

export function FeedbackState({
  tone = "empty",
  title,
  description,
  icon,
  actionLabel,
  onAction,
  action,
  compact = false,
  className,
  headingLevel = 2,
}: FeedbackStateProps) {
  const Icon = icon ?? defaults[tone].icon;
  const Heading = ("h" + String(headingLevel)) as ElementType;

  return (
    <Surface
      tone={tone === "error" ? "danger" : "subtle"}
      padding="none"
      role={tone === "error" ? "alert" : "status"}
      aria-live={tone === "loading" ? "polite" : undefined}
      aria-busy={tone === "loading" || undefined}
      className={cn(
        "flex flex-col items-center justify-center px-5 text-center",
        compact ? "min-h-32 py-5" : "min-h-44 py-8",
        className,
      )}
    >
      <Icon size={22} className={defaults[tone].iconClass} aria-hidden="true" />
      <Heading className="mt-3 text-sm font-semibold text-[var(--color-text)]">
        {title}
      </Heading>
      {description ? (
        <p className="mt-1 max-w-sm text-xs leading-5 text-[var(--color-text-muted)]">
          {description}
        </p>
      ) : null}
      {action ?? (
        actionLabel && onAction ? (
          <Button className="mt-4" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        ) : null
      )}
    </Surface>
  );
}
