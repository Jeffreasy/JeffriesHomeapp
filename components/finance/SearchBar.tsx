"use client";

import { Search, X } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="search-bar">
      <Search size={15} className="search-bar__icon" />
      <input className="search-bar__input" type="search"
        placeholder="Zoek op naam of omschrijving…"
        value={value} onChange={(e) => onChange(e.target.value)} />
      {value && (
        <button className="search-bar__clear" onClick={() => onChange("")} aria-label="Wis zoekopdracht">
          <X size={14} />
        </button>
      )}
    </div>
  );
}
