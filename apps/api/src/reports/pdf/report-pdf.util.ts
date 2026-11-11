import { PdfGeneratorService } from "../../common/pdf";
import { fileToBase64 } from '../../common/utils/file-to-base64.util';

export interface ReportPdfOptions {
  title: string;
  schoolName?: string;
  subtitle: string;
  user: string;
  school: any;
  summary?: Array<{ label: string; value: string | number }>;
  sections?: Array<{
    title: string;
  schoolName?: string;
    columns: Array<{ header?: string; label?: string; key: string; align?: string; format?: string }>;
    data: any[];
  }>;
}

export async function generateReportPDF(opts: ReportPdfOptions, pdfGenerator: PdfGeneratorService): Promise<Buffer> {
  const logoBase64 = await fileToBase64(opts.school?.logoUrl);
  const stampBase64 = await fileToBase64(opts.school?.stampUrl);
  const signatureBase64 = await fileToBase64(opts.school?.signatureUrl);

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 11px; color: #374151; margin: 0; padding: 0; line-height: 1.5; }
  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #0D9488; padding-bottom: 12px; margin-bottom: 16px; background: #F0FDFA; padding: 12px; border-radius: 8px; }
  .header-left { text-align: left; flex: 1; font-size: 10px; color: #4B5563; }
  .header-left .republic { font-weight: 800; font-size: 12px; color: #0F766E; margin-bottom: 2px; }
  .header-left .school-name { font-size: 14px; font-weight: 700; color: #0F766E; margin-top: 6px; text-transform: uppercase; }
  .header-left .school-info { font-size: 9px; color: #6B7280; margin-top: 2px; }
  .header-right { display: flex; align-items: center; justify-content: center; width: 140px; }
  .title-block { text-align: center; margin: 16px 0 20px 0; }
  .title-block h1 { font-size: 18px; margin: 0 0 6px 0; text-transform: uppercase; color: #0F766E; font-weight: 800; }
  .title-block .subtitle { font-size: 12px; color: #6B7280; font-weight: 500; }
  .summary { display: flex; gap: 10px; margin-bottom: 20px; }
  .summary-item { flex: 1; border: 1px solid #E5E7EB; border-radius: 6px; padding: 10px; text-align: center; background: #FFFFFF; }
  .summary-label { font-size: 9px; color: #6B7280; text-transform: uppercase; font-weight: 600; }
  .summary-value { font-size: 18px; font-weight: 800; color: #0F766E; margin-top: 4px; }
  .section { margin-bottom: 20px; page-break-inside: avoid; }
  .section h2 { font-size: 13px; margin: 0 0 8px 0; padding: 8px 12px; background: #0F766E; color: #FFFFFF; font-weight: 700; border-radius: 4px 4px 0 0; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; border: 1px solid #E5E7EB; }
  th { background: #F3F4F6; border-bottom: 2px solid #D1D5DB; padding: 8px; font-weight: 700; color: #374151; text-transform: uppercase; font-size: 9px; }
  td { border-bottom: 1px solid #E5E7EB; padding: 6px 8px; color: #4B5563; }
  tr:nth-child(even) td { background: #F9FAFB; }
  .footer-signature { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 16px; page-break-inside: avoid; }
  .footer-left, .footer-right { width: 45%; text-align: center; }
  .footer-role { font-weight: 700; font-size: 12px; color: #111827; margin-top: 8px; }
  .footer-name { border-top: 2px solid #0D9488; padding-top: 6px; margin-top: 6px; font-size: 11px; font-weight: 700; color: #0F766E; }
</style>
</head>
<body>
  <div class="header">
    <div class="header-right">${logoBase64 ? `<img src="${logoBase64}" style="max-height:70px; max-width:120px;" />` : ''}</div>
    <div class="header-left">
      <div class="republic">RÉPUBLIQUE DU MALI</div>
      <div class="school-name">${opts.school?.name || 'Établissement'}</div>
      <div class="school-info">${opts.school?.address || ''}</div>
      <div class="school-info">${opts.school?.phone ? 'Tél : ' + opts.school.phone : ''} ${opts.school?.email ? '- ' + opts.school.email : ''}</div>
    </div>
  </div>

  <div class="title-block">
    <h1>${opts.title}</h1>
    <div class="subtitle">${opts.subtitle}</div>
  </div>

  <div class="summary">
    ${(opts.summary ?? []).map(s => `
      <div class="summary-item">
        <div class="summary-label">${s.label}</div>
        <div class="summary-value">${s.value}</div>
      </div>
    `).join('')}
  </div>

  ${(opts.sections ?? []).map(sec => `
    <div class="section">
      <h2>${sec.title}</h2>
      <table>
        <thead><tr>${sec.columns.map(c => `<th style="text-align:center">${c.label || c.header || c.key}</th>`).join('')}</tr></thead>
        <tbody>${sec.data.map((row) => `
          <tr>${sec.columns.map(c => `<td style="text-align:center">${row[c.key] ?? '—'}</td>`).join('')}</tr>
        `).join('')}</tbody>
      </table>
    </div>
  `).join('')}

  <div class="footer-signature">
    <div class="footer-left">
      <div class="footer-role">Le Directeur</div>
      ${signatureBase64 ? `<img src="${signatureBase64}" style="max-height:50px; margin:6px 0;" />` : ''}
      <div class="footer-name">${opts.school?.directorName || opts.user}</div>
    </div>
    <div class="footer-right">
      <div style="font-size:10px; font-style:italic; color:#6B7280;">Cachet de l'établissement</div>
      ${stampBase64 ? `<img src="${stampBase64}" style="max-height:80px; margin-top:6px;" />` : ''}
    </div>
  </div>
</body>
</html>
  `;

  return pdfGenerator.generateFromHtml(html, {
    format: "A4",
    printBackground: true,
    margin: { top: "15mm", bottom: "20mm", left: "15mm", right: "15mm" },
  });
}
