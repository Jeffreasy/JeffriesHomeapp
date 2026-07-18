import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { ArrowLeft, Download, ExternalLink, FileText, FolderOpen, Printer } from "lucide-react";
import {
  getLaventeCarePdfDocument,
  getLaventeCarePdfDossierContextLabel,
  getLaventeCarePdfFilename,
  getLaventeCarePdfUrl,
  isLaventeCarePdfTheme,
  parseLaventeCarePdfDossierContext,
  type LaventeCarePdfTheme,
} from "@/lib/laventecare";
import { getBackendApiKey, getBackendBaseUrl } from "@/lib/server/backend-config";
import {
  createDossierDocumentLookupUrl,
  selectExactDossierDocument,
} from "@/lib/laventecare/dossier-document-lookup";
import { isOwnerUserId } from "@/lib/server/owner-config";

type PageProps = {
  params: Promise<{
    documentKey: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type DossierDocument = {
  id: string;
  document_key: string;
  titel: string;
  template_label: string | null;
  context_type: string;
  context_id: string | null;
  context_title: string | null;
  lead_id: string | null;
  project_id: string | null;
  workstream_id: string | null;
  company_id: string | null;
  pdf_url: string;
  theme: string;
  delivery: string;
  notes: string | null;
  generated_at: string;
  created_at: string;
};

type ViewerData =
  | {
      kind: "pdf";
      document: NonNullable<ReturnType<typeof getLaventeCarePdfDocument>>;
      theme: LaventeCarePdfTheme;
      context: ReturnType<typeof parseLaventeCarePdfDossierContext>;
      pdfUrl: string;
      screenDownloadUrl: string;
      printDownloadUrl: string;
    }
  | {
      kind: "dossier";
      dossier: DossierDocument;
      theme: LaventeCarePdfTheme;
      context: ReturnType<typeof parseLaventeCarePdfDossierContext>;
    }
  | {
      kind: "missing";
      documentKey: string;
      theme: LaventeCarePdfTheme;
      context: ReturnType<typeof parseLaventeCarePdfDossierContext>;
    };



// This route renders with a file-extension documentKey (e.g. "foo.pdf"), which
// the Clerk middleware matcher skips — so it can be reached without a session.
// Real customer dossier documents must therefore be gated by an explicit
// owner-identity check here, independent of middleware.
async function isOwner() {
  try {
    const { userId } = await auth();
    return isOwnerUserId(userId);
  } catch {
    return false;
  }
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function toUrlSearchParams(params: Record<string, string | string[] | undefined>) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const item of value) search.append(key, item);
    } else if (value !== undefined) {
      search.set(key, value);
    }
  }

  return search;
}

async function getDossierDocument(documentKey: string) {
  try {
    const headers = new Headers({ "Content-Type": "application/json" });
    const apiKey = getBackendApiKey();
    if (apiKey) headers.set("X-API-Key", apiKey);

    const response = await fetch(
      createDossierDocumentLookupUrl(getBackendBaseUrl(), documentKey),
      { cache: "no-store", headers },
    );
    if (!response.ok) return null;

    const documents = (await response.json()) as DossierDocument[];
    return selectExactDossierDocument(documents, documentKey);
  } catch {
    return null;
  }
}

