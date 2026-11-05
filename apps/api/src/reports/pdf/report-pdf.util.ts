import { PdfGeneratorService } from "../../common/pdf";

interface PDFOptions {
  title: string;
  schoolName: string;
  subtitle?: string;
  period?: string;
  user: string;
  sections: Array<{
    title: string;
    rows: any[];
    columns?: Array<{ key: string; label: string; align?: 'left' | 'right' | 'center'; format?: 'currency' | 'percent' | 'text' }>;
  }>;
  summary?: Array<{ label: string; value: string | number }>;
}

export async function generateReportPDF(
  opts: PDFOptions,
  pdfGenerator: PdfGeneratorService,
): Promise<Buffer> {
  const html = buildHTML(opts);
  return pdfGenerator.generateFromHtml(html, {
    format: "A4",
    printBackground: true,
    margin: { top: "15mm", bottom: "15mm", left: "12mm", right: "12mm" },
  });
}

function formatValue(v: any, format?: string): string {
  if (v === null || v === undefined || v === '') return '—';
  if (format === 'currency') {
    return new Intl.NumberFormat('fr-FR').format(Number(v)) + ' FCFA';
  }
  if (format === 'percent') {
    return Number(v).toFixed(1) + ' %';
  }
  return String(v);
}

function buildHTML(opts: PDFOptions): string {
  const date = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  const summaryHTML = opts.summary?.length
    ? `
      <div class="summary">
        ${opts.summary.map((s) => `
          <div class="summary-item">
            <div class="summary-label">${s.label}</div>
            <div class="summary-value">${s.value}</div>
          </div>
        `).join('')}
      </div>
    `
    : '';

  const sectionsHTML = opts.sections.map((sec) => {
    if (!sec.rows || sec.rows.length === 0) {
      return `
        <div class="section">
          <h3>${sec.title}</h3>
          <p class="empty">Aucune donnée</p>
        </div>
      `;
    }

    const cols = sec.columns ?? Object.keys(sec.rows[0]).map((k) => ({
      key: k, label: k, align: 'left' as const, format: 'text' as const,
    }));

    const headerHTML = cols.map((c) =>
      `<th class="col-${c.align ?? 'left'}">${c.label}</th>`
    ).join('');

    const rowsHTML = sec.rows.map((r) =>
      '<tr>' + cols.map((c) => {
        const val = formatValue(r[c.key], c.format);
        return `<td class="col-${c.align ?? 'left'}">${val}</td>`;
      }).join('') + '</tr>'
    ).join('');

    return `
      <div class="section">
        <h3>${sec.title}</h3>
        <table>
          <thead><tr>${headerHTML}</tr></thead>
          <tbody>${rowsHTML}</tbody>
        </table>
      </div>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>${opts.title}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Helvetica', 'Arial', sans-serif;
    font-size: 11px;
    color: #1a1a1a;
    line-height: 1.4;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 12px;
    border-bottom: 3px solid #1e40af;
    margin-bottom: 16px;
  }
  .school-info h1 {
    font-size: 16px;
    color: #1e40af;
    font-weight: 700;
    margin-bottom: 4px;
  }
  .school-info p {
    font-size: 10px;
    color: #666;
  }
  .report-meta {
    text-align: right;
    font-size: 10px;
    color: #666;
  }
  .report-meta .report-title {
    font-size: 13px;
    font-weight: 600;
    color: #1a1a1a;
    margin-bottom: 4px;
  }
  h2.title {
    font-size: 18px;
    color: #1e40af;
    text-align: center;
    margin: 12px 0 20px 0;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .summary {
    display: flex;
    gap: 8px;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }
  .summary-item {
    flex: 1;
    min-width: 100px;
    border: 1px solid #e5e7eb;
    border-radius: 4px;
    padding: 8px;
    text-align: center;
    background: #f9fafb;
  }
  .summary-label {
    font-size: 9px;
    color: #6b7280;
    text-transform: uppercase;
    margin-bottom: 3px;
  }
  .summary-value {
    font-size: 14px;
    font-weight: 700;
    color: #1e40af;
  }
  .section {
    margin-bottom: 20px;
  }
  .section h3 {
    font-size: 12px;
    color: #1e40af;
    margin-bottom: 6px;
    padding-bottom: 4px;
    border-bottom: 1px solid #e5e7eb;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  th {
    background: #f3f4f6;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    color: #4b5563;
    padding: 6px 8px;
    border: 1px solid #e5e7eb;
    letter-spacing: 0.3px;
  }
  td {
    padding: 5px 8px;
    border: 1px solid #e5e7eb;
    font-size: 10px;
  }
  tbody tr:nth-child(even) { background: #f9fafb; }
  .col-left { text-align: left; }
  .col-right { text-align: right; }
  .col-center { text-align: center; }
  .empty {
    text-align: center;
    color: #9ca3af;
    font-style: italic;
    padding: 12px;
  }
  .footer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    text-align: center;
    font-size: 9px;
    color: #9ca3af;
    border-top: 1px solid #e5e7eb;
    padding-top: 4px;
    background: white;
  }
  .footer-page::after {
    content: counter(page);
  }
</style>
</head>
<body>
  <div class="header">
    <div class="school-info">
      <h1>${opts.schoolName}</h1>
      <p>Système d'Information Scolaire — SIS-MALI</p>
    </div>
    <div class="report-meta">
      <div class="report-title">${opts.title}</div>
      ${opts.subtitle ? `<div>${opts.subtitle}</div>` : ''}
      ${opts.period ? `<div>Période : ${opts.period}</div>` : ''}
      <div>Édité le ${date}</div>
      <div>Par ${opts.user}</div>
    </div>
  </div>

  <h2 class="title">${opts.title}</h2>

  ${summaryHTML}
  ${sectionsHTML}

  <div class="footer">
    Document généré automatiquement par SIS-MALI · ${date}
  </div>
</body>
</html>`;
}