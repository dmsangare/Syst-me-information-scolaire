import { PdfGeneratorService } from "../../common/pdf";
import * as ExcelJS from "exceljs";

interface GradeRow {
  index: number;
  matricule: string;
  firstName: string;
  lastName: string;
  gender: string;
  value: number | null;
  isAbsent: boolean;
  observation: string | null;
  rank: number | null;
}

interface AssessmentExportData {
  schoolName: string;
  schoolAddress?: string | null;
  schoolPhone?: string | null;
  schoolLogoUrl?: string | null;
  className: string;
  subjectName: string;
  termName: string;
  assessmentTitle: string;
  assessmentType: string;
  assessmentDate: string;
  maxScore: number;
  coefficient: number;
  teacherName?: string | null;
  academicYear: string;
  grades: GradeRow[];
  stats: {
    count: number;
    total: number;
    average: number;
    min: number;
    max: number;
  };
}

// ============================================================
// PDF
// ============================================================
export async function generateAssessmentPDF(
  data: AssessmentExportData,
  pdfGenerator: PdfGeneratorService,
): Promise<Buffer> {
  const html = buildHTML(data);
  return pdfGenerator.generateFromHtml(html, {
    format: "A4",
    printBackground: true,
    margin: { top: "10mm", right: "10mm", bottom: "12mm", left: "10mm" },
  });
}

