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

  let yearLabel = academicYear?.label ?? "—";
  if (!academicYear?.label && academicYear?.startDate && academicYear?.endDate) {
    yearLabel = `${new Date(academicYear.startDate).getFullYear()}-${new Date(academicYear.endDate).getFullYear()}`;
  }

  const logoBlock = images.logo
    ? `<img src="${images.logo}" alt="Logo" style="max-height:70px; max-width:120px; object-fit:contain;" />`
    : `<div style="width:70px; height:70px; background:#f3f4f6; border-radius:8px;"></div>`;

  const bordereauBlock = report.bordereauNumber
    ? `<div class="bordereau">
         <span class="bordereau-label">Bordereau N°</span>
         <span class="bordereau-value">${escapeHtml(report.bordereauNumber)}</span>
       </div>`
    : "";

  const summaryHTML = opts.summary && opts.summary.length > 0
    ? `<div class="summary">
        ${opts.summary.map((s) => `
          <div class="summary-item">
            <div class="summary-label">${escapeHtml(s.label)}</div>
            <div class="summary-value">${escapeHtml(s.value)}</div>
          </div>
        `).join("")}
      </div>`
    : "";

  const sectionsHTML = opts.sections.map((sec) => {
    const cols = sec.columns ?? [];
    const thead = cols.map((c) => `<th style="text-align:center">${escapeHtml(c.label)}</th>`).join("");
    const tbody = sec.rows.map((row) => {
      const tds = cols.map((c) => {
        const val = formatValue(row[c.key], c.format);
        return `<td style="text-align:center">${escapeHtml(val)}</td>`;
      }).join("");
      return `<tr>${tds}</tr>`;
    }).join("");

    return `
      <div class="section">
        <h2>${escapeHtml(sec.title)}</h2>
        <table>
          <thead><tr>${thead}</tr></thead>
          <tbody>${tbody}</tbody>
        </table>
      </div>
    `;
  }).join("");

  const signatureBlock = `
    <div class="footer-signature">
      <div class="footer-left">
        <div class="footer-place">Fait à ${escapeHtml(signature?.place ?? school.commune ?? '—')}, le ${dateStr}</div>
        <div class="footer-role">${escapeHtml(signature?.role ?? 'Le Directeur')}</div>
        ${images.signature ? `<img src="${images.signature}" alt="Signature" style="max-height:60px; margin:6px 0;" />` : `<div style="height:60px;"></div>`}
        <div class="footer-name">${escapeHtml(signature?.name ?? school.directorName ?? '—')}</div>
      </div>
      <div class="footer-right">
        <div class="footer-stamp-label">Cachet de l'établissement</div>
        ${images.stamp ? `<img src="${images.stamp}" alt="Cachet" style="max-height:80px; margin-top:6px;" />` : `<div style="height:80px; border:1px dashed #ccc; width:120px; margin-top:6px;"></div>`}
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
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    font-size: 11px;
    color: #374151;
    margin: 0;
    padding: 0;
    line-height: 1.5;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 3px solid #0D9488;
    padding-bottom: 12px;
    margin-bottom: 16px;
    background: #F0FDFA;
    padding: 12px;
    border-radius: 8px;
  }
  .header-left {
    text-align: left;
    flex: 1;
    font-size: 10px;
    color: #4B5563;
  }
  .header-left .republic {
    font-weight: 800;
    font-size: 12px;
    color: #0F766E;
    letter-spacing: 0.5px;
    margin-bottom: 2px;
  }
  .header-left .motto {
    font-style: italic;
    font-size: 9px;
    color: #6B7280;
    margin-bottom: 6px;
  }
  .header-left .ministry, .header-left .academy, .header-left .cap {
    font-size: 10px;
    margin-bottom: 2px;
  }
  .header-left .school-name {
    font-size: 13px;
    font-weight: 700;
    color: #0F766E;
    margin-top: 6px;
    text-transform: uppercase;
  }
  .header-right {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 140px;
    padding-left: 12px;
  }
  .title-block {
    text-align: center;
    margin: 16px 0 20px 0;
  }
  .title-block h1 {
    font-size: 18px;
    margin: 0 0 6px 0;
    text-transform: uppercase;
    color: #0F766E;
    letter-spacing: 0.5px;
    font-weight: 800;
  }
  .title-block .subtitle {
    font-size: 12px;
    color: #6B7280;
    font-weight: 500;
  }
  .identification {
    background: #F9FAFB;
    border: 1px solid #E5E7EB;
    border-left: 4px solid #0D9488;
    border-radius: 4px;
    padding: 12px;
    margin-bottom: 16px;
    font-size: 11px;
  }
  .identification-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px 16px;
  }
  .identification .label {
    font-weight: 600;
    color: #374151;
    margin-right: 4px;
  }
  .bordereau {
    background: #F0FDFA;
    border: 1px solid #0D9488;
    padding: 8px 12px;
    margin-bottom: 12px;
    text-align: right;
    font-size: 11px;
    border-radius: 4px;
  }
  .bordereau-label { font-weight: 700; color: #0F766E; margin-right: 8px; }
  .bordereau-value { font-family: monospace; font-size: 12px; color: #111827; }
  .summary {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
  }
  .summary-item {
    flex: 1;
    border: 1px solid #E5E7EB;
    border-radius: 6px;
    padding: 10px;
    text-align: center;
    background: #FFFFFF;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  }
  .summary-label {
    font-size: 9px;
    color: #6B7280;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 600;
  }
  .summary-value {
    font-size: 18px;
    font-weight: 800;
    color: #0F766E;
    margin-top: 4px;
  }
  .section {
    margin-bottom: 20px;
    page-break-inside: avoid;
  }
  .section h2 {
    font-size: 13px;
    margin: 0 0 8px 0;
    padding: 8px 12px;
    background: #0F766E;
    color: #FFFFFF;
    font-weight: 700;
    border-radius: 4px 4px 0 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10px;
    border: 1px solid #E5E7EB;
  }
  th {
    background: #F3F4F6;
    border-bottom: 2px solid #D1D5DB;
    padding: 8px;
    font-weight: 700;
    color: #374151;
    text-transform: uppercase;
    font-size: 9px;
    letter-spacing: 0.5px;
  }
  td {
    border-bottom: 1px solid #E5E7EB;
    padding: 6px 8px;
    color: #4B5563;
  }
  tr:nth-child(even) td {
    background: #F9FAFB;
  }
  .footer-signature {
    display: flex;
    justify-content: space-between;
    margin-top: 40px;
    padding-top: 16px;
    page-break-inside: avoid;
  }
  .footer-left, .footer-right {
    width: 45%;
    text-align: center;
  }
  .footer-place { font-size: 10px; font-style: italic; color: #6B7280; }
  .footer-role { font-weight: 700; font-size: 12px; color: #111827; margin-top: 8px; }
  .footer-name {
    border-top: 2px solid #0D9488;
    padding-top: 6px;
    margin-top: 6px;
    font-size: 11px;
    font-weight: 700;
    color: #0F766E;
  }
  .footer-stamp-label {
    font-size: 10px;
    font-style: italic;
    color: #6B7280;
  }
</style>
</head>
<body>

  <div class="header">
    <div class="header-right">${logoBlock}</div>
    <div class="header-left">
      <div class="republic">RÉPUBLIQUE DU MALI</div>
      <div class="motto">Un Peuple - Un But - Une Foi</div>
      <div class="ministry">Ministère de l'Éducation Nationale</div>
      ${school.academy ? `<div class="academy">Académie d'Enseignement de ${escapeHtml(school.academy)}</div>` : ""}
      ${school.cap ? `<div class="cap">CAP de ${escapeHtml(school.cap)}</div>` : ""}
      <div class="school-name">${escapeHtml(school.name)}</div>
    </div>
  </div>

  <div class="title-block">
    <h1>${escapeHtml(report.title)}</h1>
    <div class="subtitle">${escapeHtml(report.code)} — Année scolaire ${escapeHtml(yearLabel)}${report.version && report.version > 1 ? ` — Version ${report.version}` : ""}</div>
  </div>

  <div class="identification">
    <div class="identification-grid">
      <div><span class="label">Établissement :</span>${escapeHtml(school.name)}</div>
      <div><span class="label">Code :</span>${escapeHtml(school.code ?? "—")}</div>
      <div><span class="label">Type :</span>${escapeHtml(labelSchoolType(school.type))}</div>
      <div><span class="label">Région :</span>${escapeHtml(school.region ?? "—")}</div>
      <div><span class="label">Commune :</span>${escapeHtml(school.commune ?? "—")}</div>
      <div><span class="label">Téléphone :</span>${escapeHtml(school.phone ?? "—")}</div>
      <div><span class="label">Email :</span>${escapeHtml(school.email ?? "—")}</div>
      <div><span class="label">Directeur :</span>${escapeHtml(school.directorName ?? "—")}</div>
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
