"use client";

import { Eye, EyeOff, Home, Power } from "lucide-react";

export function DashboardHeader({
  greeting,
  today,
  privacyOn,
  togglePrivacy,
  allOn,
  onlineDevicesCount,
  toggleAll,
}: {
  greeting: string;
  today: string;
  privacyOn: boolean;
  togglePrivacy: () => void;
  allOn: boolean;
  onlineDevicesCount: number;
  toggleAll: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-[#0a0a0f]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10">
            <Home size={20} className="text-amber-300" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Jeffries Homeapp
            </p>
            <h1 className="mt-1 truncate text-2xl font-bold text-white">{greeting}</h1>
            <p className="mt-1 text-sm capitalize text-slate-500">{today}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={togglePrivacy}
            title={privacyOn ? "Privacy mode uitzetten" : "Privacy mode aanzetten"}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--color-border)] bg-white/[0.03] px-3 text-sm font-medium text-slate-300 transition-colors hover:bg-white/[0.06]"
          >
            {privacyOn ? <EyeOff size={16} /> : <Eye size={16} />}
            <span className="hidden sm:inline">{privacyOn ? "Privacy aan" : "Privacy uit"}</span>
          </button>

          <button
            type="button"
            onClick={toggleAll}
            disabled={onlineDevicesCount === 0}
            title={allOn ? "Alle online lampen uitzetten" : "Alle online lampen aanzetten"}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-500/15 disabled:cursor-not-allowed disabled:border-[var(--color-border)] disabled:bg-white/[0.03] disabled:text-slate-600"
          >
            <Power size={16} />
            <span>{allOn ? "Alles uit" : "Alles aan"}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
