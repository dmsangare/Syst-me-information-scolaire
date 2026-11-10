import * as ExcelJS from "exceljs";

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
}

export interface ExcelOptions {
  title: string;
  subtitle?: string;
  sheetName?: string;
  columns: ExcelColumn[];
  data: Record<string, any>[];
  schoolName?: string;
}

export async function generateExcel(options: ExcelOptions): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Etablissement";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(options.sheetName || "Liste", {
    views: [{ state: "frozen", ySplit: 4 }],
  });

  // Titre principal
  const titleRow = sheet.addRow([options.schoolName || options.title]);
  titleRow.font = { size: 16, bold: true, color: { argb: "FF1E40AF" } };
  titleRow.height = 24;
  sheet.mergeCells(1, 1, 1, options.columns.length);
  titleRow.alignment = { horizontal: "center", vertical: "middle" };

  // Sous-titre
  const subtitleRow = sheet.addRow([options.subtitle || ""]);
  subtitleRow.font = { size: 11, italic: true, color: { argb: "FF6B7280" } };
  sheet.mergeCells(2, 1, 2, options.columns.length);
  subtitleRow.alignment = { horizontal: "center", vertical: "middle" };

  // Ligne vide
  sheet.addRow([]);

  // En-têtes
  const headerRow = sheet.addRow(options.columns.map((c) => c.header));
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.height = 22;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E40AF" },
    };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: "thin", color: { argb: "FF3B82F6" } },
      bottom: { style: "thin", color: { argb: "FF3B82F6" } },
      left: { style: "thin", color: { argb: "FF3B82F6" } },
      right: { style: "thin", color: { argb: "FF3B82F6" } },
    };
  });

  // Largeurs
  options.columns.forEach((col, idx) => {
    sheet.getColumn(idx + 1).width = col.width || 15;
  });

  // Données
  options.data.forEach((item, index) => {
    const row = sheet.addRow(options.columns.map((c) => item[c.key] ?? ""));
    if (index % 2 === 1) {
      row.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF3F4F6" },
        };
      });
    }
    row.eachCell((cell) => {
      cell.alignment = { horizontal: "left", vertical: "middle" };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE5E7EB" } },
        bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
        left: { style: "thin", color: { argb: "FFE5E7EB" } },
        right: { style: "thin", color: { argb: "FFE5E7EB" } },
      };
    });
  });

  // Pied de page
  sheet.addRow([]);
  const dateRow = sheet.addRow([
    `Genere le ${new Date().toLocaleDateString("fr-FR")} a ${new Date().toLocaleTimeString("fr-FR")}`,
  ]);
  dateRow.font = { size: 9, italic: true, color: { argb: "FF9CA3AF" } };
  sheet.mergeCells(dateRow.number, 1, dateRow.number, options.columns.length);
  dateRow.alignment = { horizontal: "right" };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
