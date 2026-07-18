"use client";

import { useMemo, useState } from "react";
import { BriefcaseBusiness, ChevronDown, LoaderCircle, UserRound } from "lucide-react";
import { AppIcon } from "@/components/ui/AppIcon";
import { Button } from "@/components/ui/Button";
import { SearchablePicker } from "@/components/ui/SearchablePicker";
import { useContacten } from "@/hooks/useContacten";
import { useLaventeCareBusinessContextOptions } from "@/hooks/useLaventeCareBusinessContexts";
import {
  fallbackBusinessContextOption,
  getBusinessContextOptionKey,
  type LaventeCareContextOption,
} from "@/lib/laventecare/business-context";
import { normalizeBusinessContext, type BusinessContextValue } from "@/lib/workspace-context";
import { cn } from "@/lib/utils";

type BusinessContextPickerProps = {
  value?: BusinessContextValue | null;
  onChange: (value: BusinessContextValue | null) => void;
  label?: string;
  compact?: boolean;
};

const EMPTY_CONTEXT_OPTION: LaventeCareContextOption = {
  key: "none",
  label: "Geen koppeling",
  meta: "Persoonlijk of algemeen",
  value: null,
  aliases: [],
  rank: 0,
};

// The domain owns filtering and grouping; SearchablePicker owns the responsive
// popover, focus lifecycle and keyboard/ARIA combobox contract.
export function BusinessContextPicker({
  value,
  onChange,
  label = "Koppeling",
  compact = false,
}: BusinessContextPickerProps) {
  const { options: laventeCareOptions, isError: laventeCareError } =
    useLaventeCareBusinessContextOptions();
  const { contacts, isLoading: contactsLoading, isError: contactsError } = useContacten();
  const contactOptions = useMemo<LaventeCareContextOption[]>(
    () =>
      contacts.map((contact) => ({
        key: `contact:${contact.id}`,
        label: contact.display_name,
        meta:
          (contact.relationship_types ?? []).map(contactRelationshipLabel).join(" · ") ||
          "Contact",
        value: { type: "contact", id: contact.id, title: contact.display_name },
        aliases: [
          ...(contact.labels ?? []).map((item) => item.name),
          ...(contact.organizations ?? []).map((item) => item.organization_name ?? ""),
        ].filter(Boolean),
        rank: 2,
      })),
    [contacts],
  );
  const options = useMemo(
    () => [...laventeCareOptions, ...contactOptions],
    [contactOptions, laventeCareOptions],
  );
  const normalized = normalizeBusinessContext(value);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const requestedSelectedKey = getBusinessContextOptionKey(normalized);
  const matchedSelected = options.find((option) => option.key === requestedSelectedKey);
  const fallbackSelected = matchedSelected ? null : fallbackBusinessContextOption(normalized);
  const selected = matchedSelected ?? fallbackSelected ?? options[0] ?? EMPTY_CONTEXT_OPTION;
  const selectedOptionKey = selected.key;

  const filteredOptions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((option) =>
      `${option.label} ${option.meta} ${option.aliases.join(" ")}`
        .toLowerCase()
        .includes(needle),
    );
  }, [options, query]);

  const groups = useMemo(
    () =>
      [
        {
          label: null,
          items: filteredOptions.filter(
            (option) => option.key === "none" || option.key === "laventecare",
          ),
        },
        {
          label: "Klantdossiers",
          items: filteredOptions.filter((option) => option.key.startsWith("company:")),
        },
        {
          label: "Leads",
          items: filteredOptions.filter((option) => option.key.startsWith("lead:")),
        },
        {
          label: "Projecten",
          items: filteredOptions.filter((option) => option.key.startsWith("project:")),
        },
        {
          label: "Opdrachten",
          items: filteredOptions.filter((option) => option.key.startsWith("workstream:")),
        },
        {
          label: "Contacten",
          items: filteredOptions.filter((option) => option.key.startsWith("contact:")),
        },
      ].filter((group) => group.items.length > 0),
    [filteredOptions],
  );

  const pickerOptions = useMemo(
    () => (fallbackSelected ? [fallbackSelected, ...filteredOptions] : filteredOptions),
    [fallbackSelected, filteredOptions],
  );
  const optionKeys = useMemo(
    () => pickerOptions.map((option) => option.key),
    [pickerOptions],
  );

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) setQuery("");
  };

  const handleSelectOption = (optionKey: string) => {
    const option = pickerOptions.find((candidate) => candidate.key === optionKey);
    if (option) onChange(option.value ?? null);
  };

  return (
    <div className={compact ? "space-y-1.5" : "space-y-2"}>
      <p className="flex items-center gap-1.5 text-micro font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
        {normalized?.type === "contact" ? (
          <UserRound size={12} aria-hidden="true" />
        ) : (
          <BriefcaseBusiness size={12} aria-hidden="true" />
        )}
        {label}
      </p>
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
        <SearchablePicker
          open={open}
          onOpenChange={handleOpenChange}
          title="Koppeling kiezen"
          ariaLabel="Kies een zakelijke of persoonlijke koppeling"
          closeLabel="Koppelingen sluiten"
          query={query}
          onQueryChange={setQuery}
          searchLabel="Koppeling zoeken"
          searchPlaceholder={`Zoek in ${options.length} koppelingen...`}
          listboxLabel="Beschikbare koppelingen"
          optionKeys={optionKeys}
          selectedOptionKey={selectedOptionKey}
          onSelectOption={handleSelectOption}
          rootClassName="w-full"
          className="w-96"
          listboxClassName="max-h-64 space-y-2"
          trigger={(triggerProps) => (
            <Button
              {...triggerProps}
              variant="ghost"
              fullWidth
              aria-label={`${label}: ${selected.label}`}
              className="h-auto min-w-0 justify-start px-1 py-1 text-left"
            >
              {normalized?.type === "contact" ? (
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[var(--color-info-border)] bg-[var(--color-info-subtle)] text-[var(--color-info)]">
                  <UserRound size={13} aria-hidden="true" />
                </span>
              ) : (
                <AppIcon
                  name="business"
                  tone={normalized ? "accent" : "neutral"}
                  size="xs"
                  framed
                  className="h-7 w-7 rounded-lg"
                />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-[var(--color-text)]">
                  {selected.label}
                </span>
                <span className="block truncate text-micro text-[var(--color-text-muted)]">
                  {selected.meta}
                </span>
              </span>
              <ChevronDown
                size={14}
                aria-hidden="true"
                className={cn(
                  "shrink-0 text-[var(--color-text-muted)] transition-transform",
                  open && "rotate-180",
                )}
              />
            </Button>
          )}
          renderOptions={({ activeOptionKey, getOptionProps }) => (
            <>
              {fallbackSelected ? (
                <Button
                  {...getOptionProps(fallbackSelected.key)}
                  variant="secondary"
                  fullWidth
                  className={cn(
                    "h-auto flex-col items-stretch gap-0 p-3 text-left",
                    "border-[var(--color-primary-border)] bg-[var(--color-primary-subtle)] text-[var(--color-primary-hover)]",
                    activeOptionKey === fallbackSelected.key &&
                      "ring-2 ring-[var(--color-primary)] ring-offset-1 ring-offset-[var(--color-surface)]",
                  )}
                >
                  <span className="block truncate text-xs font-bold">
                    {fallbackSelected.label}
                  </span>
                  <span className="mt-0.5 block truncate text-micro text-[var(--color-text-muted)]">
                    {fallbackSelected.meta}
                  </span>
                </Button>
              ) : null}

              {groups.map((group) => (
                <div key={group.label ?? "algemeen"}>
                  {group.label ? (
                    <p className="mb-1 px-1 text-micro font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
                      {group.label}
                    </p>
                  ) : null}
                  <div className="space-y-1.5">
                    {group.items.map((option) => {
                      const isSelected = option.key === selectedOptionKey;
                      const isActive = option.key === activeOptionKey;
                      return (
                        <Button
                          key={option.key}
                          {...getOptionProps(option.key)}
                          variant="secondary"
                          fullWidth
                          className={cn(
                            "h-auto flex-col items-stretch gap-0 p-3 text-left",
                            isSelected &&
                              "border-[var(--color-primary-border)] bg-[var(--color-primary-subtle)] text-[var(--color-primary-hover)]",
                            isActive &&
                              "ring-2 ring-[var(--color-primary)] ring-offset-1 ring-offset-[var(--color-surface)]",
                          )}
                        >
                          <span className="flex min-w-0 items-center gap-1.5">
                            {option.key.startsWith("contact:") ? (
                              <UserRound
                                size={11}
                                className="shrink-0 text-[var(--color-info)]"
                                aria-hidden="true"
                              />
                            ) : null}
                            <span className="block truncate text-xs font-bold">
                              {option.label}
                            </span>
                          </span>
                          <span className="mt-0.5 block truncate pl-[17px] text-micro text-[var(--color-text-muted)]">
                            {option.meta}
                          </span>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {filteredOptions.length === 0 ? (
                <p className="rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-xs text-[var(--color-text-muted)]">
                  Geen context gevonden voor &ldquo;{query}&rdquo;.
                </p>
              ) : null}
            </>
          )}
        />

        {contactsLoading ? (
          <p
            role="status"
            className="mt-1.5 flex items-center gap-1 text-micro text-[var(--color-text-muted)]"
          >
            <LoaderCircle
              size={11}
              className="animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
            Contacten laden…
          </p>
        ) : null}
        {laventeCareError ? (
          <p className="mt-1.5 text-micro text-[var(--color-warning)]">
            Klantdossiers konden niet geladen worden — lijst kan onvolledig zijn.
          </p>
        ) : null}
        {contactsError ? (
          <p role="alert" className="mt-1.5 text-micro text-[var(--color-warning)]">
            Contacten konden niet geladen worden — lijst kan onvolledig zijn.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function contactRelationshipLabel(value: string) {
  const labels: Record<string, string> = {
    family: "Familie",
    friend: "Vriend",
    colleague: "Collega",
    business: "Zakelijk",
  };
  return labels[value] ?? value;
}