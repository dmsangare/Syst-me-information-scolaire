import { PdfGeneratorService } from "../../common/pdf";

interface ReceiptData {
  schoolName: string;
  schoolLogoBase64?: string | null;
  schoolStampBase64?: string | null;
  schoolAddress?: string | null;
  schoolPhone?: string | null;
  schoolMotto?: string | null;
  receiptNumber: string;
  issuedAt: Date;
  studentName: string;
  studentMatricule: string;
  studentClass?: string | null;
  invoiceNumber: string;
  invoiceItems?: Array<{
    label: string;
    quantity: number;
    unitAmount: number;
    totalAmount: number;
  }> | null;
  invoiceTotal: number;
  invoicePaid: number;
  invoiceBalance: number;
  paymentAmount: number;
  paymentMethod: string;
  paymentReference?: string | null;
  cashierName?: string | null;
  verifyUrl?: string;
}

const METHOD_LABELS: Record<string, string> = {
  CASH: "Especes",
  MOBILE_MONEY: "Mobile Money",
  TRANSFER: "Virement bancaire",
  CHECK: "Cheque",
  OTHER: "Autre",
};

export async function generateReceiptPDF(
  data: ReceiptData,
  pdfGenerator: PdfGeneratorService,
): Promise<Buffer> {
  let qrDataUrl = "";
  try {
    const QRCode = await import("qrcode");
    if (data.verifyUrl) {
      qrDataUrl = await QRCode.toDataURL(data.verifyUrl, {
        width: 180, margin: 1,
        color: { dark: "#1E40AF", light: "#FFFFFF" },
      });
    }
  } catch {}

  const html = buildHTML(data, qrDataUrl);
  return pdfGenerator.generateFromHtml(html, {
    format: "A4",
    printBackground: true,
    margin: { top: "12mm", right: "12mm", bottom: "12mm", left: "12mm" },
  });
}

function fmtMoney(n: number): string {
  return `${Number(n).toLocaleString("fr-FR")} FCFA`;
}

