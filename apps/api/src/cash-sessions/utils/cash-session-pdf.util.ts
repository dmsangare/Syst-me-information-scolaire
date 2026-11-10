import { PdfGeneratorService } from "../../common/pdf";

interface Movement {
  time: string;
  type: "IN" | "OUT";
  label: string;
  detail?: string;
  amount: number;
  method?: string;
}

interface CashSessionReportData {
  schoolName: string;
  schoolLogoBase64?: string | null;
  schoolStampBase64?: string | null;
  schoolSigle?: string | null;
  schoolAddress?: string | null;
  schoolPhone?: string | null;
  schoolMotto?: string | null;
  sessionId: string;
  cashierName: string;
  openedAt: Date;
  closedAt?: Date | null;
  openingAmount: number;
  totalCash: number;
  totalOther: number;
  totalExpenses: number;
  paymentsCount: number;
  expensesCount: number;
  theoreticalBalance: number;
  closingAmount?: number | null;
  difference?: number | null;
  movements: Movement[];
}

export async function generateCashSessionPDF(
  data: CashSessionReportData,
  pdfGenerator: PdfGeneratorService,
): Promise<Buffer> {
  const html = buildHTML(data);
  return pdfGenerator.generateFromHtml(html, {
    format: "A4",
    printBackground: true,
    margin: { top: "12mm", right: "12mm", bottom: "12mm", left: "12mm" },
  });
}

function fmtMoney(n: number): string {
  return `${Number(n).toLocaleString("fr-FR")} FCFA`;
}

function fmtDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildHTML(data: CashSessionReportData): string {
  const movementsHTML =
    data.movements.length === 0
      ? '<tr><td colspan="5" class="empty">Aucun mouvement enregistre durant cette session.</td></tr>'
      : data.movements
          .map((m) => {
            const sign = m.type === "IN" ? "+" : "-";
            const color = m.type === "IN" ? "#059669" : "#DC2626";
            const badge =
              m.type === "IN"
                ? '<span class="badge-in">Encaissement</span>'
                : '<span class="badge-out">Depense</span>';
            return `<tr>
              <td class="time-cell">${m.time}</td>
              <td>${badge}</td>
              <td>${m.label}${m.detail ? `<div class="detail">${m.detail}</div>` : ""}</td>
              <td class="method-cell">${m.method || "—"}</td>
              <td class="amount-cell" style="color:${color}">${sign}${fmtMoney(m.amount)}</td>
            </tr>`;
          })
          .join("");

  const ecart = Number(data.difference ?? 0);
  const ecartClass = ecart === 0 ? "ok" : ecart > 0 ? "warn" : "bad";
  const ecartLabel =
    ecart === 0 ? "Aucun ecart" : ecart > 0 ? "Excedent" : "Manquant";

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: Helvetica, Arial, sans-serif; font-size: 10px; color: #1F2937; padding: 8px; }
.header { display: flex; align-items: center; gap: 15px; padding-bottom: 10px; border-bottom: 3px double #1E40AF; margin-bottom: 15px; }
.logo { width: 50px; height: 50px; background: #1E40AF; color: white; display: flex; align-items: center; justify-content: center; border-radius: 8px; font-size: 20px; font-weight: bold; }
.logo-img { width: 50px; height: 50px; object-fit: contain; border-radius: 8px; }
.school-name { font-size: 15px; font-weight: bold; color: #1E40AF; text-transform: uppercase; }
.school-info { font-size: 9px; color: #6B7280; margin-top: 2px; }
.school-motto { font-size: 9px; font-style: italic; color: #6B7280; margin-top: 2px; }
.title-block { text-align: center; margin: 12px 0 18px; }
.title { font-size: 20px; font-weight: bold; color: #1E40AF; letter-spacing: 2px; }
.subtitle { font-size: 10px; color: #6B7280; margin-top: 4px; }
.session-id { font-size: 11px; font-family: monospace; font-weight: bold; color: #059669; margin-top: 6px; }
.summary { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 20px; background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 6px; padding: 10px 14px; margin-bottom: 12px; }
.summary-item { display: flex; gap: 8px; font-size: 10px; }
.summary-label { color: #6B7280; min-width: 90px; }
.summary-value { font-weight: 600; color: #1F2937; }
.kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 12px; }
.kpi { border-radius: 6px; padding: 10px; text-align: center; }
.kpi.blue { background: #EFF6FF; border: 1px solid #93C5FD; }
.kpi.green { background: #F0FDF4; border: 1px solid #86EFAC; }
.kpi.red { background: #FEF2F2; border: 1px solid #FCA5A5; }
.kpi.gray { background: #F9FAFB; border: 1px solid #D1D5DB; }
.kpi-label { font-size: 8px; text-transform: uppercase; letter-spacing: 1px; color: #6B7280; margin-bottom: 4px; }
.kpi-value { font-size: 13px; font-weight: bold; font-family: monospace; }
.kpi.blue .kpi-value { color: #1E40AF; }
.kpi.green .kpi-value { color: #059669; }
.kpi.red .kpi-value { color: #DC2626; }
.kpi.gray .kpi-value { color: #1F2937; }
.table-title { font-size: 11px; font-weight: bold; color: #1F2937; margin: 14px 0 6px; padding-bottom: 4px; border-bottom: 2px solid #E5E7EB; text-transform: uppercase; letter-spacing: 1px; }
table.movements { width: 100%; border-collapse: collapse; font-size: 9px; }
table.movements th { background: #1E40AF; color: white; padding: 6px 8px; text-align: left; font-size: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
table.movements th.right { text-align: right; }
table.movements td { padding: 6px 8px; border-bottom: 1px solid #F3F4F6; vertical-align: top; }
table.movements td.time-cell { font-family: monospace; color: #6B7280; }
table.movements td.method-cell { color: #6B7280; font-size: 9px; }
table.movements td.amount-cell { text-align: right; font-family: monospace; font-weight: bold; }
table.movements td.empty { text-align: center; color: #9CA3AF; padding: 20px; font-style: italic; }
.badge-in { background: #D1FAE5; color: #065F46; padding: 1px 5px; border-radius: 3px; font-size: 8px; font-weight: 600; }
.badge-out { background: #FEE2E2; color: #991B1B; padding: 1px 5px; border-radius: 3px; font-size: 8px; font-weight: 600; }
.detail { color: #6B7280; font-size: 8px; margin-top: 1px; }
.balance-box { margin-top: 15px; border-radius: 8px; padding: 14px 18px; display: flex; justify-content: space-between; align-items: center; }
.balance-box.ok { background: #F0FDF4; border: 2px solid #10B981; }
.balance-box.warn { background: #FEF3C7; border: 2px solid #F59E0B; }
.balance-box.bad { background: #FEF2F2; border: 2px solid #DC2626; }
.balance-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
.balance-box.ok .balance-label { color: #065F46; }
.balance-box.warn .balance-label { color: #92400E; }
.balance-box.bad .balance-label { color: #991B1B; }
.balance-value { font-size: 20px; font-weight: bold; font-family: monospace; }
.balance-box.ok .balance-value { color: #059669; }
.balance-box.warn .balance-value { color: #D97706; }
.balance-box.bad .balance-value { color: #DC2626; }
.signature-block { display: flex; justify-content: space-between; margin-top: 30px; padding-top: 15px; }
.signature-item { text-align: center; width: 45%; }
.signature-line { border-top: 1px solid #1F2937; margin-bottom: 5px; padding-top: 25px; }
.signature-label { font-size: 9px; color: #6B7280; }
.footer { text-align: center; font-size: 8px; color: #9CA3AF; margin-top: 25px; padding-top: 8px; border-top: 1px solid #E5E7EB; font-style: italic; }
</style></head><body>
<div class="header">
  ${data.schoolLogoBase64 ? `<img src="${data.schoolLogoBase64}" class="logo-img" alt="Logo"/>` : `<div class="logo">${(data.schoolSigle || data.schoolName || "S").charAt(0)}</div>`}
  <div>
    <div class="school-name">${data.schoolName}</div>
    ${data.schoolAddress ? `<div class="school-info">${data.schoolAddress}</div>` : ""}
    ${data.schoolPhone ? `<div class="school-info">Tel: ${data.schoolPhone}</div>` : ""}
    ${data.schoolMotto ? `<div class="school-motto">"${data.schoolMotto}"</div>` : ""}
  </div>
</div>
<div class="title-block">
  <div class="title">RAPPORT DE CAISSE</div>
  <div class="subtitle">Session du ${fmtDateTime(data.openedAt)} au ${fmtDateTime(data.closedAt)}</div>
  <div class="session-id">Session #${data.sessionId.slice(0, 8).toUpperCase()}</div>
</div>
<div class="summary">
  <div class="summary-item"><span class="summary-label">Caissier :</span><span class="summary-value">${data.cashierName}</span></div>
  <div class="summary-item"><span class="summary-label">Ouverture :</span><span class="summary-value">${fmtDateTime(data.openedAt)}</span></div>
  <div class="summary-item"><span class="summary-label">Cloture :</span><span class="summary-value">${fmtDateTime(data.closedAt)}</span></div>
  <div class="summary-item"><span class="summary-label">Statut :</span><span class="summary-value">${data.closedAt ? "CLOTUREE" : "OUVERTE"}</span></div>
</div>
<div class="kpi-grid">
  <div class="kpi gray"><div class="kpi-label">Fond initial</div><div class="kpi-value">${fmtMoney(data.openingAmount)}</div></div>
  <div class="kpi green"><div class="kpi-label">Encaissements</div><div class="kpi-value">+${fmtMoney(data.totalCash + data.totalOther)}</div></div>
  <div class="kpi red"><div class="kpi-label">Depenses</div><div class="kpi-value">-${fmtMoney(data.totalExpenses)}</div></div>
  <div class="kpi blue"><div class="kpi-label">Solde theorique</div><div class="kpi-value">${fmtMoney(data.theoreticalBalance)}</div></div>
</div>
<div class="summary">
  <div class="summary-item"><span class="summary-label">Especes :</span><span class="summary-value">${fmtMoney(data.totalCash)}</span></div>
  <div class="summary-item"><span class="summary-label">Autres methodes :</span><span class="summary-value">${fmtMoney(data.totalOther)}</span></div>
  <div class="summary-item"><span class="summary-label">Nb encaissements :</span><span class="summary-value">${data.paymentsCount}</span></div>
  <div class="summary-item"><span class="summary-label">Nb depenses :</span><span class="summary-value">${data.expensesCount}</span></div>
</div>
<div class="table-title">Detail des mouvements (${data.movements.length})</div>
<table class="movements">
  <thead>
    <tr>
      <th style="width: 60px;">Heure</th>
      <th style="width: 90px;">Type</th>
      <th>Description</th>
      <th style="width: 90px;">Mode</th>
      <th class="right" style="width: 110px;">Montant</th>
    </tr>
  </thead>
  <tbody>${movementsHTML}</tbody>
</table>
<div class="balance-box ${ecartClass}">
  <div>
    <div class="balance-label">${ecartLabel} a la cloture</div>
    <div style="font-size: 9px; margin-top: 2px;">Comptage reel : ${fmtMoney(Number(data.closingAmount ?? 0))} / Theorique : ${fmtMoney(data.theoreticalBalance)}</div>
  </div>
  <div class="balance-value">${ecart > 0 ? "+" : ""}${fmtMoney(ecart)}</div>
</div>
<div class="signature-block">
  <div class="signature-item"><div class="signature-line"></div><div class="signature-label">Le Caissier</div></div>
  <div class="signature-item">
    ${data.schoolStampBase64
      ? `<img src="${data.schoolStampBase64}" alt="Cachet" style="height:70px;object-fit:contain;margin-bottom:5px;" />`
      : `<div class="signature-line"></div>`}
    <div class="signature-label">Le Directeur / Comptable</div>
  </div>
</div>
<div class="footer">Rapport de caisse genere automatiquement par ${escapeHtml(data.schoolName ?? "Etablissement")} — Conservez ce document pour vos archives comptables.</div>
</body></html>`;
}

function escapeHtml(text: string): string {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
