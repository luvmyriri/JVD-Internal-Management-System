/**
 * Client-side CSV export. Escapes values (quotes, commas, newlines) and prepends a
 * UTF-8 BOM so Excel opens ₱ / accented text correctly. Pair the exported rows with
 * the table's *current* filtered set so "Export" reflects exactly what the user sees.
 */
export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
}

function escapeCell(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function exportToCsv<T>(filename: string, rows: T[], columns: CsvColumn<T>[]): void {
  const header = columns.map((c) => escapeCell(c.header)).join(',');
  const body = rows.map((row) => columns.map((c) => escapeCell(c.value(row))).join(',')).join('\n');
  const csv = '﻿' + header + '\n' + body + '\n';

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Build a dated filename like "invoices_2026-07-19.csv" without Date parsing surprises. */
export function datedFilename(base: string): string {
  const d = new Date();
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return `${base}_${stamp}.csv`;
}
