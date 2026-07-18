"use client";

import { useState, type KeyboardEventHandler } from "react";
import { TrendingDown, TrendingUp, AlertTriangle, ChevronDown, Search } from "lucide-react";
import { CATEGORIE_OPTIES, CODE_LABELS, eurExact } from "@/lib/finance-constants";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FeedbackState } from "@/components/ui/FeedbackState";
import { Popover } from "@/components/ui/Popover";
import { Surface } from "@/components/ui/Surface";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

import type { TransactionRow } from "@/hooks/useTransactions";
export type { TransactionRow };

// ─── Inline categorie-editor ─────────────────────────────────────────────────

function CategorieEditor({
  tx,
  onSave,
}: {
  tx: TransactionRow;
  onSave: (id: string, cat: string | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const catLabel = tx.categorie ?? "Overig";

  const handleMenuKeyDown: KeyboardEventHandler<HTMLDivElement> = (event) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const items = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>("[data-category-option]"),
    );
    if (items.length === 0) return;
    event.preventDefault();
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    const next = current === -1
      ? event.key === "ArrowDown" ? 0 : items.length - 1
      : event.key === "ArrowDown"
        ? (current + 1) % items.length
        : (current - 1 + items.length) % items.length;
    items[next]?.focus();
  };

  const saveCategory = (category: string | undefined) => {
    onSave(tx._id || tx.id || "", category);
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      title="Categorie kiezen"
      ariaLabel="Kies een categorie"
      closeLabel="Categoriemenu sluiten"
      role="menu"
      align="end"
      onContentKeyDown={handleMenuKeyDown}
      className="grid max-h-60 w-48 gap-1 overflow-y-auto"
      mobileClassName="grid gap-1"
      trigger={(triggerProps) => (
        <Button
          {...triggerProps}
          variant="secondary"
          size="sm"
          className={cn(
            "h-auto min-h-11 rounded-full px-3",
            open && "border-[var(--color-primary-border)] bg-[var(--color-primary-subtle)] text-[var(--color-primary-hover)]",
          )}
          title="Categorie aanpassen"
          aria-label={"Categorie aanpassen, huidige categorie: " + catLabel}
        >
          {catLabel}
          <ChevronDown
            size={14}
            aria-hidden="true"
            className={cn("transition-transform", open && "rotate-180")}
          />
        </Button>
      )}
    >
      {CATEGORIE_OPTIES.map((cat) => (
        <Button
          key={cat}
          type="button"
          role="menuitemradio"
          data-category-option
          aria-checked={tx.categorie === cat}
          variant={tx.categorie === cat ? "secondary" : "ghost"}
          size="sm"
          fullWidth
          className={cn(
            "justify-start",
            tx.categorie === cat && "border-[var(--color-primary-border)] bg-[var(--color-primary-subtle)] text-[var(--color-primary-hover)]",
          )}
          onClick={() => saveCategory(cat)}
        >
          {cat}
        </Button>
      ))}
      <Button
        type="button"
        role="menuitemradio"
        data-category-option
        aria-checked={!tx.categorie}
        variant={!tx.categorie ? "secondary" : "ghost"}
        size="sm"
        fullWidth
        className={cn(
          "mt-1 justify-start border-t border-[var(--color-border)]",
          !tx.categorie && "border-[var(--color-primary-border)] bg-[var(--color-primary-subtle)] text-[var(--color-primary-hover)]",
        )}
        onClick={() => saveCategory(undefined)}
      >
        ↩ Auto-detect
      </Button>
    </Popover>
  );
}

// ─── TransactionList ─────────────────────────────────────────────────────────

