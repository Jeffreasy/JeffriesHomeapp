"use client";

import { Building2, CalendarClock, FileText, FolderOpen, Mail, Pencil, Phone, Plus, UserRound, Workflow } from "lucide-react";
import type { CompanyItem, ContactItem, DossierDocumentItem, LeadItem, ProjectItem, WorkstreamItem } from "./LaventeCareTypes";
import { formatDate, label } from "./LaventeCareUtils";

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

  if (companies.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-bold text-white">Nog geen klantenbasis</p>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              Maak je eerste klant aan of vul een klantnaam bij een lead/opdracht in. Het systeem hergebruikt die daarna voor dossiers, PDFs, notities en agenda-context.
            </p>
          </div>
          <button
            type="button"
            onClick={onShowCompanyForm}
            className="btn btn--primary w-full justify-center sm:w-auto"
          >
            <Plus size={16} />
            Klant toevoegen
          </button>
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

      <div className="grid gap-3 lg:grid-cols-2">
        {companies.map((company) => {
          const id = company._id ?? company.id;
          const companyContacts = contacts.filter((contact) => contact.company_id === id);
          const companyDocs = dossierDocuments.filter((doc) => doc.company_id === id);
          const openWork = [
            company.leads ? `${company.leads} lead${company.leads === 1 ? "" : "s"}` : "",
            company.workstreams ? `${company.workstreams} opdracht${company.workstreams === 1 ? "" : "en"}` : "",
            company.projects ? `${company.projects} project${company.projects === 1 ? "" : "en"}` : "",
          ].filter(Boolean);

          return (
            <article key={id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Building2 size={16} className="shrink-0 text-amber-300" />
                    <h3 className="truncate text-base font-bold text-white">{company.naam}</h3>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {label(company.relatie_type)} - {label(company.status)}
                    {company.sector ? ` - ${company.sector}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onEditCompany(company)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
                    aria-label={`${company.naam} bewerken`}
                    title="Klant bewerken"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenDossier(company)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-300 transition hover:bg-amber-500/20"
                    aria-label={`${company.naam} dossier openen`}
                    title="Klantdossier"
                  >
                    <FolderOpen size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onStartWorkstream(company)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-violet-500/20 bg-violet-500/10 text-violet-300 transition hover:bg-violet-500/20"
                    aria-label={`Nieuwe opdracht voor ${company.naam}`}
                    title="Nieuwe opdracht"
                  >
                    <Workflow size={15} />
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <MiniStat label="Werk" value={openWork.length ? openWork.join(" / ") : "Geen open werk"} />
                <MiniStat label="Dossier" value={`${companyDocs.length || company.dossierDocuments} document(en)`} />
                <MiniStat label="Actie" value={company.volgendeActie ? formatDate(company.volgendeActie) : "Geen datum"} />
              </div>

              <button
                type="button"
                onClick={() => onOpenDossier(company)}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-200 transition hover:bg-amber-500/20"
              >
                <FolderOpen size={15} />
                Open klantdossier
              </button>

              <div className="mt-4 rounded-lg border border-white/10 bg-black/10 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">Contacten</p>
                  <button
                    type="button"
                    onClick={() => onAddContact(company)}
                    className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-sky-500/20 bg-sky-500/10 px-2 text-xs font-semibold text-sky-300 transition hover:bg-sky-500/20"
                  >
                    <Plus size={13} />
                    Contact
                  </button>
                </div>

                {companyContacts.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {companyContacts.map((contact) => (
                      <button
                        key={contact._id ?? contact.id}
                        type="button"
                        onClick={() => onEditContact(contact)}
                        className="flex w-full items-start gap-2 rounded-lg border border-white/5 bg-white/[0.02] p-2 text-left transition hover:border-sky-500/20 hover:bg-sky-500/10"
                      >
                        <UserRound size={15} className="mt-0.5 shrink-0 text-slate-400" />
                        <span className="min-w-0 flex-1">
                          <span className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm font-semibold text-slate-200">
                            <span className="truncate">{contact.naam}</span>
                            {contact.is_primary ? (
                              <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-1.5 py-0.5 text-[10px] uppercase tracking-normal text-sky-300">
                                primair
                              </span>
                            ) : null}
                          </span>
                          {contact.rol ? <span className="mt-0.5 block truncate text-xs text-slate-500">{contact.rol}</span> : null}
                          <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
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
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-slate-500">Nog geen contactpersoon gekoppeld.</p>
                )}

                {company.website ? (
                  <a
                    href={toExternalHref(company.website)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 block truncate text-xs font-semibold text-sky-300 hover:text-sky-200"
                  >
                    {company.website}
                  </a>
                ) : null}
              </div>

              {company.notities ? (
                <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-500">{company.notities}</p>
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

function Metric({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{sub}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
      <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-normal text-slate-500">
        {label === "Actie" ? <CalendarClock size={11} /> : label === "Dossier" ? <FileText size={11} /> : null}
        {label}
      </p>
      <p className="mt-1 truncate text-xs font-semibold text-slate-200">{value}</p>
    </div>
  );
}