function fmtDateTime(d: Date): string {
  return new Date(d).toLocaleString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function buildHTML(data: ReceiptData, qrDataUrl: string): string {
  const methodLabel = METHOD_LABELS[data.paymentMethod] || data.paymentMethod;
  const qrHTML = qrDataUrl
    ? `<div class="qr-block"><img src="${qrDataUrl}" class="qr-code" alt="QR"/><div class="qr-label">Verification</div><div class="qr-code-value">${data.receiptNumber}</div></div>`
    : "";

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: Helvetica, Arial, sans-serif; font-size: 11px; color: #1F2937; padding: 10px; }
.header { display: flex; align-items: center; gap: 15px; padding-bottom: 12px; border-bottom: 3px double #1E40AF; margin-bottom: 20px; position: relative; }
.logo { width: 60px; height: 60px; background: #1E40AF; color: white; display: flex; align-items: center; justify-content: center; border-radius: 8px; font-size: 24px; font-weight: bold; }
.logo-img { width: 60px; height: 60px; object-fit: contain; border-radius: 8px; }
.school-name { font-size: 16px; font-weight: bold; color: #1E40AF; text-transform: uppercase; }
.school-info { font-size: 9px; color: #6B7280; margin-top: 2px; }
.school-motto { font-size: 9px; font-style: italic; color: #6B7280; margin-top: 2px; }
.qr-block { position: absolute; top: 0; right: 0; text-align: center; }
.qr-code { width: 90px; height: 90px; border: 2px solid #1E40AF; border-radius: 6px; padding: 3px; }
.qr-label { font-size: 8px; color: #6B7280; margin-top: 3px; }
.qr-code-value { font-size: 8px; font-family: monospace; font-weight: bold; color: #1E40AF; }
.title-block { text-align: center; margin: 15px 0 25px; }
.title { font-size: 22px; font-weight: bold; color: #1E40AF; letter-spacing: 2px; }
.subtitle { font-size: 11px; color: #6B7280; margin-top: 5px; }
.receipt-number { font-size: 14px; font-family: monospace; font-weight: bold; color: #059669; margin-top: 8px; }
.info-box { background: #F0FDF4; border: 1px solid #86EFAC; border-radius: 6px; padding: 12px 15px; margin-bottom: 15px; }
.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 20px; }
.info-item { display: flex; gap: 6px; }
.info-label { font-size: 10px; color: #6B7280; min-width: 80px; }
.info-value { font-size: 11px; font-weight: 600; color: #1F2937; }
.amount-box { background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
.amount-label { font-size: 11px; opacity: 0.9; text-transform: uppercase; letter-spacing: 1px; }
.amount-value { font-size: 32px; font-weight: bold; margin-top: 5px; font-family: monospace; }
.details-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
.details-table td { padding: 8px 10px; border-bottom: 1px solid #E5E7EB; font-size: 11px; }
.details-table .label { color: #6B7280; width: 40%; }
.details-table .value { font-weight: 600; }
.balance-box { background: #FEF3C7; border: 2px solid #F59E0B; border-radius: 6px; padding: 12px 15px; margin: 15px 0; display: flex; justify-content: space-between; align-items: center; }
.balance-label { font-size: 11px; color: #92400E; font-weight: 600; text-transform: uppercase; }
.balance-value { font-size: 20px; font-weight: bold; color: #78350F; font-family: monospace; }
.signature-block { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 20px; }
.signature-item { text-align: center; width: 45%; }
.signature-line { border-top: 1px solid #1F2937; margin-bottom: 5px; padding-top: 30px; }
.signature-label { font-size: 9px; color: #6B7280; }
.footer { text-align: center; font-size: 8px; color: #9CA3AF; margin-top: 30px; padding-top: 10px; border-top: 1px solid #E5E7EB; font-style: italic; }
</style></head><body>
<div class="header">
  ${data.schoolLogoBase64 ? `<img src="${data.schoolLogoBase64}" class="logo-img" alt="Logo"/>` : `<div class="logo">${(data.schoolName || "S").charAt(0)}</div>`}
  <div>
    <div class="school-name">${data.schoolName}</div>
    ${data.schoolAddress ? `<div class="school-info">${data.schoolAddress}</div>` : ""}
    ${data.schoolPhone ? `<div class="school-info">Tel: ${data.schoolPhone}</div>` : ""}
    ${data.schoolMotto ? `<div class="school-motto">"${data.schoolMotto}"</div>` : ""}
  </div>
  ${qrHTML}
</div>
<div class="title-block">
  <div class="title">RECU DE PAIEMENT</div>
  <div class="subtitle">Emis le ${fmtDateTime(data.issuedAt)}</div>
  <div class="receipt-number">NÂ° ${data.receiptNumber}</div>
</div>
<div class="info-box">
  <div class="info-grid">
    <div class="info-item"><span class="info-label">Eleve :</span><span class="info-value">${data.studentName}</span></div>
    <div class="info-item"><span class="info-label">Matricule :</span><span class="info-value">${data.studentMatricule}</span></div>
    ${data.studentClass ? `<div class="info-item"><span class="info-label">Classe :</span><span class="info-value">${data.studentClass}</span></div>` : ""}
    <div class="info-item"><span class="info-label">Facture :</span><span class="info-value">${data.invoiceNumber}</span></div>
  </div>
</div>
<div class="amount-box">
  <div class="amount-label">Montant recu</div>
  <div class="amount-value">${fmtMoney(data.paymentAmount)}</div>
</div>
<table class="details-table"><tbody>
  <tr><td class="label">Methode</td><td class="value">${methodLabel}</td></tr>
  ${data.paymentReference ? `<tr><td class="label">Reference</td><td class="value">${data.paymentReference}</td></tr>` : ""}
  ${data.cashierName ? `<tr><td class="label">Encaisse par</td><td class="value">${data.cashierName}</td></tr>` : ""}
  ${data.invoiceItems && data.invoiceItems.length > 0 ? `
    <tr><td colspan="2" style="padding:12px 0 6px 0;">
      <div style="font-weight:600;font-size:11px;color:#374151;border-bottom:1px solid #E5E7EB;padding-bottom:4px;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;">
        DÃ©tail des frais
      </div>
    </td></tr>
    ${data.invoiceItems.map((it) => `
      <tr>
        <td class="label" style="padding-left:12px;">
          ${it.label}${it.quantity > 1 ? ` <span style="color:#6B7280;font-size:9px;">(x${it.quantity})</span>` : ""}
        </td>
        <td class="value" style="text-align:right;">${fmtMoney(it.totalAmount)}</td>
      </tr>
    `).join("")}
  ` : ""}
  <tr><td class="label">Total facture</td><td class="value">${fmtMoney(data.invoiceTotal)}</td></tr>
</tbody></table>
<div class="balance-box">
  <div class="balance-label">Solde restant</div>
  <div class="balance-value">${fmtMoney(data.invoiceBalance)}</div>
</div>
<div class="signature-block">
  <div class="signature-item"><div class="signature-line"></div><div class="signature-label">Le Caissier</div></div>
  <div class="signature-item">
    ${data.schoolStampBase64
      ? `<img src="${data.schoolStampBase64}" alt="Cachet" style="height:70px;object-fit:contain;margin-bottom:5px;" />`
      : `<div class="signature-line"></div>`}
    <div class="signature-label">Cachet etablissement</div>
  </div>
</div>
<div class="footer">Ce recu ne vaut que pour le montant indique. Toute reproduction non autorisee est interdite.<br/>Document genere par SIS-MALI</div>
</body></html>`;
}