function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function isEmbeddableUrl(value: string) {
  return value.startsWith("/api/") || /^https?:\/\/.+\.pdf(?:[?#].*)?$/i.test(value);
}

async function getViewerData({ params, searchParams }: PageProps): Promise<ViewerData> {
  const [{ documentKey }, rawSearchParams] = await Promise.all([params, searchParams]);
  const document = getLaventeCarePdfDocument(documentKey);

  const themeParam = firstParam(rawSearchParams.theme);
  const theme: LaventeCarePdfTheme =
    themeParam && isLaventeCarePdfTheme(themeParam) ? themeParam : "screen";
  const context = parseLaventeCarePdfDossierContext(toUrlSearchParams(rawSearchParams));

  if (!document) {
    // Only the authenticated owner may resolve real dossier documents; everyone
    // else gets the generic "not found" view without any backend fetch.
    const dossier = (await isOwner()) ? await getDossierDocument(documentKey) : null;
    return dossier ? { kind: "dossier", dossier, theme, context } : { kind: "missing", documentKey, theme, context };
  }

  return {
    kind: "pdf",
    document,
    theme,
    context,
    pdfUrl: getLaventeCarePdfUrl({
      documentKey: document.key,
      theme,
      delivery: "inline",
      context,
    }),
    screenDownloadUrl: getLaventeCarePdfUrl({
      documentKey: document.key,
      theme: "screen",
      delivery: "download",
      context,
    }),
    printDownloadUrl: getLaventeCarePdfUrl({
      documentKey: document.key,
      theme: "print",
      delivery: "download",
      context,
    }),
  };
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const data = await getViewerData(props);

  return {
    title:
      data.kind === "pdf"
        ? `${data.document.title} - LaventeCare PDF`
        : data.kind === "dossier"
          ? `${data.dossier.titel} - LaventeCare dossier`
          : "LaventeCare document niet gevonden",
  };
}

export default async function LaventeCarePdfViewerPage(props: PageProps) {
  const data = await getViewerData(props);

  if (data.kind === "dossier") {
    return <DossierDocumentView dossier={data.dossier} theme={data.theme} contextLabel={getLaventeCarePdfDossierContextLabel(data.context)} />;
  }

  if (data.kind === "missing") {
    return <MissingDocumentView documentKey={data.documentKey} contextLabel={getLaventeCarePdfDossierContextLabel(data.context)} />;
  }

  const { document, theme, context, pdfUrl, screenDownloadUrl, printDownloadUrl } = data;
  const filename = getLaventeCarePdfFilename(document, theme);

  return (
    <div className="flex min-h-dvh min-w-0 flex-col overflow-x-clip bg-[var(--color-bg)] text-slate-100">
      <header className="sticky top-0 z-40 shrink-0 border-b border-white/10 bg-slate-950/95 px-3 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-xl sm:px-5 sm:pb-3 sm:pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/laventecare"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 transition-colors hover:bg-white/[0.08] hover:text-white"
              aria-label="Terug naar LaventeCare"
            >
              <ArrowLeft size={18} />
            </Link>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-normal text-amber-300/80">LaventeCare PDF</p>
              <h1 className="truncate text-base font-bold text-white sm:text-lg">{document.title}</h1>
              <p className="mt-0.5 truncate text-xs text-slate-500">
                {filename} - {getLaventeCarePdfDossierContextLabel(context)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1.5 sm:flex sm:shrink-0 sm:items-center sm:gap-2">
            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-sky-500/25 bg-sky-500/10 px-3 text-xs font-semibold text-sky-200 transition-colors hover:bg-sky-500/15 sm:text-sm"
            >
              <ExternalLink size={15} />
              <span>Open</span>
            </a>
            <a
              href={screenDownloadUrl}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/[0.08] sm:text-sm"
            >
              <Download size={15} />
              <span>Screen</span>
            </a>
            <a
              href={printDownloadUrl}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 text-xs font-semibold text-amber-200 transition-colors hover:bg-amber-500/15 sm:text-sm"
            >
              <Printer size={15} />
              <span>Print</span>
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-5 sm:pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pt-5">
        <section className="glass flex min-h-96 flex-1 flex-col overflow-hidden border border-white/10 bg-[var(--color-surface)]">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2 sm:px-4">
            <div className="flex min-w-0 items-center gap-2">
              <FileText size={16} className="shrink-0 text-amber-300" />
              <p className="truncate text-sm font-semibold text-slate-200">
                {theme === "print" ? "Printversie" : "Screenversie"}
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] font-bold uppercase text-slate-400">
              PDF
            </span>
          </div>
          <iframe
            src={pdfUrl}
            title={`${document.title} PDF`}
            className="block min-h-96 w-full flex-1 bg-white"
          />
        </section>
      </main>
    </div>
  );
}

function DossierDocumentView({
  dossier,
  theme,
  contextLabel,
}: {
  dossier: DossierDocument;
  theme: LaventeCarePdfTheme;
  contextLabel: string;
}) {
  const sourceUrl = dossier.pdf_url.trim();
  const canOpenSource = isHttpUrl(sourceUrl);
  const canEmbed = isEmbeddableUrl(sourceUrl);

  return (
    <div className="flex min-h-dvh min-w-0 flex-col overflow-x-clip bg-[var(--color-bg)] text-slate-100">
      <header className="sticky top-0 z-40 shrink-0 border-b border-white/10 bg-slate-950/95 px-3 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-xl sm:px-5 sm:pb-3 sm:pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/laventecare"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 transition-colors hover:bg-white/[0.08] hover:text-white"
              aria-label="Terug naar LaventeCare"
            >
              <ArrowLeft size={18} />
            </Link>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-normal text-amber-300/80">LaventeCare dossier</p>
              <h1 className="truncate text-base font-bold text-white sm:text-lg">{dossier.titel}</h1>
              <p className="mt-0.5 truncate text-xs text-slate-500">
                {dossier.template_label ?? "Dossierstuk"} - {contextLabel}
              </p>
            </div>
          </div>

          {canOpenSource ? (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-sky-500/25 bg-sky-500/10 px-3 text-xs font-semibold text-sky-200 transition-colors hover:bg-sky-500/15 sm:text-sm"
            >
              <ExternalLink size={15} />
              <span>Open bron</span>
            </a>
          ) : null}
        </div>
      </header>

      <main className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-5 sm:pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pt-5">
        {canEmbed ? (
          <section className="glass flex min-h-96 flex-1 flex-col overflow-hidden border border-white/10 bg-[var(--color-surface)]">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2 sm:px-4">
              <div className="flex min-w-0 items-center gap-2">
                <FileText size={16} className="shrink-0 text-amber-300" />
                <p className="truncate text-sm font-semibold text-slate-200">
                  {theme === "print" ? "Printversie" : "Dossierdocument"}
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] font-bold uppercase text-slate-400">
                PDF
              </span>
            </div>
            <iframe
              src={sourceUrl}
              title={`${dossier.titel} PDF`}
              className="block min-h-96 w-full flex-1 bg-white"
            />
          </section>
        ) : (
          <section className="glass border border-white/10 bg-[var(--color-surface)] p-4 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/10 text-amber-200">
                <FolderOpen size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase text-amber-300/80">Dossierstuk geregistreerd</p>
                <h2 className="mt-1 text-xl font-bold text-white">{dossier.titel}</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                  Dit dossierstuk verwijst naar een interne of lokale bron en is daarom niet als browser-PDF te embedden.
                  De registratie blijft wel beschikbaar in LaventeCare, inclusief context, notities en bronpad.
                </p>
              </div>
            </div>

            <dl className="mt-6 grid gap-3 sm:grid-cols-2">
              <InfoItem label="Template" value={dossier.template_label ?? "Dossierstuk"} />
              <InfoItem label="Context" value={dossier.context_title ?? dossier.context_type} />
              <InfoItem label="Aangemaakt" value={formatDate(dossier.created_at)} />
              <InfoItem label="Bron" value={sourceUrl} mono />
            </dl>

            {dossier.notes ? (
              <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs font-bold uppercase text-slate-500">Notities</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">{dossier.notes}</p>
              </div>
            ) : null}
          </section>
        )}
      </main>
    </div>
  );
}

function MissingDocumentView({ documentKey, contextLabel }: { documentKey: string; contextLabel: string }) {
  return (
    <main className="min-h-dvh overflow-x-clip bg-[var(--color-bg)] px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] text-slate-100">
      <div className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-[var(--color-surface)] p-5 shadow-2xl shadow-black/30">
        <Link
          href="/laventecare"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/[0.08] hover:text-white"
        >
          <ArrowLeft size={16} />
          Terug naar LaventeCare
        </Link>
        <p className="mt-6 text-xs font-bold uppercase text-amber-300/80">Document niet gevonden</p>
        <h1 className="mt-2 text-2xl font-bold text-white">Dit LaventeCare document bestaat niet meer in de catalogus of het dossier.</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Documentkey: <span className="font-mono text-slate-300">{documentKey}</span>
          <br />
          Context: {contextLabel}
        </p>
      </div>
    </main>
  );
}

function InfoItem({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <dt className="text-xs font-bold uppercase text-slate-500">{label}</dt>
      <dd className={`mt-1 break-words text-sm text-slate-200 ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
