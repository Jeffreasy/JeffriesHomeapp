"use client";

import { BookOpenText, List } from "lucide-react";
import {
  AppPageHeader,
  PageToolbar,
} from "@/components/layout/AppPageShell";
import { AppIcon } from "@/components/ui/AppIcon";
import { Button } from "@/components/ui/Button";
import { ResponsiveActions } from "@/components/ui/ResponsiveActions";
import { Tabs, type TabItem } from "@/components/ui/Tabs";

export type NotesTab = "journal" | "collection";

const NOTES_TABS: ReadonlyArray<TabItem<NotesTab>> = [
  { id: "journal", label: "Weekjournaal", icon: BookOpenText },
  { id: "collection", label: "Collectie", icon: List },
];

interface NotesHeaderProps {
  count: number;
  archivedCount: number;
  completedCount: number;
  pinnedCount: number;
  isLoading: boolean;
  privacyOn: boolean;
  isPrivacyUnknown: boolean;
  togglePrivacy: () => void;
  handleNew: () => void;
  activeTab: NotesTab;
  onTabChange: (tab: NotesTab) => void;
}

export function NotesHeader({
  count,
  archivedCount,
  completedCount,
  pinnedCount,
  isLoading,
  privacyOn,
  isPrivacyUnknown,
  togglePrivacy,
  handleNew,
  activeTab,
  onTabChange,
}: NotesHeaderProps) {
  return (
    <>
      <AppPageHeader
        leading={<AppIcon name="notes" tone="accent" size="lg" framed active />}
        title="Notities"
        description={
          isLoading
            ? "Werkruimte laden…"
            : `${count} actief · ${completedCount} afgerond · ${archivedCount} archief${
                pinnedCount > 0 ? ` · ${pinnedCount} vastgezet` : ""
              }`
        }
        actions={
          <ResponsiveActions
            menuLabel="Notitieacties"
            primary={
              <Button
                onClick={handleNew}
                title="Nieuwe notitie (toets n)"
                aria-label="Nieuwe notitie"
                aria-keyshortcuts="n"
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
                title={isPrivacyUnknown ? "Privacyvoorkeur wordt veilig geladen" : privacyOn ? "Notities tonen" : "Notities verbergen"}
                aria-label={isPrivacyUnknown ? "Privacyvoorkeur wordt geladen" : privacyOn ? "Notities tonen" : "Notities verbergen"}
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

      <PageToolbar label="Notitie-weergave" className="mt-4">
        <Tabs
          items={NOTES_TABS}
          value={activeTab}
          onValueChange={onTabChange}
          idPrefix="notes"
          ariaLabel="Notitie-weergave"
          appearance="contained"
          className="w-full [&_[role=tab]]:flex-1"
        />
      </PageToolbar>
    </>
  );
}
