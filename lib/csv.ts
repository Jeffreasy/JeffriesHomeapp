export type CsvDelimiter = "," | ";";

export function detectCsvDelimiter(text: string): CsvDelimiter {
  let commas = 0;
  let semicolons = 0;
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (inQuotes && text[index + 1] === '"') index += 1;
      else inQuotes = !inQuotes;
    } else if (!inQuotes && (char === "\n" || char === "\r")) {
      break;
    } else if (!inQuotes && char === ",") commas += 1;
    else if (!inQuotes && char === ";") semicolons += 1;
  }

  return semicolons > commas ? ";" : ",";
}

/** RFC 4180-compatible parser, including escaped quotes and embedded newlines. */
export function parseDelimitedRows(
  text: string,
  delimiter: CsvDelimiter = detectCsvDelimiter(text),
): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const finishRow = () => {
    row.push(field);
    if (row.some((value) => value.trim().length > 0)) rows.push(row);
    row = [];
    field = "";
  };

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\r" || char === "\n") {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      finishRow();
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) finishRow();
  return rows;
}

export function parseDelimitedObjects(text: string): {
  headers: string[];
  rows: Record<string, string>[];
} {
  const records = parseDelimitedRows(text);
  if (records.length < 2) return { headers: [], rows: [] };
  const headers = records[0].map((header) => header.trim());
  const rows = records.slice(1).map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, (values[index] ?? "").trim()])),
  );
  return { headers, rows };
}
