import { PdfGeneratorService } from "../../common/pdf";

/**
 * BLOC B â€” Generation PDF des cartes scolaires.
 *
 * Format A4 : 8 cartes par page (2 colonnes x 4 lignes), format PVC 85.6 x 54 mm.
 * Chaque carte porte un QR code pointant vers /v/{shortCode}/{token}.
 */

export interface IdCardData {
  schoolName: string;
  schoolSigle?: string | null;
  schoolLogoBase64?: string | null;
  schoolAddress?: string | null;
  schoolPhone?: string | null;
  schoolMotto?: string | null;
  academicYearLabel: string;
  student: {
    id: string;
    matricule: string;
    firstName: string;
    lastName: string;
    gender: string;
    birthDate: Date;
    className: string;
    photoUrl?: string | null;
  };
  qrDataUrl: string; // QR deja encode en data URL
  verifyUrl: string;
}

export interface IdCardBatchOptions {
  format: "A4" | "PVC";
  includeVerso: boolean;
}

/** Genere le HTML d'une carte (recto). */
function buildCardRecto(data: IdCardData): string {
  const photo = data.student.photoUrl
    ? `<img src="${data.student.photoUrl}" class="photo" alt="" />`
    : `<div class="photo photo-empty"><span>${data.student.firstName[0] || "?"}${data.student.lastName[0] || "?"}</span></div>`;

  return `
    <div class="card">
      <div class="card-header">
        <div class="logo">${data.schoolLogoBase64 ? `<img src="${data.schoolLogoBase64}" alt="" />` : `<span>${data.schoolSigle || "SIS"}</span>`}</div>
        <div class="school">
          <div class="school-name">${escapeHtml(data.schoolName)}</div>
          <div class="school-motto">${escapeHtml(data.schoolMotto || "")}</div>
        </div>
      </div>
      <div class="card-body">
        <div class="photo-wrap">${photo}</div>
        <div class="info">
          <div class="name">${escapeHtml(data.student.lastName.toUpperCase())}</div>
          <div class="firstname">${escapeHtml(data.student.firstName)}</div>
          <div class="field"><span>Matricule</span><strong>${escapeHtml(data.student.matricule)}</strong></div>
          <div class="field"><span>Classe</span><strong>${escapeHtml(data.student.className)}</strong></div>
          <div class="field"><span>Ne(e) le</span><strong>${formatDate(data.student.birthDate)}</strong></div>
        </div>
        <div class="qr-wrap">
          <img src="${data.qrDataUrl}" class="qr" alt="" />
          <div class="qr-label">Verifier</div>
        </div>
      </div>
      <div class="card-footer">
        <span>Annee ${escapeHtml(data.academicYearLabel)}</span>
        <span>Carte scolaire</span>
      </div>
    </div>
  `;
}

/** Genere le HTML du verso (reglement + contacts). */
function buildCardVerso(data: IdCardData): string {
  return `
    <div class="card verso">
      <div class="card-header">
        <div class="school">
          <div class="school-name">${escapeHtml(data.schoolName)}</div>
          <div class="school-motto">Annee ${escapeHtml(data.academicYearLabel)}</div>
        </div>
      </div>
      <div class="card-body-verso">
        <div class="verso-title">Reglement interieur</div>
        <ul class="verso-list">
          <li>Cette carte est personnelle et non transferable.</li>
          <li>Elle doit etre presentee a toute demande.</li>
          <li>En cas de perte, prevenir le secretariat.</li>
        </ul>
        <div class="verso-contacts">
          <div class="contact-line"><span>Adresse</span><strong>${escapeHtml(data.schoolAddress || "-")}</strong></div>
          <div class="contact-line"><span>Telephone</span><strong>${escapeHtml(data.schoolPhone || "-")}</strong></div>
        </div>
      </div>
      <div class="card-footer">
        <span>${escapeHtml(data.verifyUrl)}</span>
      </div>
    </div>
  `;
}

