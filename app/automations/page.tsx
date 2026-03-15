"use client";

import { useState } from "react";
import { Plus, X, Activity } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { useAutomations } from "@/hooks/useAutomations";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { AutomationCard } from "@/components/automations/AutomationCard";
import { AutomationForm } from "@/components/automations/AutomationForm";
import { DienstWekkerSection } from "@/components/automations/DienstWekkerSection";
import { type Automation, type ShiftType } from "@/lib/automations";
import { cn } from "@/lib/utils";

export default function AutomationsPage() {
  const { automations, add, addDienstWekkerPack, toggle, remove, lastCheck } =
    useAutomations();
  const [showForm, setShowForm] = useState(false);
  const { openConfirm } = useConfirm();
  const { success } = useToast();

  const handleAdd = (data: Parameters<typeof add>[0]) => {
    add(data);
    success(`Automatisering '${data.name}' aangemaakt`);
  };

  const handleDelete = async (a: Automation) => {
    const confirmed = await openConfirm({
      title: "Automatisering verwijderen",
      message: `'${a.name}' permanent verwijderen?`,
      confirmLabel: "Verwijderen",
      variant: "danger",
    });
    if (!confirmed) return;
    remove(a.id);
    success("Automatisering verwijderd");
  };

  const handleAddWekkerPack = (shiftType: ShiftType) => {
    const count = addDienstWekkerPack(shiftType);
    success(`${count} ${shiftType}-dienst automations aangemaakt`);
  };

  const enabled = automations.filter((a) => a.enabled);
  const disabled = automations.filter((a) => !a.enabled);

  const hasVroegPack = automations.some((a) => a.group === "dienst-wekker-vroeg");
  const hasLaatPack = automations.some((a) => a.group === "dienst-wekker-laat");
  const hasDienstPack = automations.some((a) => a.group === "dienst-wekker-dienst");

  const wekkerPacks = [
    { type: "Vroeg" as ShiftType, label: "Vroeg dienst", sub: "05:00 · 05:30 · 06:15", accent: "#f97316", hasIt: hasVroegPack },
    { type: "Laat"  as ShiftType, label: "Laat dienst",  sub: "12:30 · 13:45",          accent: "#ef4444", hasIt: hasLaatPack  },
    { type: "Dienst" as ShiftType, label: "Dagdienst",   sub: "12:00",                   accent: "#3b82f6", hasIt: hasDienstPack },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-md px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Automatisering</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {enabled.length} actief · Engine elke 15s
              {lastCheck && <span className="ml-1 text-slate-600">· {lastCheck}</span>}
            </p>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            aria-expanded={showForm}
            aria-label={showForm ? "Formulier sluiten" : "Nieuwe automatisering toevoegen"}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all",
              showForm
                ? "bg-white/5 text-slate-300 border-white/10"
                : "bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/25"
            )}
          >
            {showForm ? <X size={14} /> : <Plus size={14} />}
            {showForm ? "Annuleren" : "Toevoegen"}
          </button>
        </div>
      </header>

      <main className="px-6 py-6 max-w-3xl mx-auto space-y-5">
        <ErrorBoundary>
          <DienstWekkerSection packs={wekkerPacks} onInstall={handleAddWekkerPack} />
        </ErrorBoundary>

          {/* Engine status */}
          <div className="glass rounded-xl p-4 flex items-center gap-3 border border-green-500/15">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" aria-hidden="true" />
            <div className="flex-1">
              <p className="text-xs font-medium text-green-400">Automation Engine actief (Docker)</p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Draait 24/7 op je lokale server · ook zonder open browser
              </p>
            </div>
            <Activity size={15} className="text-green-400 opacity-60" aria-hidden="true" />
          </div>

          <AnimatePresence>
            {showForm && (
              <AutomationForm onClose={() => setShowForm(false)} onSave={handleAdd} />
            )}
          </AnimatePresence>

          {enabled.length > 0 && (
            <section aria-label="Actieve automatiseringen">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-3">
                Actief ({enabled.length})
              </p>
              <div className="space-y-2">
                <AnimatePresence>
                  {enabled.map((a) => (
                    <AutomationCard
                      key={a.id}
                      automation={a}
                      onToggle={() => toggle(a.id)}
                      onDelete={() => handleDelete(a)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          )}

          {disabled.length > 0 && (
            <section aria-label="Uitgeschakelde automatiseringen">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-3">
                Uitgeschakeld ({disabled.length})
              </p>
              <div className="space-y-2">
                <AnimatePresence>
                  {disabled.map((a) => (
                    <AutomationCard
                      key={a.id}
                      automation={a}
                      onToggle={() => toggle(a.id)}
                      onDelete={() => handleDelete(a)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          )}

          {automations.length === 0 && !showForm && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3">
                <Activity size={24} className="text-slate-600" />
              </div>
              <h3 className="text-sm font-semibold text-slate-300">Nog geen automatiseringen</h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Voeg een tijdschema toe om lampen automatisch te bedienen.
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 text-sm font-medium hover:bg-amber-500/25 transition-colors"
              >
                <Plus size={13} />
                Eerste automatisering
              </button>
            </div>
          )}
      </main>
    </div>
  );
}
