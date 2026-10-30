import { PdfGeneratorService } from "../../common/pdf";
import { escapeHtml, escapeMultiline, safeImage, fmt, ordinal, formatDate, genderLabel } from "./report-card-pdf.util";

export interface AnnualReportCardPDFData {
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
  academicYear: string;
  cycle: "PREMIER_CYCLE" | "DEUXIEME_CYCLE";

  // Pour 2e cycle : 3 trimestres
  terms?: Array<{
    termName: string;
    average: number | null;
    rank: number | null;
  }>;

  // Pour 1er cycle : 9 compositions
  compositions?: Array<{
    periodName: string;
    average: number | null;
  }>;

  annualAverage: number | null;
  annualSum: number | null;
  rank: number | null;

  decision: string | null;
  decisionLabel: string | null;
  appreciation: string | null;
  scale: number;
  absencesCount: number;
  latesCount: number;
  qrCodeDataUrl?: string | null;
}

export async function generateAnnualReportCardPDF(
  data: AnnualReportCardPDFData,
  pdfGenerator: PdfGeneratorService,
): Promise<Buffer> {
  const html = buildAnnualHTML(data);
  return pdfGenerator.generateFromHtml(html, {
    format: "A4",
    printBackground: true,
    margin: { top: "8mm", right: "10mm", bottom: "10mm", left: "10mm" },
  });
}

