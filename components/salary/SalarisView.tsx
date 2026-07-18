"use client";

import { useMemo } from "react";
import { TrendingUp, Euro, Briefcase, ArrowRight, Clock3, Moon, Eye, EyeOff } from "lucide-react";

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
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { FeedbackState } from "@/components/ui/FeedbackState";
import { Surface } from "@/components/ui/Surface";
import { SurfaceHeader } from "@/components/ui/SurfaceHeader";
import { AppIcon } from "@/components/ui/AppIcon";

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
      <FeedbackState
        tone="loading"
        title="Salarisgegevens laden…"
        description="Roosterprognoses en loonstroken worden samengevoegd."
        compact
      />
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
    // H8: de uploader is de databron van deze tab — hij mag niet achter de
    // lege staat verdwijnen. Toon 'm hier óók, en verbreed de copy zodat beide
    // routes (rooster óf loonstrook uploaden) genoemd worden.
    return (
      <div className="space-y-6">
        <FeedbackState
          title="Nog geen salarisdata"
          description="Upload hieronder je loonstroken, of importeer en synchroniseer je rooster. Deze tab rekent dan automatisch uren, contracturen en ORT door."
          icon={Euro}
        />

        <Surface padding="md">
          <SurfaceHeader
            icon={<AppIcon name="upload" tone="accent" size="sm" />}
            eyebrow="Documentimport"
            title="Loonstroken uploaden"
            headingLevel={3}
          />
          <LoonstrookUploader />
        </Surface>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* S1: eigen eye-toggle, zelfde patroon als de finance-header. */}
      <div className="flex items-center justify-end">
        <Button
          onClick={togglePrivacy}
          title={privacyOn ? "Bedragen tonen" : "Bedragen verbergen"}
          aria-label={privacyOn ? "Bedragen tonen" : "Bedragen verbergen"}
          variant={privacyOn ? "primary" : "secondary"}
          size="sm"
        >
          {privacyOn ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
          <span className="hidden sm:inline">{privacyOn ? "Verborgen" : "Zichtbaar"}</span>
        </Button>
      </div>

      {/* Totalen banner */}
      <div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <TotaalCard icon={Clock3} label="Roosteruren" value={`${Math.round(totaalUren * 10) / 10}u`} tone="info" />
          <TotaalCard icon={Moon} label="ORT uren" value={`${Math.round(totaalOrtUren * 10) / 10}u`} tone="accent" />
          <TotaalCard icon={Briefcase} label="Totaal bruto" value={mask(fmt(totaalBruto))} tone="accent" />
          <TotaalCard icon={TrendingUp} label="Netto totaal" value={mask(fmt(totaalNetto))} tone="success" />
        </div>
        {/* S5: expliciete scope — deze totalen beslaan álle jaren en mengen
            prognose- met loonstrookmaanden. */}
        <p className="mt-2 text-micro uppercase tracking-wider text-[var(--color-text-muted)]">
          alle jaren · prognose + werkelijk gemengd
        </p>
      </div>

      {scheduleForecastCount > 0 && (
        <Surface tone="info" padding="md" className="text-xs">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-micro font-bold uppercase tracking-wider text-[var(--color-info)]">Roosterberekening actief</p>
              <p className="mt-1 leading-relaxed text-[var(--color-text-muted)]">
                {scheduleForecastCount} maand(en) worden direct uit je diensten berekend. Loonstroken blijven leidend zodra ze geïmporteerd zijn.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:min-w-52">
              <Surface tone="subtle" radius="sm" padding="sm" className="text-right">
                <span className="block text-micro uppercase text-[var(--color-text-muted)]">Extra</span>
                <span className="font-bold text-[var(--color-warning)]">{Math.round(totaalExtraUren * 10) / 10}u</span>
              </Surface>
              <Surface tone="subtle" radius="sm" padding="sm" className="text-right">
                <span className="block text-micro uppercase text-[var(--color-text-muted)]">Pensioen</span>
                <span className="font-bold text-[var(--color-danger)]">{mask(fmt(totaalPensioen))}</span>
              </Surface>
            </div>
          </div>
        </Surface>
      )}

      {/* Huidige maand prognose */}
      {huidig && <PrognoseCard record={huidig} mask={mask} />}

      {/* Per jaar */}
      {jaren.map((jaar) => (
        <JaarSectie key={jaar} jaar={jaar} records={displayPerJaar[jaar]} mask={mask} />
      ))}

      {/* Loonstroken Upload */}
      <Surface padding="md">
        <SurfaceHeader
          icon={<AppIcon name="upload" tone="accent" size="sm" />}
          eyebrow="Documentimport"
          title="Loonstroken uploaden"
          headingLevel={3}
        />
        <LoonstrookUploader />
      </Surface>

      {/* Werkelijk vs Berekend vergelijking */}
      {loonstroken.count > 0 && (
        <VergelijkingSectie berekend={forecastRecords} werkelijkByPeriode={loonstroken.byPeriode} mask={mask} />
      )}

      {/* Disclaimer + Finance link */}
      <p className="text-micro text-[var(--color-text-muted)] text-center leading-relaxed">
        Maanden met geïmporteerde loonstrook gebruiken werkelijke bedragen; overige maanden blijven prognoses.
        {"\u2248"} Netto prognose is een schatting op basis van de 2026-loonheffingstabel.
        De exacte verrekening door {"'"}s Heeren Loo kan afwijken door tijdvakfactor en heffingskortingen.
      </p>
      {loonstroken.count > 0 && (
        <div className="flex justify-center">
          <ButtonLink href="/finance" variant="ghost" size="sm">
            Bekijk salaris in Finance overzicht <ArrowRight size={12} aria-hidden="true" />
          </ButtonLink>
        </div>
      )}
    </div>
  );
}
