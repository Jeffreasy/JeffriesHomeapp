"use client";

import { useRef } from "react";
import { RefreshCw, Calendar, Upload } from "lucide-react";
import { useSchedule } from "@/hooks/useSchedule";
import { useToast } from "@/components/ui/Toast";
import { NextShiftCard } from "@/components/schedule/NextShiftCard";
import { DienstItem } from "@/components/schedule/DienstItem";

export function RoosterPanel() {
  const {
    nextDienst,
    thisWeek,
    upcoming,
    meta,
    isLoading,
    importXlsx,
    syncFromSheets,
    clear,
  } = useSchedule();
  const { success, error } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const today = new Date().toISOString().slice(0, 10);

  const handleSync = async () => {
    const result = await syncFromSheets();
    if (result.ok) success(`${result.count} diensten gesynchroniseerd van Google Sheets`);
    else error(`Sync mislukt: ${result.error}`);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await importXlsx(file);
    if (result.ok) success(`${result.count} diensten geïmporteerd`);
    else error(`Import mislukt: ${result.error}`);
    e.target.value = "";
  };

  const restUpcoming = upcoming.filter(
    (d) => !thisWeek.find((w) => w.eventId === d.eventId)
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Calendar size={11} />
          Rooster
        </p>
        <div className="flex gap-2 items-center">
          {meta && (
            <button
              onClick={clear}
              className="text-[10px] text-slate-600 hover:text-red-400 transition-colors"
            >
              Wissen
            </button>
          )}
          <button
            onClick={handleSync}
            disabled={isLoading}
            aria-label="Synchroniseer rooster van Google Sheets"
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/25 text-xs text-amber-400 hover:bg-amber-500/20 transition-all"
          >
            <RefreshCw size={11} className={isLoading ? "animate-spin" : ""} />
            Sync Sheets
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={isLoading}
            aria-label="Handmatig .xlsx uploaden"
            title="Handmatig .xlsx uploaden"
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-600 hover:text-slate-400 transition-all"
          >
            <Upload size={10} />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFile}
            className="hidden"
            aria-label="Roosterbestand uploaden"
          />
        </div>
      </div>

      {meta && (
        <p className="text-[10px] text-slate-600">
          {meta.fileName} · {meta.totalRows} diensten ·{" "}
          {new Date(meta.importedAt).toLocaleDateString("nl")}
        </p>
      )}

      <NextShiftCard dienst={nextDienst} onImport={handleSync} />

      {!meta && !nextDienst && (
        <div className="rounded-xl p-6 text-center border border-dashed border-white/10">
          <RefreshCw size={28} className="text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-400 font-medium">Rooster ophalen</p>
          <p className="text-xs text-slate-600 mt-1 mb-4">
            Klik om je dienstenrooster te synchroniseren vanuit Google Sheets
          </p>
          <button
            onClick={handleSync}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 text-sm font-medium hover:bg-amber-500/25 transition-colors flex items-center gap-2 mx-auto"
          >
            <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
            {isLoading ? "Bezig met syncing..." : "Sync van Google Sheets"}
          </button>
        </div>
      )}

      {thisWeek.length > 0 && (
        <div>
          <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-2">
            Deze week
          </p>
          <div className="space-y-1">
            {thisWeek.map((d) => (
              <DienstItem key={d.eventId} dienst={d} isToday={d.startDatum === today} />
            ))}
          </div>
        </div>
      )}

      {restUpcoming.length > 0 && (
        <div>
          <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-2">
            Komende 30 dagen
          </p>
          <div className="space-y-1">
            {restUpcoming.slice(0, 20).map((d) => (
              <DienstItem key={d.eventId} dienst={d} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
