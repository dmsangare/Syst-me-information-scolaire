import { api } from "@/lib/axios";

// ============================================================
// CSV
// ============================================================
export function exportCSV(rows: any[], filename: string) {
  if (!rows || rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(";"),
    ...rows.map((r) =>
      headers.map((h) => {
        const v = r[h];
        if (v === null || v === undefined) return '""';
        return `"${String(v).replace(/"/g, '""')}"`;
      }).join(";")
    ),
  ].join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, `${filename}-${new Date().toISOString().slice(0, 10)}.csv`);
}

// ============================================================
// EXCEL (.xlsx) - via backend (POST /api/v1/export/excel)
// ============================================================
export async function exportExcel(
  sheets: Array<{ name: string; rows: any[] }>,
  filename: string
) {
  const res = await api.post(
    "/export/excel",
    {
      filename,
      sheets: sheets.map((s) => ({
        name: s.name,
        rows: s.rows ?? [],
      })),
    },
    { responseType: "blob" }
  );

  const blob = new Blob([res.data], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  downloadBlob(blob, `${filename}-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ============================================================
// PDF (via backend)
// ============================================================
export async function exportPDF(endpoint: string, filename: string) {
  const res = await api.get(endpoint, { responseType: "blob" });
  const blob = new Blob([res.data], { type: "application/pdf" });
  downloadBlob(blob, `${filename}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ============================================================
// Helper
// ============================================================
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

// ============================================================
// EXCEL VIA ENDPOINT BACKEND (design vert, sections multiples)
// ============================================================
export async function exportExcelFromBackend(endpoint: string, filename: string) {
  const res = await api.get(endpoint, { responseType: "blob" });
  const blob = new Blob([res.data], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  downloadBlob(blob, `${filename}-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
