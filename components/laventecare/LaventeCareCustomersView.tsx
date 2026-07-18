"use client";

import { IconButton } from "@/components/ui/IconButton";
import { Button } from "@/components/ui/Button";
import { SearchField } from "@/components/ui/SearchField";
import { useMemo, useState } from "react";
import { Building2, CalendarClock, FileText, FolderOpen, Mail, Pencil, Phone, Plus, UserRound, Workflow } from "lucide-react";
import type { CompanyItem, ContactItem, DossierDocumentItem, LeadItem, ProjectItem, WorkstreamItem } from "./LaventeCareTypes";
import { formatDate, isDossierDocumentForCompany, label } from "./LaventeCareUtils";

export function LaventeCareCustomersView({
  companies,
  contacts,
  activeLeads,
  activeWorkstreams,
  activeProjects,
  dossierDocuments,
  onShowCompanyForm,
  onEditCompany,
  onAddContact,
  onEditContact,
  onStartWorkstream,
  onOpenDossier,
}: {
  companies: CompanyItem[];
  contacts: ContactItem[];
  activeLeads: LeadItem[];
  activeWorkstreams: WorkstreamItem[];
  activeProjects: ProjectItem[];
  dossierDocuments: DossierDocumentItem[];
  onShowCompanyForm: () => void;
  onEditCompany: (company: CompanyItem) => void;
  onAddContact: (company: CompanyItem) => void;
  onEditContact: (contact: ContactItem) => void;
  onStartWorkstream: (company: CompanyItem) => void;
  onOpenDossier: (company: CompanyItem) => void;
}) {
  const activeCompanyIds = new Set([
    ...activeLeads.map((item) => item.company_id).filter(Boolean),
    ...activeWorkstreams.map((item) => item.company_id).filter(Boolean),
    ...activeProjects.map((item) => item.company_id).filter(Boolean),
  ]);
  // Simpele client-side zoekfilter op naam (en sector) voor de klantenlijst.
  const [query, setQuery] = useState("");
  const filteredCompanies = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return companies;
    return companies.filter((company) =>
      `${company.naam} ${company.sector ?? ""}`.toLowerCase().includes(needle)
    );
  }, [companies, query]);

  if (companies.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-muted)] p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-bold text-[var(--color-text)]">Nog geen klantenbasis</p>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
              Maak je eerste klant aan of vul een klantnaam bij een lead/opdracht in. Het systeem hergebruikt die daarna voor dossiers, PDFs, notities en agenda-context.
            </p>
          </div>
          <Button
            type="button"
            onClick={onShowCompanyForm}
            variant="primary" fullWidth className="sm:w-auto"
          >
            <Plus size={16} />
            Klant toevoegen
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Klanten" value={companies.length} sub="dossiers en opdrachtgevers" />
        <Metric label="Contacten" value={contacts.length} sub="personen in dossiers" />
        <Metric label="Actief" value={activeCompanyIds.size} sub="met open werk" />
      </div>

      <SearchField
        label="Zoek klant"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onClear={() => setQuery("")}
        placeholder="Zoek klant op naam of sector..."
      />

      {filteredCompanies.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 text-sm text-[var(--color-text-muted)]">
          Geen klanten gevonden voor &ldquo;{query}&rdquo;.
        </p>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-2">
        {filteredCompanies.map((company) => {
          const id = company._id ?? company.id;
          const companyContacts = contacts.filter((contact) => contact.company_id === id);
          const leadIds = new Set(activeLeads.filter((lead) => lead.company_id === id).map((lead) => lead._id ?? lead.id));
          const workstreamIds = new Set(activeWorkstreams.filter((workstream) => workstream.company_id === id).map((workstream) => workstream._id ?? workstream.id));
          const projectIds = new Set(activeProjects.filter((project) => project.company_id === id).map((project) => project._id ?? project.id));
          const companyDocs = dossierDocuments.filter((doc) => isDossierDocumentForCompany(doc, id, company.naam, leadIds, projectIds, workstreamIds));
          const openWork = [
            company.leads ? `${company.leads} lead${company.leads === 1 ? "" : "s"}` : "",
            company.workstreams ? `${company.workstreams} opdracht${company.workstreams === 1 ? "" : "en"}` : "",
            company.projects ? `${company.projects} project${company.projects === 1 ? "" : "en"}` : "",
          ].filter(Boolean);

          return (
            <article key={id} className="min-w-0 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Building2 size={16} className="shrink-0 text-[var(--color-primary-hover)]" />
                    <h3 className="truncate text-base font-bold text-[var(--color-text)]">{company.naam}</h3>
                  </div>
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                    {label(company.relatie_type)} - {label(company.status)}
                    {company.sector ? ` - ${company.sector}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5 self-end sm:self-auto">
                  <IconButton
                    label={`${company.naam} bewerken`}
                    title="Klant bewerken"
                    onClick={() => onEditCompany(company)}
                    icon={<Pencil size={15} />}
                    variant="ghost"
                    className="border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
                  />
                  <IconButton
                    label={`${company.naam} dossier openen`}
                    title="Klantdossier"
                    onClick={() => onOpenDossier(company)}
                    icon={<FolderOpen size={15} />}
                    variant="ghost"
                    className="border-[var(--color-primary-border)] bg-[var(--color-primary-subtle)] text-[var(--color-primary-hover)] hover:bg-[var(--color-primary-border)]"
                  />
                  <IconButton
                    label={`Nieuwe opdracht voor ${company.naam}`}
                    title="Nieuwe opdracht"
                    onClick={() => onStartWorkstream(company)}
                    icon={<Workflow size={15} />}
                    variant="ghost"
                    className="border-[var(--color-info-border)] bg-[var(--color-info-subtle)] text-[var(--color-info)] hover:bg-[var(--color-info-border)]"
                  />
                </div>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <MiniStat label="Werk" value={openWork.length ? openWork.join(" / ") : "Geen open werk"} />
                <MiniStat label="Dossier" value={`${companyDocs.length || company.dossierDocuments} document(en)`} />
                <MiniStat label="Actie" value={company.volgendeActie ? formatDate(company.volgendeActie) : "Geen datum"} />
              </div>

              <Button type="button" variant="primary" fullWidth onClick={() => onOpenDossier(company)} className="mt-3">
                <FolderOpen size={15} aria-hidden="true" />
                Open klantdossier
              </Button>

              <div className="mt-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-active)] p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-normal text-[var(--color-text-muted)]">Contacten</p>
                  <Button type="button" size="sm" variant="secondary" onClick={() => onAddContact(company)}>
                    <Plus size={13} aria-hidden="true" />
                    Contact
                  </Button>
                </div>

                {companyContacts.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {companyContacts.map((contact) => (
                      <Button
                        key={contact._id ?? contact.id}
                        type="button"
                        variant="secondary"
                        fullWidth
                        onClick={() => onEditContact(contact)}
                        className="h-auto items-start justify-start p-3 text-left"
                      >
                        <UserRound size={15} className="mt-0.5 shrink-0 text-[var(--color-text-muted)]" />
                        <span className="min-w-0 flex-1">
                          <span className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm font-semibold text-[var(--color-text)]">
                            <span className="truncate">{contact.naam}</span>
                            {contact.is_primary ? (
                              <span className="rounded-full border border-[var(--color-info-border)] bg-[var(--color-info-subtle)] px-1.5 py-0.5 text-micro uppercase tracking-normal text-[var(--color-info)]">
                                primair
                              </span>
                            ) : null}
                          </span>
                          {contact.rol ? <span className="mt-0.5 block truncate text-xs text-[var(--color-text-muted)]">{contact.rol}</span> : null}
                          <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--color-text-muted)]">
                            {contact.email ? (
                              <span className="inline-flex items-center gap-1">
                                <Mail size={12} />
                                {contact.email}
                              </span>
                            ) : null}
                            {contact.telefoon ? (
                              <span className="inline-flex items-center gap-1">
                                <Phone size={12} />
                                {contact.telefoon}
                              </span>
                            ) : null}
                          </span>
                        </span>
                      </Button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-[var(--color-text-muted)]">Nog geen contactpersoon gekoppeld.</p>
                )}

                {company.website ? (
                  <a
                    href={toExternalHref(company.website)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 block truncate text-xs font-semibold text-[var(--color-info)] hover:text-[var(--color-info)]"
                  >
                    {company.website}
                  </a>
                ) : null}
              </div>

              {company.notities ? (
                <p className="mt-3 line-clamp-2 text-xs leading-5 text-[var(--color-text-muted)]">{company.notities}</p>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function toExternalHref(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

// M-K: isDossierDocumentForCompany is gehoist naar LaventeCareUtils — deze
// kopie liep al achter (miste de hasIdContext-guard op de name-match).

function Metric({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3">
      <p className="text-xs font-semibold uppercase tracking-normal text-[var(--color-text-muted)]">{label}</p>
      <p className="mt-2 text-2xl font-bold text-[var(--color-text)]">{value}</p>
      <p className="mt-1 text-xs text-[var(--color-text-muted)]">{sub}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2">
      <p className="flex items-center gap-1 text-micro font-semibold uppercase tracking-normal text-[var(--color-text-muted)]">
        {label === "Actie" ? <CalendarClock size={11} /> : label === "Dossier" ? <FileText size={11} /> : null}
        {label}
      </p>
      <p className="mt-1 truncate text-xs font-semibold text-[var(--color-text)]">{value}</p>
    </div>
  );
}