function buildHTML(data: AssessmentExportData): string {
  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

  const isFirstCycle = data.maxScore === 10;
  const averageOn20 = isFirstCycle ? data.stats.average * 2 : data.stats.average;

  const rowsHTML = data.grades
    .map((g) => {
      const note = g.isAbsent
        ? '<span style="color:#F59E0B;font-weight:600">ABSENT</span>'
        : g.value !== null
          ? `<strong>${g.value.toFixed(2)}</strong>`
          : '<span style="color:#9CA3AF">â€”</span>';

      const rank = g.rank
        ? g.rank === 1
          ? `<span style="color:#EAB308;font-weight:700">ðŸ¥‡ ${g.rank}</span>`
          : g.rank === 2
            ? `<span style="color:#6B7280;font-weight:700">ðŸ¥ˆ ${g.rank}</span>`
            : g.rank === 3
              ? `<span style="color:#EA580C;font-weight:700">ðŸ¥‰ ${g.rank}</span>`
              : g.rank
        : '<span style="color:#9CA3AF">â€”</span>';

      return `
        <tr>
          <td style="text-align:center">${g.index}</td>
          <td style="font-family:monospace;font-size:9px">${g.matricule}</td>
          <td>${g.lastName} ${g.firstName}</td>
          <td style="text-align:center">${g.gender === "M" ? "M" : "F"}</td>
          <td style="text-align:center;font-size:13px">${note}</td>
          <td style="text-align:center">${rank}</td>
          <td style="font-size:9px;color:#6B7280">${g.observation || "â€”"}</td>
        </tr>
      `;
    })
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 10px; color: #1F2937; line-height: 1.4; padding: 0; }

  .header { display: flex; align-items: center; gap: 12px; padding-bottom: 10px; border-bottom: 2px solid #1E40AF; margin-bottom: 15px; }
  .header-info { flex: 1; }
  .school-name { font-size: 14px; font-weight: bold; color: #1E40AF; text-transform: uppercase; }
  .school-info { font-size: 9px; color: #6B7280; margin-top: 2px; }

  .title-block { text-align: center; margin: 15px 0; }
  .title { font-size: 16px; font-weight: bold; color: #1E40AF; letter-spacing: 0.5px; }
  .subtitle { font-size: 11px; color: #4B5563; margin-top: 3px; }

  .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 12px; padding: 10px; background: #F9FAFB; border-radius: 4px; }
  .info-item { display: flex; flex-direction: column; }
  .info-label { font-size: 8px; color: #6B7280; text-transform: uppercase; }
  .info-value { font-size: 11px; font-weight: 600; margin-top: 1px; }

  .stats-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px; margin-bottom: 15px; }
  .stat-card { padding: 8px; border: 1px solid #E5E7EB; border-radius: 4px; text-align: center; }
  .stat-label { font-size: 8px; color: #6B7280; text-transform: uppercase; }
  .stat-value { font-size: 14px; font-weight: bold; color: #1E40AF; margin-top: 2px; }

  table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
  th { background: #1E40AF; color: white; padding: 6px 4px; font-size: 9px; text-align: left; font-weight: 600; }
  td { padding: 5px 4px; border-bottom: 1px solid #E5E7EB; font-size: 10px; }
  tr:nth-child(even) { background: #F9FAFB; }

  .footer { text-align: center; font-size: 8px; color: #9CA3AF; margin-top: 15px; padding-top: 8px; border-top: 1px solid #E5E7EB; }

  .signature-block { display: flex; justify-content: space-between; margin-top: 25px; padding-top: 15px; }
  .signature-item { text-align: center; width: 40%; }
  .signature-line { border-top: 1px solid #1F2937; margin-bottom: 3px; padding-top: 3px; }
  .signature-label { font-size: 8px; color: #6B7280; }
</style>
</head>
<body>

<div class="header">
  <div style="width:50px;height:50px;background:#1E40AF;color:white;display:flex;align-items:center;justify-content:center;border-radius:6px;font-size:20px;font-weight:bold;">S</div>
  <div class="header-info">
    <div class="school-name">${data.schoolName}</div>
    ${data.schoolAddress ? `<div class="school-info">${data.schoolAddress}</div>` : ""}
    ${data.schoolPhone ? `<div class="school-info">Tel: ${data.schoolPhone}</div>` : ""}
  </div>
</div>

<div class="title-block">
  <div class="title">FICHE DE NOTES â€” ${data.assessmentTitle.toUpperCase()}</div>
  <div class="subtitle">${data.assessmentType} Â· ${formatDate(data.assessmentDate)}</div>
</div>

<div class="info-grid">
  <div class="info-item">
    <span class="info-label">Classe</span>
    <span class="info-value">${data.className}</span>
  </div>
  <div class="info-item">
    <span class="info-label">Matiere</span>
    <span class="info-value">${data.subjectName}</span>
  </div>
  <div class="info-item">
    <span class="info-label">Trimestre</span>
    <span class="info-value">${data.termName}</span>
  </div>
  <div class="info-item">
    <span class="info-label">Bareme</span>
    <span class="info-value">/${data.maxScore}</span>
  </div>
  <div class="info-item">
    <span class="info-label">Coefficient</span>
    <span class="info-value">${data.coefficient}</span>
  </div>
  <div class="info-item">
    <span class="info-label">Enseignant</span>
    <span class="info-value">${data.teacherName || "â€”"}</span>
  </div>
</div>

<div class="stats-grid">
  <div class="stat-card">
    <div class="stat-label">Notes saisies</div>
    <div class="stat-value">${data.stats.count}/${data.stats.total}</div>
  </div>
  <div class="stat-card">
    <div class="stat-label">Moyenne classe</div>
    <div class="stat-value">${data.stats.average.toFixed(2)}</div>
    <div style="font-size:8px;color:#6B7280;">${isFirstCycle ? `(${averageOn20.toFixed(2)}/20)` : ""}</div>
  </div>
  <div class="stat-card">
    <div class="stat-label">Note min</div>
    <div class="stat-value">${data.stats.min.toFixed(1)}</div>
  </div>
  <div class="stat-card">
    <div class="stat-label">Note max</div>
    <div class="stat-value">${data.stats.max.toFixed(1)}</div>
  </div>
</div>

<table>
  <thead>
    <tr>
      <th style="width:30px;text-align:center">NÂ°</th>
      <th style="width:90px">Matricule</th>
      <th>Nom & Prenom</th>
      <th style="width:30px;text-align:center">Sexe</th>
      <th style="width:70px;text-align:center">Note /${data.maxScore}</th>
      <th style="width:50px;text-align:center">Rang</th>
      <th style="width:130px">Observation</th>
    </tr>
  </thead>
  <tbody>
    ${rowsHTML}
  </tbody>
</table>

<div class="signature-block">
  <div class="signature-item">
    <div class="signature-line"></div>
    <div class="signature-label">L'Enseignant</div>
  </div>
  <div class="signature-item">
    <div class="signature-line"></div>
    <div class="signature-label">Le Directeur</div>
  </div>
</div>

<div class="footer">
  Document genere automatiquement par SIS-MALI le ${formatDate(new Date().toISOString())} â€” Annee scolaire ${data.academicYear}
</div>

</body>
</html>`;
}

// ============================================================
// EXCEL
// ============================================================
export async function generateAssessmentExcel(
  data: AssessmentExportData,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SIS-MALI";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Notes", {
    pageSetup: { paperSize: 9, orientation: "portrait" },
  });

  // Largeurs de colonnes
  sheet.columns = [
    { header: "NÂ°", key: "index", width: 6 },
    { header: "Matricule", key: "matricule", width: 18 },
    { header: "Nom & PrÃ©nom", key: "name", width: 30 },
    { header: "Sexe", key: "gender", width: 8 },
    { header: `Note /${data.maxScore}`, key: "value", width: 12 },
    { header: "Rang", key: "rank", width: 8 },
    { header: "Observation", key: "observation", width: 30 },
  ];

  // Titre
  sheet.mergeCells("A1:G1");
  const titleCell = sheet.getCell("A1");
  titleCell.value = `FICHE DE NOTES â€” ${data.assessmentTitle}`;
  titleCell.font = { size: 14, bold: true, color: { argb: "FF1E40AF" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFF6FF" } };
  sheet.getRow(1).height = 25;

  // Sous-titre
  sheet.mergeCells("A2:G2");
  const subCell = sheet.getCell("A2");
  subCell.value = `${data.schoolName} Â· ${data.className} Â· ${data.subjectName} Â· ${data.termName} Â· ${data.assessmentDate}`;
  subCell.font = { size: 10, italic: true, color: { argb: "FF6B7280" } };
  subCell.alignment = { horizontal: "center" };

  // Ligne vide
  sheet.addRow([]);

  // En-tÃªtes
  const headerRow = sheet.addRow([
    "NÂ°",
    "Matricule",
    "Nom & PrÃ©nom",
    "Sexe",
    `Note /${data.maxScore}`,
    "Rang",
    "Observation",
  ]);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E40AF" } };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height = 22;

  // Donnees
  data.grades.forEach((g) => {
    const row = sheet.addRow({
      index: g.index,
      matricule: g.matricule,
      name: `${g.lastName} ${g.firstName}`,
      gender: g.gender,
      value: g.isAbsent ? "ABSENT" : g.value !== null ? g.value : "â€”",
      rank: g.rank || "â€”",
      observation: g.observation || "",
    });

    if (g.isAbsent) {
      row.font = { color: { argb: "FFF59E0B" }, bold: true };
    }

    row.alignment = { vertical: "middle" };
    row.getCell("index").alignment = { horizontal: "center" };
    row.getCell("value").alignment = { horizontal: "center" };
    row.getCell("rank").alignment = { horizontal: "center" };
    row.getCell("gender").alignment = { horizontal: "center" };
  });

  // Ligne vide
  sheet.addRow([]);

  // Stats
  sheet.addRow([`Notes saisies :`, `${data.stats.count}/${data.stats.total}`]);
  sheet.addRow([`Moyenne classe :`, data.stats.average.toFixed(2)]);
  sheet.addRow([`Note minimale :`, data.stats.min.toFixed(1)]);
  sheet.addRow([`Note maximale :`, data.stats.max.toFixed(1)]);

  // Pied de page
  sheet.addRow([]);
  const footerCell = sheet.addRow([
    `Document genere par SIS-MALI Â· ${new Date().toLocaleDateString("fr-FR")}`,
  ]);
  footerCell.font = { size: 9, italic: true, color: { argb: "FF9CA3AF" } };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// ============================================================
// CSV
// ============================================================
export function generateAssessmentCSV(data: AssessmentExportData): string {
  const sep = ";";

  const escape = (v: any) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    if (s.includes(sep) || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const lines: string[] = [];

  // Entete
  lines.push(
    [
      "NÂ°",
      "Matricule",
      "Nom & Prenom",
      "Sexe",
      `Note /${data.maxScore}`,
      "Rang",
      "Observation",
    ]
      .map(escape)
      .join(sep),
  );

  // Donnees
  data.grades.forEach((g) => {
    lines.push(
      [
        g.index,
        g.matricule,
        `${g.lastName} ${g.firstName}`,
        g.gender,
        g.isAbsent ? "ABSENT" : g.value !== null ? g.value.toFixed(2) : "",
        g.rank || "",
        g.observation || "",
      ]
        .map(escape)
        .join(sep),
    );
  });

  // Ligne vide
  lines.push("");

  // Stats
  lines.push([`Notes saisies`, `${data.stats.count}/${data.stats.total}`].map(escape).join(sep));
  lines.push([`Moyenne classe`, data.stats.average.toFixed(2)].map(escape).join(sep));
  lines.push([`Note minimale`, data.stats.min.toFixed(1)].map(escape).join(sep));
  lines.push([`Note maximale`, data.stats.max.toFixed(1)].map(escape).join(sep));

  return lines.join("\n");
}