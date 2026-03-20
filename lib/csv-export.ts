function escapeCell(cell: string | number | boolean | null | undefined): string {
  const s = cell === null || cell === undefined ? "" : String(cell);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Download a CSV file in the browser (UTF-8 with BOM for Excel). */
export function downloadCsv(filename: string, rows: (string | number | boolean | null | undefined)[][]): void {
  const lines = rows.map((row) => row.map(escapeCell).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF", lines], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
