"use client";

import type { Dispatch, FormEvent, SetStateAction } from "react";
import { Building2, Loader2, Plus, Save } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import type { CompanyForm } from "./LaventeCareTypes";

export function LaventeCareCompanyModal({
  isOpen,
  onClose,
  companyForm,
  setCompanyForm,
  savingCompany,
  editingCompany,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  companyForm: CompanyForm;
  setCompanyForm: Dispatch<SetStateAction<CompanyForm>>;
  savingCompany: boolean;
  editingCompany: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingCompany ? "Klant bewerken" : "Nieuwe klant"}
      icon={<Building2 size={18} className="text-amber-300" />}
      theme="amber"
      maxWidth="4xl"
    >
      <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-xs font-semibold text-slate-400">Klantdossiernaam</span>
          <input
            value={companyForm.naam}
            onChange={(event) => setCompanyForm((form) => ({ ...form, naam: event.target.value }))}
            placeholder="Klant, organisatie, opdrachtgever of eigen project"
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
          <span className="text-xs font-semibold text-slate-400">Relatietype</span>
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
            <option value="intern">Intern</option>
            <option value="eigen_project">Eigen project</option>
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
            value={companyForm.volgendeActie}
            onChange={(event) => setCompanyForm((form) => ({ ...form, volgendeActie: event.target.value }))}
            placeholder="Bel, review, offerte opvolgen..."
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-amber-500"
          />
        </label>

        <div className="sm:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-normal text-amber-300">Facturatie en contract</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block">
              <span className="text-xs font-semibold text-slate-400">KVK</span>
              <input
                value={companyForm.kvkNumber}
                onChange={(event) => setCompanyForm((form) => ({ ...form, kvkNumber: event.target.value }))}
                placeholder="88162710"
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-amber-500"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-400">BTW</span>
              <input
                value={companyForm.vatNumber}
                onChange={(event) => setCompanyForm((form) => ({ ...form, vatNumber: event.target.value }))}
                placeholder="NL..."
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-amber-500"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-400">Betaaltermijn</span>
              <input
                type="number"
                min={1}
                value={companyForm.paymentTermsDays}
                onChange={(event) => setCompanyForm((form) => ({ ...form, paymentTermsDays: event.target.value ? Number(event.target.value) : "" }))}
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-amber-500"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-400">Factuurmail</span>
              <input
                value={companyForm.billingEmail}
                onChange={(event) => setCompanyForm((form) => ({ ...form, billingEmail: event.target.value }))}
                placeholder="administratie@..."
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-amber-500"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-400">Contractstatus</span>
              <select
                value={companyForm.contractStatus}
                onChange={(event) => setCompanyForm((form) => ({ ...form, contractStatus: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-amber-500"
              >
                <option value="geen_contract">Geen contract</option>
                <option value="voorstel">Voorstel</option>
                <option value="akkoord">Akkoord</option>
                <option value="actief">Actief</option>
                <option value="afgelopen">Afgelopen</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-400">Service level</span>
              <select
                value={companyForm.serviceLevel}
                onChange={(event) => setCompanyForm((form) => ({ ...form, serviceLevel: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-amber-500"
              >
                <option value="basis">Basis</option>
                <option value="pilot">Pilot</option>
                <option value="project">Project</option>
                <option value="beheer">Beheer</option>
                <option value="sla">SLA</option>
              </select>
            </label>
            <label className="block sm:col-span-2 lg:col-span-3">
              <span className="text-xs font-semibold text-slate-400">Factuuradres / referentie</span>
              <input
                value={companyForm.billingAddress}
                onChange={(event) => setCompanyForm((form) => ({ ...form, billingAddress: event.target.value }))}
                placeholder="Factuuradres"
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-amber-500"
              />
              <input
                value={companyForm.billingReference}
                onChange={(event) => setCompanyForm((form) => ({ ...form, billingReference: event.target.value }))}
                placeholder="Referentie, PO of projectcode"
                className="mt-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-amber-500"
              />
            </label>
          </div>
        </div>

        <div className="sm:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-normal text-amber-300">Portaal en compliance</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block">
              <span className="text-xs font-semibold text-slate-400">Voorkeurskanaal</span>
              <input
                value={companyForm.preferredChannel}
                onChange={(event) => setCompanyForm((form) => ({ ...form, preferredChannel: event.target.value }))}
                placeholder="Email, WhatsApp, Teams..."
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-amber-500"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-400">Klantportaal</span>
              <input
                value={companyForm.portalUrl}
                onChange={(event) => setCompanyForm((form) => ({ ...form, portalUrl: event.target.value }))}
                placeholder="https://..."
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-amber-500"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-400">Standaard login</span>
              <input
                value={companyForm.defaultLoginUrl}
                onChange={(event) => setCompanyForm((form) => ({ ...form, defaultLoginUrl: event.target.value }))}
                placeholder="https://.../login"
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-amber-500"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-400">Onboarding</span>
              <select
                value={companyForm.onboardingStatus}
                onChange={(event) => setCompanyForm((form) => ({ ...form, onboardingStatus: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-amber-500"
              >
                <option value="niet_gestart">Niet gestart</option>
                <option value="intake">Intake</option>
                <option value="pilot">Pilot</option>
                <option value="actief">Actief</option>
                <option value="afgerond">Afgerond</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-400">Verwerking/privacy</span>
              <select
                value={companyForm.dataProcessingStatus}
                onChange={(event) => setCompanyForm((form) => ({ ...form, dataProcessingStatus: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-amber-500"
              >
                <option value="niet_nodig">Niet nodig</option>
                <option value="te_controleren">Te controleren</option>
                <option value="verwerkersovereenkomst_nodig">Verwerkersovereenkomst nodig</option>
                <option value="vastgelegd">Vastgelegd</option>
              </select>
            </label>
          </div>
        </div>

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
            {savingCompany ? (
              <Loader2 size={16} className="mr-2 animate-spin" />
            ) : editingCompany ? (
              <Save size={16} className="mr-2" />
            ) : (
              <Plus size={16} className="mr-2" />
            )}
            {editingCompany ? "Opslaan" : "Klant toevoegen"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
