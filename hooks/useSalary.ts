"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";


// ─── Types ────────────────────────────────────────────────────────────────────

export interface SalarisRecord {
  _id:                string;
  periode:            string;
  jaar:               number;
  maand:              number;
  aantalDiensten:     number;
  uurloonORT:         number;

  basisLoon:          number;
  amtZeerintensief:   number;
  toeslagBalansvif:   number;
  ortTotaal:          number;   // was ortTotaalBedrag in MaandResult
  extraUrenBedrag:    number;
  toeslagVakatieUren: number;
  reiskosten:         number;
  eenmaligTotaal:     number;
  brutoBetaling:      number;

  pensioenpremie:    number;
  loonheffingSchat:  number;
  nettoPrognose:     number;

  ortDetail?:      string; // JSON: { VROEG: 45, ZONDAG: 89 }
  eenmaligDetail?: string; // JSON: [{ label, bedrag }]
  berekendOp:      string;
}

// ─── useSalary ────────────────────────────────────────────────────────────────

export function useSalary() {
  const { user } = useUser();
  const userId   = user?.id ?? "";

  // Bereken direct vanuit schedule tabel
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const computed = useQuery((api as any).salary.computeFromSchedule, userId ? { userId } : "skip");

  const records: SalarisRecord[] = useMemo(() => {
    if (!computed || computed.length === 0) return [];
    return computed.map((r: any) => ({
      _id:                r.maandLabel,
      periode:            r.maandLabel,
      jaar:               r.jaar,
      maand:              r.maand,
      aantalDiensten:     r.aantalDiensten,
      uurloonORT:         r.tarieven.uurloonORT,

      basisLoon:          r.basisLoon,
      amtZeerintensief:   r.amtZeerintensief,
      toeslagBalansvif:   r.toeslagBalansvif,
      ortTotaal:          r.ortTotaalBedrag,
      extraUrenBedrag:    r.extraUrenBedrag,
      toeslagVakatieUren: r.toeslagVakatieUren,
      reiskosten:         r.reiskosten,
      eenmaligTotaal:     r.eenmaligTotaal,
      brutoBetaling:      r.brutoBetaling,

      pensioenpremie:    r.pensioenpremie,
      loonheffingSchat:  r.loonheffingSchat,
      nettoPrognose:     r.nettoPrognose,

      ortDetail:      JSON.stringify(r.ortTotalen),
      eenmaligDetail: JSON.stringify(r.eenmalig),
      berekendOp:     new Date().toISOString(),
    })) as SalarisRecord[];
  }, [computed]);

  // Lopende maand
  const nu        = new Date();
  const huidigKey = `${nu.getFullYear()}-${String(nu.getMonth() + 1).padStart(2, "0")}`;
  const huidig    = records.find((r) => r.periode === huidigKey) ?? null;

  // Jaar-groepen
  const perJaar: Record<number, SalarisRecord[]> = {};
  for (const r of records) {
    if (!perJaar[r.jaar]) perJaar[r.jaar] = [];
    perJaar[r.jaar].push(r);
  }

  const totaalBruto = records.reduce((s, r) => s + r.brutoBetaling, 0);
  const totaalNetto = records.reduce((s, r) => s + r.nettoPrognose, 0);

  return {
    records,
    huidig,
    perJaar,
    totaalBruto,
    totaalNetto,
    isLoading:  computed === undefined,
    berekendOp: records[0]?.berekendOp ?? null,
    isNative:   true, // altijd Convex-native berekening
  };
}
