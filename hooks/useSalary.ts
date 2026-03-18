"use client";

import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SalarisRecord {
  _id: string;
  periode:            string;   // "2026-03"
  jaar:               number;
  maand:              number;
  aantalDiensten:     number;
  uurloonORT:         number;

  basisLoon:          number;
  amtZeerintensief:   number;
  toeslagBalansvif:   number;
  ortTotaal:          number;
  extraUrenBedrag:    number;
  toeslagVakatieUren: number;
  reiskosten:         number;
  eenmaligTotaal:     number;
  brutoBetaling:      number;

  pensioenpremie:    number;
  loonheffingSchat:  number;
  nettoPrognose:     number;

  ortDetail?:      string; // JSON
  eenmaligDetail?: string; // JSON
  berekendOp:      string;
}

// ─── useSalary ────────────────────────────────────────────────────────────────

export function useSalary() {
  const { user } = useUser();
  const userId   = user?.id ?? "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const docs = useQuery((api as any).salary.list, userId ? { userId } : "skip");

  const records: SalarisRecord[] = (docs ?? []) as SalarisRecord[];

  // Lopende maand
  const nu         = new Date();
  const huidigKey  = `${nu.getFullYear()}-${String(nu.getMonth() + 1).padStart(2, "0")}`;
  const huidig     = records.find((r) => r.periode === huidigKey) ?? null;

  // Jaar-groepen
  const perJaar: Record<number, SalarisRecord[]> = {};
  for (const r of records) {
    if (!perJaar[r.jaar]) perJaar[r.jaar] = [];
    perJaar[r.jaar].push(r);
  }

  // Totalen over alle records
  const totaalBruto = records.reduce((s, r) => s + r.brutoBetaling, 0);
  const totaalNetto = records.reduce((s, r) => s + r.nettoPrognose, 0);

  return {
    records,
    huidig,
    perJaar,
    totaalBruto,
    totaalNetto,
    isLoading: docs === undefined,
    berekendOp: records[0]?.berekendOp ?? null,
  };
}
