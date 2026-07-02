"use client";

import { useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { Loader2, Plus, Workflow } from "lucide-react";
import { Modal, ModalCancelButton } from "@/components/ui/Modal";
import type { CompanyItem, ProjectItem, WorkstreamForm } from "./LaventeCareTypes";
import { LAVENTECARE_WORKSTREAM_TYPES } from "./LaventeCareTypes";

export function LaventeCareWorkstreamModal({
  isOpen,
  onClose,
  dirty,
  workstreamForm,
  setWorkstreamForm,
  companies,
  projects,
  savingWorkstream,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  dirty?: boolean;
  workstreamForm: WorkstreamForm;
  setWorkstreamForm: Dispatch<SetStateAction<WorkstreamForm>>;
  companies: CompanyItem[];
  projects: ProjectItem[];
  savingWorkstream: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  const filteredProjects = workstreamForm.companyId
    ? projects.filter((project) => project.company_id === workstreamForm.companyId)
    : projects;
  const [titelError, setTitelError] = useState("");

  // Inline validatie (M28/L1): markeer en focus het titelveld; de page-level
  // handler houdt de toast en blokkeert de daadwerkelijke submit.
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (!workstreamForm.titel.trim()) {
      setTitelError("Titel is verplicht");
      window.setTimeout(() => document.getElementById("workstream-form-titel")?.focus(), 0);
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
      title="Nieuwe opdracht"
      icon={<Workflow size={18} className="text-violet-300" />}
      theme="violet"
      maxWidth="3xl"
    >
      <form onSubmit={handleSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-xs font-semibold text-slate-400">
            Titel <span className="text-rose-300">*</span>
          </span>
          <input
            id="workstream-form-titel"
            required
            aria-invalid={Boolean(titelError)}
            value={workstreamForm.titel}
            onChange={(event) => setWorkstreamForm((form) => ({ ...form, titel: event.target.value }))}
            placeholder="Bijv. Integratieonderzoek voor klant"
            className={`mt-1 w-full rounded-lg border bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-600 ${
              titelError
                ? "border-rose-400/60 focus:border-rose-400/60"
                : "border-[var(--color-border)] focus:border-violet-500"
            }`}
          />
          {titelError ? (
            <p className="mt-1 text-xs font-semibold text-rose-300" role="alert">
              {titelError}
            </p>
          ) : null}
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-slate-400">Type</span>
          <select
            value={workstreamForm.type}
            onChange={(event) => setWorkstreamForm((form) => ({ ...form, type: event.target.value }))}
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-violet-500"
          >
            {LAVENTECARE_WORKSTREAM_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-slate-400">Klantdossier</span>
          <select
            value={workstreamForm.companyId}
            onChange={(event) => {
              const selected = companies.find((company) => (company._id ?? company.id) === event.target.value);
              setWorkstreamForm((form) => ({
                ...form,
                companyId: event.target.value,
                klantNaam: selected ? selected.naam : form.klantNaam,
                projectId: projects.some((project) => (project._id ?? project.id) === form.projectId && project.company_id === event.target.value)
                  ? form.projectId
                  : "",
              }));
            }}
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-violet-500"
          >
            <option value="">Nog niet gekoppeld</option>
            {companies.map((company) => (
              <option key={company._id ?? company.id} value={company._id ?? company.id}>
                {company.naam}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-slate-400">Project</span>
          <select
            value={workstreamForm.projectId}
            onChange={(event) => {
              const selectedProject = projects.find((project) => (project._id ?? project.id) === event.target.value);
              const selectedCompany = companies.find((company) => (company._id ?? company.id) === selectedProject?.company_id);
              setWorkstreamForm((form) => ({
                ...form,
                projectId: event.target.value,
                companyId: selectedProject?.company_id ?? form.companyId,
                klantNaam: selectedCompany?.naam ?? form.klantNaam,
              }));
            }}
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-violet-500"
          >
            <option value="">Losse opdracht / later koppelen</option>
            {filteredProjects.map((project) => (
              <option key={project._id ?? project.id} value={project._id ?? project.id}>
                {project.naam}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-slate-400">Losse context</span>
          <input
            value={workstreamForm.klantNaam}
            onChange={(event) => setWorkstreamForm((form) => ({ ...form, klantNaam: event.target.value }))}
            placeholder="Alleen gebruiken als er nog geen klantdossier is"
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-violet-500"
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-slate-400">Status</span>
          <select
            value={workstreamForm.status}
            onChange={(event) => setWorkstreamForm((form) => ({ ...form, status: event.target.value }))}
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-violet-500"
          >
            <option value="nieuw">Nieuw</option>
            <option value="intake">Intake</option>
            <option value="analyse">Analyse</option>
            <option value="uitvoering">Uitvoering</option>
            <option value="wacht_op_klant">Wacht op klant</option>
            <option value="afgerond">Afgerond</option>
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-slate-400">Prioriteit</span>
          <select
            value={workstreamForm.prioriteit}
            onChange={(event) =>
              setWorkstreamForm((form) => ({ ...form, prioriteit: event.target.value as WorkstreamForm["prioriteit"] }))
            }
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-violet-500"
          >
            <option value="laag">Laag</option>
            <option value="normaal">Normaal</option>
            <option value="hoog">Hoog</option>
          </select>
        </label>

        <label className="block sm:col-span-2">
          <span className="text-xs font-semibold text-slate-400">Doel</span>
          <textarea
            value={workstreamForm.doel}
            onChange={(event) => setWorkstreamForm((form) => ({ ...form, doel: event.target.value }))}
            placeholder="Wat moet deze opdracht opleveren?"
            rows={2}
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-violet-500"
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-slate-400">Scope</span>
          <textarea
            value={workstreamForm.scope}
            onChange={(event) => setWorkstreamForm((form) => ({ ...form, scope: event.target.value }))}
            placeholder="Wat valt binnen deze opdracht?"
            rows={3}
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-violet-500"
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-slate-400">Deliverable</span>
          <textarea
            value={workstreamForm.deliverable}
            onChange={(event) => setWorkstreamForm((form) => ({ ...form, deliverable: event.target.value }))}
            placeholder="Quickscan, advies, fix, implementatie, overdracht..."
            rows={3}
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-violet-500"
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-slate-400">Deadline</span>
          <input
            type="date"
            value={workstreamForm.deadline}
            onChange={(event) => setWorkstreamForm((form) => ({ ...form, deadline: event.target.value }))}
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-violet-500"
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-slate-400">Volgende stap</span>
          <input
            value={workstreamForm.volgendeStap}
            onChange={(event) => setWorkstreamForm((form) => ({ ...form, volgendeStap: event.target.value }))}
            placeholder="Concrete eerstvolgende actie"
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-violet-500"
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-slate-400">Geschatte minuten</span>
          <input
            type="number"
            value={workstreamForm.geschatteMinuten}
            onChange={(event) =>
              setWorkstreamForm((form) => ({ ...form, geschatteMinuten: event.target.value ? Number(event.target.value) : "" }))
            }
            placeholder="Bijv. 120"
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-violet-500"
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-slate-400">Waarde indicatie</span>
          <input
            type="number"
            value={workstreamForm.waardeIndicatie}
            onChange={(event) =>
              setWorkstreamForm((form) => ({ ...form, waardeIndicatie: event.target.value ? Number(event.target.value) : "" }))
            }
            placeholder="Bijv. 350"
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-violet-500"
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-slate-400">Stack-tags</span>
          <input
            value={workstreamForm.stackTags}
            onChange={(event) => setWorkstreamForm((form) => ({ ...form, stackTags: event.target.value }))}
            placeholder="cms, api, webhook, automation"
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-violet-500"
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-slate-400">Labels</span>
          <input
            value={workstreamForm.tags}
            onChange={(event) => setWorkstreamForm((form) => ({ ...form, tags: event.target.value }))}
            placeholder="quickscan, klantvraag, support"
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-violet-500"
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="text-xs font-semibold text-slate-400">Bevindingen</span>
          <textarea
            value={workstreamForm.bevindingen}
            onChange={(event) => setWorkstreamForm((form) => ({ ...form, bevindingen: event.target.value }))}
            placeholder="Eerste observaties of later bij te werken bevindingen"
            rows={3}
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-violet-500"
          />
        </label>

        <div className="mt-4 flex justify-end border-t border-white/5 pt-4 sm:col-span-2">
          {/* R11: via de guarded close, zodat de dirty-guard ook hier geldt. */}
          <ModalCancelButton
            onFallback={onClose}
            className="mr-3 px-4 py-2 text-sm text-slate-300 transition-colors hover:text-white"
          />
          <button type="submit" disabled={savingWorkstream} className="btn border-transparent bg-violet-500 px-6 text-white hover:bg-violet-600">
            {savingWorkstream ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Plus size={16} className="mr-2" />}
            Opdracht toevoegen
          </button>
        </div>
      </form>
    </Modal>
  );
}
