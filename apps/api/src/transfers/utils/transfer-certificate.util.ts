import { PdfGeneratorService } from "../../common/pdf";
import QRCode from "qrcode";

interface TransferCertificateData {
  // Élève
  studentName: string;
  studentMatricule: string;
  studentGender: string;
  studentBirthDate: Date;
  studentBirthPlace?: string | null;
  // École
  schoolName: string;
  schoolAddress?: string | null;
  schoolPhone?: string | null;
  schoolLogoUrl?: string | null;
  schoolDirector?: string | null;
  schoolMotto?: string | null;
  // Transfert
  transferType: "IN" | "OUT";
  fromSchool?: string | null;
  toSchool?: string | null;
  reason: string;
  reasonDetails?: string | null;
  effectiveDate: Date;
  previousMatricule?: string | null;
  previousClassLevel?: string | null;
  previousAverage?: number | null;
  decision?: string | null;
  // Vérification
  verificationCode: string;
  verifyUrl: string;
  issuedAt: Date;
}

const REASON_LABELS: Record<string, string> = {
  DEMENAGEMENT: "Demenagement de la famille",
  PASSAGE: "Passage en classe superieure dans un autre etablissement",
  DISCIPLINE: "Raison disciplinaire",
  FAMILIALE: "Raison familiale",
  AUTRE: "Autre raison",
};

export async function generateTransferCertificate(
  data: TransferCertificateData,
  pdfGenerator: PdfGeneratorService,
): Promise<Buffer> {
  // 1. Generer le QR code
  const qrDataUrl = await QRCode.toDataURL(data.verifyUrl, {
    width: 200,
    margin: 1,
    color: { dark: "#1E40AF", light: "#FFFFFF" },
  });

  // 2. Construire le HTML
  const html = buildCertificateHTML(data, qrDataUrl);

  // 3. Generer le PDF via Playwright
  return pdfGenerator.generateFromHtml(html, {
    format: "A4",
    printBackground: true,
    margin: { top: "10mm", right: "12mm", bottom: "12mm", left: "12mm" },
  });
}

