import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';

export interface ExcelSheet {
  name: string;
  rows: Record<string, any>[];
}

@Injectable()
export class ExportService {
  /**
   * Genere un fichier Excel (.xlsx) a partir de plusieurs feuilles.
   * Chaque feuille : nom + tableau de lignes (objets plats).
   */
  async generateExcel(sheets: ExcelSheet[]): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Etablissement';
    wb.created = new Date();

    for (const sheet of sheets) {
      const ws = wb.addWorksheet(sheet.name.slice(0, 31));

      if (!sheet.rows || sheet.rows.length === 0) {
        ws.addRow(['Aucune donnée']);
        continue;
      }

      const headers = Object.keys(sheet.rows[0]);
      ws.columns = headers.map((h) => ({
        header: h,
        key: h,
        width: Math.min(
          Math.max(
            h.length,
            ...sheet.rows.map((r) => String(r[h] ?? '').length),
          ) + 2,
          40,
        ),
      }));

      // En-tete en gras
      ws.getRow(1).font = { bold: true };
      ws.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFEEEEEE' },
      };

      // Lignes
      for (const row of sheet.rows) {
        ws.addRow(row);
      }
    }

    const buffer = await wb.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
