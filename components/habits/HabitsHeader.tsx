"use client";

import { AppPageHeader } from "@/components/layout/AppPageShell";
import { AppIcon } from "@/components/ui/AppIcon";
import { cn } from "@/lib/utils";

interface HabitsHeaderProps {
  privacyOn: boolean;
  isPrivacyUnknown: boolean;
  togglePrivacy: () => void;
  setShowForm: (show: boolean) => void;
}

export function HabitsHeader({
  privacyOn,
  isPrivacyUnknown,
  togglePrivacy,
  setShowForm,
}: HabitsHeaderProps) {
  return (
    <AppPageHeader
      className="!flex-row !items-start !justify-between gap-3"
      leading={<AppIcon name="habit" tone="amber" size="md" framed active />}
      eyebrow="Zelfregie"
      title="Habits"
      description="Dagelijkse routines, herstel en langetermijnvoortgang."
      actions={
        <>
          <button
            type="button"
            onClick={togglePrivacy}
            disabled={isPrivacyUnknown}
            title={isPrivacyUnknown ? "Privacyvoorkeur wordt veilig geladen" : privacyOn ? "Habits tonen" : "Habits verbergen"}
            aria-label={isPrivacyUnknown ? "Privacyvoorkeur wordt geladen" : privacyOn ? "Habits tonen" : "Habits verbergen"}
            aria-pressed={privacyOn}
            aria-busy={isPrivacyUnknown}
            className={cn(
              "inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70 disabled:cursor-wait disabled:opacity-60",
              privacyOn
                ? "border-indigo-500/30 bg-indigo-500/15 text-indigo-200"
                : "border-[var(--color-border)] bg-[var(--color-surface)] text-slate-300 hover:bg-[var(--color-surface-hover)]",
            )}
          >
            <AppIcon
              name={isPrivacyUnknown ? "activity" : privacyOn ? "hide" : "show"}
              tone={isPrivacyUnknown ? "slate" : privacyOn ? "indigo" : "slate"}
              size="sm"
            />
            <span className="hidden sm:inline">
              {isPrivacyUnknown ? "Laden" : privacyOn ? "Verborgen" : "Zichtbaar"}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            aria-label="Nieuwe habit toevoegen"
            title="Nieuwe habit toevoegen"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/15 px-3 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70"
          >
            <AppIcon name="add" tone="amber" size="sm" />
            <span>Nieuw</span>
          </button>
        </>
      }
    />
  );
}
