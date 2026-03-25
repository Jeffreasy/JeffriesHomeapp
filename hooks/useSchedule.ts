"use client";

import { useCallback, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import {
  type DienstRow, type ScheduleMeta,
  parseXlsxRow, getUpcoming, getNextDienst, getThisWeek,
} from "@/lib/schedule";

// ─── Convex doc shape (spiegelt convex/schema.ts schedule tabel) ──────────────

interface ScheduleDoc {
  eventId:      string;
  titel:        string;
  startDatum:   string;
  startTijd:    string;
  eindDatum:    string;
  eindTijd:     string;
  werktijd:     string;
  locatie:      string;
  team:         string;
  shiftType:    string;
  prioriteit:   number;
  duur:         number;
  weeknr:       string;
  dag:          string;
  status:       string;
  beschrijving: string;
  heledag:      boolean;
}

// ─── Map Convex doc → DienstRow ───────────────────────────────────────────────

function fromDoc(doc: ScheduleDoc): DienstRow {
  return {
    eventId:     doc.eventId,
    titel:       doc.titel,
    startDatum:  doc.startDatum,
    startTijd:   doc.startTijd,
    eindDatum:   doc.eindDatum,
    eindTijd:    doc.eindTijd,
    werktijd:    doc.werktijd,
    locatie:     doc.locatie,
    team:        doc.team,
    shiftType:   doc.shiftType,
    prioriteit:  doc.prioriteit,
    duur:        doc.duur,
    weeknr:      doc.weeknr,
    dag:         doc.dag,
    status:      doc.status,
    beschrijving: doc.beschrijving,
    heledag:     doc.heledag,
  };
}

// ─── useSchedule ─────────────────────────────────────────────────────────────

export function useSchedule() {
  const { user } = useUser();
  const userId = user?.id ?? "";

  const docs    = useQuery(api.schedule.list, userId ? { userId } : "skip");
  const metaDoc = useQuery(api.schedule.getMeta, userId ? { userId } : "skip");

  const diensten: DienstRow[] = useMemo(() => {
    if (!docs) return [];
    // Server filtert al VERWIJDERD records — hier alleen deduplicatie
    // 1. Dedupliceer op eventId (laatste doc wint)
    const deduped = new Map<string, typeof docs[0]>();
    for (const doc of docs) {
      deduped.set(doc.eventId, doc);
    }
    // 2. Deduplicate op startDatum+startTijd (zelfde dienst, ander eventId)
    const byKey = new Map<string, DienstRow>();
    for (const doc of deduped.values()) {
      const key = `${doc.startDatum}|${doc.startTijd}|${doc.eindTijd}`;
      if (!byKey.has(key)) {
        byKey.set(key, fromDoc(doc));
      }
    }
    return Array.from(byKey.values());
  }, [docs]);
  const meta: ScheduleMeta | null = metaDoc
    ? { importedAt: metaDoc.importedAt, fileName: metaDoc.fileName, totalRows: metaDoc.totalRows }
    : null;

  const bulkImportMutation = useMutation(api.schedule.bulkImport);

  const isLoading = docs === undefined;


  // ── Import from xlsx file ─────────────────────────────────────────────────
  const importXlsx = useCallback(async (file: File) => {
    if (!userId) return { ok: false, count: 0, error: "Niet ingelogd" };
    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array", cellDates: false });

      const sheetName = wb.SheetNames.find(n => n.toLowerCase().includes("diensten")) ?? wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      if (!ws) throw new Error(`Sheet "${sheetName}" niet gevonden`);

      const rawData: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" });
      if (rawData.length < 2) throw new Error("Geen data gevonden");

      const headers: string[] = rawData[0].map((h: any) => String(h).trim());
      const rows: DienstRow[] = [];
      for (let i = 1; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || row.every((c: any) => !c)) continue;
        const parsed = parseXlsxRow(row, headers);
        if (parsed) rows.push(parsed);
      }

      if (rows.length === 0) throw new Error("Geen geldige diensten gevonden");

      const dienstenPayload = rows.map(d => ({ ...d, userId }));

      await bulkImportMutation({
        userId,
        diensten: dienstenPayload,
        importedAt: new Date().toISOString(),
        fileName: file.name,
      });

      return { ok: true, count: rows.length };
    } catch (e: any) {
      return { ok: false, count: 0, error: e.message ?? "Onbekende fout" };
    }
  }, [userId, bulkImportMutation]);

  const clear = useCallback(async () => {
    if (!userId) return;
    await bulkImportMutation({
      userId,
      diensten: [],
      importedAt: new Date().toISOString(),
      fileName: "",
    });
  }, [userId, bulkImportMutation]);

  const dienstenByDate = useMemo(() => {
    const map: Record<string, DienstRow[]> = {};
    for (const d of diensten) {
      (map[d.startDatum] ??= []).push(d);
    }
    return map;
  }, [diensten]);

  return {
    diensten,
    meta,
    dienstenByDate,
    nextDienst: getNextDienst(diensten),
    thisWeek:   getThisWeek(diensten),
    upcoming:   getUpcoming(diensten, 30),
    isLoading,
    importXlsx,
    clear,
  };
}
