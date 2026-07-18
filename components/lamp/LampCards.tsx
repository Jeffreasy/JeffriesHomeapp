import {
  AlertTriangle,
  ArrowRight,
  Lightbulb,
  Search,
  type LucideIcon,
} from "lucide-react";
import type { FilterMode } from "./LampUtils";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { FeedbackState } from "@/components/ui/FeedbackState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Surface } from "@/components/ui/Surface";
import { SurfaceHeader as CoreSurfaceHeader } from "@/components/ui/SurfaceHeader";

export function SectionHeader({
  icon: Icon,
  label,
  title,
  sub,
}: {
  icon: LucideIcon;
  label: string;
  title: string;
  sub?: string;
}) {
  return (
    <CoreSurfaceHeader
      icon={<Icon size={16} className="text-[var(--color-primary-hover)]" />}
      eyebrow={label}
      title={title}
      meta={sub}
    />
  );
}

export function WarningPanel({ title, text }: { title: string; text: string }) {
  return (
    <Surface tone="danger" className="flex items-start gap-3">
      <AlertTriangle
        size={18}
        className="mt-0.5 shrink-0 text-[var(--color-danger)]"
        aria-hidden="true"
      />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[var(--color-danger)]">{title}</p>
        <p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">{text}</p>
      </div>
    </Surface>
  );
}

export function LoadingGrid() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} className="h-28 rounded-2xl" />
      ))}
    </div>
  );
}

export function EmptyDevices() {
  return (
    <FeedbackState
      icon={Lightbulb}
      title="Geen lampen gevonden"
      description="Registreer je eerste WiZ-lamp via instellingen om de bedienpagina te vullen."
      action={
        <ButtonLink href="/settings" variant="primary" className="mt-5">
          Instellingen openen
          <ArrowRight size={15} aria-hidden="true" />
        </ButtonLink>
      }
      className="min-h-[320px]"
    />
  );
}

export function NoResults({
  search,
  filter,
  onReset,
}: {
  search: string;
  filter: FilterMode;
  onReset: () => void;
}) {
  const hasFilter = search.trim().length > 0 || filter !== "all";

  return (
    <FeedbackState
      icon={Search}
      title="Geen lampen in deze selectie"
      description={
        hasFilter
          ? "Pas je zoekterm of statusfilter aan om meer lampen te zien."
          : "Er zijn geen lampen die voldoen aan deze weergave."
      }
      action={
        <Button className="mt-5" onClick={onReset}>
          Filters resetten
        </Button>
      }
      className="min-h-[280px]"
    />
  );
}
