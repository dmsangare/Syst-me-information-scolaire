// ============================================================
// TYPES — MODULE CAMPAGNES (COMPOSITIONS / TRIMESTRES)
// ============================================================

export type CampaignStatus = "BROUILLON" | "ACTIVE" | "SAISIE_EN_COURS" | "VALIDE_DIRECTEUR";
export type TermType = "MOIS" | "TRIMESTRE";

export interface CampaignTerm {
  id: string;
  name: string;
  type: TermType;
  startDate: string;
  endDate: string;
  isLocked: boolean;
  academicYear: { id: string; label: string };
}

export interface CampaignClass {
  id: string;
  name: string;
  code: string;
  level: { id: string; name: string; cycle: "PREMIER_CYCLE" | "DEUXIEME_CYCLE" };
}

export interface CampaignItem {
  id: string;
  termId: string;
  classId: string;
  status: CampaignStatus;
  activatedAt?: string | null;
  validatedAt?: string | null;
  validatedBy?: string | null;
  createdAt: string;
  updatedAt: string;
  term: CampaignTerm;
  class: CampaignClass;
  _stats?: {
    assessmentsCount: number;
    teacherValidations: { validated: number; total: number };
  };
}

export interface CreateCampaignInput {
  termId: string;
  classIds: string[];
  notes?: string;
}

export interface CampaignListFilters {
  academicYearId?: string;
  classId?: string;
  termId?: string;
  status?: CampaignStatus;
}

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  BROUILLON: "Brouillon",
  ACTIVE: "Active",
  SAISIE_EN_COURS: "Saisie en cours",
  VALIDE_DIRECTEUR: "Validee",
};

export const CAMPAIGN_STATUS_COLORS: Record<CampaignStatus, string> = {
  BROUILLON: "bg-gray-100 text-gray-700",
  ACTIVE: "bg-blue-100 text-blue-700",
  SAISIE_EN_COURS: "bg-yellow-100 text-yellow-700",
  VALIDE_DIRECTEUR: "bg-green-100 text-green-700",
};

export const TERM_TYPE_LABELS: Record<TermType, string> = {
  MOIS: "Mois",
  TRIMESTRE: "Trimestre",
};