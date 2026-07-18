"use client";

import { SearchField } from "@/components/ui/SearchField";

interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}

export function SearchBar({ value, onChange, className }: SearchBarProps) {
  return (
    <SearchField
      label="Zoek transacties"
      placeholder="Zoek op naam of omschrijving…"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onClear={() => onChange("")}
      wrapperClassName={className}
    />
  );
}
