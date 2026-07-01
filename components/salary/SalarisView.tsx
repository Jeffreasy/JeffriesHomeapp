"use client";

import { useMemo } from "react";
import { TrendingUp, Euro, Briefcase, FileUp, ArrowRight, Clock3, Moon, Eye, EyeOff } from "lucide-react";
import Link from "next/link";

import { useSalary, type SalarisRecord } from "@/hooks/useSalary";
import { useLoonstroken, type LoonstrookRecord } from "@/hooks/useLoonstroken";
import { usePrivacy } from "@/hooks/usePrivacy";
import type { DienstRow } from "@/lib/schedule";
import { calculateScheduleSalaryRecords } from "@/lib/salaryForecast";
import { ErrorState } from "@/components/dashboard/DashboardPrimitives";
import { LoonstrookUploader } from "./LoonstrookUploader";
import { type SalarisDisplayRecord } from "./SalaryTypes";
import { displayRecordVanLoonstrook, displayRecord, fmt } from "./SalaryUtils";
import { PrognoseCard, JaarSectie, TotaalCard, VergelijkingSectie } from "./SalaryCards";

type SalarisViewProps = {
  diensten?: DienstRow[];
};

function mergeWithScheduleMetrics(scheduleRecord: SalarisRecord | undefined, apiRecord: SalarisRecord) {
  if (!scheduleRecord) return apiRecord;
  return {
    ...scheduleRecord,
    ...apiRecord,
    generatedFromSchedule: scheduleRecord.generatedFromSchedule,
    totaalUren: scheduleRecord.totaalUren,
    contractUren: scheduleRecord.contractUren,
    contractUrenPerWeek: scheduleRecord.contractUrenPerWeek,
    extraUren: scheduleRecord.extraUren,
    ortUren: scheduleRecord.ortUren,
    ortUrenDetail: scheduleRecord.ortUrenDetail,
    salarisCalibratie: scheduleRecord.salarisCalibratie,
  };
}

