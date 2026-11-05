import { PdfGeneratorService } from "../../common/pdf";
import { fileToBase64 } from '../../common/utils/file-to-base64.util';

// ============================================================
// PDF officiel pour les rapports administratifs (RAP-01..13)
// En-tete Republique du Mali + logo + signature + cachet
// ============================================================

export interface OfficialReportPdfOptions {
  school: {
    name: string;
    code?: string | null;
    sigle?: string | null;
    type?: string | null;
    region?: string | null;
    cercle?: string | null;
    commune?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
    motto?: string | null;
    directorName?: string | null;
    academy?: string | null;
    cap?: string | null;
    logoUrl?: string | null;
    stampUrl?: string | null;
    signatureUrl?: string | null;
  };
  academicYear?: {
    label?: string | null;
    startDate?: string | Date | null;
    endDate?: string | Date | null;
  } | null;
  report: {
    code: string;
    title: string;
    version?: number;
    bordereauNumber?: string | null;
    validatedAt?: Date | string | null;
    status?: string;
  };
  referenceDate?: string;
  summary?: Array<{ label: string; value: string | number }>;
  sections: Array<{
    title: string;
    rows: any[];
    columns?: Array<{
      key: string;
      label: string;
      align?: 'left' | 'right' | 'center';
      format?: 'currency' | 'percent' | 'text';
    }>;
  }>;
  signature?: {
    name?: string | null;
    role?: string | null;
    place?: string | null;
  };
}

