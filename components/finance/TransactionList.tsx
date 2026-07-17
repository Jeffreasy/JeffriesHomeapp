"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { TrendingDown, TrendingUp, AlertTriangle, ChevronDown, Search } from "lucide-react";
import { CATEGORIE_OPTIES, CODE_LABELS, eurExact } from "@/lib/finance-constants";

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
  const [flipLeft, setFlipLeft] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  const toggle = () => {
    if (!open) {
      const rect = editorRef.current?.getBoundingClientRect();
      setFlipLeft(Boolean(rect && rect.left - 160 + rect.width < 0));
    }
    setOpen((current) => !current);
  };
  // Close on outside click / Escape, and move focus into the menu on open.
  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: MouseEvent | TouchEvent) {
      if (editorRef.current && !editorRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        close(true);
        return;
      }
      // Tab uit het menu: sluit het menu (zonder focus terug te trekken) zodat
      // het niet open blijft hangen terwijl de focus al elders staat.
      if (e.key === "Tab") {
        close(false);
        return;
      }
      // Pijltjesnavigatie tussen de menu-items (rondlopend), zoals bij een
      // echt role="menu" hoort.
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        const items = Array.from(
          menuRef.current?.querySelectorAll<HTMLButtonElement>(".cat-option") ?? []
        );
        if (items.length === 0) return;
        e.preventDefault();
        const current = items.indexOf(document.activeElement as HTMLButtonElement);
        let next: number;
        if (current === -1) {
          next = e.key === "ArrowDown" ? 0 : items.length - 1;
        } else {
          next = e.key === "ArrowDown"
            ? (current + 1) % items.length
            : (current - 1 + items.length) % items.length;
        }
        items[next]?.focus();
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    // Move focus into the menu for keyboard / screen-reader users.
    const firstItem = menuRef.current?.querySelector<HTMLButtonElement>(".cat-option");
    firstItem?.focus();

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  const catLabel = tx.categorie ?? "Overig";

  return (
    <div className="cat-editor" ref={editorRef}>
      <button
        ref={triggerRef}
        type="button"
        className="tx-categorie"
        onClick={toggle}
        title="Categorie aanpassen"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Categorie aanpassen, huidige categorie: ${catLabel}`}
      >
        {catLabel}
        <ChevronDown size={10} aria-hidden="true" />
      </button>
      {open && (
        <div
          className={`cat-dropdown${flipLeft ? " cat-dropdown--left" : ""}`}
          role="menu"
          aria-label="Kies een categorie"
          ref={menuRef}
        >
          {CATEGORIE_OPTIES.map((cat) => (
            <button
              key={cat}
              type="button"
              role="menuitem"
              className={`cat-option ${tx.categorie === cat ? "cat-option--active" : ""}`}
              onClick={() => { onSave(tx._id || tx.id || "", cat); close(true); }}
            >
              {cat}
            </button>
          ))}
          <button
            type="button"
            role="menuitem"
            className="cat-option cat-option--clear"
            onClick={() => { onSave(tx._id || tx.id || "", undefined); close(true); }}
          >
            ↩ Auto-detect
          </button>
        </div>
      )}
    </div>
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
      <div className="space-y-2" role="status">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-white/[0.03]" aria-hidden="true" />
        ))}
        <span className="sr-only">Transacties laden…</span>
      </div>
    );
  }

  if (transactions.length === 0 && !isLoading) {
    return (
      <div className="tx-empty">
        {isFirstRun ? (
          <p>Nog geen transacties — importeer je eerste Rabobank-CSV hierboven.</p>
        ) : (
          <>
            <p>Geen transacties gevonden voor deze filters.</p>
            {!isDone && (
              <button type="button" className="btn btn--ghost btn--sm" onClick={onLoadMore}>
                Verder zoeken
              </button>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="tx-list">
      {transactions.map((tx, index) => {
        const previous = transactions[index - 1];
        const showDateHeader = !previous || tx.datum !== previous.datum;
        const rowId = tx._id || tx.id || `${tx.datum}-${index}`;
        const isExpanded = expandedId === rowId;
        const naam = (tx.isInterneOverboeking || tx.is_interne_overboeking)
          ? "↔ Interne overboeking"
          : (tx.tegenpartijNaam || tx.tegenpartij_naam || "Onbekend");
        const zoekNaam = tx.tegenpartijNaam || tx.tegenpartij_naam || "";

        return (
          <div key={rowId}>
            {showDateHeader && (
              <div className="tx-date-header">
                {(() => {
                  const d = new Date(tx.datum + "T00:00:00");
                  return isNaN(d.getTime())
                    ? tx.datum
                    : d.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });
                })()}
              </div>
            )}
            <div
              className={[
                "tx-row",
                tx.bedrag > 0       && "tx-row--credit",
                tx.bedrag < 0       && "tx-row--debit",
                tx.code === "st"    && "tx-row--stornering",
                (tx.isInterneOverboeking || tx.is_interne_overboeking) && "tx-row--intern",
              ].filter(Boolean).join(" ")}
            >
              {/* Partij + omschrijving — tap-to-expand (F2) */}
              <button
                type="button"
                className="tx-info cursor-pointer appearance-none border-0 bg-transparent p-0 text-left"
                onClick={() => setExpandedId(isExpanded ? null : rowId)}
                aria-expanded={isExpanded}
                title={isExpanded ? "Transactiedetail verbergen" : "Transactiedetail tonen"}
              >
                <span className="tx-naam flex items-center gap-1.5">
                  <span className="min-w-0 truncate">{naam}</span>
                  <ChevronDown
                    size={12}
                    aria-hidden="true"
                    className={`shrink-0 text-slate-500 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  />
                </span>
                {tx.omschrijving && (
                  // Geen harde afkapping: .tx-omschrijving heeft al CSS-ellipsis;
                  // de title toont desgewenst de volledige tekst.
                  <span className="tx-omschrijving" title={tx.omschrijving}>{tx.omschrijving}</span>
                )}
                {(tx.redenRetour || tx.reden_retour) && (
                  <span className="tx-retour"><AlertTriangle size={11} />{tx.redenRetour || tx.reden_retour}</span>
                )}
              </button>

              {/* Code badge */}
              <span className="tx-code">{CODE_LABELS[tx.code] ?? tx.code}</span>

              {/* Categorie editor */}
              <CategorieEditor tx={tx} onSave={onCategorie} />

              {/* Bedrag */}
              <span className={`tx-bedrag ${tx.bedrag >= 0 ? "tx-bedrag--plus" : "tx-bedrag--min"}`}>
                {tx.bedrag >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                {formatAmount(tx.bedrag)}
              </span>
            </div>

            {isExpanded && (
              <div className="mb-1 rounded-lg border border-white/8 bg-white/[0.03] px-4 py-3 text-xs">
                <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
                  <div className="flex justify-between gap-3 sm:flex-col sm:justify-start">
                    <dt className="text-slate-500">Tegenrekening</dt>
                    <dd className="font-medium text-slate-300 break-all">{tx.tegenrekening_iban || "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-3 sm:flex-col sm:justify-start">
                    <dt className="text-slate-500">Saldo na transactie</dt>
                    <dd className="font-medium tabular-nums text-slate-300">
                      {typeof tx.saldo_na_trn === "number" ? formatBalance(tx.saldo_na_trn) : "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3 sm:flex-col sm:justify-start">
                    <dt className="text-slate-500">Referentie</dt>
                    <dd className="font-medium text-slate-300 break-all">{tx.referentie || "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-3 sm:flex-col sm:justify-start">
                    <dt className="text-slate-500">Oorspronkelijk bedrag</dt>
                    <dd className="font-medium tabular-nums text-slate-300">
                      {typeof tx.oorsp_bedrag === "number" && tx.oorsp_munt
                        ? maskValue(`${tx.oorsp_bedrag.toLocaleString("nl-NL", { minimumFractionDigits: 2 })} ${tx.oorsp_munt}`)
                        : "—"}
                    </dd>
                  </div>
                </dl>
                {onSearchTegenpartij && zoekNaam && (
                  <button
                    type="button"
                    className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/[0.08]"
                    onClick={() => onSearchTegenpartij(zoekNaam)}
                  >
                    <Search size={12} aria-hidden="true" />
                    Meer van deze tegenpartij
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Load more */}
      {!isDone && (
        <div className="tx-load-more">
          <button className="btn btn--ghost btn--sm" onClick={onLoadMore} disabled={isLoading}>
            {isLoading ? <><span className="spinner-inline" /> Laden…</> : "Meer laden"}
          </button>
        </div>
      )}
    </div>
  );
}
