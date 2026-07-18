"use client";

import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { Plus, Target } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { ModalCancelButton } from "@/components/ui/ModalCancelButton";
import type { CompanyItem, ContactItem, LeadForm } from "./LaventeCareTypes";

const LEAD_FORM_ID = "laventecare-lead-form";

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
      window.setTimeout(() => document.getElementById("lead-form-title")?.focus(), 0);
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
      icon={<Target size={18} className="text-[var(--color-info)]" />}
      tone="accent"
      maxWidth="2xl"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <ModalCancelButton onFallback={onClose} className="w-full sm:w-auto" />
          <Button
            type="submit"
            form={LEAD_FORM_ID}
            loading={savingLead}
            loadingLabel="Opslaan…"
            variant="primary"
            className="w-full sm:w-auto"
          >
            <Plus size={16} aria-hidden="true" />
            Opslaan
          </Button>
        </div>
      }
    >
      <form id={LEAD_FORM_ID} onSubmit={handleSubmit} noValidate className="grid gap-3 lg:grid-cols-6">
        <FormField
          id="lead-form-title"
          label={<>Titel <span aria-hidden="true" className="text-[var(--color-danger)]">*</span></>}
          error={titelError || undefined}
          className="lg:col-span-2"
        >
          {(controlProps) => (
            <Input
              {...controlProps}
              required
              invalid={Boolean(titelError)}
              value={leadForm.titel}
              onChange={(event) => setLeadForm((form) => ({ ...form, titel: event.target.value }))}
              placeholder="Bijv. automatisering klantintake"
            />
          )}
        </FormField>
        <FormField
          id="lead-form-company"
          label="Klantdossier"
          className="lg:col-span-2"
        >
          {(controlProps) => (
            <Select
              {...controlProps}
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
            >
              <option value="">Nieuw of nog niet gekoppeld</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.naam}
                </option>
              ))}
            </Select>
          )}
        </FormField>
        <FormField
          id="lead-form-contact"
          label="Contact"
          className="lg:col-span-2"
        >
          {(controlProps) => (
            <Select
              {...controlProps}
              value={leadForm.contactId}
              onChange={(event) => setLeadForm((form) => ({ ...form, contactId: event.target.value }))}
              disabled={!leadForm.companyId || companyContacts.length === 0}
            >
              <option value="">Geen contact</option>
              {companyContacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.naam}
                  {contact.rol ? ` - ${contact.rol}` : ""}
                </option>
              ))}
            </Select>
          )}
        </FormField>
        <FormField
          id="lead-form-company-name"
          label="Klant/organisatie"
          description={dossierSelected ? "Wordt overgenomen uit klantdossier" : undefined}
          className="lg:col-span-3"
        >
          {(controlProps) => (
            <Input
              {...controlProps}
              value={leadForm.companyName}
              disabled={dossierSelected}
              onChange={(event) => setLeadForm((form) => ({ ...form, companyName: event.target.value }))}
              placeholder="Naam van klant, organisatie of opdrachtgever"
            />
          )}
        </FormField>
        <FormField
          id="lead-form-website"
          label="Website"
          description={dossierSelected ? "Wordt overgenomen uit klantdossier" : undefined}
          className="lg:col-span-3"
        >
          {(controlProps) => (
            <Input
              {...controlProps}
              value={leadForm.website}
              disabled={dossierSelected}
              onChange={(event) => setLeadForm((form) => ({ ...form, website: event.target.value }))}
              placeholder="https://..."
            />
          )}
        </FormField>
        <FormField
          id="lead-form-pain-point"
          label="Pijnpunt"
          className="lg:col-span-3"
        >
          {(controlProps) => (
            <Textarea
              {...controlProps}
              value={leadForm.pijnpunt}
              onChange={(event) => setLeadForm((form) => ({ ...form, pijnpunt: event.target.value }))}
              placeholder="Welke workflow, foutkans of groeirem speelt er?"
              rows={3}
            />
          )}
        </FormField>
        <FormField
          id="lead-form-next-step"
          label="Volgende stap"
          className="lg:col-span-3"
        >
          {(controlProps) => (
            <Textarea
              {...controlProps}
              value={leadForm.volgendeStap}
              onChange={(event) => setLeadForm((form) => ({ ...form, volgendeStap: event.target.value }))}
              placeholder="Bijv. discovery-call plannen"
              rows={3}
            />
          )}
        </FormField>
        <FormField
          id="lead-form-priority"
          label="Prioriteit"
          className="lg:col-span-2 lg:col-start-5"
        >
          {(controlProps) => (
            <Select
              {...controlProps}
              value={leadForm.prioriteit}
              onChange={(event) =>
                setLeadForm((form) => ({ ...form, prioriteit: event.target.value as LeadForm["prioriteit"] }))
              }
            >
              <option value="laag">Laag</option>
              <option value="normaal">Normaal</option>
              <option value="hoog">Hoog</option>
            </Select>
          )}
        </FormField>
      </form>
    </Modal>
  );
}
