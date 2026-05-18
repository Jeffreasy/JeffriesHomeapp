"use client";

import { useMemo } from "react";
import { TrendingUp, Euro, Landmark, Briefcase, FileUp, ArrowRight } from "lucide-react";
import Link from "next/link";

import { useSalary } from "@/hooks/useSalary";
import { useLoonstroken } from "@/hooks/useLoonstroken";
import { LoonstrookUploader } from "./LoonstrookUploader";
import { type SalarisDisplayRecord } from "./SalaryTypes";
import { displayRecordVanLoonstrook, displayRecord, fmt } from "./SalaryUtils";
import { PrognoseCard, JaarSectie, TotaalCard, VergelijkingSectie } from "./SalaryCards";

export function SalarisView() {
  const { records, isLoading } = useSalary();
  const loonstroken = useLoonstroken();

  const displayRecords = useMemo(() => {
    const merged = records.map((r) => displayRecord(r, loonstroken.byPeriode));
    const existing = new Set(merged.map((r) => r.periode));
    const actualOnly = loonstroken.records
      .filter((w: any) => !existing.has(w.periodeLabel))
      .map((w: any) => displayRecordVanLoonstrook(w));
    return [...merged, ...actualOnly].sort((a, b) => a.jaar - b.jaar || a.maand - b.maand);
  }, [loonstroken.byPeriode, loonstroken.records, records]);

  const displayPerJaar = useMemo(() => {
    const map: Record<number, SalarisDisplayRecord[]> = {};
    for (const r of displayRecords) (map[r.jaar] ??= []).push(r);
    return map;
  }, [displayRecords]);

  const jaren = Object.keys(displayPerJaar)
    .map(Number)
    .sort((a, b) => b - a);
    
  const nu = new Date();
  const huidigKey = `${nu.getFullYear()}-${String(nu.getMonth() + 1).padStart(2, "0")}`;
  const huidig = displayRecords.find((r) => r.periode === huidigKey) ?? null;
  
  const totaalBruto = displayRecords.reduce((s, r) => s + r.brutoBetaling, 0);
  const totaalNetto = displayRecords.reduce((s, r) => s + r.nettoPrognose, 0);
  const totaalPensioen = displayRecords.reduce((s, r) => s + r.pensioenpremie, 0);
  
  const isLoadingData = isLoading || loonstroken.isLoading;

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-5 h-5 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (displayRecords.length === 0) {
    return (
      <div className="glass rounded-2xl p-12 text-center border border-dashed border-white/10">
        <Euro size={36} className="text-slate-600 mx-auto mb-4" />
        <h3 className="text-base font-semibold text-slate-300 mb-1">Geen salarisdata</h3>
        <p className="text-sm text-slate-500">
          Synchroniseer je rooster via de Sync-knop zodat diensten beschikbaar zijn.<br />
          De salarisberekening wordt daarna automatisch gegenereerd.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Totalen banner */}
      <div className="grid grid-cols-3 gap-3">
        <TotaalCard icon={Briefcase} label="Totaal Bruto" value={fmt(totaalBruto)} accent="#f59e0b" />
        <TotaalCard icon={Landmark}  label="Pensioen PFZW" value={fmt(totaalPensioen)} accent="#ef4444" />
        <TotaalCard icon={TrendingUp} label="Netto totaal" value={fmt(totaalNetto)} accent="#34d399" />
      </div>

      {/* Huidige maand prognose */}
      {huidig && <PrognoseCard record={huidig} />}

      {/* Per jaar */}
      {jaren.map((jaar) => (
        <JaarSectie key={jaar} jaar={jaar} records={displayPerJaar[jaar]} />
      ))}

      {/* Loonstroken Upload */}
      <div className="glass rounded-2xl p-5 border border-white/5">
        <div className="flex items-center gap-2 mb-4">
          <FileUp size={14} className="text-indigo-400" />
          <p className="text-[10px] text-indigo-400/70 uppercase tracking-wider font-bold">Loonstroken uploaden</p>
        </div>
        <LoonstrookUploader />
      </div>

      {/* Werkelijk vs Berekend vergelijking */}
      {loonstroken.count > 0 && (
        <VergelijkingSectie berekend={records} werkelijkByPeriode={loonstroken.byPeriode} />
      )}

      {/* Disclaimer + Finance link */}
      <p className="text-[10px] text-slate-700 text-center leading-relaxed">
        Maanden met geimporteerde loonstrook gebruiken werkelijke bedragen; overige maanden blijven prognoses.
        {"\u2248"} Netto prognose is een schatting op basis van de 2026-loonheffingstabel.
        De exacte verrekening door {"'"}s Heeren Loo kan afwijken door tijdvakfactor en heffingskortingen.
      </p>
      {loonstroken.count > 0 && (
        <Link href="/finance" className="flex items-center justify-center gap-1.5 text-xs text-indigo-400/70 hover:text-indigo-400 transition-colors py-2">
          Bekijk salaris in Finance overzicht <ArrowRight size={12} />
        </Link>
      )}
    </div>
  );
}
