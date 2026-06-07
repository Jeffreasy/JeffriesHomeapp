"use client";

import { Building2, CalendarClock, FileText, Mail, Phone, Plus, UserRound, Workflow } from "lucide-react";
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
  onStartWorkstream,
}: {
  companies: CompanyItem[];
  contacts: ContactItem[];
  activeLeads: LeadItem[];
  activeWorkstreams: WorkstreamItem[];
  activeProjects: ProjectItem[];
  dossierDocuments: DossierDocumentItem[];
  onShowCompanyForm: () => void;
  onStartWorkstream: (company: CompanyItem) => void;
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
        <Metric label="Klanten" value={companies.length} sub="bedrijven en opdrachtgevers" />
        <Metric label="Contacten" value={contacts.length} sub="personen in dossiers" />
        <Metric label="Actief" value={activeCompanyIds.size} sub="met open werk" />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {companies.map((company) => {
          const id = company._id ?? company.id;
          const companyContacts = contacts.filter((contact) => contact.company_id === id);
          const primaryContact = companyContacts.find((contact) => contact.is_primary) ?? companyContacts[0];
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
                <button
                  type="button"
                  onClick={() => onStartWorkstream(company)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-violet-500/20 bg-violet-500/10 text-violet-300 transition hover:bg-violet-500/20"
                  aria-label={`Nieuwe opdracht voor ${company.naam}`}
                  title="Nieuwe opdracht"
                >
                  <Workflow size={15} />
                </button>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <MiniStat label="Werk" value={openWork.length ? openWork.join(" / ") : "Geen open werk"} />
                <MiniStat label="Dossier" value={`${companyDocs.length || company.dossierDocuments} document(en)`} />
                <MiniStat label="Actie" value={company.volgendeActie ? formatDate(company.volgendeActie) : "Geen datum"} />
              </div>

              {primaryContact || company.website ? (
                <div className="mt-4 rounded-lg border border-white/10 bg-black/10 p-3">
                  {primaryContact ? (
                    <div className="flex items-start gap-2">
                      <UserRound size={15} className="mt-0.5 shrink-0 text-slate-400" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-200">
                          {primaryContact.naam}
                          {primaryContact.rol ? ` - ${primaryContact.rol}` : ""}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                          {primaryContact.email ? (
                            <span className="inline-flex items-center gap-1">
                              <Mail size={12} />
                              {primaryContact.email}
                            </span>
                          ) : null}
                          {primaryContact.telefoon ? (
                            <span className="inline-flex items-center gap-1">
                              <Phone size={12} />
                              {primaryContact.telefoon}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ) : null}
                  {company.website ? (
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 block truncate text-xs font-semibold text-sky-300 hover:text-sky-200"
                    >
                      {company.website}
                    </a>
                  ) : null}
                </div>
              ) : null}

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
