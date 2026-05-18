"use client";

import { BookOpenText, ClipboardList, FileText, Layers3, Search } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { LAVENTECARE_LEGAL_STACK, LAVENTECARE_PRICING } from "@/lib/laventecareData";
import { label } from "./LaventeCareUtils";

export function LaventeCareKnowledgeView({
  search,
  setSearch,
  documentGroups,
}: {
  search: string;
  setSearch: Dispatch<SetStateAction<string>>;
  documentGroups: [string, any[]][];
}) {
  return (
    <section className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="glass p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">Kennisbasis</p>
            <h2 className="mt-1 text-lg font-bold text-white">Bedrijfsdocumentatie</h2>
          </div>
          <label className="relative block w-full sm:w-72">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Zoek documentatie"
              className="search-bar__input h-10 text-sm"
            />
          </label>
        </div>

        <div className="mt-4 space-y-4">
          {documentGroups.map(([category, docs]) => (
            <div key={category}>
              <div className="mb-2 flex items-center gap-2">
                <ClipboardList size={15} className="text-slate-400" />
                <h3 className="text-sm font-bold capitalize text-slate-200">{category}</h3>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-xs text-slate-500">
                  {docs.length}
                </span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {docs.map((doc) => (
                  <div key={doc.documentKey ?? doc.titel} className="glass p-4 bg-[var(--color-surface)]">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
                        <FileText size={16} className="text-amber-300" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="line-clamp-2 text-sm font-semibold text-white">{doc.titel}</h4>
                        <p className="mt-1 text-xs text-slate-500">{label(doc.fase ?? undefined)} - {doc.versie ?? "2026-04"}</p>
                      </div>
                    </div>
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-400">{doc.samenvatting}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-5">
        <div className="glass p-5">
          <div className="flex items-center gap-2">
            <BookOpenText size={18} className="text-amber-300" />
            <h2 className="text-lg font-bold text-white">Juridische stapel</h2>
          </div>
          <div className="mt-4 space-y-2">
            {LAVENTECARE_LEGAL_STACK.map((item, index) => (
              <div key={item} className="flex items-center gap-3 glass px-3 py-2 bg-[var(--color-surface)]">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-xs font-bold text-slate-400">
                  {index + 1}
                </span>
                <span className="text-sm font-medium text-slate-200">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass p-5">
          <div className="flex items-center gap-2">
            <Layers3 size={18} className="text-violet-300" />
            <h2 className="text-lg font-bold text-white">Prijsankers</h2>
          </div>
          <div className="mt-4 space-y-3">
            {LAVENTECARE_PRICING.map((price) => (
              <div key={price.key} className="glass p-3 bg-[var(--color-surface)]">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-white">{price.title}</p>
                  <p className="shrink-0 text-right text-xs font-bold text-violet-200">{price.price}</p>
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-500">{price.note}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