/** Genere le HTML complet de toutes les cartes. */
export function buildIdCardsHTML(
  cards: IdCardData[],
  options: IdCardBatchOptions,
): string {
  const pageFormat = options.format === "PVC" ? "PVC" : "A4";
  const cardsHtml = cards
    .map((c) => {
      const recto = buildCardRecto(c);
      if (!options.includeVerso) return recto;
      // Recto + Verso : on alterne les pages (impression recto-verso)
      return recto + buildCardVerso(c);
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<style>
  @page { size: ${pageFormat}; margin: 8mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; }

  .grid {
    display: grid;
    grid-template-columns: repeat(2, 85.6mm);
    grid-template-rows: repeat(4, 54mm);
    gap: 4mm;
    justify-content: center;
  }

  .card {
    width: 85.6mm;
    height: 54mm;
    border: 1px solid #cbd5e1;
    border-radius: 3mm;
    overflow: hidden;
    background: #ffffff;
    display: flex;
    flex-direction: column;
    page-break-inside: avoid;
    break-inside: avoid;
    position: relative;
  }

  .card-header {
    background: #1e40af;
    color: #ffffff;
    padding: 1.5mm 2mm;
    display: flex;
    align-items: center;
    gap: 2mm;
  }

  .logo {
    width: 8mm;
    height: 8mm;
    background: #ffffff;
    border-radius: 1mm;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    color: #1e40af;
    font-size: 8pt;
    flex-shrink: 0;
  }
  .logo img { max-width: 100%; max-height: 100%; }

  .school { flex: 1; min-width: 0; }
  .school-name { font-size: 9pt; font-weight: 700; line-height: 1.1; }
  .school-motto { font-size: 6pt; opacity: 0.85; font-style: italic; }

  .card-body {
    flex: 1;
    display: flex;
    gap: 2mm;
    padding: 2mm;
    align-items: center;
  }

  .photo-wrap { flex-shrink: 0; }
  .photo {
    width: 16mm;
    height: 21mm;
    object-fit: cover;
    border: 0.5mm solid #1e40af;
    border-radius: 1mm;
  }
  .photo-empty {
    background: #f1f5f9;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    color: #64748b;
    font-size: 14pt;
  }

  .info { flex: 1; min-width: 0; font-size: 6.5pt; line-height: 1.3; }
  .name { font-size: 8pt; font-weight: 700; color: #0f172a; }
  .firstname { font-size: 7pt; margin-bottom: 1mm; }
  .field { display: flex; justify-content: space-between; gap: 1mm; }
  .field span { color: #64748b; }
  .field strong { color: #0f172a; font-weight: 600; }

  .qr-wrap { flex-shrink: 0; display: flex; flex-direction: column; align-items: center; }
  .qr { width: 14mm; height: 14mm; }
  .qr-label { font-size: 5.5pt; color: #64748b; margin-top: 0.5mm; }

  .card-footer {
    background: #f1f5f9;
    padding: 1mm 2mm;
    display: flex;
    justify-content: space-between;
    font-size: 5.5pt;
    color: #475569;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  /* Verso */
  .verso { page-break-before: always; }
  .card-body-verso { flex: 1; padding: 2mm 3mm; font-size: 6pt; }
  .verso-title { font-weight: 700; margin-bottom: 1mm; color: #1e40af; text-transform: uppercase; }
  .verso-list { list-style: disc; padding-left: 3mm; margin-bottom: 2mm; line-height: 1.4; }
  .verso-list li { margin-bottom: 0.5mm; }
  .contact-line { display: flex; justify-content: space-between; gap: 1mm; }
  .contact-line span { color: #64748b; }
</style>
</head>
<body>
  <div class="grid">
    ${cardsHtml}
  </div>
</body>
</html>`;
}

/** Genere un PDF de cartes via Playwright. */
export async function generateIdCardsPDF(
  cards: IdCardData[],
  options: IdCardBatchOptions = { format: "A4", includeVerso: false },
  pdfGenerator: PdfGeneratorService,
): Promise<Buffer> {
  const html = buildIdCardsHTML(cards, options);
  return pdfGenerator.generateFromHtml(html, {
    format: "A4",
    printBackground: true,
    margin: { top: "8mm", right: "8mm", bottom: "8mm", left: "8mm" },
  });
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(d: Date): string {
  const dt = new Date(d);
  const day = String(dt.getDate()).padStart(2, "0");
  const month = String(dt.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${dt.getFullYear()}`;
}