export async function generateOfficialReportPDF(
  opts: OfficialReportPdfOptions,
  pdfGenerator: PdfGeneratorService,
): Promise<Buffer> {
  // Precharger les images en base64
  const logoBase64 = await fileToBase64(opts.school.logoUrl);
  const stampBase64 = await fileToBase64(opts.school.stampUrl);
  const signatureBase64 = await fileToBase64(opts.school.signatureUrl);

  const html = buildOfficialHTML(opts, {
    logo: logoBase64,
    stamp: stampBase64,
    signature: signatureBase64,
  });

  return pdfGenerator.generateFromHtml(html, {
    format: "A4",
    printBackground: true,
    margin: { top: "15mm", bottom: "20mm", left: "15mm", right: "15mm" },
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: `
      <div style="font-size:8px; width:100%; text-align:center; color:#555; padding:0 15mm;">
        <span class="pageNumber"></span> / <span class="totalPages"></span>
      </div>
    `,
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

function escapeHtml(s: any): string {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ============================================================
// Libelles propres pour les enums
// ============================================================

function labelSchoolType(value: string | null | undefined): string {
  if (!value) return "—";
  const map: Record<string, string> = {
    FONDAMENTAL: "École fondamentale",
    FONDAMENTAL_LYCEE: "Fondamental & Lycée",
    LYCEE: "Lycée",
    PRIVE: "Privé",
    PUBLIC: "Public",
    MEDERSA: "Médersa",
    TECHNIQUE: "Enseignement technique",
  };
  return map[value] ?? value;
}

function labelEnrollmentStatus(value: string | null | undefined): string {
  if (!value) return "—";
  const map: Record<string, string> = {
    ACTIVE: "Inscrit",
    PENDING: "En attente",
    VALIDATED: "Validé",
    CANCELLED: "Annulé",
    COMPLETED: "Terminé",
    TRANSFERRED: "Transféré",
    GRADUATED: "Diplômé",
    DROPPED: "Abandon",
    SUSPENDED: "Suspendu",
  };
  return map[value] ?? value;
}

function formatDate(d: any): string {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function buildOfficialHTML(
  opts: OfficialReportPdfOptions,
  images: { logo: string | null; stamp: string | null; signature: string | null },
): string {
  const { school, academicYear, report, signature } = opts;
  const dateStr = formatDate(new Date());

  // Annee scolaire
  let yearLabel = academicYear?.label ?? '—';
  if (!academicYear?.label && academicYear?.startDate && academicYear?.endDate) {
    yearLabel = `${new Date(academicYear.startDate).getFullYear()}-${new Date(academicYear.endDate).getFullYear()}`;
  }

  // Bloc logo (a droite du header)
  const logoBlock = images.logo
    ? `<img src="${images.logo}" alt="Logo" style="max-height:70px; max-width:120px;" />`
    : `<div style="width:70px;"></div>`;

  // Bloc bordereau
  const bordereauBlock = report.bordereauNumber
    ? `<div class="bordereau">
         <span class="bordereau-label">Bordereau N°</span>
         <span class="bordereau-value">${escapeHtml(report.bordereauNumber)}</span>
       </div>`
    : '';

  // Summary cards
  const summaryHTML =
    opts.summary && opts.summary.length > 0
      ? `<div class="summary">
          ${opts.summary
            .map(
              (s) => `
            <div class="summary-item">
              <div class="summary-label">${escapeHtml(s.label)}</div>
              <div class="summary-value">${escapeHtml(s.value)}</div>
            </div>
          `,
            )
            .join('')}
        </div>`
      : '';

  // Sections
  const sectionsHTML = opts.sections
    .map((sec) => {
      const cols = sec.columns ?? [];
      const thead = cols
        .map(
          (c) =>
            `<th style="text-align:${c.align ?? 'left'}">${escapeHtml(c.label)}</th>`,
        )
        .join('');
      const tbody = sec.rows
        .map((row) => {
          const tds = cols
            .map((c) => {
              const val = formatValue(row[c.key], c.format);
              return `<td style="text-align:${c.align ?? 'left'}">${escapeHtml(val)}</td>`;
            })
            .join('');
          return `<tr>${tds}</tr>`;
        })
        .join('');

      return `
        <div class="section">
          <h2>${escapeHtml(sec.title)}</h2>
          <table>
            <thead><tr>${thead}</tr></thead>
            <tbody>${tbody}</tbody>
          </table>
        </div>
      `;
    })
    .join('');

  // Bloc signature + cachet
  const signatureBlock = `
    <div class="footer-signature">
      <div class="footer-left">
        <div class="footer-place">Fait Ã  ${escapeHtml(signature?.place ?? school.commune ?? '—')}, le ${dateStr}</div>
        <div class="footer-role">${escapeHtml(signature?.role ?? 'Le Directeur')}</div>
        ${
          images.signature
            ? `<img src="${images.signature}" alt="Signature" style="max-height:60px; margin:6px 0;" />`
            : `<div style="height:60px;"></div>`
        }
        <div class="footer-name">${escapeHtml(signature?.name ?? school.directorName ?? '—')}</div>
      </div>
      <div class="footer-right">
        <div class="footer-stamp-label">Cachet de l'établissement</div>
        ${
          images.stamp
            ? `<img src="${images.stamp}" alt="Cachet" style="max-height:80px; margin-top:6px;" />`
            : `<div style="height:80px; border:1px dashed #ccc; width:120px; margin-top:6px;"></div>`
        }
      </div>
    </div>
  `;

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<title>${escapeHtml(report.title)}</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: 'Times New Roman', 'DejaVu Serif', serif;
    font-size: 11px;
    color: #111;
    margin: 0;
    padding: 0;
    line-height: 1.4;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 2px solid #111;
    padding-bottom: 8px;
    margin-bottom: 12px;
  }
  .header-left {
    text-align: center;
    flex: 1;
    font-size: 10px;
  }
  .header-left .republic {
    font-weight: bold;
    font-size: 11px;
    letter-spacing: 0.5px;
  }
  .header-left .motto {
    font-style: italic;
    font-size: 9px;
    margin: 2px 0;
  }
  .header-left .ministry {
    margin-top: 4px;
    font-size: 10px;
  }
  .header-left .academy {
    font-size: 10px;
  }
  .header-left .cap {
    font-size: 10px;
    font-weight: bold;
  }
  .header-right {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 130px;
    padding-left: 8px;
  }
  .title-block {
    text-align: center;
    margin: 12px 0;
  }
  .title-block h1 {
    font-size: 16px;
    margin: 0 0 4px 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .title-block .subtitle {
    font-size: 11px;
    color: #444;
    font-style: italic;
  }
  .identification {
    background: #f5f5f5;
    border-left: 3px solid #333;
    padding: 8px 10px;
    margin-bottom: 10px;
    font-size: 10.5px;
  }
  .identification-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px 16px;
  }
  .identification .label {
    font-weight: bold;
    margin-right: 4px;
  }
  .bordereau {
    background: #e8f0ff;
    border: 1px solid #3366cc;
    padding: 5px 10px;
    margin-bottom: 10px;
    text-align: right;
    font-size: 10.5px;
  }
  .bordereau-label { font-weight: bold; margin-right: 6px; }
  .bordereau-value { font-family: 'Courier New', monospace; font-size: 11px; }
  .summary {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  }
  .summary-item {
    flex: 1;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 6px 8px;
    text-align: center;
    background: #fafafa;
  }
  .summary-label {
    font-size: 9px;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }
  .summary-value {
    font-size: 15px;
    font-weight: bold;
    margin-top: 2px;
  }
  .section {
    margin-bottom: 12px;
  }
  .section h2 {
    font-size: 12px;
    margin: 8px 0 4px 0;
    padding: 4px 6px;
    background: #333;
    color: #fff;
    font-weight: bold;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10px;
  }
  th {
    background: #eee;
    border: 1px solid #999;
    padding: 4px 6px;
    font-weight: bold;
  }
  td {
    border: 1px solid #ccc;
    padding: 3px 6px;
  }
  tr:nth-child(even) td {
    background: #fafafa;
  }
  .footer-signature {
    display: flex;
    justify-content: space-between;
    margin-top: 30px;
    padding-top: 10px;
    page-break-inside: avoid;
  }
  .footer-left, .footer-right {
    width: 45%;
    text-align: center;
  }
  .footer-place { font-size: 10px; font-style: italic; }
  .footer-role { font-weight: bold; font-size: 11px; margin-top: 8px; }
  .footer-name {
    border-top: 1px solid #111;
    padding-top: 4px;
    margin-top: 4px;
    font-size: 10px;
    font-weight: bold;
  }
  .footer-stamp-label {
    font-size: 10px;
    font-style: italic;
    color: #666;
  }
</style>
</head>
<body>

  <div class="header">
    <div class="header-left">
      <div class="republic">RÉPUBLIQUE DU MALI</div>
      <div class="motto">Un Peuple - Un But - Une Foi</div>
      <div class="ministry">Ministère de l'Éducation Nationale</div>
      ${school.academy ? `<div class="academy">Académie d'Enseignement de ${escapeHtml(school.academy)}</div>` : ''}
      ${school.cap ? `<div class="cap">CAP de ${escapeHtml(school.cap)}</div>` : ''}
      <div class="academy" style="margin-top:4px; font-weight:bold;">${escapeHtml(school.name)}</div>
    </div>
    <div class="header-right">${logoBlock}</div>
  </div>

  <div class="title-block">
    <h1>${escapeHtml(report.title)}</h1>
    <div class="subtitle">${escapeHtml(report.code)} — Année scolaire ${escapeHtml(yearLabel)}${report.version && report.version > 1 ? ` — Version ${report.version}` : ''}</div>
  </div>

  <div class="identification">
    <div class="identification-grid">
      <div><span class="label">Établissement :</span>${escapeHtml(school.name)}</div>
      <div><span class="label">Code :</span>${escapeHtml(school.code ?? '—')}</div>
      <div><span class="label">Type :</span>${escapeHtml(labelSchoolType(school.type))}</div>
      <div><span class="label">Région :</span>${escapeHtml(school.region ?? '—')}</div>
      <div><span class="label">Commune :</span>${escapeHtml(school.commune ?? '—')}</div>
      <div><span class="label">Téléphone :</span>${escapeHtml(school.phone ?? '—')}</div>
      <div><span class="label">Email :</span>${escapeHtml(school.email ?? '—')}</div>
      <div><span class="label">Directeur :</span>${escapeHtml(school.directorName ?? '—')}</div>
    </div>
  </div>

  ${bordereauBlock}
  ${summaryHTML}
  ${sectionsHTML}
  ${signatureBlock}

</body>
</html>
  `;
}