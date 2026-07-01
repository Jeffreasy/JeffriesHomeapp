"use client";

import { useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { Loader2, Plus, Save, UserRound } from "lucide-react";
import { Modal, ModalCancelButton } from "@/components/ui/Modal";
import type { CompanyItem, ContactForm } from "./LaventeCareTypes";

export function LaventeCareContactModal({
  isOpen,
  onClose,
  dirty,
  contactForm,
  setContactForm,
  companies,
  savingContact,
  editingContact,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  dirty?: boolean;
  contactForm: ContactForm;
  setContactForm: Dispatch<SetStateAction<ContactForm>>;
  companies: CompanyItem[];
  savingContact: boolean;
  editingContact: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  const [companyError, setCompanyError] = useState("");
  const [naamError, setNaamError] = useState("");

  // Inline validatie (M28/L1): markeer en focus het schuldige veld; de
  // page-level handler houdt de toast en blokkeert de daadwerkelijke submit.
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    const missingCompany = !contactForm.companyId;
    const missingNaam = !contactForm.naam.trim();
    setCompanyError(missingCompany ? "Koppel de contactpersoon aan een klant" : "");
    setNaamError(missingNaam ? "Naam is verplicht" : "");
    if (missingCompany || missingNaam) {
      window.setTimeout(
        () => document.getElementById(missingCompany ? "contact-form-company" : "contact-form-naam")?.focus(),
        0,
      );
    }
    void onSubmit(event);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      dirty={dirty}
      title={editingContact ? "Contactpersoon bewerken" : "Contactpersoon toevoegen"}
      icon={<UserRound size={18} className="text-sky-300" />}
      theme="sky"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-xs font-semibold text-slate-400">
            Klant <span className="text-rose-300">*</span>
          </span>
          <select
            id="contact-form-company"
            required
            aria-invalid={Boolean(companyError)}
            value={contactForm.companyId}
            onChange={(event) => setContactForm((form) => ({ ...form, companyId: event.target.value }))}
            className={`mt-1 w-full rounded-lg border bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors ${
              companyError
                ? "border-rose-400/60 focus:border-rose-400/60"
                : "border-[var(--color-border)] focus:border-sky-500"
            }`}
          >
            <option value="">Geen klant gekoppeld</option>
            {companies.map((company) => (
              <option key={company._id ?? company.id} value={company._id ?? company.id}>
                {company.naam}
              </option>
            ))}
          </select>
          {companyError ? (
            <p className="mt-1 text-xs font-semibold text-rose-300" role="alert">
              {companyError}
            </p>
          ) : null}
        </label>

        <label className="block sm:col-span-2">
          <span className="text-xs font-semibold text-slate-400">
            Naam <span className="text-rose-300">*</span>
          </span>
          <input
            id="contact-form-naam"
            required
            aria-invalid={Boolean(naamError)}
            value={contactForm.naam}
            onChange={(event) => setContactForm((form) => ({ ...form, naam: event.target.value }))}
            placeholder="Naam contactpersoon"
            className={`mt-1 w-full rounded-lg border bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-600 ${
              naamError
                ? "border-rose-400/60 focus:border-rose-400/60"
                : "border-[var(--color-border)] focus:border-sky-500"
            }`}
          />
          {naamError ? (
            <p className="mt-1 text-xs font-semibold text-rose-300" role="alert">
              {naamError}
            </p>
          ) : null}
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

        <label className="block">
          <span className="text-xs font-semibold text-slate-400">Rol</span>
          <input
            value={contactForm.rol}
            onChange={(event) => setContactForm((form) => ({ ...form, rol: event.target.value }))}
            placeholder="Eigenaar, projectleider, financieel contact..."
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-sky-500"
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-slate-400">Beslisrol</span>
          <select
            value={contactForm.decisionRole}
            onChange={(event) => setContactForm((form) => ({ ...form, decisionRole: event.target.value }))}
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-sky-500"
          >
            <option value="">Niet vastgelegd</option>
            <option value="beslisser">Beslisser</option>
            <option value="beinvloeder">Beinvloeder</option>
            <option value="gebruiker">Gebruiker</option>
            <option value="financieel">Financieel</option>
            <option value="technisch">Technisch</option>
          </select>
        </label>

        <label className="block sm:col-span-2">
          <span className="text-xs font-semibold text-slate-400">Voorkeurskanaal</span>
          <input
            value={contactForm.preferredChannel}
            onChange={(event) => setContactForm((form) => ({ ...form, preferredChannel: event.target.value }))}
            placeholder="Email, telefoon, WhatsApp, Teams..."
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
          {/* R11: via de guarded close, zodat de dirty-guard ook hier geldt. */}
          <ModalCancelButton
            onFallback={onClose}
            className="inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold text-slate-300 transition-colors hover:text-white"
          />
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