interface Props {
  transactions: TransactionRow[];
  onCategorie: (id: string, cat: string | undefined) => void;
  formatAmount?: (amount: number) => string;
  /** Formatter voor niet-getekende bedragen in het detail (saldo na transactie) — privacy-mask aware. */
  formatBalance?: (amount: number) => string;
  /** Privacy-mask voor vrije tekstwaarden (bv. oorspronkelijk bedrag in
   *  vreemde valuta) — dezelfde helper als usePrivacy("finance").mask. */
  maskValue?: (value: string) => string;
  /** F2: "Meer van deze tegenpartij" zet de zoekterm op de tegenpartijnaam. */
  onSearchTegenpartij?: (naam: string) => void;
  /** True wanneer er nog helemaal geen transacties zijn (lege DB, geen filters)
   *  — dan is de lege staat een import-CTA, geen "geen resultaten"-melding. */
  isFirstRun?: boolean;
  isDone: boolean;
  onLoadMore: () => void;
  isLoading: boolean;
}

function defaultFormatAmount(amount: number) {
  return `${amount >= 0 ? "+" : ""}${amount.toLocaleString("nl-NL", { style: "currency", currency: "EUR" })}`;
}

export function TransactionList({
  transactions,
  onCategorie,
  formatAmount = defaultFormatAmount,
  formatBalance = eurExact,
  maskValue = (value: string) => value,
  onSearchTegenpartij,
  isFirstRun = false,
  isDone,
  onLoadMore,
  isLoading,
}: Props) {
  // F2: tap-to-expand — één rij tegelijk open met tegenrekening, saldo na
  // transactie, referentie en oorspronkelijk bedrag/valuta uit het rijmodel.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Eerste load: skeleton-rijen in plaats van een lege regio, zodat "laden"
  // niet op "geen transacties" lijkt.
  if (transactions.length === 0 && isLoading) {
    return (
      <FeedbackState
        tone="loading"
        compact
        title="Transacties laden"
        description="De geselecteerde transacties worden opgehaald."
      />
    );
  }

  if (transactions.length === 0 && !isLoading) {
    return (
      <FeedbackState
        compact
        title={isFirstRun ? "Nog geen transacties" : "Geen transacties gevonden"}
        description={isFirstRun
          ? "Importeer je eerste Rabobank-CSV via het importpaneel hierboven."
          : "Er zijn geen transacties gevonden voor de huidige filters."}
        actionLabel={!isFirstRun && !isDone ? "Verder zoeken" : undefined}
        onAction={!isFirstRun && !isDone ? onLoadMore : undefined}
      />
    );
  }

  return (
    <div className="space-y-1">
      {transactions.map((tx, index) => {
        const previous = transactions[index - 1];
        const showDateHeader = !previous || tx.datum !== previous.datum;
        const rowId = tx._id || tx.id || [
          tx.datum,
          tx.referentie ?? "",
          tx.tegenrekening_iban ?? "",
          tx.omschrijving ?? "",
          String(tx.bedrag),
        ].join("|");
        const isExpanded = expandedId === rowId;
        const naam = (tx.isInterneOverboeking || tx.is_interne_overboeking)
          ? "↔ Interne overboeking"
          : (tx.tegenpartijNaam || tx.tegenpartij_naam || "Onbekend");
        const zoekNaam = tx.tegenpartijNaam || tx.tegenpartij_naam || "";

        return (
          <div key={rowId}>
            {showDateHeader && (
              <div className="px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-subtle)]">
                {(() => {
                  const d = new Date(tx.datum + "T00:00:00");
                  return isNaN(d.getTime())
                    ? tx.datum
                    : d.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });
                })()}
              </div>
            )}
            <div
              className={cn(
                "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-1.5 rounded-xl border-b border-[var(--color-border)] px-3 py-2.5 transition-colors hover:bg-[var(--color-surface-hover)] sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]",
                tx.code === "st" && "border-l-2 border-l-[var(--color-danger)] bg-[var(--color-danger-subtle)]",
                (tx.isInterneOverboeking || tx.is_interne_overboeking) && "opacity-50",
              )}
            >
              {/* Partij + omschrijving — tap-to-expand (F2) */}
              <Button
                type="button"
                variant="ghost"
                fullWidth
                className="col-span-3 h-auto min-h-11 flex-col items-start justify-center gap-0.5 rounded-lg border-0 px-1 py-1 text-left sm:col-span-1"
                onClick={() => setExpandedId(isExpanded ? null : rowId)}
                aria-expanded={isExpanded}
                title={isExpanded ? "Transactiedetail verbergen" : "Transactiedetail tonen"}
              >
                <span className="flex max-w-full items-center gap-1.5 text-sm font-semibold text-[var(--color-text)]">
                  <span className="min-w-0 truncate">{naam}</span>
                  <ChevronDown
                    size={14}
                    aria-hidden="true"
                    className={cn(
                      "shrink-0 text-[var(--color-text-subtle)] transition-transform",
                      isExpanded && "rotate-180",
                    )}
                  />
                </span>
                {tx.omschrijving && (
                  <span className="max-w-full truncate text-xs font-normal text-[var(--color-text-subtle)]" title={tx.omschrijving}>
                    {tx.omschrijving}
                  </span>
                )}
                {(tx.redenRetour || tx.reden_retour) && (
                  <span className="mt-0.5 flex items-start gap-1 text-xs font-medium text-[var(--color-danger)]">
                    <AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
                    {tx.redenRetour || tx.reden_retour}
                  </span>
                )}
              </Button>

              {/* Code badge */}
              <Badge size="sm" tone="neutral" className="whitespace-nowrap">
                {CODE_LABELS[tx.code] ?? tx.code}
              </Badge>

              {/* Categorie editor */}
              <CategorieEditor tx={tx} onSave={onCategorie} />

              {/* Bedrag */}
              <span className={cn(
                "ml-auto flex items-center gap-1 whitespace-nowrap text-sm font-semibold tabular-nums",
                tx.bedrag >= 0 ? "text-[var(--color-success)]" : "text-[var(--color-text)]",
              )}>
                {tx.bedrag >= 0
                  ? <TrendingUp size={14} aria-hidden="true" />
                  : <TrendingDown size={14} aria-hidden="true" />}
                {formatAmount(tx.bedrag)}
              </span>
            </div>

            {isExpanded && (
              <Surface tone="subtle" radius="sm" padding="sm" className="mb-1 text-xs">
                <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
                  <div className="flex justify-between gap-3 sm:flex-col sm:justify-start">
                    <dt className="text-[var(--color-text-subtle)]">Tegenrekening</dt>
                    <dd className="break-all font-medium text-[var(--color-text-muted)]">{tx.tegenrekening_iban || "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-3 sm:flex-col sm:justify-start">
                    <dt className="text-[var(--color-text-subtle)]">Saldo na transactie</dt>
                    <dd className="font-medium tabular-nums text-[var(--color-text-muted)]">
                      {typeof tx.saldo_na_trn === "number" ? formatBalance(tx.saldo_na_trn) : "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3 sm:flex-col sm:justify-start">
                    <dt className="text-[var(--color-text-subtle)]">Referentie</dt>
                    <dd className="break-all font-medium text-[var(--color-text-muted)]">{tx.referentie || "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-3 sm:flex-col sm:justify-start">
                    <dt className="text-[var(--color-text-subtle)]">Oorspronkelijk bedrag</dt>
                    <dd className="font-medium tabular-nums text-[var(--color-text-muted)]">
                      {typeof tx.oorsp_bedrag === "number" && tx.oorsp_munt
                        ? maskValue(`${tx.oorsp_bedrag.toLocaleString("nl-NL", { minimumFractionDigits: 2 })} ${tx.oorsp_munt}`)
                        : "—"}
                    </dd>
                  </div>
                </dl>
                {onSearchTegenpartij && zoekNaam && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="mt-3"
                    onClick={() => onSearchTegenpartij(zoekNaam)}
                  >
                    <Search size={14} aria-hidden="true" />
                    Meer van deze tegenpartij
                  </Button>
                )}
              </Surface>
            )}
          </div>
        );
      })}

      {/* Load more */}
      {!isDone && (
        <div className="flex justify-center px-2 pb-2 pt-4">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onLoadMore}
            loading={isLoading}
            loadingLabel="Laden…"
          >
            Meer laden
          </Button>
        </div>
      )}
    </div>
  );
}
