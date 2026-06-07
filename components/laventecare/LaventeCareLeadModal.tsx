"use client";

import type { Dispatch, FormEvent, SetStateAction } from "react";
import { Loader2, Plus, Target } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import type { LeadForm } from "./LaventeCareTypes";

export function LaventeCareLeadModal({
  isOpen,
  onClose,
  leadForm,
  setLeadForm,
  savingLead,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  leadForm: LeadForm;
  setLeadForm: Dispatch<SetStateAction<LeadForm>>;
  savingLead: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nieuwe lead kwalificeren"
      icon={<Target size={18} className="text-sky-300" />}
      theme="primary"
      maxWidth="2xl"
    >
      <form onSubmit={onSubmit} className="grid gap-3 lg:grid-cols-6">
        <label className="block lg:col-span-2">
          <span className="text-xs font-semibold text-slate-400">Titel</span>
          <input
            value={leadForm.titel}
            onChange={(event) => setLeadForm((form) => ({ ...form, titel: event.target.value }))}
            placeholder="Bijv. automatisering klantintake"
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-[var(--color-primary)]"
          />
        </label>
        <label className="block lg:col-span-2">
          <span className="text-xs font-semibold text-slate-400">Bedrijf</span>
          <input
            value={leadForm.companyName}
            onChange={(event) => setLeadForm((form) => ({ ...form, companyName: event.target.value }))}
            placeholder="Bedrijfsnaam"
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-[var(--color-primary)]"
          />
        </label>
        <label className="block lg:col-span-2">
          <span className="text-xs font-semibold text-slate-400">Website</span>
          <input
            value={leadForm.website}
            onChange={(event) => setLeadForm((form) => ({ ...form, website: event.target.value }))}
            placeholder="https://..."
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-[var(--color-primary)]"
          />
        </label>
        <label className="block lg:col-span-3">
          <span className="text-xs font-semibold text-slate-400">Pijnpunt</span>
          <textarea
            value={leadForm.pijnpunt}
            onChange={(event) => setLeadForm((form) => ({ ...form, pijnpunt: event.target.value }))}
            placeholder="Welke workflow, foutkans of groeirem speelt er?"
            rows={3}
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-[var(--color-primary)]"
          />
        </label>
        <label className="block lg:col-span-3">
          <span className="text-xs font-semibold text-slate-400">Volgende stap</span>
          <textarea
            value={leadForm.volgendeStap}
            onChange={(event) => setLeadForm((form) => ({ ...form, volgendeStap: event.target.value }))}
            placeholder="Bijv. discovery-call plannen"
            rows={3}
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-[var(--color-primary)]"
          />
        </label>
        <div className="mt-2 flex items-end justify-end gap-3 lg:col-span-6">
          <label className="block max-w-[200px] flex-1">
            <span className="text-xs font-semibold text-slate-400">Prioriteit</span>
            <select
              value={leadForm.prioriteit}
              onChange={(event) =>
                setLeadForm((form) => ({ ...form, prioriteit: event.target.value as LeadForm["prioriteit"] }))
              }
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[var(--color-primary)]"
            >
              <option value="laag">Laag</option>
              <option value="normaal">Normaal</option>
              <option value="hoog">Hoog</option>
            </select>
          </label>
          <button type="submit" disabled={savingLead} className="btn btn--primary max-w-[150px] flex-1 justify-center">
            {savingLead ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Opslaan
          </button>
        </div>
      </form>
    </Modal>
  );
}

