import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Inbox, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Surface } from "@/components/ui/Surface";
import { cn } from "@/lib/utils";

type FeedbackTone = "empty" | "error" | "loading";

const defaults: Record<FeedbackTone, { icon: LucideIcon; iconClass: string }> = {
  empty: { icon: Inbox, iconClass: "text-[var(--color-text-subtle)]" },
  error: { icon: AlertTriangle, iconClass: "text-rose-300" },
  loading: { icon: LoaderCircle, iconClass: "animate-spin text-amber-300" },
};

export function FeedbackState({
  tone = "empty",
  title,
  description,
  icon,
  actionLabel,
  onAction,
  compact = false,
}: {
  tone?: FeedbackTone;
  title: string;
  description: string;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}) {
  const Icon = icon ?? defaults[tone].icon;

  return (
    <Surface
      tone={tone === "error" ? "danger" : "subtle"}
      padding="none"
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex flex-col items-center justify-center px-5 text-center",
        compact ? "min-h-32 py-5" : "min-h-44 py-8",
      )}
    >
      <Icon size={22} className={defaults[tone].iconClass} aria-hidden="true" />
      <h2 className="mt-3 text-sm font-semibold text-[var(--color-text)]">{title}</h2>
      <p className="mt-1 max-w-sm text-xs leading-5 text-[var(--color-text-muted)]">
        {description}
      </p>
      {actionLabel && onAction ? (
        <Button className="mt-4" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </Surface>
  );
}
