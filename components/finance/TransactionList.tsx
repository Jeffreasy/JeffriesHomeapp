"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { TrendingDown, TrendingUp, AlertTriangle, ChevronDown } from "lucide-react";
import { CATEGORIE_OPTIES, CODE_LABELS } from "@/lib/finance-constants";

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
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    // Reposition if the right-anchored dropdown would overflow the viewport edge.
    const rect = editorRef.current?.getBoundingClientRect();
    if (rect && rect.left - 160 + rect.width < 0) setFlipLeft(true);

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
        onClick={() => setOpen((v) => !v)}
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
  isDone,
  onLoadMore,
  isLoading,
}: Props) {
  if (transactions.length === 0 && !isLoading) {
    return (
      <div className="tx-empty">
        <p>Geen transacties gevonden voor deze filters.</p>
        {!isDone && (
          <button className="btn btn--ghost btn--sm" onClick={onLoadMore}>
            Verder zoeken
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="tx-list">
      {transactions.map((tx, index) => {
        const previous = transactions[index - 1];
        const showDateHeader = !previous || tx.datum !== previous.datum;

        return (
          <div key={tx._id || tx.id}>
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
              {/* Partij + omschrijving */}
              <div className="tx-info">
                <span className="tx-naam">
                  {(tx.isInterneOverboeking || tx.is_interne_overboeking) ? "↔ Interne overboeking" : (tx.tegenpartijNaam || tx.tegenpartij_naam || "Onbekend")}
                </span>
                {tx.omschrijving && (
                  <span className="tx-omschrijving">{tx.omschrijving.slice(0, 90)}</span>
                )}
                {(tx.redenRetour || tx.reden_retour) && (
                  <span className="tx-retour"><AlertTriangle size={11} />{tx.redenRetour || tx.reden_retour}</span>
                )}
              </div>

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
