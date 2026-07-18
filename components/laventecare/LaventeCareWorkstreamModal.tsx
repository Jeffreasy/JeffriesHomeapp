"use client";

import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { Plus, Workflow } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { ModalCancelButton } from "@/components/ui/ModalCancelButton";
import type { CompanyItem, ProjectItem, WorkstreamForm } from "./LaventeCareTypes";
import { LAVENTECARE_WORKSTREAM_TYPES } from "./LaventeCareTypes";

const WORKSTREAM_FORM_ID = "laventecare-workstream-form";

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
      window.setTimeout(() => document.getElementById("workstream-form-title")?.focus(), 0);
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
      icon={<Workflow size={18} className="text-[var(--color-info)]" />}
      tone="info"
      maxWidth="3xl"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <ModalCancelButton onFallback={onClose} className="w-full sm:w-auto" />
          <Button
            type="submit"
            form={WORKSTREAM_FORM_ID}
            variant="infoSolid"
            loading={savingWorkstream}
            loadingLabel="Opdracht toevoegen…"
            className="w-full px-6 sm:w-auto"
          >
            <Plus size={16} aria-hidden="true" />
            Opdracht toevoegen
          </Button>
        </div>
      }
    >
      <form id={WORKSTREAM_FORM_ID} onSubmit={handleSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
        <FormField
          id="workstream-form-title"
          label={<>Titel <span aria-hidden="true" className="text-[var(--color-danger)]">*</span></>}
          error={titelError || undefined}
          className="sm:col-span-2"
        >
          {(controlProps) => (
            <Input
              {...controlProps}
              required
              invalid={Boolean(titelError)}
              value={workstreamForm.titel}
              onChange={(event) => setWorkstreamForm((form) => ({ ...form, titel: event.target.value }))}
              placeholder="Bijv. Integratieonderzoek voor klant"
            />
          )}
        </FormField>

        <FormField
          id="workstream-form-type"
          label="Type"
        >
          {(controlProps) => (
            <Select
              {...controlProps}
              value={workstreamForm.type}
              onChange={(event) => setWorkstreamForm((form) => ({ ...form, type: event.target.value }))}
            >
              {LAVENTECARE_WORKSTREAM_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </Select>
          )}
        </FormField>

        <FormField
          id="workstream-form-company"
          label="Klantdossier"
        >
          {(controlProps) => (
            <Select
              {...controlProps}
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
            >
              <option value="">Nog niet gekoppeld</option>
              {companies.map((company) => (
                <option key={company._id ?? company.id} value={company._id ?? company.id}>
                  {company.naam}
                </option>
              ))}
            </Select>
          )}
        </FormField>

        <FormField
          id="workstream-form-project"
          label="Project"
        >
          {(controlProps) => (
            <Select
              {...controlProps}
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
            >
              <option value="">Losse opdracht / later koppelen</option>
              {filteredProjects.map((project) => (
                <option key={project._id ?? project.id} value={project._id ?? project.id}>
                  {project.naam}
                </option>
              ))}
            </Select>
          )}
        </FormField>

        <FormField
          id="workstream-form-customer-context"
          label="Losse context"
        >
          {(controlProps) => (
            <Input
              {...controlProps}
              value={workstreamForm.klantNaam}
              onChange={(event) => setWorkstreamForm((form) => ({ ...form, klantNaam: event.target.value }))}
              placeholder="Alleen gebruiken als er nog geen klantdossier is"
            />
          )}
        </FormField>

        <FormField
          id="workstream-form-status"
          label="Status"
        >
          {(controlProps) => (
            <Select
              {...controlProps}
              value={workstreamForm.status}
              onChange={(event) => setWorkstreamForm((form) => ({ ...form, status: event.target.value }))}
            >
              <option value="nieuw">Nieuw</option>
              <option value="intake">Intake</option>
              <option value="analyse">Analyse</option>
              <option value="uitvoering">Uitvoering</option>
              <option value="wacht_op_klant">Wacht op klant</option>
              <option value="afgerond">Afgerond</option>
            </Select>
          )}
        </FormField>

        <FormField
          id="workstream-form-priority"
          label="Prioriteit"
        >
          {(controlProps) => (
            <Select
              {...controlProps}
              value={workstreamForm.prioriteit}
              onChange={(event) =>
                setWorkstreamForm((form) => ({ ...form, prioriteit: event.target.value as WorkstreamForm["prioriteit"] }))
              }
            >
              <option value="laag">Laag</option>
              <option value="normaal">Normaal</option>
              <option value="hoog">Hoog</option>
            </Select>
          )}
        </FormField>

        <FormField
          id="workstream-form-goal"
          label="Doel"
          className="sm:col-span-2"
        >
          {(controlProps) => (
            <Textarea
              {...controlProps}
              value={workstreamForm.doel}
              onChange={(event) => setWorkstreamForm((form) => ({ ...form, doel: event.target.value }))}
              placeholder="Wat moet deze opdracht opleveren?"
              rows={2}
            />
          )}
        </FormField>

        <FormField
          id="workstream-form-scope"
          label="Scope"
        >
          {(controlProps) => (
            <Textarea
              {...controlProps}
              value={workstreamForm.scope}
              onChange={(event) => setWorkstreamForm((form) => ({ ...form, scope: event.target.value }))}
              placeholder="Wat valt binnen deze opdracht?"
              rows={3}
            />
          )}
        </FormField>

        <FormField
          id="workstream-form-deliverable"
          label="Deliverable"
        >
          {(controlProps) => (
            <Textarea
              {...controlProps}
              value={workstreamForm.deliverable}
              onChange={(event) => setWorkstreamForm((form) => ({ ...form, deliverable: event.target.value }))}
              placeholder="Quickscan, advies, fix, implementatie, overdracht..."
              rows={3}
            />
          )}
        </FormField>

        <FormField
          id="workstream-form-deadline"
          label="Deadline"
        >
          {(controlProps) => (
            <Input
              {...controlProps}
              type="date"
              value={workstreamForm.deadline}
              onChange={(event) => setWorkstreamForm((form) => ({ ...form, deadline: event.target.value }))}
            />
          )}
        </FormField>

        <FormField
          id="workstream-form-next-step"
          label="Volgende stap"
        >
          {(controlProps) => (
            <Input
              {...controlProps}
              value={workstreamForm.volgendeStap}
              onChange={(event) => setWorkstreamForm((form) => ({ ...form, volgendeStap: event.target.value }))}
              placeholder="Concrete eerstvolgende actie"
            />
          )}
        </FormField>

        <FormField
          id="workstream-form-estimated-minutes"
          label="Geschatte minuten"
        >
          {(controlProps) => (
            <Input
              {...controlProps}
              type="number"
              value={workstreamForm.geschatteMinuten}
              onChange={(event) =>
                setWorkstreamForm((form) => ({ ...form, geschatteMinuten: event.target.value ? Number(event.target.value) : "" }))
              }
              placeholder="Bijv. 120"
            />
          )}
        </FormField>

        <FormField
          id="workstream-form-estimated-value"
          label="Waarde indicatie"
        >
          {(controlProps) => (
            <Input
              {...controlProps}
              type="number"
              value={workstreamForm.waardeIndicatie}
              onChange={(event) =>
                setWorkstreamForm((form) => ({ ...form, waardeIndicatie: event.target.value ? Number(event.target.value) : "" }))
              }
              placeholder="Bijv. 350"
            />
          )}
        </FormField>

        <FormField
          id="workstream-form-stack-tags"
          label="Stack-tags"
        >
          {(controlProps) => (
            <Input
              {...controlProps}
              value={workstreamForm.stackTags}
              onChange={(event) => setWorkstreamForm((form) => ({ ...form, stackTags: event.target.value }))}
              placeholder="cms, api, webhook, automation"
            />
          )}
        </FormField>

        <FormField
          id="workstream-form-labels"
          label="Labels"
        >
          {(controlProps) => (
            <Input
              {...controlProps}
              value={workstreamForm.tags}
              onChange={(event) => setWorkstreamForm((form) => ({ ...form, tags: event.target.value }))}
              placeholder="quickscan, klantvraag, support"
            />
          )}
        </FormField>

        <FormField
          id="workstream-form-findings"
          label="Bevindingen"
          className="sm:col-span-2"
        >
          {(controlProps) => (
            <Textarea
              {...controlProps}
              value={workstreamForm.bevindingen}
              onChange={(event) => setWorkstreamForm((form) => ({ ...form, bevindingen: event.target.value }))}
              placeholder="Eerste observaties of later bij te werken bevindingen"
              rows={3}
            />
          )}
        </FormField>

      </form>
    </Modal>
  );
}
