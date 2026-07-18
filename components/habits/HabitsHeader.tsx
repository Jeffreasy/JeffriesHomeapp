"use client";

import { AppPageHeader } from "@/components/layout/AppPageShell";
import { AppIcon } from "@/components/ui/AppIcon";
import { Button } from "@/components/ui/Button";
import { ResponsiveActions } from "@/components/ui/ResponsiveActions";

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
      leading={<AppIcon name="habit" tone="accent" size="lg" framed active />}
      eyebrow="Zelfregie"
      title="Habits"
      description="Dagelijkse routines, herstel en langetermijnvoortgang."
      actions={
        <ResponsiveActions
          menuLabel="Habitacties"
          primary={
            <Button
              onClick={() => setShowForm(true)}
              aria-label="Nieuwe habit toevoegen"
              title="Nieuwe habit toevoegen"
              variant="primary"
            >
              <AppIcon name="add" tone="accent" size="sm" iconClassName="text-current" />
              <span>Nieuw</span>
            </Button>
          }
          secondary={
            <Button
              onClick={togglePrivacy}
              loading={isPrivacyUnknown}
              disabled={isPrivacyUnknown}
              aria-busy={isPrivacyUnknown || undefined}
              loadingLabel="Laden"
              title={isPrivacyUnknown ? "Privacyvoorkeur wordt veilig geladen" : privacyOn ? "Habits tonen" : "Habits verbergen"}
              aria-label={isPrivacyUnknown ? "Privacyvoorkeur wordt geladen" : privacyOn ? "Habits tonen" : "Habits verbergen"}
              aria-pressed={privacyOn}
              variant={privacyOn ? "warning" : "secondary"}
              className="w-full justify-start sm:w-auto sm:justify-center"
            >
              <AppIcon
                name={privacyOn ? "hide" : "show"}
                tone={privacyOn ? "warning" : "neutral"}
                size="sm"
              />
              <span>{privacyOn ? "Verborgen" : "Zichtbaar"}</span>
            </Button>
          }
        />
      }
    />
  );
}
