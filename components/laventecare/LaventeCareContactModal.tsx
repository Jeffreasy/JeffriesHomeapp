"use client";

import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { Plus, Save, UserRound } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { ModalCancelButton } from "@/components/ui/ModalCancelButton";
import type { CompanyItem, ContactForm } from "./LaventeCareTypes";

const CONTACT_FORM_ID = "laventecare-contact-form";

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
        () => document.getElementById(missingCompany ? "contact-form-company" : "contact-form-name")?.focus(),
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
      icon={<UserRound size={18} className="text-[var(--color-info)]" />}
      tone="info"
      maxWidth="2xl"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <ModalCancelButton onFallback={onClose} className="w-full sm:w-auto" />
          <Button
            type="submit"
            form={CONTACT_FORM_ID}
            variant="infoSolid"
            loading={savingContact}
            loadingLabel={editingContact ? "Opslaan…" : "Contact toevoegen…"}
            className="w-full px-6 sm:w-auto"
          >
            {editingContact ? <Save size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
            {editingContact ? "Opslaan" : "Contact toevoegen"}
          </Button>
        </div>
      }
    >
      <form id={CONTACT_FORM_ID} onSubmit={handleSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
        <FormField
          id="contact-form-company"
          label={<>Klant <span aria-hidden="true" className="text-[var(--color-danger)]">*</span></>}
          error={companyError || undefined}
          className="sm:col-span-2"
        >
          {(controlProps) => (
            <Select
              {...controlProps}
              required
              invalid={Boolean(companyError)}
              value={contactForm.companyId}
              onChange={(event) => setContactForm((form) => ({ ...form, companyId: event.target.value }))}
            >
              <option value="">Geen klant gekoppeld</option>
              {companies.map((company) => (
                <option key={company._id ?? company.id} value={company._id ?? company.id}>
                  {company.naam}
                </option>
              ))}
            </Select>
          )}
        </FormField>

        <FormField
          id="contact-form-name"
          label={<>Naam <span aria-hidden="true" className="text-[var(--color-danger)]">*</span></>}
          error={naamError || undefined}
          className="sm:col-span-2"
        >
          {(controlProps) => (
            <Input
              {...controlProps}
              required
              invalid={Boolean(naamError)}
              value={contactForm.naam}
              onChange={(event) => setContactForm((form) => ({ ...form, naam: event.target.value }))}
              placeholder="Naam contactpersoon"
            />
          )}
        </FormField>

        <FormField
          id="contact-form-email"
          label="E-mail"
        >
          {(controlProps) => (
            <Input
              {...controlProps}
              type="email"
              value={contactForm.email}
              onChange={(event) => setContactForm((form) => ({ ...form, email: event.target.value }))}
              placeholder="naam@bedrijf.nl"
            />
          )}
        </FormField>

        <FormField
          id="contact-form-phone"
          label="Telefoon"
        >
          {(controlProps) => (
            <Input
              {...controlProps}
              value={contactForm.telefoon}
              onChange={(event) => setContactForm((form) => ({ ...form, telefoon: event.target.value }))}
              placeholder="+31..."
            />
          )}
        </FormField>

        <FormField
          id="contact-form-role"
          label="Rol"
        >
          {(controlProps) => (
            <Input
              {...controlProps}
              value={contactForm.rol}
              onChange={(event) => setContactForm((form) => ({ ...form, rol: event.target.value }))}
              placeholder="Eigenaar, projectleider, financieel contact..."
            />
          )}
        </FormField>

        <FormField
          id="contact-form-decision-role"
          label="Beslisrol"
        >
          {(controlProps) => (
            <Select
              {...controlProps}
              value={contactForm.decisionRole}
              onChange={(event) => setContactForm((form) => ({ ...form, decisionRole: event.target.value }))}
            >
              <option value="">Niet vastgelegd</option>
              <option value="beslisser">Beslisser</option>
              <option value="beinvloeder">Beinvloeder</option>
              <option value="gebruiker">Gebruiker</option>
              <option value="financieel">Financieel</option>
              <option value="technisch">Technisch</option>
            </Select>
          )}
        </FormField>

        <FormField
          id="contact-form-preferred-channel"
          label="Voorkeurskanaal"
          className="sm:col-span-2"
        >
          {(controlProps) => (
            <Input
              {...controlProps}
              value={contactForm.preferredChannel}
              onChange={(event) => setContactForm((form) => ({ ...form, preferredChannel: event.target.value }))}
              placeholder="Email, telefoon, WhatsApp, Teams..."
            />
          )}
        </FormField>

        <Checkbox
          label="Primaire contactpersoon voor deze klant"
          checked={contactForm.isPrimary}
          onChange={(event) => setContactForm((form) => ({ ...form, isPrimary: event.target.checked }))}
          className="border border-[var(--color-border)] bg-[var(--color-surface-muted)] sm:col-span-2"
        />

        <FormField
          id="contact-form-notes"
          label="Notities"
          className="sm:col-span-2"
        >
          {(controlProps) => (
            <Textarea
              {...controlProps}
              value={contactForm.notities}
              onChange={(event) => setContactForm((form) => ({ ...form, notities: event.target.value }))}
              placeholder="Communicatievoorkeur, rol in traject, afspraken of bijzonderheden"
              rows={4}
            />
          )}
        </FormField>

      </form>
    </Modal>
  );
}
