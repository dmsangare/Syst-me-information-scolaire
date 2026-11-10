import * as ExcelJS from 'exceljs';

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
}

export interface ExcelSection {
  title: string;
  columns: ExcelColumn[];
  data: Record<string, any>[];
}

export interface OfficialReportExcelOptions {
  title?: string;
  subtitle?: string;
  schoolName?: string;
  sheetName?: string;
  sections?: ExcelSection[];
  report?: { title: string; code: string };
  school?: { name: string };
}

export async function generateOfficialReportExcel(opts: OfficialReportExcelOptions): Promise<Buffer> {
  const title = opts.report?.title || opts.title || 'Rapport';
  const schoolName = opts.school?.name || opts.schoolName || 'Établissement';
  const subtitle = opts.subtitle || '';
  const sheetName = opts.sheetName || 'Rapport';
  const sections = opts.sections || [];

  const workbook = new ExcelJS.Workbook();
  workbook.creator = schoolName;
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(sheetName);

  sheet.addRow([schoolName]);
  const titleRow = sheet.lastRow!;
  titleRow.font = { size: 16, bold: true, color: { argb: 'FF0D9488' } };
  titleRow.height = 24;
  sheet.mergeCells(1, 1, 1, 7);
  titleRow.alignment = { horizontal: 'center', vertical: 'middle' };

  if (subtitle) {
    sheet.addRow([subtitle]);
    const subRow = sheet.lastRow!;
    subRow.font = { size: 11, italic: true, color: { argb: 'FF6B7280' } };
    sheet.mergeCells(2, 1, 2, 7);
    subRow.alignment = { horizontal: 'center', vertical: 'middle' };
  }

  sheet.addRow([]);

  for (const sec of sections) {
    sheet.addRow([sec.title.toUpperCase()]);
    const secTitle = sheet.lastRow!;
    secTitle.font = { size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
    secTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D9488' } };
    sheet.mergeCells(secTitle.number, 1, secTitle.number, 7);
    secTitle.height = 22;
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

    sec.columns.forEach((col, i) => {
      sheet.getColumn(i + 1).width = col.width || 15;
    });

    sheet.addRow([]);
  }

  sheet.addRow([]);
  const footerRow = sheet.addRow([`Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`]);
  footerRow.font = { size: 9, italic: true, color: { argb: 'FF9CA3AF' } };
  sheet.mergeCells(footerRow.number, 1, footerRow.number, 7);
  footerRow.alignment = { horizontal: 'right' };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
