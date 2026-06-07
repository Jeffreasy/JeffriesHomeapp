"use client";

import { Sparkles } from "lucide-react";
import { LAVENTECARE_PROFILE } from "@/lib/laventecare";

export function LaventeCareHero() {
  return (
    <section className="glass p-5">
      <div className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr] lg:items-start">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
            <Sparkles size={14} />
            Geintegreerde businesslaag actief
          </div>
          <h2 className="mt-4 max-w-3xl text-2xl font-bold text-white sm:text-3xl">
            Van bedrijfsdocumentatie naar een werkbaar LaventeCare-systeem.
          </h2>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400">
            {LAVENTECARE_PROFILE.kernbelofte}
          </p>
        </div>
        <div className="glass bg-[var(--color-surface)] p-4">
          <p className="text-sm font-semibold text-white">Integratieprincipe</p>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Leads, projecten, documenten, decisions, change requests en SLA-signalen staan als eigen domein klaar
            voor Brain, Telegram, Agenda, Email, Notities en Finance.
          </p>
        </div>
      </div>
    </section>
  );
}

