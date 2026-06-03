"use client";

import { useCallback, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";
import {
  useGetSchedule,
  useGetScheduleMeta,
  postScheduleImport,
} from "@/lib/api/generated/schedule/schedule";
import {
  type DienstRow,
  type ScheduleMeta,
  getUpcoming,
  getNextDienst,
  getThisWeek,
  parseCsv,
  parseCsvRow,
} from "@/lib/schedule";
import type { ModelSchedule, ModelScheduleMeta } from "@/lib/api/model";

// ─── Map API Model → DienstRow ────────────────────────────────────────────────

function fromRow(doc: ModelSchedule): DienstRow {
  return {
    eventId:     doc.event_id ?? "",
    titel:       doc.titel ?? "",
    startDatum:  doc.start_datum ?? "",
    startTijd:   doc.start_tijd ?? "",
    eindDatum:   doc.eind_datum ?? "",
    eindTijd:    doc.eind_tijd ?? "",
    werktijd:    doc.werktijd ?? "",
    locatie:     doc.locatie ?? "",
    team:        doc.team ?? "",
    shiftType:   doc.shift_type ?? "",
    prioriteit:  doc.prioriteit ?? 0,
    duur:        doc.duur ?? 0,
    weeknr:      doc.weeknr ?? "",
    dag:         doc.dag ?? "",
    status:      doc.status ?? "",
    beschrijving: doc.beschrijving ?? "",
    heledag:     doc.heledag ?? false,
  };
}

// ─── useSchedule ─────────────────────────────────────────────────────────────

export function useSchedule() {
  const { user } = useUser();
  const userId = user?.id ?? "";
  const queryClient = useQueryClient();

  // Force refetch trigger
  const [version, setVersion] = useState(0);

  const { data: scheduleRaw, isLoading: loadingSchedule, refetch: refetchSchedule } = useGetSchedule(
    { userId },
    { query: { enabled: !!userId } }
  );
  
  const { data: metaRaw, isLoading: loadingMeta, refetch: refetchMeta } = useGetScheduleMeta(
    { userId },
    { query: { enabled: !!userId } }
  );

  const diensten: DienstRow[] = useMemo(() => {
    const rawDocs = Array.isArray(scheduleRaw?.data) ? scheduleRaw.data as ModelSchedule[] : [];
    if (!rawDocs || rawDocs.length === 0) return [];
    
    // 1. Dedupliceer op eventId
    const deduped = new Map<string, ModelSchedule>();
    for (const doc of rawDocs) {
      if (doc.event_id) deduped.set(doc.event_id, doc);
    }
    // 2. Deduplicate op startDatum+startTijd
    const byKey = new Map<string, DienstRow>();
    for (const doc of deduped.values()) {
      const key = `${doc.start_datum}|${doc.start_tijd}|${doc.eind_tijd}`;
      if (!byKey.has(key)) {
        byKey.set(key, fromRow(doc));
      }
    }
    return Array.from(byKey.values());
  }, [scheduleRaw]);

  const metaDoc = metaRaw?.data as ModelScheduleMeta | undefined;
  
  const meta: ScheduleMeta | null = metaDoc && metaDoc.imported_at
    ? { 
        importedAt: metaDoc.imported_at, 
        fileName: metaDoc.file_name ?? "", 
        totalRows: metaDoc.total_rows ?? 0 
      }
    : null;

  const isLoading = loadingSchedule || loadingMeta;

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["/schedule"] });
    queryClient.invalidateQueries({ queryKey: ["/schedule/meta"] });
  }, [queryClient]);

  const refetch = useCallback(async () => {
    await Promise.all([refetchSchedule(), refetchMeta()]);
  }, [refetchSchedule, refetchMeta]);

  const clear = useCallback(async () => {
    if (!userId) return;
    await postScheduleImport({ userId, fileName: "", rows: [] } as unknown as Parameters<typeof postScheduleImport>[0]);
    invalidateAll();
    setVersion(v => v + 1);
  }, [userId, invalidateAll]);

  const importCsv = useCallback(async (file: File) => {
    if (!userId) return { ok: false, count: 0, error: "Niet ingelogd" };
    try {
      const text = await file.text();
      const { headers, rows } = parseCsv(text);
      if (rows.length === 0) throw new Error("Geen data of ongeldig CSV formaat");

      const items: DienstRow[] = [];
      for (const row of rows) {
        if (!row || row.every((c) => c === "" || c === null || c === undefined)) continue;
        const parsed = parseCsvRow(row, headers);
        if (parsed) items.push(parsed);
      }

      if (items.length === 0) throw new Error("Geen geldige diensten gevonden in de CSV");

      const payload = {
        userId,
        fileName: file.name,
        rows: items,
      };
      await postScheduleImport(payload as unknown as Parameters<typeof postScheduleImport>[0]);
      invalidateAll();
      setVersion(v => v + 1);

      return { ok: true, count: items.length };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Onbekende fout";
      return { ok: false, count: 0, error: message };
    }
  }, [userId, invalidateAll]);

  const toggleStatus = async (event_id: string, status: string) => {
    const dienst = diensten.find((d) => d.eventId === event_id);
    if (!dienst) return;
    setVersion((v) => v + 1);
    await postScheduleImport({ userId, fileName: "status-update", rows: [{ ...dienst, status }] } as unknown as Parameters<typeof postScheduleImport>[0]);
    invalidateAll();
  };

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
    importCsv,
    clear,
    toggleStatus,
    refetch,
    version,
  };
}
