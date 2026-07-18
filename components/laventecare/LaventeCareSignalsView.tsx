"use client";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { surfaceVariants } from "@/components/ui/Surface";
import { useState } from "react";
import { Clock3, Sparkles } from "lucide-react";
import type { BusinessSignal, ActionItem, FollowUpSignal } from "./LaventeCareTypes";
import { ActionItemCard, EmptyState, FollowUpCard, SignalCard } from "./LaventeCareCards";

function ShowAllToggle({
  total,
  noun,
  expanded,
  onToggle,
}: {
  total: number;
  noun: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <Button type="button" variant="ghost" size="sm" fullWidth onClick={onToggle} aria-expanded={expanded} className="mt-2">
      {expanded ? "Toon minder" : `Toon alle ${total} ${noun}`}
    </Button>
  );
}

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
  // Verborgen afkapping opgeheven: standaard 6/5/3 items, met "Toon alle N".
  const [showAllSignals, setShowAllSignals] = useState(false);
  const [showAllActions, setShowAllActions] = useState(false);
  const [showAllFollowUps, setShowAllFollowUps] = useState(false);

  return (
    <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.3fr_0.7fr]">
      <div className={cn(surfaceVariants({ padding: "none" }), "min-w-0 p-5")}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-normal text-[var(--color-text-muted)]">Live koppelingen</p>
            <h2 className="mt-1 text-lg font-bold text-[var(--color-text)]">Triage inbox</h2>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">Nieuwe matches uit mail, agenda en notities.</p>
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
            (showAllSignals ? businessSignals : businessSignals.slice(0, 6)).map((signal) => (
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
        {businessSignals.length > 6 ? (
          <ShowAllToggle
            total={businessSignals.length}
            noun="signalen"
            expanded={showAllSignals}
            onToggle={() => setShowAllSignals((value) => !value)}
          />
        ) : null}
      </div>

      <div className={cn(surfaceVariants({ padding: "none" }), "min-w-0 p-5")}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Clock3 size={18} className="text-[var(--color-primary-hover)]" />
            <h2 className="text-lg font-bold text-[var(--color-text)]">Acties en follow-ups</h2>
          </div>
          <Sparkles size={18} className="text-[var(--color-info)]" />
        </div>
        <div className="mt-4 space-y-3">
          {actionItems.length === 0 ? (
            <EmptyState title="Geen open acties" body="Maak vanuit zakelijke signalen een actie, dan neemt Brain dit mee in Telegram." />
          ) : (
            (showAllActions ? actionItems : actionItems.slice(0, 5)).map((action) => (
              <ActionItemCard
                key={action._id}
                action={action}
                busy={processingAction === action._id}
                onComplete={handleCompleteAction}
              />
            ))
          )}
        </div>
        {actionItems.length > 5 ? (
          <ShowAllToggle
            total={actionItems.length}
            noun="acties"
            expanded={showAllActions}
            onToggle={() => setShowAllActions((value) => !value)}
          />
        ) : null}
        {followUps.length > 0 && (
          <div className="mt-5 border-t border-[var(--color-border)] pt-4">
            <p className="text-xs font-semibold uppercase tracking-normal text-[var(--color-text-muted)]">Follow-ups uit funnel</p>
            <div className="mt-3 space-y-3">
              {(showAllFollowUps ? followUps : followUps.slice(0, 3)).map((followUp) => (
                <FollowUpCard key={`${followUp.source}-${followUp.id}`} followUp={followUp} />
              ))}
            </div>
            {followUps.length > 3 ? (
              <ShowAllToggle
                total={followUps.length}
                noun="follow-ups"
                expanded={showAllFollowUps}
                onToggle={() => setShowAllFollowUps((value) => !value)}
              />
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}

function TriageStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-2 py-2">
      <p className="text-base font-bold text-[var(--color-text)]">{value}</p>
      <p className="mt-0.5 truncate text-micro font-semibold text-[var(--color-text-muted)]">{label}</p>
    </div>
  );
}
