"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { Panel } from "./LampCards";
import { FILTERS, type FilterMode } from "./LampUtils";

export function LampToolbar({
  search,
  filter,
  filteredCount,
  totalCount,
  onSearchChange,
  onClearSearch,
  onFilterChange,
}: {
  search: string;
  filter: FilterMode;
  filteredCount: number;
  totalCount: number;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  onFilterChange: (value: FilterMode) => void;
}) {
  return (
    <Panel>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex min-h-11 flex-1 items-center gap-2 rounded-xl border border-[var(--color-border)] bg-black/10 px-3">
          <Search size={15} className="shrink-0 text-slate-500" />
          <input
            type="text"
            placeholder="Zoek op lamp, kamer of IP-adres..."
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-sm text-slate-200 outline-none placeholder:text-slate-600"
          />
          {search && (
            <button
              type="button"
              onClick={onClearSearch}
              aria-label="Zoekterm wissen"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-[var(--color-surface-hover)] hover:text-slate-300"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          <div className="flex min-h-11 items-center gap-1 rounded-xl border border-[var(--color-border)] bg-black/10 p-1">
            <SlidersHorizontal size={14} className="ml-2 shrink-0 text-slate-500" />
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onFilterChange(item.id)}
                aria-pressed={filter === item.id}
                className={`h-8 shrink-0 rounded-lg px-3 text-xs font-semibold transition-colors ${
                  filter === item.id
                    ? "bg-amber-500/15 text-amber-200"
                    : "text-slate-500 hover:bg-[var(--color-surface-hover)] hover:text-slate-300"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <span className="shrink-0 text-xs text-slate-500">
            {filteredCount}/{totalCount}
          </span>
        </div>
      </div>
    </Panel>
  );
}
