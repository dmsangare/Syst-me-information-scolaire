import { useState } from "react";
import { Download, FileSpreadsheet, FileText, FileType, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { exportCSV, exportExcel, exportPDF, exportExcelFromBackend } from "@/lib/export";

interface ExportMenuProps {
  csvRows?: any[];
  excelSheets?: Array<{ name: string; rows: any[] }>;
  pdfEndpoint?: string;
  excelEndpoint?: string;
  filename: string;
}

export function ExportMenu({ csvRows, excelSheets, pdfEndpoint, excelEndpoint, filename }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  const handleCSV = () => {
    if (!csvRows || csvRows.length === 0) {
      toast.error("Aucune donnée à exporter");
      return;
    }
    try {
      exportCSV(csvRows, filename);
      toast.success("CSV téléchargé");
      setOpen(false);
    } catch (e: any) {
      toast.error("Erreur lors de la génération du CSV");
    }
  };

  const handleExcel = async () => {
    // Si un endpoint backend est fourni, on l'utilise
    if (excelEndpoint) {
      setLoading("excel");
      try {
        await exportExcelFromBackend(excelEndpoint, filename);
        toast.success("Excel téléchargé");
        setOpen(false);
      } catch (e: any) {
        toast.error("Erreur lors de la génération de l'Excel");
      } finally {
        setLoading(null);
      }
      return;
    }

    // Sinon, on garde l'ancien comportement
    if (!excelSheets || excelSheets.length === 0) {
      toast.error("Aucune donnée à exporter");
      return;
    }
    setLoading("excel");
    try {
      await exportExcel(excelSheets, filename);
      toast.success("Excel téléchargé");
      setOpen(false);
    } catch (e: any) {
      toast.error("Erreur lors de la génération de l'Excel");
    } finally {
      setLoading(null);
    }
  };

  const handlePDF = async () => {
    if (!pdfEndpoint) return;
    setLoading("pdf");
    try {
      await exportPDF(pdfEndpoint, filename);
      toast.success("PDF téléchargé");
      setOpen(false);
    } catch (e: any) {
      toast.error("Erreur lors de la génération du PDF");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="relative">
      <Button variant="outline" size="sm" onClick={() => setOpen(!open)}>
        <Download className="h-4 w-4 mr-2" /> Exporter
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 bg-white border rounded shadow-lg z-50 min-w-[180px] py-1">
            {csvRows && (
              <button
                onClick={handleCSV}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <FileText className="h-4 w-4 text-green-600" /> Export CSV
              </button>
            )}
            {(excelSheets || excelEndpoint) && (
              <button
                onClick={handleExcel}
                disabled={loading === "excel"}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
              >
                {loading === "excel" ? (
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                )}
                Export Excel
              </button>
            )}
            {pdfEndpoint && (
              <button
                onClick={handlePDF}
                disabled={loading === "pdf"}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
              >
                {loading === "pdf" ? (
                  <Loader2 className="h-4 w-4 animate-spin text-red-600" />
                ) : (
                  <FileType className="h-4 w-4 text-red-600" />
                )}
                Export PDF
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
