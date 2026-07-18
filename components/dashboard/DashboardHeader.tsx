"use client";

import { Eye, EyeOff, Home, Power } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";

interface DashboardHeaderProps {
  greeting: string;
  today: string;
  privacyOn: boolean;
  isPrivacyUnknown: boolean;
  togglePrivacy: () => void;
  allOn: boolean;
  onlineDevicesCount: number;
  lightingPending: boolean;
  toggleAll: () => void;
}

export function DashboardHeader({
  greeting,
  today,
  privacyOn,
  isPrivacyUnknown,
  togglePrivacy,
  allOn,
  onlineDevicesCount,
  lightingPending,
  toggleAll,
}: DashboardHeaderProps) {
  const allLightsLabel = allOn ? "Alle online lampen uitzetten" : "Alle online lampen aanzetten";

  return (
    <header className="app-topbar sticky top-0 z-[var(--layer-sticky)] border-b border-[var(--color-border)] bg-[var(--color-background)]/92 backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-3 py-2 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-2.5">
          <div
            className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--color-primary-border)] bg-[var(--color-primary-subtle)] text-[var(--color-primary-hover)] min-[430px]:flex"
            aria-hidden="true"
          >
            <Home size={17} />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold text-[var(--color-text)] sm:text-lg">{greeting}</h1>
            <p className="truncate text-xs capitalize text-[var(--color-text-muted)]">{today}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <IconButton
            onClick={togglePrivacy}
            label={isPrivacyUnknown ? "Privacyvoorkeur wordt geladen" : privacyOn ? "Privacy mode uitzetten" : "Privacy mode aanzetten"}
            icon={privacyOn ? <EyeOff size={17} /> : <Eye size={17} />}
            variant="secondary"
            loading={isPrivacyUnknown}
            disabled={isPrivacyUnknown}
            aria-busy={isPrivacyUnknown}
            aria-pressed={privacyOn}
          />

          <Button
            onClick={toggleAll}
            disabled={onlineDevicesCount === 0}
            loading={lightingPending}
            loadingLabel="Bezig"
            variant={allOn ? "warning" : "secondary"}
            aria-label={allLightsLabel}
            title={allLightsLabel}
            size="sm"
          >
            <Power size={16} aria-hidden="true" />
            <span>{allOn ? "Alles uit" : "Alles aan"}</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
