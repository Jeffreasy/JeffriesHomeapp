"use client";

import type { Dispatch, FormEvent, SetStateAction } from "react";
import { Building2, Loader2, Plus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import type { CompanyForm } from "./LaventeCareTypes";

export function LaventeCareCompanyModal({
  isOpen,
  onClose,
  companyForm,
  setCompanyForm,
  savingCompany,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  companyForm: CompanyForm;
  setCompanyForm: Dispatch<SetStateAction<CompanyForm>>;
  savingCompany: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nieuwe klant"
      icon={<Building2 size={18} className="text-amber-300" />}
      theme="amber"
      maxWidth="2xl"
    >
      <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-xs font-semibold text-slate-400">Klantnaam</span>
          <input
            value={companyForm.naam}
            onChange={(event) => setCompanyForm((form) => ({ ...form, naam: event.target.value }))}
            placeholder="Bedrijf, organisatie of opdrachtgever"
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-amber-500"
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-slate-400">Website</span>
          <input
            value={companyForm.website}
            onChange={(event) => setCompanyForm((form) => ({ ...form, website: event.target.value }))}
            placeholder="https://..."
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-amber-500"
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-slate-400">Sector</span>
          <input
            value={companyForm.sector}
            onChange={(event) => setCompanyForm((form) => ({ ...form, sector: event.target.value }))}
            placeholder="Zorg, mkb, e-commerce..."
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-amber-500"
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-slate-400">Relatie</span>
          <select
            value={companyForm.relatieType}
            onChange={(event) =>
              setCompanyForm((form) => ({ ...form, relatieType: event.target.value as CompanyForm["relatieType"] }))
            }
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-amber-500"
          >
            <option value="prospect">Prospect</option>
            <option value="klant">Klant</option>
            <option value="partner">Partner</option>
            <option value="leverancier">Leverancier</option>
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-slate-400">Status</span>
          <select
            value={companyForm.status}
            onChange={(event) =>
              setCompanyForm((form) => ({ ...form, status: event.target.value as CompanyForm["status"] }))
            }
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-amber-500"
          >
            <option value="actief">Actief</option>
            <option value="prospect">Prospect</option>
            <option value="inactief">Inactief</option>
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-slate-400">Volgende actie</span>
          <input
            type="date"
            value={companyForm.volgendeActie}
            onChange={(event) => setCompanyForm((form) => ({ ...form, volgendeActie: event.target.value }))}
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-amber-500"
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="text-xs font-semibold text-slate-400">Notities</span>
          <textarea
            value={companyForm.notities}
            onChange={(event) => setCompanyForm((form) => ({ ...form, notities: event.target.value }))}
            placeholder="Relatiecontext, afspraken, bijzonderheden of aandachtspunten"
            rows={4}
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-amber-500"
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
            disabled={savingCompany}
            className="btn border-transparent bg-amber-500 px-6 text-slate-950 hover:bg-amber-400"
          >
            {savingCompany ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Plus size={16} className="mr-2" />}
            Klant toevoegen
          </button>
        </div>
      </form>
    </Modal>
  );
}
