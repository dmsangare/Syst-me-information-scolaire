import * as ExcelJS from 'exceljs';

export interface ReportExcelOptions {
  title: string;
  schoolName: string;
  sections: Array<{
    title: string;
    columns: Array<{ header: string; key: string; width?: number }>;
    data: any[];
  }>;
}

export async function generateReportExcel(opts: ReportExcelOptions): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = opts.schoolName;
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Rapport');

  // Titre principal
  sheet.addRow([opts.schoolName]);
  const titleRow = sheet.lastRow!;
  titleRow.font = { size: 16, bold: true, color: { argb: 'FF0D9488' } };
  titleRow.height = 24;
  sheet.mergeCells(1, 1, 1, 8);
  titleRow.alignment = { horizontal: 'center', vertical: 'middle' };

  // Sous-titre
  sheet.addRow([opts.title]);
  const subRow = sheet.lastRow!;
  subRow.font = { size: 12, bold: true, color: { argb: 'FF374151' } };
  sheet.mergeCells(2, 1, 2, 8);
  subRow.alignment = { horizontal: 'center', vertical: 'middle' };

  sheet.addRow([]); // Ligne vide

  // Sections
  for (const sec of opts.sections) {
    sheet.addRow([sec.title.toUpperCase()]);
    const secTitle = sheet.lastRow!;
    secTitle.font = { size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
    secTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D9488' } };
    sheet.mergeCells(secTitle.number, 1, secTitle.number, 8);
    secTitle.alignment = { horizontal: 'left', vertical: 'middle' };

    if (sec.columns.length > 0) {
      sheet.addRow(sec.columns.map(c => c.header));
      const headerRow = sheet.lastRow!;
      headerRow.font = { bold: true, color: { argb: 'FF374151' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
      headerRow.eachCell(cell => {
        cell.border = { bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });
    }

    sec.data.forEach((item, idx) => {
      const rowData = sec.columns.map(c => {
        let v = item[c.key];
        if (v === null || v === undefined) v = '—';
        if (typeof v === 'object') v = JSON.stringify(v);
        return v;
      });
      sheet.addRow(rowData);
      const row = sheet.lastRow!;
      if (idx % 2 === 1) {
        row.eachCell(cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
        });
      }
      row.eachCell(cell => {
        cell.font = { size: 10, color: { argb: 'FF4B5563' } };
        cell.border = { bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } } };
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      });
    });

    // Largeurs
    sec.columns.forEach((col, i) => {
      sheet.getColumn(i + 1).width = col.width || 15;
    });

    sheet.addRow([]); // Ligne vide entre sections
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
