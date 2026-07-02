"use client";

import { useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { Loader2, Plus, Target } from "lucide-react";
import { Modal, ModalCancelButton } from "@/components/ui/Modal";
import type { CompanyItem, ContactItem, LeadForm } from "./LaventeCareTypes";

export function LaventeCareLeadModal({
  isOpen,
  onClose,
  dirty,
  leadForm,
  setLeadForm,
  companies,
  contacts,
  savingLead,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  dirty?: boolean;
  leadForm: LeadForm;
  setLeadForm: Dispatch<SetStateAction<LeadForm>>;
  companies: CompanyItem[];
  contacts: ContactItem[];
  savingLead: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  const companyContacts = contacts.filter((contact) => contact.company_id === leadForm.companyId);
  const dossierSelected = Boolean(leadForm.companyId);
  const [titelError, setTitelError] = useState("");

  // Inline validatie (M28): markeer en focus het titelveld; de page-level
  // handler houdt de toast en blokkeert de daadwerkelijke submit.
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (!leadForm.titel.trim()) {
      setTitelError("Titel is verplicht");
      window.setTimeout(() => document.getElementById("lead-form-titel")?.focus(), 0);
    } else {
      setTitelError("");
    }
    void onSubmit(event);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      dirty={dirty}
      title="Nieuwe lead kwalificeren"
      icon={<Target size={18} className="text-sky-300" />}
      theme="primary"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} noValidate className="grid gap-3 lg:grid-cols-6">
        <label className="block lg:col-span-2">
          <span className="text-xs font-semibold text-slate-400">
            Titel <span className="text-rose-300">*</span>
          </span>
          <input
            id="lead-form-titel"
            required
            aria-invalid={Boolean(titelError)}
            value={leadForm.titel}
            onChange={(event) => setLeadForm((form) => ({ ...form, titel: event.target.value }))}
            placeholder="Bijv. automatisering klantintake"
            className={`mt-1 w-full rounded-lg border bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-600 ${
              titelError
                ? "border-rose-400/60 focus:border-rose-400/60"
                : "border-[var(--color-border)] focus:border-[var(--color-primary)]"
            }`}
          />
          {titelError ? (
            <p className="mt-1 text-xs font-semibold text-rose-300" role="alert">
              {titelError}
            </p>
          ) : null}
        </label>
        <label className="block lg:col-span-2">
          <span className="text-xs font-semibold text-slate-400">Klantdossier</span>
          <select
            value={leadForm.companyId}
            onChange={(event) => {
              const selected = companies.find((company) => company.id === event.target.value);
              setLeadForm((form) => ({
                ...form,
                companyId: event.target.value,
                contactId: "",
                companyName: selected ? selected.naam : form.companyName,
                website: selected?.website ?? form.website,
              }));
            }}
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[var(--color-primary)]"
          >
            <option value="">Nieuw of nog niet gekoppeld</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.naam}
              </option>
            ))}
          </select>
        </label>
        <label className="block lg:col-span-2">
          <span className="text-xs font-semibold text-slate-400">Contact</span>
          <select
            value={leadForm.contactId}
            onChange={(event) => setLeadForm((form) => ({ ...form, contactId: event.target.value }))}
            disabled={!leadForm.companyId || companyContacts.length === 0}
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">Geen contact</option>
            {companyContacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.naam}
                {contact.rol ? ` - ${contact.rol}` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="block lg:col-span-3">
          <span className="text-xs font-semibold text-slate-400">Klant/organisatie</span>
          <input
            value={leadForm.companyName}
            disabled={dossierSelected}
            onChange={(event) => setLeadForm((form) => ({ ...form, companyName: event.target.value }))}
            placeholder="Naam van klant, organisatie of opdrachtgever"
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50"
          />
          {dossierSelected ? (
            <span className="mt-1 block text-[11px] text-slate-500">wordt overgenomen uit klantdossier</span>
          ) : null}
        </label>
        <label className="block lg:col-span-3">
          <span className="text-xs font-semibold text-slate-400">Website</span>
          <input
            value={leadForm.website}
            disabled={dossierSelected}
            onChange={(event) => setLeadForm((form) => ({ ...form, website: event.target.value }))}
            placeholder="https://..."
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50"
          />
          {dossierSelected ? (
            <span className="mt-1 block text-[11px] text-slate-500">wordt overgenomen uit klantdossier</span>
          ) : null}
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
          {/* R11: via de guarded close, zodat de dirty-guard ook hier geldt. */}
          <ModalCancelButton
            onFallback={onClose}
            className="px-4 py-2 text-sm text-slate-300 transition-colors hover:text-white"
          />
          <button type="submit" disabled={savingLead} className="btn btn--primary max-w-[150px] flex-1 justify-center">
            {savingLead ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Opslaan
          </button>
        </div>
      </form>
    </Modal>
  );
}
