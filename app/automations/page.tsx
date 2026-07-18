"use client";

import { useRef, useState } from "react";
import { Plus, X, Activity } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { useAutomations } from "@/hooks/useAutomations";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { AppIcon } from "@/components/ui/AppIcon";
import { FeedbackState } from "@/components/ui/FeedbackState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Surface } from "@/components/ui/Surface";
import { ErrorState } from "@/components/dashboard/DashboardPrimitives";
import { AutomationCard } from "@/components/automations/AutomationCard";
import { AutomationForm, type AutomationFormHandle } from "@/components/automations/AutomationForm";
import { DienstWekkerSection } from "@/components/automations/DienstWekkerSection";
import { type Automation, type DienstWekkerTimes, type ShiftType } from "@/lib/automations";
import {
  AppPageHeader,
  AppPageShell,
} from "@/components/layout/AppPageShell";

type ManagedShiftType = Exclude<ShiftType, "any">;

export default function AutomationsPage() {
  const { automations, add, update, addDienstWekkerPack, removeDienstWekkerPack, toggle, remove, isLoading, isError, refetch } =
    useAutomations();
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [busyWekkerType, setBusyWekkerType] = useState<ManagedShiftType | null>(null);
  const [togglingIds, setTogglingIds] = useState<string[]>([]);
  const formRef = useRef<AutomationFormHandle>(null);
  const { openConfirm } = useConfirm();
  const { success, error } = useToast();

  // Header-toggle: bij een open formulier via de dirty-guarded requestClose
  // sluiten (mirror van Escape/backdrop/X), niet de state hard resetten.
  const handleHeaderToggle = () => {
    if (editingId) {
      formRef.current?.requestClose();
    } else {
      setEditingId("new");
    }
  };

  // Het formulier awaicht deze promise: pas sluiten bij succes. Een fout
  // bubbelt naar AutomationForm, dat open blijft en zelf een inline
  // foutmelding toont — géén page-level toast erbovenop (dubbele feedback).
  const handleSave = async (data: Parameters<typeof add>[0]) => {
    const isNew = editingId === "new";
    const target = editingId;
    if (isNew) {
      await add(data);
      success(`Automatisering '${data.name}' aangemaakt`);
    } else if (target) {
      await update(target, data);
      success(`Automatisering '${data.name}' bijgewerkt`);
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
    setTogglingIds((ids) => [...ids, a.id]);
    try {
      await toggle(a.id);
    } catch {
      error(`Schakelen van '${a.name}' mislukt`);
    } finally {
      setTogglingIds((ids) => ids.filter((id) => id !== a.id));
    }
  };

  const handleSaveWekkerPack = async (shiftType: ManagedShiftType, times: DienstWekkerTimes) => {
    setBusyWekkerType(shiftType);
    try {
      const count = await addDienstWekkerPack(shiftType, times);
      success(`${shiftType}-wekker opgeslagen met ${count} stappen`);
    } catch (err) {
      error(err instanceof Error ? err.message : `${shiftType}-wekker opslaan mislukt`);
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
    } catch (err) {
      error(err instanceof Error ? err.message : `${shiftType}-wekker verwijderen mislukt`);
    } finally {
      setBusyWekkerType(null);
    }
  };


  const enabled = automations.filter((a) => a.enabled);
  const disabled = automations.filter((a) => !a.enabled);

  return (
    <AppPageShell width="standard" className="space-y-5">
      <AppPageHeader
        eyebrow="Smart home"
        title="Automatisering"
        description={enabled.length + " actief · " + automations.length + " totaal"}
        leading={
          <AppIcon name="automations" tone="accent" size="lg" framed />
        }
        actions={
          <Button
            variant={editingId ? "secondary" : "warning"}
            onClick={handleHeaderToggle}
            aria-expanded={Boolean(editingId)}
            aria-label={editingId ? "Formulier sluiten" : "Nieuwe automatisering toevoegen"}
          >
            {editingId ? <X size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
            {editingId ? "Annuleren" : "Toevoegen"}
          </Button>
        }
      />

      <div className="space-y-5">
        <ErrorBoundary>
          <DienstWekkerSection
            automations={automations}
            busyType={busyWekkerType}
            // Opslaan/verwijderen pas toestaan als de lijst betrouwbaar geladen
            // is: tijdens load/fout is `docs` leeg → oude pack-ids onvindbaar →
            // opslaan zou een dubbel pack aanmaken (fix 8a).
            listReady={!isLoading && !isError}
            onSave={handleSaveWekkerPack}
            onRemove={handleRemoveWekkerPack}
          />
        </ErrorBoundary>

          {/* Engine status — weerspiegelt de echte querystatus (M10) */}
          {isError ? (
            <Surface tone="danger" padding="sm" radius="md" className="flex items-center gap-3" role="status">
              <AppIcon name="activity" tone="danger" size="sm" framed />
              <div className="flex-1">
                <p className="text-xs font-medium text-[var(--color-danger)]">
                  Engine niet bereikbaar — status onbekend
                </p>
                <p className="mt-0.5 text-micro text-[var(--color-text-muted)]">
                  De automatiseringen konden niet worden opgehaald · wekkers gaan mogelijk niet af
                </p>
              </div>
              <Badge tone="danger" size="sm">Onbekend</Badge>
            </Surface>
          ) : (
            <Surface tone="success" padding="sm" radius="md" className="flex items-center gap-3" role="status">
              <AppIcon name="activity" tone="success" size="sm" framed />
              <div className="flex-1">
                {/* L2: eerlijk claimen wat we écht weten — de API antwoordt;
                    of de engine-loop zelf draait, weten we hier niet. */}
                <p className="text-xs font-medium text-[var(--color-success)]">Automations-API bereikbaar</p>
                <p className="mt-0.5 text-micro text-[var(--color-text-muted)]">
                  Engine draait 24/7 in de cloud (Render) · ook zonder open browser
                </p>
              </div>
              <Badge tone="success" size="sm">Online</Badge>
            </Surface>
          )}

          <AnimatePresence>
            {editingId && (
              <AutomationForm
                ref={formRef}
                initialData={editingId !== "new" ? automations.find(a => a.id === editingId) : undefined}
                existing={automations}
                onClose={() => setEditingId(null)}
                onSave={handleSave}
              />
            )}
          </AnimatePresence>

          {enabled.length > 0 && (
            <section aria-label="Actieve automatiseringen">
              <p className="text-micro text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
                Actief ({enabled.length})
              </p>
              <div className="space-y-2">
                <AnimatePresence>
                  {enabled.map((a) => (
                    <AutomationCard
                      key={a.id}
                      automation={a}
                      togglePending={togglingIds.includes(a.id)}
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
              <p className="text-micro text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
                Uitgeschakeld ({disabled.length})
              </p>
              <div className="space-y-2">
                <AnimatePresence>
                  {disabled.map((a) => (
                    <AutomationCard
                      key={a.id}
                      automation={a}
                      togglePending={togglingIds.includes(a.id)}
                      onToggle={() => handleToggle(a)}
                      onEdit={() => setEditingId(a.id)}
                      onDelete={() => handleDelete(a)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          )}

          {isError ? (
            <div className="py-6">
              <ErrorState
                onRetry={refetch}
                text="De automatiseringen konden niet worden geladen. Probeer het opnieuw."
              />
            </div>
          ) : isLoading ? (
            <div className="space-y-2 py-4">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : automations.length === 0 && !editingId ? (
            <FeedbackState
              title="Nog geen automatiseringen"
              description="Voeg een tijdschema toe om lampen automatisch te bedienen."
              icon={Activity}
              action={
                <Button className="mt-4" variant="primary" onClick={() => setEditingId("new")}>
                  <Plus size={13} aria-hidden="true" />
                  Eerste automatisering
                </Button>
              }
            />
          ) : null}
      </div>
    </AppPageShell>
  );
}
