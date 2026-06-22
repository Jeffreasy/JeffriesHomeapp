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
import { type Automation, type DienstWekkerTimes, type ShiftType } from "@/lib/automations";
import { cn } from "@/lib/utils";

type ManagedShiftType = Exclude<ShiftType, "any">;

export default function AutomationsPage() {
  const { automations, add, update, addDienstWekkerPack, removeDienstWekkerPack, toggle, remove, lastCheck } =
    useAutomations();
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [busyWekkerType, setBusyWekkerType] = useState<ManagedShiftType | null>(null);
  const { openConfirm } = useConfirm();
  const { success, error } = useToast();

  const handleSave = async (data: Parameters<typeof add>[0]) => {
    const isNew = editingId === "new";
    const target = editingId;
    setEditingId(null);
    try {
      if (isNew) {
        await add(data);
        success(`Automatisering '${data.name}' aangemaakt`);
      } else if (target) {
        await update(target, data);
        success(`Automatisering '${data.name}' bijgewerkt`);
      }
    } catch {
      error(`Opslaan van '${data.name}' mislukt`);
    }
  };

  const handleDelete = async (a: Automation) => {
    const confirmed = await openConfirm({
      title: "Automatisering verwijderen",
      message: `'${a.name}' permanent verwijderen?`,
      confirmLabel: "Verwijderen",
      variant: "danger",
    });
    if (!confirmed) return;
    try {
      await remove(a.id);
      success("Automatisering verwijderd");
    } catch {
      error(`Verwijderen van '${a.name}' mislukt`);
    }
  };

  const handleToggle = async (a: Automation) => {
    try {
      await toggle(a.id);
    } catch {
      error(`Schakelen van '${a.name}' mislukt`);
    }
  };

  const handleSaveWekkerPack = async (shiftType: ManagedShiftType, times: DienstWekkerTimes) => {
    setBusyWekkerType(shiftType);
    try {
      const count = await addDienstWekkerPack(shiftType, times);
      success(`${shiftType}-wekker opgeslagen met ${count} stappen`);
    } finally {
      setBusyWekkerType(null);
    }
  };

  const handleRemoveWekkerPack = async (shiftType: ManagedShiftType) => {
    const confirmed = await openConfirm({
      title: `${shiftType}-wekker verwijderen`,
      message: `Alle automatische wekkerstappen voor ${shiftType}-diensten verwijderen?`,
      confirmLabel: "Verwijderen",
      variant: "danger",
    });
    if (!confirmed) return;

    setBusyWekkerType(shiftType);
    try {
      await removeDienstWekkerPack(shiftType);
      success(`${shiftType}-wekker verwijderd`);
    } finally {
      setBusyWekkerType(null);
    }
  };

  const enabled = automations.filter((a) => a.enabled);
  const disabled = automations.filter((a) => !a.enabled);

  return (
    <div className="text-slate-100">
      <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-background)]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10">
                <Activity size={20} className="text-amber-300" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Smart Home
                </p>
                <h1 className="mt-1 truncate text-2xl font-bold text-white">Automatisering</h1>
                <p className="mt-1 text-sm text-slate-500">
                  {enabled.length} actief · Engine elke 15s
                  {lastCheck && <span className="ml-1 text-slate-600">· {lastCheck}</span>}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={() => setEditingId((v) => (v ? null : "new"))}
                aria-expanded={!!editingId}
                aria-label={editingId ? "Formulier sluiten" : "Nieuwe automatisering toevoegen"}
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition-colors",
                  editingId
                    ? "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]"
                    : "border-amber-500/30 bg-amber-500/15 text-amber-200 hover:bg-amber-500/20"
                )}
              >
                {editingId ? <X size={16} /> : <Plus size={16} />}
                <span className="hidden sm:inline">{editingId ? "Annuleren" : "Toevoegen"}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        <ErrorBoundary>
          <DienstWekkerSection
            automations={automations}
            busyType={busyWekkerType}
            onSave={handleSaveWekkerPack}
            onRemove={handleRemoveWekkerPack}
          />
        </ErrorBoundary>

          {/* Engine status */}
          <div className="glass rounded-xl p-4 flex items-center gap-3 border border-green-500/15">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" aria-hidden="true" />
            <div className="flex-1">
              <p className="text-xs font-medium text-green-400">Automation Engine actief (Go)</p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Draait 24/7 op je lokale server · ook zonder open browser
              </p>
            </div>
            <Activity size={15} className="text-green-400 opacity-60" aria-hidden="true" />
          </div>

          <AnimatePresence>
            {editingId && (
              <AutomationForm 
                initialData={editingId !== "new" ? automations.find(a => a.id === editingId) : undefined} 
                onClose={() => setEditingId(null)} 
                onSave={handleSave} 
              />
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
                      onToggle={() => handleToggle(a)}
                      onEdit={() => setEditingId(a.id)}
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
                      onToggle={() => handleToggle(a)}
                      onEdit={() => setEditingId(a.id)}
                      onDelete={() => handleDelete(a)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          )}

          {automations.length === 0 && !editingId && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3">
                <Activity size={24} className="text-slate-600" />
              </div>
              <h3 className="text-sm font-semibold text-slate-300">Nog geen automatiseringen</h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Voeg een tijdschema toe om lampen automatisch te bedienen.
              </p>
              <button
                onClick={() => setEditingId("new")}
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
