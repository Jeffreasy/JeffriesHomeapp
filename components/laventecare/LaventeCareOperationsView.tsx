"use client";

import { AlertTriangle, ClipboardList, GitPullRequest, ScrollText } from "lucide-react";
import { formatDate, label } from "./LaventeCareUtils";
import { EmptyState, OperationCard } from "./LaventeCareCards";
import type { ChangeRequestItem, DecisionItem, SlaIncidentItem } from "./LaventeCareTypes";

export function LaventeCareOperationsView({
  recentDecisions,
  openChanges,
  openIncidents,
}: {
  recentDecisions: DecisionItem[];
  openChanges: ChangeRequestItem[];
  openIncidents: SlaIncidentItem[];
}) {
  return (
    <section className="glass min-w-0 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">Operatie</p>
          <h2 className="mt-1 text-lg font-bold text-white">Besluiten, wijzigingen en SLA</h2>
        </div>
        <ClipboardList size={20} className="text-slate-400" />
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <ScrollText size={16} className="text-sky-300" />
            <h3 className="text-sm font-bold text-slate-200">Decision log</h3>
          </div>
          <div className="space-y-3">
            {recentDecisions.length === 0 ? (
              <EmptyState title="Geen besluiten" body="Besluiten die je via Telegram vastlegt verschijnen hier als audit trail." />
            ) : (
              recentDecisions.slice(0, 3).map((decision) => (
                <OperationCard
                  key={decision._id ?? `${decision.titel}-${decision.datum}`}
                  icon={ScrollText}
                  title={decision.titel}
                  meta={`${formatDate(decision.datum)} - ${label(decision.status)}`}
                  body={decision.besluit}
                  tone="sky"
                />
              ))
            )}
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center gap-2">
            <GitPullRequest size={16} className="text-amber-300" />
            <h3 className="text-sm font-bold text-slate-200">Change requests</h3>
          </div>
          <div className="space-y-3">
            {openChanges.length === 0 ? (
              <EmptyState title="Geen open changes" body="Scope-, planning- of budgetwijzigingen blijven hier zichtbaar tot ze zijn afgehandeld." />
            ) : (
              openChanges.slice(0, 3).map((change) => (
                <OperationCard
                  key={change._id ?? change.titel}
                  icon={GitPullRequest}
                  title={change.titel}
                  meta={label(change.status)}
                  body={change.impact}
                  tone="amber"
                />
              ))
            )}
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-rose-300" />
            <h3 className="text-sm font-bold text-slate-200">SLA incidenten</h3>
          </div>
          <div className="space-y-3">
            {openIncidents.length === 0 ? (
              <EmptyState title="Geen open incidenten" body="Support- of beheerissues die je vastlegt komen hier met prioriteit en kanaal terug." />
            ) : (
              openIncidents.slice(0, 3).map((incident) => (
                <OperationCard
                  key={incident._id ?? incident.titel}
                  icon={AlertTriangle}
                  title={incident.titel}
                  meta={`${incident.prioriteit} - ${label(incident.status)} - ${label(incident.kanaal)}`}
                  body={incident.samenvatting ?? `Gemeld op ${formatDate(incident.gemeldOp)}`}
                  tone={incident.prioriteit === "P1" || incident.prioriteit === "P2" ? "rose" : "violet"}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
