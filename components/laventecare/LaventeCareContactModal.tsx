"use client";

import type { Dispatch, FormEvent, SetStateAction } from "react";
import { Loader2, Plus, Save, UserRound } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import type { CompanyItem, ContactForm } from "./LaventeCareTypes";

export function LaventeCareContactModal({
  isOpen,
  onClose,
  contactForm,
  setContactForm,
  companies,
  savingContact,
  editingContact,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  contactForm: ContactForm;
  setContactForm: Dispatch<SetStateAction<ContactForm>>;
  companies: CompanyItem[];
  savingContact: boolean;
  editingContact: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingContact ? "Contactpersoon bewerken" : "Contactpersoon toevoegen"}
      icon={<UserRound size={18} className="text-sky-300" />}
      theme="sky"
      maxWidth="2xl"
    >
      <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-xs font-semibold text-slate-400">Klant</span>
          <select
            value={contactForm.companyId}
            onChange={(event) => setContactForm((form) => ({ ...form, companyId: event.target.value }))}
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-sky-500"
          >
            <option value="">Geen klant gekoppeld</option>
            {companies.map((company) => (
              <option key={company._id ?? company.id} value={company._id ?? company.id}>
                {company.naam}
              </option>
            ))}
          </select>
        </label>

        <label className="block sm:col-span-2">
          <span className="text-xs font-semibold text-slate-400">Naam</span>
          <input
            value={contactForm.naam}
            onChange={(event) => setContactForm((form) => ({ ...form, naam: event.target.value }))}
            placeholder="Naam contactpersoon"
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-sky-500"
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-slate-400">E-mail</span>
          <input
            type="email"
            value={contactForm.email}
            onChange={(event) => setContactForm((form) => ({ ...form, email: event.target.value }))}
            placeholder="naam@bedrijf.nl"
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-sky-500"
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-slate-400">Telefoon</span>
          <input
            value={contactForm.telefoon}
            onChange={(event) => setContactForm((form) => ({ ...form, telefoon: event.target.value }))}
            placeholder="+31..."
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-sky-500"
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="text-xs font-semibold text-slate-400">Rol</span>
          <input
            value={contactForm.rol}
            onChange={(event) => setContactForm((form) => ({ ...form, rol: event.target.value }))}
            placeholder="Eigenaar, projectleider, financieel contact..."
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-sky-500"
          />
        </label>

        <label className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-3 sm:col-span-2">
          <input
            type="checkbox"
            checked={contactForm.isPrimary}
            onChange={(event) => setContactForm((form) => ({ ...form, isPrimary: event.target.checked }))}
            className="h-4 w-4 rounded border-white/20 bg-slate-950 text-sky-500 focus:ring-sky-500"
          />
          <span className="text-sm font-semibold text-slate-200">Primaire contactpersoon voor deze klant</span>
        </label>

        <label className="block sm:col-span-2">
          <span className="text-xs font-semibold text-slate-400">Notities</span>
          <textarea
            value={contactForm.notities}
            onChange={(event) => setContactForm((form) => ({ ...form, notities: event.target.value }))}
            placeholder="Communicatievoorkeur, rol in traject, afspraken of bijzonderheden"
            rows={4}
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-sky-500"
          />
        </label>

        <div className="sticky bottom-0 -mx-5 -mb-5 mt-2 flex flex-col-reverse gap-2 border-t border-white/5 bg-[rgba(15,23,42,0.96)] px-5 py-4 backdrop-blur sm:col-span-2 sm:-mx-6 sm:-mb-6 sm:flex-row sm:justify-end sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold text-slate-300 transition-colors hover:text-white"
          >
            Annuleren
          </button>
          <button
            type="submit"
            disabled={savingContact}
            className="btn border-transparent bg-sky-500 px-6 text-slate-950 hover:bg-sky-400"
          >
            {savingContact ? (
              <Loader2 size={16} className="mr-2 animate-spin" />
            ) : editingContact ? (
              <Save size={16} className="mr-2" />
            ) : (
              <Plus size={16} className="mr-2" />
            )}
            {editingContact ? "Opslaan" : "Contact toevoegen"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
