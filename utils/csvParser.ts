
import { DataRow } from "../types";

/**
 * Robust CSV parser that handles quoted fields containing commas.
 */
export const parseCSV = (csv: string): { data: DataRow[], headers: string[] } => {
  const lines = csv.split(/\r?\n/).filter(line => line.trim() !== "");
  if (lines.length === 0) return { data: [], headers: [] };

  const parseLine = (line: string) => {
    const result = [];
    let curValue = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(curValue.trim());
        curValue = "";
      } else {
        curValue += char;
      }
    }
    result.push(curValue.trim());
    return result.map(v => v.replace(/^"|"$/g, '').trim());
  };

  const headers = parseLine(lines[0]);
  const data = lines.slice(1).map(line => {
    const values = parseLine(line);
    const row: DataRow = {};
    headers.forEach((header, index) => {
      const val = values[index];
      if (val === undefined) return;
      // Try to parse numbers
      const num = Number(val);
      row[header] = isNaN(num) || val === "" ? val : num;
    });
    return row;
  });

  return { data, headers };
};

export const getGoogleSheetExportUrl = (url: string): string | null => {
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) return null;
  const sheetId = match[1];
  // gid=0 is usually the first sheet, but we can append it if present in the source URL
  const gidMatch = url.match(/gid=([0-9]+)/);
  const gid = gidMatch ? gidMatch[1] : "0";
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
};
