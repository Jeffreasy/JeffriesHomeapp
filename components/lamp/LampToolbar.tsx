"use client";

import { SlidersHorizontal } from "lucide-react";
import { FILTERS, type FilterMode } from "./LampUtils";
import { SearchField } from "@/components/ui/SearchField";
import { Surface } from "@/components/ui/Surface";
import { cn } from "@/lib/utils";

interface LampToolbarProps {
  search: string;
  filter: FilterMode;
  filteredCount: number;
  totalCount: number;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  onFilterChange: (value: FilterMode) => void;
}

export function LampToolbar({
  search,
  filter,
  filteredCount,
  totalCount,
  onSearchChange,
  onClearSearch,
  onFilterChange,
}: LampToolbarProps) {
  return (
    <Surface>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchField
          label="Zoek lampen"
          placeholder="Zoek op lamp, kamer of IP-adres"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          onClear={onClearSearch}
          wrapperClassName="flex-1"
        />

        <div className="flex items-center gap-2">
          <div
            className="flex min-h-[var(--touch-target)] min-w-0 flex-1 items-center gap-1 overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-1 scrollbar-none"
            role="group"
            aria-label="Filter lampen op status"
          >
            <SlidersHorizontal size={14} className="ml-2 shrink-0 text-[var(--color-text-muted)]" aria-hidden="true" />
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onFilterChange(item.id)}
                aria-pressed={filter === item.id}
                className={cn(
                  "min-h-[var(--touch-target)] min-w-[var(--touch-target)] shrink-0 rounded-lg border border-transparent px-3 text-xs font-semibold transition-colors",
                  filter === item.id
                    ? "border-[var(--lamp-ambient-border)] bg-[var(--lamp-ambient-soft)] text-[var(--lamp-text)]"
                    : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          <span className="shrink-0 text-xs tabular-nums text-[var(--color-text-muted)]" aria-live="polite">
            {filteredCount}/{totalCount}
          </span>
        </div>
      </div>
    </Surface>
  );
}
