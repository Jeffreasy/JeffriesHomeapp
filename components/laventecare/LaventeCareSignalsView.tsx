"use client";

import { Clock3, Sparkles } from "lucide-react";
import type { BusinessSignal, ActionItem } from "./LaventeCareTypes";
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
  followUps: any[];
  processingSignal: string | null;
  processingAction: string | null;
  handleCreateActionFromSignal: (signal: BusinessSignal) => Promise<void>;
  handleConvertSignalToLead: (signal: BusinessSignal) => Promise<void>;
  handleCompleteAction: (action: ActionItem) => Promise<void>;
}) {
  const signalKey = (kind: "action" | "lead", signal: BusinessSignal) => `${kind}:${signal.source}:${signal.id}`;

  return (
    <section className="mt-5 grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
      <div className="glass p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">Live koppelingen</p>
            <h2 className="mt-1 text-lg font-bold text-white">Zakelijke signalen</h2>
          </div>
          <Sparkles size={20} className="text-violet-300" />
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {businessSignals.length === 0 ? (
            <div className="lg:col-span-2">
              <EmptyState title="Nog geen zakelijke signalen" body="Emails, agenda-afspraken en notities met LaventeCare-termen of lead/projectnamen verschijnen hier automatisch." />
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

      <div className="glass p-5">
        <div className="flex items-center gap-2">
          <Clock3 size={18} className="text-amber-300" />
          <h2 className="text-lg font-bold text-white">Acties</h2>
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
          <div className="mt-5 border-t border-white/10 pt-4">
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