function buildCertificateHTML(
  data: TransferCertificateData,
  qrDataUrl: string,
): string {
  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

  const isOutbound = data.transferType === "OUT";
  const title = isOutbound
    ? "CERTIFICAT DE TRANSFERT"
    : "ATTESTATION DE TRANSFERT ENTRANT";

  const logoHTML = data.schoolLogoUrl
    ? `<img src="${data.schoolLogoUrl}" alt="Logo" style="width: 70px; height: 70px; object-fit: contain;" />`
    : `<div style="width: 70px; height: 70px; background: #1E40AF; color: white; display: flex; align-items: center; justify-content: center; border-radius: 8px; font-size: 28px; font-weight: bold;">S</div>`;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 11px; color: #1F2937; line-height: 1.5; }

          .header { display: flex; align-items: center; gap: 15px; padding-bottom: 12px; border-bottom: 3px double #1E40AF; margin-bottom: 20px; }
          .header-info { flex: 1; }
          .school-name { font-size: 16px; font-weight: bold; color: #1E40AF; text-transform: uppercase; }
          .school-info { font-size: 9px; color: #6B7280; margin-top: 2px; }
          .school-motto { font-size: 9px; font-style: italic; color: #6B7280; margin-top: 2px; }

          .title-block { text-align: center; margin: 25px 0; }
          .title { font-size: 20px; font-weight: bold; color: #1E40AF; letter-spacing: 1px; }
          .subtitle { font-size: 11px; color: #6B7280; margin-top: 5px; }
          .ref-number { font-size: 10px; color: #9CA3AF; margin-top: 8px; font-family: monospace; }

          .qr-block { position: absolute; top: 30px; right: 12mm; text-align: center; }
          .qr-code { width: 100px; height: 100px; border: 2px solid #1E40AF; border-radius: 8px; padding: 3px; }
          .qr-label { font-size: 8px; color: #6B7280; margin-top: 4px; }
          .qr-code-value { font-size: 9px; font-family: monospace; font-weight: bold; color: #1E40AF; margin-top: 2px; }

          .content { position: relative; }

          .section { margin-bottom: 20px; }
          .section-title { font-size: 12px; font-weight: bold; color: #1E40AF; padding: 5px 0; border-bottom: 1px solid #E5E7EB; margin-bottom: 10px; }

          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 20px; }
          .info-item { display: flex; flex-direction: column; }
          .info-label { font-size: 9px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.3px; }
          .info-value { font-size: 11px; font-weight: 600; color: #1F2937; margin-top: 2px; }

          .statement { background: #F9FAFB; border-left: 4px solid #1E40AF; padding: 12px 15px; margin: 15px 0; font-size: 11px; line-height: 1.6; text-align: justify; }

          .decision-box { background: #FEF3C7; border: 1px solid #F59E0B; border-radius: 6px; padding: 12px; margin: 15px 0; }
          .decision-label { font-size: 9px; color: #92400E; text-transform: uppercase; }
          .decision-value { font-size: 14px; font-weight: bold; color: #78350F; margin-top: 3px; }

          .signature-block { display: flex; justify-content: space-between; margin-top: 50px; padding-top: 20px; }
          .signature-item { text-align: center; width: 45%; }
          .signature-line { border-top: 1px solid #1F2937; margin-bottom: 5px; padding-top: 5px; }
          .signature-label { font-size: 9px; color: #6B7280; }

          .footer { text-align: center; margin-top: 30px; padding-top: 10px; border-top: 1px solid #E5E7EB; font-size: 8px; color: #9CA3AF; }
          .verify-note { background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 4px; padding: 8px; margin-top: 15px; font-size: 9px; color: #1E40AF; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          ${logoHTML}
          <div class="header-info">
            <div class="school-name">${escapeHtml(data.schoolName)}</div>
            ${data.schoolAddress ? `<div class="school-info">${escapeHtml(data.schoolAddress)}</div>` : ""}
            ${data.schoolPhone ? `<div class="school-info">Tel: ${escapeHtml(data.schoolPhone)}</div>` : ""}
            ${data.schoolMotto ? `<div class="school-motto">"${escapeHtml(data.schoolMotto)}"</div>` : ""}
          </div>
        </div>

        <div class="content">
          <div class="qr-block">
            <img class="qr-code" src="${qrDataUrl}" alt="QR Code" />
            <div class="qr-label">Verification</div>
            <div class="qr-code-value">${escapeHtml(data.verificationCode)}</div>
          </div>

          <div class="title-block">
            <div class="title">${title}</div>
            <div class="subtitle">Delivre le ${formatDate(data.issuedAt)}</div>
            <div class="ref-number">Reference: ${escapeHtml(data.verificationCode)}</div>
          </div>

          <!-- IDENTIFICATION DE L'ELEVE -->
          <div class="section">
            <div class="section-title">IDENTIFICATION DE L ELEVE</div>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Nom et prenom</span>
                <span class="info-value">${escapeHtml(data.studentName)}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Matricule</span>
                <span class="info-value" style="font-family: monospace;">${escapeHtml(data.studentMatricule)}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Sexe</span>
                <span class="info-value">${data.studentGender === "M" ? "Masculin" : "Feminin"}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Date de naissance</span>
                <span class="info-value">${formatDate(data.studentBirthDate)}</span>
              </div>
              ${data.studentBirthPlace ? `
              <div class="info-item">
                <span class="info-label">Lieu de naissance</span>
                <span class="info-value">${escapeHtml(data.studentBirthPlace)}</span>
              </div>` : ""}
              ${data.previousClassLevel ? `
              <div class="info-item">
                <span class="info-label">Classe</span>
                <span class="info-value">${escapeHtml(data.previousClassLevel)}</span>
              </div>` : ""}
            </div>
          </div>

          <!-- SCOLARITE -->
          ${data.previousAverage !== null && data.previousAverage !== undefined ? `
          <div class="section">
            <div class="section-title">RESULTATS SCOLAIRES</div>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Moyenne annuelle</span>
                <span class="info-value">${Number(data.previousAverage).toFixed(2)} / 20</span>
              </div>
            </div>
          </div>` : ""}

          <!-- DECISION -->
          ${data.decision ? `
          <div class="decision-box">
            <div class="decision-label">Decision du conseil de classe</div>
            <div class="decision-value">${escapeHtml(data.decision)}</div>
          </div>` : ""}

          <!-- DETAILS DU TRANSFERT -->
          <div class="section">
            <div class="section-title">${isOutbound ? "ETABLISSEMENT DE DESTINATION" : "ETABLISSEMENT D ORIGINE"}</div>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">${isOutbound ? "Ecole d accueil" : "Ecole quittee"}</span>
                <span class="info-value">${escapeHtml(isOutbound ? data.toSchool || "—" : data.fromSchool || "—")}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Date effective</span>
                <span class="info-value">${formatDate(data.effectiveDate)}</span>
              </div>
              ${data.previousMatricule && data.previousMatricule !== data.studentMatricule ? `
              <div class="info-item">
                <span class="info-label">Matricule precedent</span>
                <span class="info-value" style="font-family: monospace;">${escapeHtml(data.previousMatricule)}</span>
              </div>` : ""}
              <div class="info-item">
                <span class="info-label">Motif</span>
                <span class="info-value">${REASON_LABELS[data.reason] || data.reason}</span>
              </div>
            </div>
            ${data.reasonDetails ? `
            <div style="margin-top: 10px;">
              <div class="info-label">Details</div>
              <div style="font-size: 10px; color: #4B5563; margin-top: 3px;">${escapeHtml(data.reasonDetails)}</div>
            </div>` : ""}
          </div>

          <!-- DECLARATION -->
          <div class="statement">
            Nous, soussigne(e) <strong>${escapeHtml(data.schoolDirector || "Le Directeur")}</strong>,
            Directeur de <strong>${escapeHtml(data.schoolName)}</strong>,
            certifions que l eleve(e) <strong>${escapeHtml(data.studentName)}</strong>,
            ne(e) le <strong>${formatDate(data.studentBirthDate)}</strong>
            ${data.studentBirthPlace ? `a <strong>${escapeHtml(data.studentBirthPlace)}</strong>` : ""},
            immatricule(e) sous le numero <strong>${escapeHtml(data.studentMatricule)}</strong>,
            est regulierement ${isOutbound ? "inscrit(e) dans notre etablissement et le quitte" : "admis(e) dans notre etablissement"}
            a la date du <strong>${formatDate(data.effectiveDate)}</strong>.
          </div>

          <!-- SIGNATURES -->
          <div class="signature-block">
            <div class="signature-item">
              <div class="signature-line"></div>
              <div class="signature-label">Le Directeur</div>
              <div style="font-size: 10px; margin-top: 3px; font-weight: 600;">${escapeHtml(data.schoolDirector || "________________")}</div>
            </div>
            <div class="signature-item">
              <div class="signature-line"></div>
              <div class="signature-label">Cachet de l etablissement</div>
            </div>
          </div>

          <!-- VERIFICATION -->
          <div class="verify-note">
            Pour verifier l authenticite de ce document, rendez-vous sur :<br/>
            <strong>${escapeHtml(data.verifyUrl)}</strong>
          </div>
        </div>

        <div class="footer">
          Document genere automatiquement par SIS-MALI le ${formatDate(data.issuedAt)} — Toute reproduction non autorisee est interdite.
        </div>
      </body>
    </html>
  `;
}

function escapeHtml(text: string): string {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}