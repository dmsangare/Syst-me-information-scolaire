import * as ExcelJS from "exceljs";

// ============================================================
// TYPES
// ============================================================

export interface SituationTemplateStudent {
  matricule: string;
  firstName: string;
  lastName: string;
  className: string;
  levelName: string;
}

export interface ParsedSituationRow {
  lineNumber: number;
  matricule: string;
  firstName: string;
  lastName: string;
  className: string;
  totalDue: number;
  paidAmount: number;
  lastPaymentDate: Date | null;
  lastPaymentMethod: string | null;
  feeDetails: string | null;
  observation: string | null;
}

export interface SituationParseError {
  lineNumber: number;
  matricule?: string;
  name?: string;
  errors: string[];
}

export interface SituationParseResult {
  totalRows: number;
  validCount: number;
  errorCount: number;
  rows: ParsedSituationRow[];
  errors: SituationParseError[];
}

// ============================================================
// GENERATION DU TEMPLATE
// ============================================================

/**
 * Genere un Excel pre-rempli avec les eleves.
 * 3 onglets : SITUATION / INSTRUCTIONS / EXEMPLE
 */
export async function generateSituationTemplate(
  students: SituationTemplateStudent[],
  academicYearLabel: string,
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Etablissement";
  wb.created = new Date();

  // ============ Onglet SITUATION ============
  const ws = wb.addWorksheet("SITUATION");

  ws.columns = [
    { header: "Matricule *", key: "matricule", width: 22 },
    { header: "Nom *", key: "lastName", width: 18 },
    { header: "Prenom *", key: "firstName", width: 18 },
    { header: "Classe *", key: "className", width: 12 },
    { header: "Total du (FCFA) *", key: "totalDue", width: 18 },
    { header: "Deja paye (FCFA)", key: "paidAmount", width: 18 },
    { header: "Date dernier paiement", key: "lastPaymentDate", width: 22 },
    { header: "Mode dernier paiement", key: "lastPaymentMethod", width: 22 },
    { header: "Detail frais (optionnel)", key: "feeDetails", width: 40 },
    { header: "Observation", key: "observation", width: 30 },
  ];

  // Entete en gras avec fond gris
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFEEEEEE" },
  };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height = 24;

  // Pre-remplir avec les eleves
  for (const s of students) {
    ws.addRow({
      matricule: s.matricule,
      lastName: s.lastName,
      firstName: s.firstName,
      className: s.className,
      totalDue: "",
      paidAmount: "",
      lastPaymentDate: "",
      lastPaymentMethod: "",
      feeDetails: "",
      observation: "",
    });
  }

  // Bordures sur toutes les cellules
  ws.eachRow((row, idx) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFCCCCCC" } },
        bottom: { style: "thin", color: { argb: "FFCCCCCC" } },
        left: { style: "thin", color: { argb: "FFCCCCCC" } },
        right: { style: "thin", color: { argb: "FFCCCCCC" } },
      };
      if (idx > 1) {
        cell.alignment = { vertical: "middle" };
      }
    });
  });

  // Format colonne Total du et Deja paye
  ws.getColumn("totalDue").numFmt = "#,##0";
  ws.getColumn("paidAmount").numFmt = "#,##0";

  // Freeze la 1ere ligne
  ws.views = [{ state: "frozen", ySplit: 1 }];

  // ============ Onglet INSTRUCTIONS ============
  const wsInstr = wb.addWorksheet("INSTRUCTIONS");
  wsInstr.columns = [{ width: 100 }];

  const instructions = [
    "Import de situation initiale",
    `Annee scolaire : ${academicYearLabel}`,
    "",
    "OBJECTIF",
    "Ce fichier permet d'importer la situation actuelle de vos eleves",
    "(ce qu'ils doivent, ce qu'ils ont deja paye) pour rattraper",
    "une comptabilite tenue sur cahier papier.",
    "",
    "INSTRUCTIONS",
    "1. Remplissez UNIQUEMENT les colonnes E a J dans l'onglet SITUATION.",
    "2. Les colonnes A a D (Matricule, Nom, Prenom, Classe) sont pre-remplies.",
    "3. N'ajoutez PAS de lignes, n'en supprimez PAS.",
    "4. Les montants sont en FCFA, sans espace ni separateur.",
    "5. Format date : JJ/MM/AAAA (ex: 15/10/2026).",
    "6. Mode de paiement : ESPECES / MOBILE_MONEY / CHEQUE / VIREMENT / AUTRE.",
    "",
    "COLONNES OBLIGATOIRES (*)",
    "- Matricule (pre-rempli)",
    "- Nom (pre-rempli)",
    "- Prenom (pre-rempli)",
    "- Classe (pre-rempli)",
    "- Total du (a remplir, > 0)",
    "",
    "COLONNES OPTIONNELLES",
    "- Deja paye : montant deja verse par l'eleve (0 si rien paye)",
    "- Date dernier paiement : date du dernier versement",
    "- Mode dernier paiement : moyen utilise",
    "- Detail frais : liste separee par des points-virgules",
    "  Format : Inscription:25000;Scolarite:300000;Tenue:25000",
    "- Observation : note libre (boursier, remise, etc.)",
    "",
    "COMPORTEMENT",
    "- Les eleves deja factures seront IGNORES (pas d'ecrasement).",
    "- Si une seule ligne est invalide, AUCUNE facture ne sera creee.",
    "- Chaque facture sera marquee 'Import situation initiale'.",
    "",
    "SUPPORT",
    "En cas de probleme, contactez votre installateur.",
  ];
  instructions.forEach((line) => wsInstr.addRow([line]));
  wsInstr.getRow(1).font = { bold: true, size: 14 };
  wsInstr.getRow(5).font = { bold: true };
  wsInstr.getRow(9).font = { bold: true };
  wsInstr.getRow(17).font = { bold: true };
  wsInstr.getRow(24).font = { bold: true };
  wsInstr.getRow(31).font = { bold: true };

  // ============ Onglet EXEMPLE ============
  const wsEx = wb.addWorksheet("EXEMPLE");
  wsEx.columns = [
    { header: "Matricule *", key: "matricule", width: 22 },
    { header: "Nom *", key: "lastName", width: 18 },
    { header: "Prenom *", key: "firstName", width: 18 },
    { header: "Classe *", key: "className", width: 12 },
    { header: "Total du (FCFA) *", key: "totalDue", width: 18 },
    { header: "Deja paye (FCFA)", key: "paidAmount", width: 18 },
    { header: "Date dernier paiement", key: "lastPaymentDate", width: 22 },
    { header: "Mode dernier paiement", key: "lastPaymentMethod", width: 22 },
    { header: "Detail frais (optionnel)", key: "feeDetails", width: 40 },
    { header: "Observation", key: "observation", width: 30 },
  ];
  wsEx.getRow(1).font = { bold: true };
  wsEx.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFEEEEEE" },
  };

  wsEx.addRow({
    matricule: "EPS-2026-000001",
    lastName: "DIALLO",
    firstName: "Amadou",
    className: "6eme A",
    totalDue: 350000,
    paidAmount: 25000,
    lastPaymentDate: "15/10/2026",
    lastPaymentMethod: "ESPECES",
    feeDetails: "Inscription:25000;Scolarite:300000;Tenue:25000",
    observation: "Paye inscription uniquement",
  });
  wsEx.addRow({
    matricule: "EPS-2026-000002",
    lastName: "TRAORE",
    firstName: "Fatoumata",
    className: "6eme A",
    totalDue: 350000,
    paidAmount: 350000,
    lastPaymentDate: "01/10/2026",
    lastPaymentMethod: "MOBILE_MONEY",
    feeDetails: "Inscription:25000;Scolarite:300000;Tenue:25000",
    observation: "Tout paye",
  });
  wsEx.addRow({
    matricule: "EPS-2026-000003",
    lastName: "KEITA",
    firstName: "Moussa",
    className: "5eme B",
    totalDue: 130000,
    paidAmount: 0,
    lastPaymentDate: "",
    lastPaymentMethod: "",
    feeDetails: "Inscription:10000;Scolarite:110000;Tenue:10000",
    observation: "",
  });

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// ============================================================
// PARSING DU FICHIER UPLOADE
// ============================================================

