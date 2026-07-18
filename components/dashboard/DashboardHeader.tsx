"use client";

import { Eye, EyeOff, Home, Loader2, Power } from "lucide-react";
import { cn } from "@/lib/utils";

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
    <header className="app-topbar sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-background)]/92 backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-3 py-2 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-2.5">
          <div
            className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-300 min-[430px]:flex"
            aria-hidden="true"
          >
            <Home size={17} />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold text-white sm:text-lg">{greeting}</h1>
            <p className="truncate text-xs capitalize text-[var(--color-text-muted)]">{today}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={togglePrivacy}
            disabled={isPrivacyUnknown}
            aria-label={isPrivacyUnknown ? "Privacyvoorkeur wordt geladen" : privacyOn ? "Privacy mode uitzetten" : "Privacy mode aanzetten"}
            aria-pressed={privacyOn}
            aria-busy={isPrivacyUnknown}
            title={isPrivacyUnknown ? "Privacyvoorkeur wordt veilig geladen" : privacyOn ? "Privacy mode uitzetten" : "Privacy mode aanzetten"}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-slate-400 transition-colors hover:bg-[var(--color-surface-hover)] hover:text-slate-200 disabled:cursor-wait disabled:opacity-60"
          >
            {isPrivacyUnknown ? <Loader2 size={17} className="animate-spin" aria-hidden="true" /> : privacyOn ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
          </button>

          <button
            type="button"
            onClick={toggleAll}
            disabled={onlineDevicesCount === 0 || lightingPending}
            aria-label={allLightsLabel}
            aria-busy={lightingPending}
            title={allLightsLabel}
            className={cn(
              "inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-semibold transition-colors",
              allOn
                ? "border-amber-500/30 bg-amber-500/15 text-amber-200 hover:bg-amber-500/20"
                : "border-[var(--color-border)] bg-[var(--color-surface)] text-slate-300 hover:bg-[var(--color-surface-hover)]",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            {lightingPending ? (
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            ) : (
              <Power size={16} aria-hidden="true" />
            )}
            <span>{lightingPending ? "Bezig" : allOn ? "Alles uit" : "Alles aan"}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
