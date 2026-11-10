import { PdfGeneratorService } from "../../common/pdf";

export function escapeHtml(str: string | null | undefined): string {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function escapeMultiline(str: string | null | undefined): string {
  return escapeHtml(str).replace(/\r?\n/g, "<br />");
}

export function safeImage(src: string | null | undefined): string {
  if (!src) return "";
  return /^data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,[A-Za-z0-9+/=]+$/.test(src)
    ? src
    : "";
}

interface ReportCardItem {
  subjectName: string;
  coefficient: number;
  average: number | null;
  weighted: number | null;
  rank: number | null;
}

export interface ReportCardPDFData {
  schoolName: string;
  schoolAddress?: string | null;
  schoolPhone?: string | null;
  schoolMotto?: string | null;
  schoolLogoUrl?: string | null;
  schoolStampBase64?: string | null;
  schoolAcademy?: string | null;
  schoolCap?: string | null;

  studentName: string;
  studentMatricule: string;
  studentGender: string | null;
  studentBirthDate: string;
  studentBirthPlace?: string | null;

  className: string;
  classSize: number;
  termName: string;
  academicYear: string;

  items: ReportCardItem[];
  totalCoefficient: number;
  totalWeighted: number;
  generalAverage: number | null;
  rank: number | null;
  scale: number;
  absencesCount: number;
  latesCount: number;

   decision: string | null;
  appreciation: string | null;
  qrCodeDataUrl?: string | null;

  // ✅ NOUVEAU : assiduité détaillée
  attendanceStats?: {
    totalDays: number;
    presentDays: number;
    absentDays: number;
    justifiedDays: number;
    unjustifiedDays: number;
    pendingDays: number;
    lateDays: number;
    rate: number;
  } | null;

}

const DECISION_LABELS: Record<string, string> = {
  ADMIS: "Admis en classe supérieure",
  REDOUBLE: "Redouble",
  EXCLU: "Exclu",
};

export async function generateReportCardPDF(
  data: ReportCardPDFData,
  pdfGenerator: PdfGeneratorService,
): Promise<Buffer> {
  const html = buildHTML(data);
  return pdfGenerator.generateFromHtml(html, {
    format: "A4",
    printBackground: true,
    margin: { top: "8mm", right: "10mm", bottom: "10mm", left: "10mm" },
  });
}

function onTwenty(value: number, scale: number): number {
  return (value * 20) / (scale > 0 ? scale : 20);
}

function getAppreciation(average: number | null, scale: number): string {
  if (average === null) return "—";
  const v = onTwenty(average, scale);
  if (v >= 18) return "Excellent";
  if (v >= 16) return "Très bien";
  if (v >= 14) return "Bien";
  if (v >= 12) return "Assez bien";
  if (v >= 10) return "Passable";
  if (v >= 8) return "Insuffisant";
  return "Très insuffisant";
}

function colorFor(average: number | null, scale: number): string {
  if (average === null) return "#6B7280";
  const v = onTwenty(average, scale);
  if (v >= 14) return "#047857";
  if (v >= 10) return "#1D4ED8";
  if (v >= 8) return "#C2410C";
  return "#B91C1C";
}

export function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return n.toFixed(2).replace(".", ",");
}

export function ordinal(n: number | null | undefined): string {
  if (!n) return "—";
  return n === 1 ? "1er" : `${n}e`;
}

