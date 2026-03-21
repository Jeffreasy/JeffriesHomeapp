import { NextResponse } from "next/server";
import { parseXlsxRow } from "@/lib/schedule";

// Google Sheets public CSV export URL (DienstenData tab)
const SHEETS_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vShRStX1okidVc8k7U9TmnhK2DAv_qdq1uliunz87Pf9ETSXQ6wbXjuaWWAbL5J_Drncbn6KJlifFlq/pub?output=csv";

export async function GET() {
  try {
    // Server-side fetch — no CORS issues
    const res = await fetch(SHEETS_CSV_URL, {
      headers: { Accept: "text/csv" },
      // Disable CDN cache so we always get the latest data
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Google Sheets fetch mislukt: HTTP ${res.status}` },
        { status: 502 }
      );
    }

    const csv = await res.text();
    const rows = parseCsv(csv);

    if (rows.length < 2) {
      return NextResponse.json({ error: "Geen data ontvangen van Google Sheets" }, { status: 422 });
    }

    // First row = headers
    const headers: string[] = rows[0].map((h) => h.trim());
    const diensten = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.every((c) => !c)) continue; // skip empty rows

      const parsed = parseXlsxRow(row, headers);
      if (parsed) diensten.push(parsed);
    }

    return NextResponse.json({
      ok: true,
      count: diensten.length,
      syncedAt: new Date().toISOString(),
      diensten,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Onbekende fout" },
      { status: 500 }
    );
  }
}

// ─── Robust CSV parser (handles quoted fields with commas) ────────────────────

function parseCsv(text: string): string[][] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  return lines.map(parseRow).filter((r) => r.length > 1);
}

function parseRow(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }

  result.push(current);
  return result;
}
