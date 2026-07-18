"use client";

import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { FolderKanban, Plus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { ModalCancelButton } from "@/components/ui/ModalCancelButton";
import type { CompanyItem, ProjectForm } from "./LaventeCareTypes";
import { LAVENTECARE_PROJECT_PHASES, LAVENTECARE_PROJECT_STATUSES } from "./LaventeCareTypes";

const PROJECT_FORM_ID = "laventecare-project-form";

export function LaventeCareProjectModal({
  isOpen,
  onClose,
  dirty,
  projectForm,
  setProjectForm,
  companies,
  savingProject,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  dirty?: boolean;
  projectForm: ProjectForm;
  setProjectForm: Dispatch<SetStateAction<ProjectForm>>;
  companies: CompanyItem[];
  savingProject: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  const dossierSelected = Boolean(projectForm.companyId);
  const [naamError, setNaamError] = useState("");

  // Inline validatie (M28): markeer en focus het naamveld; de page-level
  // handler houdt de toast en blokkeert de daadwerkelijke submit.
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (!projectForm.naam.trim()) {
      setNaamError("Naam is verplicht");
      window.setTimeout(() => document.getElementById("project-form-name")?.focus(), 0);
    } else {
      setNaamError("");
    }
    void onSubmit(event);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      dirty={dirty}
      title="Nieuw project toevoegen"
      icon={<FolderKanban size={18} className="text-[var(--color-success)]" />}
      tone="success"
      maxWidth="2xl"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <ModalCancelButton onFallback={onClose} className="w-full sm:w-auto" />
          <Button
            type="submit"
            form={PROJECT_FORM_ID}
            variant="successSolid"
            loading={savingProject}
            loadingLabel="Project toevoegen…"
            className="w-full px-6 sm:w-auto"
          >
            <Plus size={16} aria-hidden="true" />
            Project toevoegen
          </Button>
        </div>
      }
    >
      <form id={PROJECT_FORM_ID} onSubmit={handleSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
        <FormField
          id="project-form-company"
          label="Bestaande klant"
          className="sm:col-span-2"
        >
          {(controlProps) => (
            <Select
              {...controlProps}
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
            >
              <option value="">Nieuwe/geen klant</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.naam}
                </option>
              ))}
            </Select>
          )}
        </FormField>
        <FormField
          id="project-form-name"
          label={<>Naam <span aria-hidden="true" className="text-[var(--color-danger)]">*</span></>}
          error={naamError || undefined}
        >
          {(controlProps) => (
            <Input
              {...controlProps}
              required
              invalid={Boolean(naamError)}
              value={projectForm.naam}
              onChange={(event) => setProjectForm((form) => ({ ...form, naam: event.target.value }))}
              placeholder="Naam van het project"
            />
          )}
        </FormField>
        <FormField
          id="project-form-company-name"
          label="Nieuwe klantnaam"
          description={dossierSelected ? "Wordt overgenomen uit klantdossier" : undefined}
        >
          {(controlProps) => (
            <Input
              {...controlProps}
              value={projectForm.companyName}
              disabled={dossierSelected}
              onChange={(event) => setProjectForm((form) => ({ ...form, companyName: event.target.value }))}
              placeholder="Alleen invullen bij nieuwe klant"
            />
          )}
        </FormField>
        <FormField
          id="project-form-website"
          label="Website"
          description={dossierSelected ? "Wordt overgenomen uit klantdossier" : undefined}
        >
          {(controlProps) => (
            <Input
              {...controlProps}
              value={projectForm.website}
              disabled={dossierSelected}
              onChange={(event) => setProjectForm((form) => ({ ...form, website: event.target.value }))}
              placeholder="https://..."
            />
          )}
        </FormField>
        <FormField
          id="project-form-phase"
          label="Fase"
        >
          {(controlProps) => (
            <Select
              {...controlProps}
              value={projectForm.fase}
              onChange={(event) => setProjectForm((form) => ({ ...form, fase: event.target.value }))}
            >
              {LAVENTECARE_PROJECT_PHASES.map((phase) => (
                <option key={phase.value} value={phase.value}>
                  {phase.label}
                </option>
              ))}
            </Select>
          )}
        </FormField>
        <FormField
          id="project-form-status"
          label="Status"
        >
          {(controlProps) => (
            <Select
              {...controlProps}
              value={projectForm.status}
              onChange={(event) => setProjectForm((form) => ({ ...form, status: event.target.value }))}
            >
              {LAVENTECARE_PROJECT_STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </Select>
          )}
        </FormField>
        <FormField
          id="project-form-estimated-value"
          label="Waarde indicatie"
        >
          {(controlProps) => (
            <Input
              {...controlProps}
              type="number"
              value={projectForm.waardeIndicatie}
              onChange={(event) =>
                setProjectForm((form) => ({
                  ...form,
                  waardeIndicatie: event.target.value ? Number(event.target.value) : "",
                }))
              }
              placeholder="Bijv. 1500"
            />
          )}
        </FormField>
        <FormField
          id="project-form-deadline"
          label="Deadline"
        >
          {(controlProps) => (
            <Input
              {...controlProps}
              type="date"
              value={projectForm.deadline}
              onChange={(event) => setProjectForm((form) => ({ ...form, deadline: event.target.value }))}
            />
          )}
        </FormField>
        <FormField
          id="project-form-summary"
          label="Samenvatting"
          className="sm:col-span-2"
        >
          {(controlProps) => (
            <Textarea
              {...controlProps}
              value={projectForm.samenvatting}
              onChange={(event) => setProjectForm((form) => ({ ...form, samenvatting: event.target.value }))}
              placeholder="Waar gaat het project over?"
              rows={3}
            />
          )}
        </FormField>
      </form>
    </Modal>
  );
}