export function formatDate(d: string): string {
  if (!d) return "—";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function genderLabel(g: string | null | undefined): string {
  if (g === "M") return "Masculin";
  if (g === "F") return "Féminin";
  return "—";
}

function buildHTML(data: ReportCardPDFData): string {
  const scale = data.scale && data.scale > 0 ? data.scale : 20;
  const showCoef = data.items.some((i) => i.coefficient !== 1);

  const rowsHTML = data.items.map((item) => {
    const color = colorFor(item.average, scale);
    const coefCells = showCoef ? `<td class="c strong">${escapeHtml(String(item.coefficient))}</td>` : "";
    const weightedCell = showCoef ? `<td class="c">${fmt(item.weighted)}</td>` : "";
    return `
      <tr>
        <td class="l">${escapeHtml(item.subjectName)}</td>
        ${coefCells}
        <td class="c strong" style="color:${color};">${fmt(item.average)}</td>
        ${weightedCell}
        <td class="c">${ordinal(item.rank)}</td>
        <td class="c small" style="color:${color};">${getAppreciation(item.average, scale)}</td>
      </tr>`;
  }).join("");

  const sumOfAverages = data.items.reduce((s, i) => s + (i.average !== null ? i.average : 0), 0);
  const totalRow = showCoef
    ? `<tr class="total-row"><td class="l">TOTAL</td><td class="c">${escapeHtml(String(data.totalCoefficient))}</td><td class="c">—</td><td class="c">${fmt(data.totalWeighted)}</td><td class="c">—</td><td class="c">—</td></tr>`
    : `<tr class="total-row"><td class="l">TOTAL</td><td class="c">${fmt(sumOfAverages)}</td><td class="c">—</td><td class="c">—</td></tr>`;

  const headCells = showCoef
    ? `<th class="l" style="width:30%;">Matière</th><th style="width:9%;">Coef</th><th style="width:15%;">Moyenne /${scale}</th><th style="width:16%;">Coef Ã— Moy</th><th style="width:10%;">Rang</th><th style="width:20%;">Appréciation</th>`
    : `<th class="l" style="width:46%;">Matière</th><th style="width:18%;">Moyenne /${scale}</th><th style="width:14%;">Rang</th><th style="width:22%;">Appréciation</th>`;

  const hasDecision = !!data.decision && data.decision !== "A_DETERMINER" && data.decision !== "A_EXAMINER";
  const decisionLabel = hasDecision ? escapeHtml(DECISION_LABELS[data.decision as string] || data.decision) : "";

  const generalAppr = getAppreciation(data.generalAverage, scale);
  const avgColor = colorFor(data.generalAverage, scale);

  const logo = safeImage(data.schoolLogoUrl);
  const logoHTML = logo ? `<img src="${logo}" alt="Logo" style="width:60px;height:60px;object-fit:contain;" />` : "";
  const stamp = safeImage(data.schoolStampBase64);

  const academyLine = data.schoolAcademy ? `<div>Académie d'Enseignement de ${escapeHtml(data.schoolAcademy)}</div>` : "";
  const capLine = data.schoolCap ? `<div>CAP de ${escapeHtml(data.schoolCap)}</div>` : "";

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 10px; color: #1F2937; line-height: 1.35; }
  table.head { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
  table.head td { vertical-align: top; border: 0; padding: 0; font-size: 9px; }
  .head-left { width: 38%; text-align: center; font-weight: 600; text-transform: uppercase; }
  .head-center { width: 24%; text-align: center; }
  .head-right { width: 38%; text-align: center; }
  .republic { font-weight: bold; font-size: 11px; text-transform: uppercase; }
  .devise { font-style: italic; font-size: 9px; margin-top: 1px; }
  .school-block { text-align: center; border-bottom: 2.5px double #1E40AF; padding-bottom: 8px; margin-bottom: 10px; }
  .school-name { font-size: 15px; font-weight: bold; color: #1E40AF; text-transform: uppercase; }
  .school-info { font-size: 8.5px; color: #4B5563; margin-top: 1px; }
  .school-motto { font-size: 8.5px; font-style: italic; color: #4B5563; margin-top: 1px; }
  .title-block { text-align: center; margin: 8px 0 10px; }
  .title { font-size: 15px; font-weight: bold; color: #1E40AF; letter-spacing: 1px; }
  .subtitle { font-size: 10px; color: #374151; margin-top: 2px; font-weight: 600; }
  table.student { width: 100%; border-collapse: collapse; background: #EFF6FF; border: 1px solid #BFDBFE; margin-bottom: 10px; }
  table.student td { border: 0; padding: 3px 10px; font-size: 10px; width: 50%; }
  .lbl { color: #4B5563; font-weight: 500; }
  .val { font-weight: 600; color: #111827; }
  table.notes { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  table.notes th { background: #1E40AF; color: #fff; padding: 5px 3px; font-size: 8px; text-align: center; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; border: 1px solid #1E40AF; }
  table.notes th.l { text-align: left; padding-left: 8px; }
  table.notes td { padding: 4px 3px; font-size: 10px; border: 1px solid #D1D5DB; }
  table.notes tr { page-break-inside: avoid; }
  table.notes tr:nth-child(even) td { background: #F9FAFB; }
  td.l { text-align: left; padding-left: 6px; }
  td.c { text-align: center; }
  td.strong { font-weight: 600; }
  td.small { font-size: 9px; }
  tr.total-row td { background: #F3F4F6 !important; font-weight: bold; border-top: 2px solid #1E40AF; }
  table.summary { width: 100%; border-collapse: collapse; border: 2px solid #0EA5E9; background: #F0F9FF; margin: 10px 0; }
  table.summary td { border: 0; padding: 8px 14px; vertical-align: middle; }
  .average-label { font-size: 9px; color: #0369A1; text-transform: uppercase; letter-spacing: 0.5px; }
  .average-value { font-size: 20px; font-weight: bold; color: ${avgColor}; margin-top: 2px; }
  .average-appr { font-size: 11px; font-weight: 600; color: ${avgColor}; }
  .rank-value { font-size: 16px; font-weight: bold; color: #1E40AF; }
  table.info { width: 100%; border-collapse: collapse; border: 1px solid #D1D5DB; margin-bottom: 8px; }
  table.info td { padding: 5px 10px; font-size: 9.5px; border: 0; }
  .section { border: 1px solid #D1D5DB; border-radius: 4px; padding: 8px 10px; margin-bottom: 8px; page-break-inside: avoid; }
  .section-title { font-size: 9px; font-weight: bold; color: #1E40AF; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px; }
  .appreciation-text { font-size: 10px; line-height: 1.5; color: #374151; font-style: italic; min-height: 28px; }
  .decision-text { font-size: 12px; font-weight: bold; color: #1E40AF; text-align: center; padding: 4px 0; }
  table.sign { width: 100%; border-collapse: collapse; margin-top: 14px; page-break-inside: avoid; }
  table.sign td { width: 24%; text-align: center; vertical-align: bottom; padding: 0 8px; border: 0; height: 80px; }
  .signature-line { border-top: 1px solid #1F2937; margin-top: 4px; padding-top: 3px; font-size: 8.5px; color: #4B5563; font-style: italic; }
  .footer { text-align: center; font-size: 7.5px; color: #6B7280; margin-top: 12px; padding-top: 6px; border-top: 1px solid #E5E7EB; }
</style>
</head>
<body>

<table class="head">
  <tr>
    <td class="head-left">
      <div>Ministère de l'Éducation Nationale</div>
      ${academyLine}
      ${capLine}
    </td>
    <td class="head-center">${logoHTML}</td>
    <td class="head-right">
      <div class="republic">République du Mali</div>
      <div class="devise">Un Peuple "“ Un But "“ Une Foi</div>
    </td>
  </tr>
</table>

<div class="school-block">
  <div class="school-name">${escapeHtml(data.schoolName)}</div>
  ${data.schoolAddress ? `<div class="school-info">${escapeHtml(data.schoolAddress)}</div>` : ""}
  ${data.schoolPhone ? `<div class="school-info">Tél : ${escapeHtml(data.schoolPhone)}</div>` : ""}
  ${data.schoolMotto ? `<div class="school-motto">Â« ${escapeHtml(data.schoolMotto)} Â»</div>` : ""}
</div>

<div class="title-block">
  <div class="title">BULLETIN DE NOTES</div>
  <div class="subtitle">${escapeHtml(data.termName)} — Année scolaire ${escapeHtml(data.academicYear)}</div>
</div>

<table class="student">
  <tr>
    <td><span class="lbl">Élève : </span><span class="val">${escapeHtml(data.studentName)}</span></td>
    <td><span class="lbl">Classe : </span><span class="val">${escapeHtml(data.className)}</span></td>
  </tr>
  <tr>
    <td><span class="lbl">Matricule : </span><span class="val" style="font-family:monospace;">${escapeHtml(data.studentMatricule)}</span></td>
    <td><span class="lbl">Effectif : </span><span class="val">${escapeHtml(String(data.classSize))} élèves</span></td>
  </tr>
  <tr>
    <td><span class="lbl">Sexe : </span><span class="val">${genderLabel(data.studentGender)}</span></td>
    <td><span class="lbl">Né(e) le : </span><span class="val">${formatDate(data.studentBirthDate)}${data.studentBirthPlace ? ` Ã  ${escapeHtml(data.studentBirthPlace)}` : ""}</span></td>
  </tr>
</table>

<table class="notes">
  <thead><tr>${headCells}</tr></thead>
  <tbody>${rowsHTML}${totalRow}</tbody>
</table>

<table class="summary">
  <tr>
    <td>
      <div class="average-label">Moyenne générale</div>
      <div class="average-value">${fmt(data.generalAverage)} / ${scale}</div>
      <div class="average-appr">${generalAppr}</div>
    </td>
    <td style="text-align:right;">
      <div class="average-label">Rang</div>
      <div class="rank-value">${ordinal(data.rank)}${data.classSize ? ` sur ${escapeHtml(String(data.classSize))} élèves` : ""}</div>
    </td>
  </tr>
</table>

<table class="info">
  <tr>
    <td><span class="lbl">Absences : </span><span class="val">${escapeHtml(String(data.absencesCount || 0))}</span></td>
    <td><span class="lbl">Retards : </span><span class="val">${escapeHtml(String(data.latesCount || 0))}</span></td>
  </tr>
</table>

${data.attendanceStats ? `
<div class="section" style="border-color:#FCD34D;background:#FFFBEB;">
  <div class="section-title" style="color:#92400E;">Assiduité — Année ${escapeHtml(data.academicYear)}</div>
  <table style="width:100%;border-collapse:collapse;font-size:9.5px;">
    <tr>
      <td style="padding:3px 6px;border-bottom:1px solid #FDE68A;">
        <span style="color:#4B5563;">Total jours d'appel</span>
        <strong style="float:right;">${data.attendanceStats.totalDays}</strong>
      </td>
      <td style="padding:3px 6px;border-bottom:1px solid #FDE68A;">
        <span style="color:#4B5563;">Présences</span>
        <strong style="float:right;color:#047857;">${data.attendanceStats.presentDays}</strong>
      </td>
    </tr>
    <tr>
      <td style="padding:3px 6px;border-bottom:1px solid #FDE68A;">
        <span style="color:#4B5563;">Absences justifiées</span>
        <strong style="float:right;color:#0369A1;">${data.attendanceStats.justifiedDays}</strong>
      </td>
      <td style="padding:3px 6px;border-bottom:1px solid #FDE68A;">
        <span style="color:#4B5563;">Absences non justifiées</span>
        <strong style="float:right;color:#B91C1C;">${data.attendanceStats.unjustifiedDays}</strong>
      </td>
    </tr>
    <tr>
      <td style="padding:3px 6px;border-bottom:1px solid #FDE68A;">
        <span style="color:#4B5563;">Justifications en attente</span>
        <strong style="float:right;color:#C2410C;">${data.attendanceStats.pendingDays}</strong>
      </td>
      <td style="padding:3px 6px;border-bottom:1px solid #FDE68A;">
        <span style="color:#4B5563;">Retards</span>
        <strong style="float:right;color:#92400E;">${data.attendanceStats.lateDays}</strong>
      </td>
    </tr>
    <tr>
      <td colspan="2" style="padding:5px 6px;text-align:center;font-weight:bold;color:#92400E;background:#FEF3C7;">
        Taux de présence annuel : ${data.attendanceStats.rate}%
      </td>
    </tr>
  </table>
</div>
` : ""}

<div class="section">
  <div class="section-title">Appréciation générale</div>
  <div class="appreciation-text">
    ${data.appreciation ? escapeMultiline(data.appreciation) : "<em style='color:#6B7280;'>Aucune appréciation saisie</em>"}
  </div>
</div>

${hasDecision ? `<div class="section" style="border-color:#0EA5E9;background:#F0F9FF;">
  <div class="section-title" style="color:#0369A1;">Décision</div>
  <div class="decision-text">${decisionLabel}</div>
</div>` : ""}

<table class="sign">
  <tr>
    <td><div class="signature-line">Le Maître ou la Maîtresse / Le Titulaire de classe</div></td>
    <td>${stamp ? `<img src="${stamp}" alt="Cachet" style="height:70px;object-fit:contain;" />` : ""}<div class="signature-line">Le Directeur / La Directrice</div></td>
    ${data.qrCodeDataUrl ? `<td style="text-align:center;vertical-align:top;"><img src="${data.qrCodeDataUrl}" alt="QR de verification" style="width:70px;height:70px;" /><div style="font-size:6.5px;color:#6B7280;margin-top:2px;">Scannez pour verifier</div></td>` : ""}
    <td><div class="signature-line">Visa du parent ou tuteur</div></td>
  </tr>
</table>

<div class="footer">
  Document généré par ${escapeHtml(data.schoolName)} le ${formatDate(new Date().toISOString())}
</div>

</body>
</html>`;
}

export const __test = { buildHTML };