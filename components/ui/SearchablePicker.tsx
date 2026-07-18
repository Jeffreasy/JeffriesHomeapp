"use client";

import {
  useId,
  useRef,
  useState,
  type KeyboardEventHandler,
  type MouseEventHandler,
  type PointerEventHandler,
  type ReactNode,
} from "react";
import { Popover, type PopoverTriggerProps } from "@/components/ui/Popover";
import { SearchField } from "@/components/ui/SearchField";
import { scrollElementIntoView } from "@/lib/ui/scroll";
import { cn } from "@/lib/utils";

export interface SearchablePickerOptionProps {
  id: string;
  role: "option";
  tabIndex: -1;
  "aria-selected": boolean;
  "data-active": "true" | undefined;
  onClick: MouseEventHandler<HTMLButtonElement>;
  onPointerMove: PointerEventHandler<HTMLButtonElement>;
}

export interface SearchablePickerRenderContext {
  activeOptionKey: string | null;
  getOptionProps: (optionKey: string) => SearchablePickerOptionProps;
}

export interface SearchablePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: (props: PopoverTriggerProps) => ReactNode;
  title: string;
  ariaLabel?: string;
  closeLabel?: string;
  query: string;
  onQueryChange: (query: string) => void;
  searchLabel: string;
  searchPlaceholder?: string;
  listboxLabel: string;
  optionKeys: readonly string[];
  selectedOptionKey?: string | null;
  onSelectOption: (optionKey: string) => void;
  renderOptions: (context: SearchablePickerRenderContext) => ReactNode;
  align?: "start" | "end";
  rootClassName?: string;
  className?: string;
  mobileClassName?: string;
  searchClassName?: string;
  listboxClassName?: string;
}

/**
 * Canonical searchable single-select composition. Popover owns the responsive
 * overlay lifecycle; this component owns the ARIA combobox and keyboard model.
 */
export function SearchablePicker({
  open,
  onOpenChange,
  trigger,
  title,
  ariaLabel = title,
  closeLabel = "Picker sluiten",
  query,
  onQueryChange,
  searchLabel,
  searchPlaceholder,
  listboxLabel,
  optionKeys,
  selectedOptionKey,
  onSelectOption,
  renderOptions,
  align = "start",
  rootClassName,
  className,
  mobileClassName,
  searchClassName,
  listboxClassName,
}: SearchablePickerProps) {
  const listboxId = useId();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [activeOptionKey, setActiveOptionKey] = useState<string | null>(null);
  const initialOptionKey = optionKeys.includes(selectedOptionKey ?? "")
    ? selectedOptionKey ?? null
    : optionKeys[0] ?? null;
  const resolvedActiveOptionKey = open && activeOptionKey && optionKeys.includes(activeOptionKey)
    ? activeOptionKey
    : open
      ? initialOptionKey
      : null;

  const optionId = (optionKey: string) =>
    `${listboxId}-option-${stableOptionIdSegment(optionKey)}`;

  const activateOption = (optionKey: string) => {
    setActiveOptionKey(optionKey);
    window.requestAnimationFrame(() => {
      scrollElementIntoView(document.getElementById(optionId(optionKey)), { block: "nearest" });
    });
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setActiveOptionKey(nextOpen ? initialOptionKey : null);
    onOpenChange(nextOpen);
  };

  const selectOption = (optionKey: string) => {
    if (!optionKeys.includes(optionKey)) return;
    onSelectOption(optionKey);
    handleOpenChange(false);
  };

  const handleSearchKeyDown: KeyboardEventHandler<HTMLInputElement> = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      handleOpenChange(false);
      return;
    }
    if (optionKeys.length === 0) return;

    const currentIndex = resolvedActiveOptionKey
      ? optionKeys.indexOf(resolvedActiveOptionKey)
      : -1;
    let nextIndex: number | null = null;

    if (event.key === "ArrowDown") {
      nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % optionKeys.length;
    } else if (event.key === "ArrowUp") {
      nextIndex = currentIndex < 0
        ? optionKeys.length - 1
        : (currentIndex - 1 + optionKeys.length) % optionKeys.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = optionKeys.length - 1;
    } else if (event.key === "Enter" && resolvedActiveOptionKey) {
      event.preventDefault();
      selectOption(resolvedActiveOptionKey);
      return;
    }

    if (nextIndex === null) return;
    event.preventDefault();
    const nextOptionKey = optionKeys[nextIndex];
    if (nextOptionKey) activateOption(nextOptionKey);
  };

  const getOptionProps = (optionKey: string): SearchablePickerOptionProps => ({
    id: optionId(optionKey),
    role: "option",
    tabIndex: -1,
    "aria-selected": optionKey === selectedOptionKey,
    "data-active": optionKey === resolvedActiveOptionKey ? "true" : undefined,
    onClick: () => selectOption(optionKey),
    onPointerMove: () => setActiveOptionKey(optionKey),
  });

  return (
    <Popover
      open={open}
      onOpenChange={handleOpenChange}
      trigger={trigger}
      title={title}
      ariaLabel={ariaLabel}
      closeLabel={closeLabel}
      align={align}
      initialFocusRef={searchInputRef}
      rootClassName={rootClassName}
      className={cn("w-80 overflow-hidden p-0", className)}
      mobileClassName={cn("p-0", mobileClassName)}
    >
      <div className={cn("border-b border-[var(--color-border)] p-3", searchClassName)}>
        <SearchField
          ref={searchInputRef}
          label={searchLabel}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onClear={() => onQueryChange("")}
          onKeyDown={handleSearchKeyDown}
          placeholder={searchPlaceholder}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-activedescendant={
            resolvedActiveOptionKey ? optionId(resolvedActiveOptionKey) : undefined
          }
          autoComplete="off"
        />
      </div>
      <div
        id={listboxId}
        role="listbox"
        aria-label={listboxLabel}
        className={cn("max-h-[min(48dvh,22rem)] overflow-y-auto p-2", listboxClassName)}
      >
        {renderOptions({
          activeOptionKey: resolvedActiveOptionKey,
          getOptionProps,
        })}
      </div>
    </Popover>
  );
}

function stableOptionIdSegment(optionKey: string) {
  let hash = 2166136261;
  for (let index = 0; index < optionKey.length; index += 1) {
    hash ^= optionKey.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  const readable = optionKey.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 32) || "option";
  return `${readable}-${(hash >>> 0).toString(36)}`;
}