const MONTHS = ["ESPECES", "MOBILE_MONEY", "CHEQUE", "VIREMENT", "AUTRE"];

/**
 * Parse et valide un fichier Excel d'import de situation.
 * Ne fait AUCUNE ecriture en BDD. Retourne les lignes valides + les erreurs.
 */
export async function parseSituationExcel(
  buffer: Buffer,
): Promise<SituationParseResult> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ArrayBuffer);

  const ws = wb.getWorksheet("SITUATION");
  if (!ws) {
    return {
      totalRows: 0,
      validCount: 0,
      errorCount: 1,
      rows: [],
      errors: [
        {
          lineNumber: 0,
          errors: ["Onglet 'SITUATION' introuvable dans le fichier"],
        },
      ],
    };
  }

  const rows: ParsedSituationRow[] = [];
  const errors: SituationParseError[] = [];

  // Ligne 1 = entetes, on commence a la 2
  for (let i = 2; i <= ws.rowCount; i++) {
    const row = ws.getRow(i);
    const getCell = (col: number) => {
      const v = row.getCell(col).value;
      if (v === null || v === undefined) return "";
      if (typeof v === "object" && "text" in v) return String(v.text);
      return String(v).trim();
    };

    const matricule = getCell(1);
    const lastName = getCell(2);
    const firstName = getCell(3);
    const className = getCell(4);
    const totalDueRaw = getCell(5);
    const paidAmountRaw = getCell(6);
    const lastPaymentDateRaw = getCell(7);
    const lastPaymentMethod = getCell(8).toUpperCase();
    const feeDetails = getCell(9);
    const observation = getCell(10);

    // Ignorer les lignes entierement vides
    if (!matricule && !lastName && !firstName && !className && !totalDueRaw) {
      continue;
    }

    const lineErrors: string[] = [];

    if (!matricule) lineErrors.push("Matricule manquant");
    if (!lastName) lineErrors.push("Nom manquant");
    if (!firstName) lineErrors.push("Prenom manquant");
    if (!className) lineErrors.push("Classe manquante");

    const totalDue = parseFloat(
      String(totalDueRaw).replace(/\s/g, "").replace(",", "."),
    );
    if (!totalDueRaw || isNaN(totalDue) || totalDue <= 0) {
      lineErrors.push("Total du invalide (doit etre un nombre > 0)");
    }

    let paidAmount = 0;
    if (paidAmountRaw) {
      paidAmount = parseFloat(
        String(paidAmountRaw).replace(/\s/g, "").replace(",", "."),
      );
      if (isNaN(paidAmount) || paidAmount < 0) {
        lineErrors.push("Deja paye invalide");
      }
    }

    if (paidAmount > 0 && paidAmount > totalDue) {
      lineErrors.push("Deja paye superieur au total du");
    }

    let lastPaymentDate: Date | null = null;
    if (lastPaymentDateRaw) {
      const parsed = parseDateFR(lastPaymentDateRaw);
      if (!parsed) {
        lineErrors.push("Date dernier paiement invalide (format JJ/MM/AAAA)");
      } else {
        lastPaymentDate = parsed;
      }
    }

    if (lastPaymentMethod && !MONTHS.includes(lastPaymentMethod)) {
      lineErrors.push(
        `Mode paiement invalide (attendu : ${MONTHS.join(" / ")})`,
      );
    }

    if (lineErrors.length > 0) {
      errors.push({
        lineNumber: i,
        matricule: matricule || undefined,
        name: `${lastName} ${firstName}`.trim() || undefined,
        errors: lineErrors,
      });
    } else {
      rows.push({
        lineNumber: i,
        matricule,
        firstName,
        lastName,
        className,
        totalDue,
        paidAmount,
        lastPaymentDate,
        lastPaymentMethod: lastPaymentMethod || null,
        feeDetails: feeDetails || null,
        observation: observation || null,
      });
    }
  }

  return {
    totalRows: rows.length + errors.length,
    validCount: rows.length,
    errorCount: errors.length,
    rows,
    errors,
  };
}

// ============================================================
// HELPERS
// ============================================================

function parseDateFR(input: string): Date | null {
  const s = input.trim();
  // Format JJ/MM/AAAA
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const month = parseInt(m[2], 10) - 1;
  let year = parseInt(m[3], 10);
  if (year < 100) year += 2000;
  const d = new Date(year, month, day);
  if (isNaN(d.getTime())) return null;
  return d;
}