function buildAnnualHTML(data: AnnualReportCardPDFData): string {
  const scale = data.scale && data.scale > 0 ? data.scale : 20;
  const logo = safeImage(data.schoolLogoUrl);
  const logoHTML = logo ? `<img src="${logo}" alt="Logo" style="width:60px;height:60px;object-fit:contain;" />` : "";
  const stamp = safeImage(data.schoolStampBase64);

  const academyLine = data.schoolAcademy ? `<div>AcadÃ©mie d'Enseignement de ${escapeHtml(data.schoolAcademy)}</div>` : "";
  const capLine = data.schoolCap ? `<div>CAP de ${escapeHtml(data.schoolCap)}</div>` : "";

  // Tableau des pÃ©riodes
  let periodsHTML = "";
  let periodsTitle = "";
  if (data.cycle === "DEUXIEME_CYCLE" && data.terms) {
    periodsTitle = "Moyennes trimestrielles";
    periodsHTML = data.terms.map((t, i) => `
      <tr>
        <td class="l">${escapeHtml(t.termName)}</td>
        <td class="c strong">${fmt(t.average)} / ${scale}</td>
        <td class="c">${ordinal(t.rank)}</td>
      </tr>
    `).join("");
  } else if (data.cycle === "PREMIER_CYCLE" && data.compositions) {
    periodsTitle = "Compositions mensuelles";
    periodsHTML = data.compositions.map((c) => `
      <tr>
        <td class="l">${escapeHtml(c.periodName)}</td>
        <td class="c strong">${fmt(c.average)} / ${scale}</td>
      </tr>
    `).join("");
  }

  const decisionLabel = data.decisionLabel || data.decision || "â€”";

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
  .section-title { font-size: 11px; font-weight: bold; color: #1E40AF; text-transform: uppercase; letter-spacing: 0.5px; margin: 12px 0 5px; }
  table.summary { width: 100%; border-collapse: collapse; border: 2px solid #0EA5E9; background: #F0F9FF; margin: 10px 0; }
  table.summary td { border: 0; padding: 8px 14px; vertical-align: middle; }
  .average-label { font-size: 9px; color: #0369A1; text-transform: uppercase; letter-spacing: 0.5px; }
  .average-value { font-size: 20px; font-weight: bold; color: #1E40AF; margin-top: 2px; }
  .rank-value { font-size: 16px; font-weight: bold; color: #1E40AF; }
  .decision-box { border: 2px solid #0EA5E9; background: #F0F9FF; border-radius: 4px; padding: 10px; margin: 10px 0; text-align: center; }
  .decision-label { font-size: 9px; color: #0369A1; text-transform: uppercase; }
  .decision-text { font-size: 14px; font-weight: bold; color: #1E40AF; margin-top: 4px; }
  table.info { width: 100%; border-collapse: collapse; border: 1px solid #D1D5DB; margin-bottom: 8px; }
  table.info td { padding: 5px 10px; font-size: 9.5px; border: 0; }
  .appreciation-text { font-size: 10px; line-height: 1.5; color: #374151; font-style: italic; min-height: 28px; padding: 8px; border: 1px solid #D1D5DB; border-radius: 4px; }
  table.sign { width: 100%; border-collapse: collapse; margin-top: 14px; page-break-inside: avoid; }
  table.sign td { width: 33%; text-align: center; vertical-align: bottom; padding: 0 8px; border: 0; height: 80px; }
  .signature-line { border-top: 1px solid #1F2937; margin-top: 4px; padding-top: 3px; font-size: 8.5px; color: #4B5563; font-style: italic; }
  .footer { text-align: center; font-size: 7.5px; color: #6B7280; margin-top: 12px; padding-top: 6px; border-top: 1px solid #E5E7EB; }
</style>
</head>
<body>

<table class="head">
  <tr>
    <td class="head-left">
      <div>MinistÃ¨re de l'Ã‰ducation Nationale</div>
      ${academyLine}
      ${capLine}
    </td>
    <td class="head-center">${logoHTML}</td>
    <td class="head-right">
      <div class="republic">RÃ©publique du Mali</div>
      <div class="devise">Un Peuple â€“ Un But â€“ Une Foi</div>
    </td>
  </tr>
</table>

<div class="school-block">
  <div class="school-name">${escapeHtml(data.schoolName)}</div>
  ${data.schoolAddress ? `<div class="school-info">${escapeHtml(data.schoolAddress)}</div>` : ""}
  ${data.schoolPhone ? `<div class="school-info">TÃ©l : ${escapeHtml(data.schoolPhone)}</div>` : ""}
  ${data.schoolMotto ? `<div class="school-motto">Â« ${escapeHtml(data.schoolMotto)} Â»</div>` : ""}
</div>

<div class="title-block">
  <div class="title">BULLETIN ANNUEL</div>
  <div class="subtitle">AnnÃ©e scolaire ${escapeHtml(data.academicYear)} â€” DÃ©cision de passage</div>
</div>

<table class="student">
  <tr>
    <td><span class="lbl">Ã‰lÃ¨ve : </span><span class="val">${escapeHtml(data.studentName)}</span></td>
    <td><span class="lbl">Classe : </span><span class="val">${escapeHtml(data.className)}</span></td>
  </tr>
  <tr>
    <td><span class="lbl">Matricule : </span><span class="val" style="font-family:monospace;">${escapeHtml(data.studentMatricule)}</span></td>
    <td><span class="lbl">Effectif : </span><span class="val">${escapeHtml(String(data.classSize))} Ã©lÃ¨ves</span></td>
  </tr>
  <tr>
    <td><span class="lbl">Sexe : </span><span class="val">${genderLabel(data.studentGender)}</span></td>
    <td><span class="lbl">NÃ©(e) le : </span><span class="val">${formatDate(data.studentBirthDate)}${data.studentBirthPlace ? ` Ã  ${escapeHtml(data.studentBirthPlace)}` : ""}</span></td>
  </tr>
</table>

<div class="section-title">${periodsTitle}</div>
<table class="notes">
  <thead>
    <tr>
      <th class="l" style="width:50%;">PÃ©riode</th>
      <th style="width:30%;">Moyenne /${scale}</th>
      ${data.cycle === "DEUXIEME_CYCLE" ? '<th style="width:20%;">Rang</th>' : ""}
    </tr>
  </thead>
  <tbody>
    ${periodsHTML}
    <tr class="total-row">
      <td class="l"><strong>TOTAL</strong></td>
      <td class="c strong">${fmt(data.annualSum)} / ${(data.cycle === "PREMIER_CYCLE" ? (data.compositions?.length ?? 9) : 3) * scale}</td>
      ${data.cycle === "DEUXIEME_CYCLE" ? '<td class="c">â€”</td>' : ""}
    </tr>
  </tbody>
</table>

<table class="summary">
  <tr>
    <td>
      <div class="average-label">Moyenne annuelle</div>
      <div class="average-value">${fmt(data.annualAverage)} / ${scale}</div>
    </td>
    <td style="text-align:right;">
      <div class="average-label">Rang</div>
      <div class="rank-value">${ordinal(data.rank)}${data.classSize ? ` sur ${escapeHtml(String(data.classSize))} Ã©lÃ¨ves` : ""}</div>
    </td>
  </tr>
</table>

<table class="info">
  <tr>
    <td><span class="lbl">Absences : </span><span class="val">${escapeHtml(String(data.absencesCount || 0))}</span></td>
    <td><span class="lbl">Retards : </span><span class="val">${escapeHtml(String(data.latesCount || 0))}</span></td>
  </tr>
</table>

<div class="decision-box">
  <div class="decision-label">DÃ©cision annuelle</div>
  <div class="decision-text">${escapeHtml(decisionLabel)}</div>
</div>

<div class="section-title">ApprÃ©ciation gÃ©nÃ©rale</div>
<div class="appreciation-text">
  ${data.appreciation ? escapeMultiline(data.appreciation) : "<em style='color:#6B7280;'>Aucune apprÃ©ciation saisie</em>"}
</div>

<table class="sign">
  <tr>
    <td><div class="signature-line">Le MaÃ®tre ou la MaÃ®tresse / Le Titulaire de classe</div></td>
    <td>${stamp ? `<img src="${stamp}" alt="Cachet" style="height:70px;object-fit:contain;" />` : ""}<div class="signature-line">Le Directeur / La Directrice</div></td>
    <td><div class="signature-line">Visa du parent ou tuteur</div></td>
  </tr>
</table>

<div class="footer">
  Document gÃ©nÃ©rÃ© par SIS-MALI le ${formatDate(new Date().toISOString())}
</div>

</body>
</html>`;
}

export const __test = { buildAnnualHTML };