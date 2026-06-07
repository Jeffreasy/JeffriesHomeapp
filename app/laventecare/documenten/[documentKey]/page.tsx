import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, ExternalLink, FileText, Printer } from "lucide-react";
import {
  getLaventeCarePdfDocument,
  getLaventeCarePdfDossierContextLabel,
  getLaventeCarePdfFilename,
  getLaventeCarePdfUrl,
  isLaventeCarePdfTheme,
  parseLaventeCarePdfDossierContext,
  type LaventeCarePdfTheme,
} from "@/lib/laventecare";

type PageProps = {
  params: Promise<{
    documentKey: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

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

async function getViewerData({ params, searchParams }: PageProps) {
  const [{ documentKey }, rawSearchParams] = await Promise.all([params, searchParams]);
  const document = getLaventeCarePdfDocument(documentKey);

  if (!document) notFound();

  const themeParam = firstParam(rawSearchParams.theme);
  const theme: LaventeCarePdfTheme =
    themeParam && isLaventeCarePdfTheme(themeParam) ? themeParam : "screen";
  const context = parseLaventeCarePdfDossierContext(toUrlSearchParams(rawSearchParams));

  return {
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
  const { document } = await getViewerData(props);

  return {
    title: `${document.title} - LaventeCare PDF`,
  };
}

export default async function LaventeCarePdfViewerPage(props: PageProps) {
  const { document, theme, context, pdfUrl, screenDownloadUrl, printDownloadUrl } = await getViewerData(props);
  const filename = getLaventeCarePdfFilename(document, theme);

  return (
    <div className="min-h-[100dvh] bg-[var(--color-bg)] text-slate-100">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#090d16]/95 px-3 py-3 backdrop-blur-xl sm:px-5">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/laventecare"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 transition-colors hover:bg-white/[0.08] hover:text-white"
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

          <div className="grid grid-cols-3 gap-2 sm:flex sm:shrink-0 sm:items-center">
            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-sky-500/25 bg-sky-500/10 px-3 text-xs font-semibold text-sky-200 transition-colors hover:bg-sky-500/15 sm:text-sm"
            >
              <ExternalLink size={15} />
              <span>Open</span>
            </a>
            <a
              href={screenDownloadUrl}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/[0.08] sm:text-sm"
            >
              <Download size={15} />
              <span>Screen</span>
            </a>
            <a
              href={printDownloadUrl}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 text-xs font-semibold text-amber-200 transition-colors hover:bg-amber-500/15 sm:text-sm"
            >
              <Printer size={15} />
              <span>Print</span>
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-3 py-3 pb-28 sm:px-5 sm:py-5">
        <section className="glass overflow-hidden border border-white/10 bg-[var(--color-surface)]">
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
            className="block h-[calc(100dvh-14.5rem)] min-h-[420px] w-full bg-white sm:h-[calc(100dvh-12rem)] sm:min-h-[640px]"
          />
        </section>
      </main>
    </div>
  );
}
