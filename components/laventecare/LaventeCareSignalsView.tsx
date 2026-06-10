"use client";

import { Clock3, Sparkles } from "lucide-react";
import type { BusinessSignal, ActionItem, FollowUpSignal } from "./LaventeCareTypes";
import { ActionItemCard, EmptyState, FollowUpCard, SignalCard } from "./LaventeCareCards";

export function LaventeCareSignalsView({
  businessSignals,
  actionItems,
  followUps,
  processingSignal,
  processingAction,
  handleCreateActionFromSignal,
  handleConvertSignalToLead,
  handleCompleteAction,
}: {
  businessSignals: BusinessSignal[];
  actionItems: ActionItem[];
  followUps: FollowUpSignal[];
  processingSignal: string | null;
  processingAction: string | null;
  handleCreateActionFromSignal: (signal: BusinessSignal) => Promise<void>;
  handleConvertSignalToLead: (signal: BusinessSignal) => Promise<void>;
  handleCompleteAction: (action: ActionItem) => Promise<void>;
}) {
  const signalKey = (kind: "action" | "lead", signal: BusinessSignal) => `${kind}:${signal.source}:${signal.id}`;
  const triageTotal = businessSignals.length + actionItems.length + followUps.length;

  return (
    <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.3fr_0.7fr]">
      <div className="glass min-w-0 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">Live koppelingen</p>
            <h2 className="mt-1 text-lg font-bold text-white">Triage inbox</h2>
            <p className="mt-1 text-sm text-slate-500">Nieuwe matches uit mail, agenda en notities.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center sm:min-w-[260px]">
            <TriageStat label="Nieuw" value={businessSignals.length} />
            <TriageStat label="Acties" value={actionItems.length} />
            <TriageStat label="Follow-up" value={followUps.length} />
          </div>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {businessSignals.length === 0 ? (
            <div className="lg:col-span-2">
              <EmptyState
                title={triageTotal > 0 ? "Geen nieuwe bron-signalen" : "Nog geen zakelijke signalen"}
                body={
                  triageTotal > 0
                    ? `${actionItems.length} open acties en ${followUps.length} follow-ups staan al in de triagekolom. Nieuwe mail-, agenda- of notitiematches verschijnen hier zodra ze binnenkomen.`
                    : "Emails, agenda-afspraken en notities met LaventeCare-termen of lead/projectnamen verschijnen hier automatisch."
                }
              />
            </div>
          ) : (
            businessSignals.slice(0, 6).map((signal) => (
              <SignalCard
                key={`${signal.source}-${signal.id}`}
                signal={signal}
                busyAction={processingSignal === signalKey("action", signal)}
                busyLead={processingSignal === signalKey("lead", signal)}
                onCreateAction={handleCreateActionFromSignal}
                onConvertToLead={handleConvertSignalToLead}
              />
            ))
          )}
        </div>
      </div>

      <div className="glass min-w-0 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Clock3 size={18} className="text-amber-300" />
            <h2 className="text-lg font-bold text-white">Acties en follow-ups</h2>
          </div>
          <Sparkles size={18} className="text-violet-300" />
        </div>
        <div className="mt-4 space-y-3">
          {actionItems.length === 0 ? (
            <EmptyState title="Geen open acties" body="Maak vanuit zakelijke signalen een actie, dan neemt Brain dit mee in Telegram." />
          ) : (
            actionItems.slice(0, 5).map((action) => (
              <ActionItemCard
                key={action._id}
                action={action}
                busy={processingAction === action._id}
                onComplete={handleCompleteAction}
              />
            ))
          )}
        </div>
        {followUps.length > 0 && (
          <div className="mt-5 border-t border-[var(--color-border)] pt-4">
            <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">Follow-ups uit funnel</p>
            <div className="mt-3 space-y-3">
              {followUps.slice(0, 3).map((followUp) => (
                <FollowUpCard key={`${followUp.source}-${followUp.id}`} followUp={followUp} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function TriageStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-2">
      <p className="text-base font-bold text-white">{value}</p>
      <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-500">{label}</p>
    </div>
  );
}
