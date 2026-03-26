"use client";

import { useState } from "react";
import { TrendingDown, TrendingUp, AlertTriangle, ChevronDown } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TransactionRow {
  _id:                  Id<"transactions">;
  datum:                string;
  bedrag:               number;
  code:                 string;
  tegenpartijNaam?:     string;
  omschrijving:         string;
  redenRetour?:         string;
  isInterneOverboeking: boolean;
  categorie?:           string;
}

const CODE_LABELS: Record<string, string> = {
  tb: "Overboeking", bc: "Betaalopdracht", id: "Incasso",
  ei: "Europese Incasso", ba: "Bankopdracht", bg: "Bankgiro",
  cb: "Creditcard", db: "Debetkaart", st: "Stornering",
  sb: "SEPA", ga: "Geldautomaat", gb: "Geldautomaat", kh: "Kascheque",
};

const CATEGORIE_OPTIES = [
  "Boodschappen", "Brandstof", "Coffeeshop", "Crypto", "Familie",
  "Fastfood", "Gaming", "Geldopname", "Online Winkelen", "Persoonlijk",
  "SaaS", "SaaS Abonnementen", "Salaris", "Sport", "Streaming",
  "Telecom", "Toeslagen", "Vakantie", "Vaste Lasten", "Vervoer",
  "Verzekeringen", "Vrienden", "Vrije Tijd", "Zakelijk",
  "Zorgverzekering", "Overig",
];

// ─── Inline categorie-editor ─────────────────────────────────────────────────

function CategorieEditor({
  tx,
  onSave,
}: {
  tx: TransactionRow;
  onSave: (id: Id<"transactions">, cat: string | undefined) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="cat-editor">
      <button className="tx-categorie" onClick={() => setOpen((v) => !v)} title="Categorie aanpassen">
        {tx.categorie ?? "Overig"}
        <ChevronDown size={10} />
      </button>
      {open && (
        <div className="cat-dropdown">
          {CATEGORIE_OPTIES.map((cat) => (
            <button
              key={cat}
              className={`cat-option ${tx.categorie === cat ? "cat-option--active" : ""}`}
              onClick={() => { onSave(tx._id, cat); setOpen(false); }}
            >
              {cat}
            </button>
          ))}
          <button className="cat-option cat-option--clear" onClick={() => { onSave(tx._id, undefined); setOpen(false); }}>
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
  onCategorie: (id: Id<"transactions">, cat: string | undefined) => void;
  isDone: boolean;
  onLoadMore: () => void;
  isLoading: boolean;
}

export function TransactionList({ transactions, onCategorie, isDone, onLoadMore, isLoading }: Props) {
  if (transactions.length === 0 && !isLoading) {
    return <div className="tx-empty"><p>Geen transacties gevonden voor deze filters.</p></div>;
  }

  // Groepeer op datum voor sub-headers
  let lastDatum = "";

  return (
    <div className="tx-list">
      {transactions.map((tx) => {
        const showDateHeader = tx.datum !== lastDatum;
        lastDatum = tx.datum;

        return (
          <div key={tx._id}>
            {showDateHeader && (
              <div className="tx-date-header">
                {new Date(tx.datum + "T00:00:00").toLocaleDateString("nl-NL", {
                  weekday: "long", day: "numeric", month: "long",
                })}
              </div>
            )}
            <div
              className={[
                "tx-row",
                tx.bedrag > 0       && "tx-row--credit",
                tx.bedrag < 0       && "tx-row--debit",
                tx.code === "st"    && "tx-row--stornering",
                tx.isInterneOverboeking && "tx-row--intern",
              ].filter(Boolean).join(" ")}
            >
              {/* Partij + omschrijving */}
              <div className="tx-info">
                <span className="tx-naam">
                  {tx.isInterneOverboeking ? "↔ Interne overboeking" : (tx.tegenpartijNaam || "Onbekend")}
                </span>
                {tx.omschrijving && (
                  <span className="tx-omschrijving">{tx.omschrijving.slice(0, 90)}</span>
                )}
                {tx.redenRetour && (
                  <span className="tx-retour"><AlertTriangle size={11} />{tx.redenRetour}</span>
                )}
              </div>

              {/* Code badge */}
              <span className="tx-code">{CODE_LABELS[tx.code] ?? tx.code}</span>

              {/* Categorie editor */}
              <CategorieEditor tx={tx} onSave={onCategorie} />

              {/* Bedrag */}
              <span className={`tx-bedrag ${tx.bedrag >= 0 ? "tx-bedrag--plus" : "tx-bedrag--min"}`}>
                {tx.bedrag >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                {tx.bedrag >= 0 ? "+" : ""}
                {tx.bedrag.toLocaleString("nl-NL", { style: "currency", currency: "EUR" })}
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
