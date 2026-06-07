"use client";

import { FileText, FolderKanban, Handshake, LifeBuoy, Sparkles } from "lucide-react";
import type { LCCockpit } from "@/lib/api";
import { LAVENTECARE_DOCUMENT_TOTAL } from "@/lib/laventecare";
import { MetricCard } from "./LaventeCareCards";

export function LaventeCareMetrics({
  summary,
  businessSignalsCount,
}: {
  summary: LCCockpit["summary"];
  businessSignalsCount: number;
}) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      <MetricCard
        icon={Handshake}
        label="Open leads"
        value={summary.activeLeads}
        detail={`${summary.leads} totaal in de funnel`}
        tone="sky"
      />
      <MetricCard
        icon={FolderKanban}
        label="Actieve projecten"
        value={summary.activeProjects}
        detail={`${summary.projects} projecten geregistreerd`}
        tone="emerald"
      />
      <MetricCard
        icon={Sparkles}
        label="Signalen"
        value={businessSignalsCount}
        detail={`${summary.actionItems ?? 0} acties open`}
        tone="violet"
      />
      <MetricCard
        icon={FileText}
        label="Documentbasis"
        value={`${summary.documents}/${LAVENTECARE_DOCUMENT_TOTAL}`}
        detail={summary.documentsSeeded ? "Geindexeerd in PostgreSQL" : "Catalogus klaar om te initialiseren"}
        tone="amber"
      />
      <MetricCard
        icon={LifeBuoy}
        label="SLA signalen"
        value={summary.openIncidents}
        detail={`${summary.openChanges} open change requests`}
        tone={summary.openIncidents > 0 ? "rose" : "violet"}
      />
    </section>
  );
}

