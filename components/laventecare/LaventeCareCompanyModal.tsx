"use client";

import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { Building2, Plus, Save } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { ModalCancelButton } from "@/components/ui/ModalCancelButton";
import type { CompanyForm } from "./LaventeCareTypes";

const COMPANY_FORM_ID = "laventecare-company-form";

export function LaventeCareCompanyModal({
  isOpen,
  onClose,
  dirty,
  companyForm,
  setCompanyForm,
  savingCompany,
  editingCompany,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  dirty?: boolean;
  companyForm: CompanyForm;
  setCompanyForm: Dispatch<SetStateAction<CompanyForm>>;
  savingCompany: boolean;
  editingCompany: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  const [naamError, setNaamError] = useState("");

  // Inline validatie (M28): markeer en focus het naamveld; de page-level
  // handler houdt de toast en blokkeert de daadwerkelijke submit.
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (!companyForm.naam.trim()) {
      setNaamError("Naam is verplicht");
      window.setTimeout(() => document.getElementById("company-form-name")?.focus(), 0);
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
      title={editingCompany ? "Klant bewerken" : "Nieuwe klant"}
      icon={<Building2 size={18} className="text-[var(--color-primary-hover)]" />}
      tone="accent"
      maxWidth="4xl"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <ModalCancelButton onFallback={onClose} className="w-full sm:w-auto" />
          <Button
            type="submit"
            form={COMPANY_FORM_ID}
            loading={savingCompany}
            loadingLabel={editingCompany ? "Opslaan…" : "Klant toevoegen…"}
            variant="primary"
            className="w-full px-6 sm:w-auto"
          >
            {editingCompany ? <Save size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
            {editingCompany ? "Opslaan" : "Klant toevoegen"}
          </Button>
        </div>
      }
    >
      <form id={COMPANY_FORM_ID} onSubmit={handleSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
        <FormField
          id="company-form-name"
          label={<>Klantdossiernaam <span aria-hidden="true" className="text-[var(--color-danger)]">*</span></>}
          error={naamError || undefined}
          className="sm:col-span-2"
        >
          {(controlProps) => (
            <Input
              {...controlProps}
              required
              invalid={Boolean(naamError)}
              value={companyForm.naam}
              onChange={(event) => setCompanyForm((form) => ({ ...form, naam: event.target.value }))}
              placeholder="Klant, organisatie, opdrachtgever of eigen project"
            />
          )}
        </FormField>

        <FormField
          id="company-form-website"
          label="Website"
        >
          {(controlProps) => (
            <Input
              {...controlProps}
              value={companyForm.website}
              onChange={(event) => setCompanyForm((form) => ({ ...form, website: event.target.value }))}
              placeholder="https://..."
            />
          )}
        </FormField>

        <FormField
          id="company-form-sector"
          label="Sector"
        >
          {(controlProps) => (
            <Input
              {...controlProps}
              value={companyForm.sector}
              onChange={(event) => setCompanyForm((form) => ({ ...form, sector: event.target.value }))}
              placeholder="Zorg, mkb, e-commerce..."
            />
          )}
        </FormField>

        <FormField
          id="company-form-relationship-type"
          label="Relatietype"
        >
          {(controlProps) => (
            <Select
              {...controlProps}
              value={companyForm.relatieType}
              onChange={(event) =>
                setCompanyForm((form) => ({ ...form, relatieType: event.target.value as CompanyForm["relatieType"] }))
              }
            >
              <option value="prospect">Prospect</option>
              <option value="klant">Klant</option>
              <option value="partner">Partner</option>
              <option value="leverancier">Leverancier</option>
              <option value="intern">Intern</option>
              <option value="eigen_project">Eigen project</option>
            </Select>
          )}
        </FormField>

        <FormField
          id="company-form-status"
          label="Status"
        >
          {(controlProps) => (
            <Select
              {...controlProps}
              value={companyForm.status}
              onChange={(event) =>
                setCompanyForm((form) => ({ ...form, status: event.target.value as CompanyForm["status"] }))
              }
            >
              <option value="actief">Actief</option>
              <option value="prospect">Prospect</option>
              <option value="inactief">Inactief</option>
            </Select>
          )}
        </FormField>

        <FormField
          id="company-form-next-action"
          label="Volgende actie"
        >
          {(controlProps) => (
            <Input
              {...controlProps}
              value={companyForm.volgendeActie}
              onChange={(event) => setCompanyForm((form) => ({ ...form, volgendeActie: event.target.value }))}
              placeholder="Bel, review, offerte opvolgen..."
            />
          )}
        </FormField>

        <div className="sm:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-normal text-[var(--color-primary-hover)]">Facturatie en contract</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <FormField
              id="company-form-chamber-of-commerce-number"
              label="KVK"
            >
              {(controlProps) => (
                <Input
                  {...controlProps}
                  value={companyForm.kvkNumber}
                  onChange={(event) => setCompanyForm((form) => ({ ...form, kvkNumber: event.target.value }))}
                  placeholder="88162710"
                />
              )}
            </FormField>
            <FormField
              id="company-form-vat-number"
              label="BTW"
            >
              {(controlProps) => (
                <Input
                  {...controlProps}
                  value={companyForm.vatNumber}
                  onChange={(event) => setCompanyForm((form) => ({ ...form, vatNumber: event.target.value }))}
                  placeholder="NL..."
                />
              )}
            </FormField>
            <FormField
              id="company-form-payment-terms-days"
              label="Betaaltermijn"
            >
              {(controlProps) => (
                <Input
                  {...controlProps}
                  type="number"
                  min={1}
                  value={companyForm.paymentTermsDays}
                  onChange={(event) => setCompanyForm((form) => ({ ...form, paymentTermsDays: event.target.value ? Number(event.target.value) : "" }))}
                />
              )}
            </FormField>
            <FormField
              id="company-form-billing-email"
              label="Factuurmail"
            >
              {(controlProps) => (
                <Input
                  {...controlProps}
                  type="email"
                  value={companyForm.billingEmail}
                  onChange={(event) => setCompanyForm((form) => ({ ...form, billingEmail: event.target.value }))}
                  placeholder="administratie@..."
                />
              )}
            </FormField>
            <FormField
              id="company-form-contract-status"
              label="Contractstatus"
            >
              {(controlProps) => (
                <Select
                  {...controlProps}
                  value={companyForm.contractStatus}
                  onChange={(event) => setCompanyForm((form) => ({ ...form, contractStatus: event.target.value }))}
                >
                  <option value="geen_contract">Geen contract</option>
                  <option value="voorstel">Voorstel</option>
                  <option value="akkoord">Akkoord</option>
                  <option value="actief">Actief</option>
                  <option value="afgelopen">Afgelopen</option>
                </Select>
              )}
            </FormField>
            <FormField
              id="company-form-service-level"
              label="Service level"
            >
              {(controlProps) => (
                <Select
                  {...controlProps}
                  value={companyForm.serviceLevel}
                  onChange={(event) => setCompanyForm((form) => ({ ...form, serviceLevel: event.target.value }))}
                >
                  <option value="basis">Basis</option>
                  <option value="pilot">Pilot</option>
                  <option value="project">Project</option>
                  <option value="beheer">Beheer</option>
                  <option value="sla">SLA</option>
                </Select>
              )}
            </FormField>
            <FormField id="company-form-billing-address" label="Factuuradres" className="sm:col-span-2 lg:col-span-3">
              {(controlProps) => (
                <Input
                  {...controlProps}
                  name="billingAddress"
                  value={companyForm.billingAddress}
                  onChange={(event) => setCompanyForm((form) => ({ ...form, billingAddress: event.target.value }))}
                  placeholder="Factuuradres"
                />
              )}
            </FormField>
            <FormField id="company-form-billing-reference" label="Factuurreferentie" className="sm:col-span-2 lg:col-span-3">
              {(controlProps) => (
                <Input
                  {...controlProps}
                  name="billingReference"
                  value={companyForm.billingReference}
                  onChange={(event) => setCompanyForm((form) => ({ ...form, billingReference: event.target.value }))}
                  placeholder="Referentie, PO of projectcode"
                />
              )}
            </FormField>
          </div>
        </div>

        <div className="sm:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-normal text-[var(--color-primary-hover)]">Portaal en compliance</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <FormField
              id="company-form-preferred-channel"
              label="Voorkeurskanaal"
            >
              {(controlProps) => (
                <Input
                  {...controlProps}
                  value={companyForm.preferredChannel}
                  onChange={(event) => setCompanyForm((form) => ({ ...form, preferredChannel: event.target.value }))}
                  placeholder="Email, WhatsApp, Teams..."
                />
              )}
            </FormField>
            <FormField
              id="company-form-portal-url"
              label="Klantportaal"
            >
              {(controlProps) => (
                <Input
                  {...controlProps}
                  value={companyForm.portalUrl}
                  onChange={(event) => setCompanyForm((form) => ({ ...form, portalUrl: event.target.value }))}
                  placeholder="https://..."
                />
              )}
            </FormField>
            <FormField
              id="company-form-default-login-url"
              label="Standaard login"
            >
              {(controlProps) => (
                <Input
                  {...controlProps}
                  value={companyForm.defaultLoginUrl}
                  onChange={(event) => setCompanyForm((form) => ({ ...form, defaultLoginUrl: event.target.value }))}
                  placeholder="https://.../login"
                />
              )}
            </FormField>
            <FormField
              id="company-form-onboarding-status"
              label="Onboarding"
            >
              {(controlProps) => (
                <Select
                  {...controlProps}
                  value={companyForm.onboardingStatus}
                  onChange={(event) => setCompanyForm((form) => ({ ...form, onboardingStatus: event.target.value }))}
                >
                  <option value="niet_gestart">Niet gestart</option>
                  <option value="intake">Intake</option>
                  <option value="pilot">Pilot</option>
                  <option value="actief">Actief</option>
                  <option value="afgerond">Afgerond</option>
                </Select>
              )}
            </FormField>
            <FormField
              id="company-form-data-processing-status"
              label="Verwerking/privacy"
            >
              {(controlProps) => (
                <Select
                  {...controlProps}
                  value={companyForm.dataProcessingStatus}
                  onChange={(event) => setCompanyForm((form) => ({ ...form, dataProcessingStatus: event.target.value }))}
                >
                  <option value="niet_nodig">Niet nodig</option>
                  <option value="te_controleren">Te controleren</option>
                  <option value="verwerkersovereenkomst_nodig">Verwerkersovereenkomst nodig</option>
                  <option value="vastgelegd">Vastgelegd</option>
                </Select>
              )}
            </FormField>
          </div>
        </div>

        <FormField
          id="company-form-notes"
          label="Notities"
          className="sm:col-span-2"
        >
          {(controlProps) => (
            <Textarea
              {...controlProps}
              value={companyForm.notities}
              onChange={(event) => setCompanyForm((form) => ({ ...form, notities: event.target.value }))}
              placeholder="Relatiecontext, afspraken, bijzonderheden of aandachtspunten"
              rows={4}
            />
          )}
        </FormField>

      </form>
    </Modal>
  );
}
