"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { Panel } from "./LampCards";
import { FILTERS, type FilterMode } from "./LampUtils";
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
    <Panel>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex min-h-11 flex-1 items-center gap-2 rounded-xl border border-[var(--color-border)] bg-black/10 pl-3">
          <Search size={15} className="shrink-0 text-[var(--color-text-muted)]" aria-hidden="true" />
          <input
            type="search"
            aria-label="Zoek lampen"
            placeholder="Zoek op lamp, kamer of IP-adres"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            className="min-w-0 flex-1 bg-transparent py-2 text-base text-slate-200 outline-none placeholder:text-[var(--color-text-subtle)] sm:text-sm"
          />
          {search && (
            <button
              type="button"
              onClick={onClearSearch}
              aria-label="Zoekterm wissen"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-slate-300"
            >
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div
            className="flex min-h-11 min-w-0 flex-1 items-center gap-1 overflow-x-auto rounded-xl border border-[var(--color-border)] bg-black/10 p-1 scrollbar-none"
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
                  "h-9 shrink-0 rounded-lg border border-transparent px-3 text-xs font-semibold transition-colors",
                  filter === item.id
                    ? "border-[var(--lamp-ambient-border)] bg-[var(--lamp-ambient-soft)] text-[var(--lamp-text)]"
                    : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-slate-300",
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
    </Panel>
  );
}
