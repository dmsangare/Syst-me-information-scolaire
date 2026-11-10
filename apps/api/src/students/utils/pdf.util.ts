import { PdfGeneratorService } from "../../common/pdf";

export interface PDFColumn {
  header: string;
  key: string;
  width?: string;
}

export interface PDFOptions {
  title: string;
  subtitle?: string;
  schoolName: string;
  schoolAddress?: string;
  schoolLogoUrl?: string;
  columns: PDFColumn[];
  data: Record<string, any>[];
  footerNote?: string;
}

export async function generatePDF(
  options: PDFOptions,
  pdfGenerator: PdfGeneratorService,
): Promise<Buffer> {
  const html = buildHTML(options);
  return pdfGenerator.generateFromHtml(html, {
    format: "A4",
    printBackground: true,
    margin: { top: "15mm", right: "10mm", bottom: "15mm", left: "10mm" },
    displayHeaderFooter: true,
    headerTemplate: "<div></div>",
    footerTemplate: `
      <div style="font-size: 8px; color: #9CA3AF; text-align: center; width: 100%; padding: 5px 0;">
        Page <span class="pageNumber"></span> / <span class="totalPages"></span> —
        ${escapeHtml(options.schoolName ?? "Etablissement")} — Genere le ${new Date().toLocaleDateString("fr-FR")}
      </div>
    `,
  });
}

function buildHTML(options: PDFOptions): string {
  const logoHTML = options.schoolLogoUrl
    ? `<img src="${options.schoolLogoUrl}" alt="Logo" style="width: 60px; height: 60px; object-fit: contain;" />`
    : `<div style="width: 60px; height: 60px; background: #1E40AF; color: white; display: flex; align-items: center; justify-content: center; border-radius: 8px; font-size: 24px; font-weight: bold;">S</div>`;

  const tableHeaders = options.columns
    .map((c) => `<th style="width: ${c.width || "auto"};">${c.header}</th>`)
    .join("");

  const tableRows = options.data
    .map(
      (row, idx) => `
      <tr class="${idx % 2 === 0 ? "even" : "odd"}">
        ${options.columns.map((c) => `<td>${escapeHtml(String(row[c.key] ?? ""))}</td>`).join("")}
      </tr>
    `,
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 10px; color: #1F2937; }
          .header { display: flex; align-items: center; gap: 15px; padding-bottom: 15px; border-bottom: 2px solid #1E40AF; margin-bottom: 15px; }
          .header-info { flex: 1; }
          .school-name { font-size: 16px; font-weight: bold; color: #1E40AF; }
          .school-address { font-size: 9px; color: #6B7280; margin-top: 2px; }
          .title { font-size: 14px; font-weight: bold; text-align: center; margin: 15px 0 5px 0; color: #1F2937; }
          .subtitle { font-size: 11px; text-align: center; color: #6B7280; margin-bottom: 15px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background: #1E40AF; color: white; padding: 8px 6px; text-align: left; font-weight: 600; font-size: 9px; border: 1px solid #1E40AF; }
          td { padding: 6px; border: 1px solid #E5E7EB; font-size: 9px; }
          tr.even { background: white; }
          tr.odd { background: #F9FAFB; }
          .footer-note { margin-top: 15px; padding-top: 10px; border-top: 1px solid #E5E7EB; font-size: 8px; color: #9CA3AF; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          ${logoHTML}
          <div class="header-info">
            <div class="school-name">${escapeHtml(options.schoolName)}</div>
            ${options.schoolAddress ? `<div class="school-address">${escapeHtml(options.schoolAddress)}</div>` : ""}
          </div>
        </div>

        <div class="title">${escapeHtml(options.title)}</div>
        ${options.subtitle ? `<div class="subtitle">${escapeHtml(options.subtitle)}</div>` : ""}

        <table>
          <thead>
            <tr>${tableHeaders}</tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>

        ${options.footerNote ? `<div class="footer-note">${escapeHtml(options.footerNote)}</div>` : ""}
      </body>
    </html>
  `;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}