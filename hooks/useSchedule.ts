"use client";

import { useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import {
  type DienstRow, type ScheduleMeta,
  parseXlsxRow, getUpcoming, getNextDienst, getThisWeek,
  saveSchedule, // localStorage cache for the automation engine
} from "@/lib/schedule";

// ─── Map Convex doc → DienstRow ───────────────────────────────────────────────

function fromDoc(doc: any): DienstRow {
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

  const diensten: DienstRow[] = (docs ?? []).map(fromDoc);
  const meta: ScheduleMeta | null = metaDoc
    ? { importedAt: metaDoc.importedAt, fileName: metaDoc.fileName, totalRows: metaDoc.totalRows }
    : null;

  const bulkImportMutation = useMutation(api.schedule.bulkImport);

  const isLoading = docs === undefined;

  // ── Sync from Google Sheets CSV ───────────────────────────────────────────
  const syncFromSheets = useCallback(async () => {
    if (!userId) return { ok: false, count: 0, error: "Niet ingelogd" };
    try {
      const res = await fetch("/api/schedule", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        return { ok: false, count: 0, error: data.error ?? "Sync mislukt" };
      }

      const dienstenPayload = data.diensten.map((d: DienstRow) => ({
        ...d,
        userId,
      }));

      await bulkImportMutation({
        userId,
        diensten: dienstenPayload,
        importedAt: data.syncedAt ?? new Date().toISOString(),
        fileName: "Google Sheets (auto-sync)",
      });

      // Cache for the local automation engine (shouldFire reads from localStorage)
      saveSchedule(data.diensten, {
        importedAt: data.syncedAt ?? new Date().toISOString(),
        fileName:   "Google Sheets (auto-sync)",
        totalRows:  data.count,
      });

      return { ok: true, count: data.count };
    } catch (e: any) {
      return { ok: false, count: 0, error: e.message ?? "Verbindingsfout" };
    }
  }, [userId, bulkImportMutation]);

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
    // Bulk import empty array effectively clears schedule
    if (!userId) return;
    await bulkImportMutation({
      userId,
      diensten: [],
      importedAt: new Date().toISOString(),
      fileName: "",
    });
  }, [userId, bulkImportMutation]);

  return {
    diensten,
    meta,
    nextDienst: getNextDienst(diensten),
    thisWeek:   getThisWeek(diensten),
    upcoming:   getUpcoming(diensten, 30),
    isLoading,
    importXlsx,
    syncFromSheets,
    clear,
  };
}