export function SalarisView({ diensten = [] }: SalarisViewProps) {
  const { records, isLoading, isError: salaryError, refetch: refetchSalary } = useSalary();
  const loonstroken = useLoonstroken();
  // S1: zelfde privacy-scope als finance — netto/bruto/pensioen/uurloon en de
  // title-tooltips maskeren met hetzelfde patroon.
  const { hidden: privacyOn, toggle: togglePrivacy, mask } = usePrivacy("finance");

  const scheduleRecords = useMemo(
    () => calculateScheduleSalaryRecords(diensten, {
      salaryRecords: records,
      loonstroken: loonstroken.records,
    }),
    [diensten, loonstroken.records, records]
  );

  const forecastRecords = useMemo(() => {
    const byPeriode = new Map<string, SalarisRecord>();
    for (const record of scheduleRecords) byPeriode.set(record.periode, record);
    for (const record of records) {
      byPeriode.set(record.periode, mergeWithScheduleMetrics(byPeriode.get(record.periode), record));
    }
    return Array.from(byPeriode.values()).sort((a, b) => a.jaar - b.jaar || a.maand - b.maand);
  }, [records, scheduleRecords]);

  const displayRecords = useMemo(() => {
    const merged = forecastRecords.map((r) => displayRecord(r, loonstroken.byPeriode));
    const existing = new Set(merged.map((r) => r.periode));
    const actualOnly = loonstroken.records
      .filter((w: LoonstrookRecord) => !existing.has(w.periodeLabel))
      .map((w: LoonstrookRecord) => displayRecordVanLoonstrook(w));
    return [...merged, ...actualOnly].sort((a, b) => a.jaar - b.jaar || a.maand - b.maand);
  }, [forecastRecords, loonstroken.byPeriode, loonstroken.records]);

  const displayPerJaar = useMemo(() => {
    const map: Record<number, SalarisDisplayRecord[]> = {};
    for (const r of displayRecords) (map[r.jaar] ??= []).push(r);
    return map;
  }, [displayRecords]);

  const jaren = Object.keys(displayPerJaar)
    .map(Number)
    .sort((a, b) => b - a);
    
  // S5: Amsterdam-gepind (zelfde patroon als useSalary) — een device op UTC
  // wees anders rond middernacht naar de verkeerde maand.
  const huidigKey = new Date()
    .toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" })
    .slice(0, 7);
  const huidig = displayRecords.find((r) => r.periode === huidigKey) ?? null;
  
  const totaalBruto = displayRecords.reduce((s, r) => s + r.brutoBetaling, 0);
  const totaalNetto = displayRecords.reduce((s, r) => s + r.nettoPrognose, 0);
  const totaalPensioen = displayRecords.reduce((s, r) => s + r.pensioenpremie, 0);
  const totaalUren = displayRecords.reduce((s, r) => s + (r.totaalUren ?? 0), 0);
  const totaalOrtUren = displayRecords.reduce((s, r) => s + (r.ortUren ?? 0), 0);
  const totaalExtraUren = displayRecords.reduce((s, r) => s + (r.extraUren ?? 0), 0);
  const scheduleForecastCount = displayRecords.filter((r) => r.generatedFromSchedule).length;
  
  const isLoadingData = isLoading || loonstroken.isLoading;

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-5 h-5 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
      </div>
    );
  }

  // Failed ≠ empty: een mislukte load mag niet op "Geen salarisdata" lijken.
  if ((salaryError || loonstroken.isError) && displayRecords.length === 0) {
    return (
      <ErrorState
        title="Salarisdata kon niet geladen worden"
        text="Er ging iets mis bij het ophalen van je salaris- of loonstrookgegevens. Probeer het opnieuw."
        onRetry={() => {
          if (salaryError) void refetchSalary();
          if (loonstroken.isError) void loonstroken.refetch();
        }}
      />
    );
  }

  if (displayRecords.length === 0) {
    return (
      <div className="glass rounded-2xl p-12 text-center border border-dashed border-[var(--color-border)]">
        <Euro size={36} className="text-slate-600 mx-auto mb-4" />
        <h3 className="text-base font-semibold text-slate-300 mb-1">Geen salarisdata</h3>
        <p className="text-sm text-slate-500">
          Importeer of synchroniseer je rooster zodat diensten beschikbaar zijn.<br />
          Daarna rekent deze tab automatisch uren, contracturen en ORT door.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* S1: eigen eye-toggle, zelfde patroon als de finance-header. */}
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={togglePrivacy}
          title={privacyOn ? "Bedragen tonen" : "Bedragen verbergen"}
          aria-label={privacyOn ? "Bedragen tonen" : "Bedragen verbergen"}
          className={`inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition-colors ${
            privacyOn
              ? "border-indigo-500/30 bg-indigo-500/15 text-indigo-200"
              : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]"
          }`}
        >
          {privacyOn ? <EyeOff size={16} /> : <Eye size={16} />}
          <span className="hidden sm:inline">{privacyOn ? "Verborgen" : "Zichtbaar"}</span>
        </button>
      </div>

      {/* Totalen banner */}
      <div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <TotaalCard icon={Clock3} label="Roosteruren" value={`${Math.round(totaalUren * 10) / 10}u`} accent="#38bdf8" />
          <TotaalCard icon={Moon} label="ORT uren" value={`${Math.round(totaalOrtUren * 10) / 10}u`} accent="#a78bfa" />
          <TotaalCard icon={Briefcase} label="Totaal bruto" value={mask(fmt(totaalBruto))} accent="#f59e0b" />
          <TotaalCard icon={TrendingUp} label="Netto totaal" value={mask(fmt(totaalNetto))} accent="#34d399" />
        </div>
        {/* S5: expliciete scope — deze totalen beslaan álle jaren en mengen
            prognose- met loonstrookmaanden. */}
        <p className="mt-2 text-[10px] uppercase tracking-wider text-slate-500">
          alle jaren · prognose + werkelijk gemengd
        </p>
      </div>

      {scheduleForecastCount > 0 && (
        <div className="rounded-2xl border border-sky-400/15 bg-sky-400/8 p-4 text-xs text-sky-100/80">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-sky-300/80">Roosterberekening actief</p>
              <p className="mt-1 leading-relaxed text-slate-400">
                {scheduleForecastCount} maand(en) worden direct uit je diensten berekend. Loonstroken blijven leidend zodra ze geimporteerd zijn.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-right sm:min-w-52">
              <span className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                <span className="block text-[10px] uppercase text-slate-500">Extra</span>
                <span className="font-bold text-amber-200">{Math.round(totaalExtraUren * 10) / 10}u</span>
              </span>
              <span className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                <span className="block text-[10px] uppercase text-slate-500">Pensioen</span>
                <span className="font-bold text-red-300">{mask(fmt(totaalPensioen))}</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Huidige maand prognose */}
      {huidig && <PrognoseCard record={huidig} mask={mask} />}

      {/* Per jaar */}
      {jaren.map((jaar) => (
        <JaarSectie key={jaar} jaar={jaar} records={displayPerJaar[jaar]} mask={mask} />
      ))}

      {/* Loonstroken Upload */}
      <div className="glass rounded-2xl p-5 border border-[var(--color-border)] min-w-0">
        <div className="flex items-center gap-2 mb-4">
          <FileUp size={14} className="text-indigo-400" />
          <p className="text-[10px] text-indigo-400/70 uppercase tracking-wider font-bold">Loonstroken uploaden</p>
        </div>
        <LoonstrookUploader />
      </div>

      {/* Werkelijk vs Berekend vergelijking */}
      {loonstroken.count > 0 && (
        <VergelijkingSectie berekend={forecastRecords} werkelijkByPeriode={loonstroken.byPeriode} mask={mask} />
      )}

      {/* Disclaimer + Finance link */}
      <p className="text-[10px] text-slate-500 text-center leading-relaxed">
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
