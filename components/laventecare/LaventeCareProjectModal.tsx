"use client";

import type { Dispatch, FormEvent, SetStateAction } from "react";
import { FolderKanban, Loader2, Plus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import type { CompanyItem, ProjectForm } from "./LaventeCareTypes";

export function LaventeCareProjectModal({
  isOpen,
  onClose,
  projectForm,
  setProjectForm,
  companies,
  savingProject,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  projectForm: ProjectForm;
  setProjectForm: Dispatch<SetStateAction<ProjectForm>>;
  companies: CompanyItem[];
  savingProject: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nieuw project toevoegen"
      icon={<FolderKanban size={18} className="text-emerald-300" />}
      theme="emerald"
      maxWidth="2xl"
    >
      <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-xs font-semibold text-slate-400">Bestaande klant</span>
          <select
            value={projectForm.companyId}
            onChange={(event) => {
              const selected = companies.find((company) => company.id === event.target.value);
              setProjectForm((form) => ({
                ...form,
                companyId: event.target.value,
                companyName: selected ? selected.naam : form.companyName,
                website: selected?.website ?? form.website,
              }));
            }}
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-emerald-500"
          >
            <option value="">Nieuwe/geen klant</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.naam}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-slate-400">Naam</span>
          <input
            value={projectForm.naam}
            onChange={(event) => setProjectForm((form) => ({ ...form, naam: event.target.value }))}
            placeholder="Naam van het project"
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-emerald-500"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-slate-400">Nieuwe klantnaam</span>
          <input
            value={projectForm.companyName}
            onChange={(event) => setProjectForm((form) => ({ ...form, companyName: event.target.value }))}
            placeholder="Alleen invullen bij nieuwe klant"
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-emerald-500"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-slate-400">Website</span>
          <input
            value={projectForm.website}
            onChange={(event) => setProjectForm((form) => ({ ...form, website: event.target.value }))}
            placeholder="https://..."
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-emerald-500"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-slate-400">Fase</span>
          <select
            value={projectForm.fase}
            onChange={(event) => setProjectForm((form) => ({ ...form, fase: event.target.value }))}
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-emerald-500"
          >
            <option value="intake">Intake</option>
            <option value="discovery">Discovery</option>
            <option value="blueprint">Blueprint</option>
            <option value="realisatie">Realisatie</option>
            <option value="sla">SLA en beheer</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-slate-400">Waarde indicatie</span>
          <input
            type="number"
            value={projectForm.waardeIndicatie}
            onChange={(event) =>
              setProjectForm((form) => ({
                ...form,
                waardeIndicatie: event.target.value ? Number(event.target.value) : "",
              }))
            }
            placeholder="Bijv. 1500"
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-emerald-500"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-slate-400">Deadline</span>
          <input
            type="date"
            value={projectForm.deadline}
            onChange={(event) => setProjectForm((form) => ({ ...form, deadline: event.target.value }))}
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-emerald-500"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-xs font-semibold text-slate-400">Samenvatting</span>
          <textarea
            value={projectForm.samenvatting}
            onChange={(event) => setProjectForm((form) => ({ ...form, samenvatting: event.target.value }))}
            placeholder="Waar gaat het project over?"
            rows={3}
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-emerald-500"
          />
        </label>
        <div className="mt-4 flex justify-end border-t border-white/5 pt-4 sm:col-span-2">
          <button
            type="button"
            onClick={onClose}
            className="mr-3 px-4 py-2 text-sm text-slate-300 transition-colors hover:text-white"
          >
            Annuleren
          </button>
          <button type="submit" disabled={savingProject} className="btn border-transparent bg-emerald-500 px-6 text-white hover:bg-emerald-600">
            {savingProject ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Plus size={16} className="mr-2" />}
            Project toevoegen
          </button>
        </div>
      </form>
    </Modal>
  );
}
