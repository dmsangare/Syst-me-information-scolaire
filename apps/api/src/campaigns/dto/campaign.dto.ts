import { z } from "zod";

/**
 * Schema de création d'une campagne (mois ou trimestre).
 * Le directeur choisit un termId existant (Term.type = MOIS ou TRIMESTRE)
 * et l'applique à une ou plusieurs classes.
 */
export const CampaignCreateSchema = z.object({
  termId: z.string().uuid(),
  classIds: z.array(z.string().uuid()).min(1),
  notes: z.string().max(500).optional(),
});

export type CampaignCreateDto = z.infer<typeof CampaignCreateSchema>;

/**
 * Schema de mise à jour d'une campagne (notes, statut).
 * Le statut est contrôlé par les routes dédiées (activate/validate).
 */
export const CampaignUpdateSchema = z.object({
  notes: z.string().max(500).optional(),
});

export type CampaignUpdateDto = z.infer<typeof CampaignUpdateSchema>;

/**
 * Query pour lister les campagnes.
 */
export const CampaignListQuerySchema = z.object({
  academicYearId: z.string().uuid().optional(),
  classId: z.string().uuid().optional(),
  termId: z.string().uuid().optional(),
  status: z.enum(["BROUILLON", "ACTIVE", "VALIDE_DIRECTEUR"]).optional(),
});

export type CampaignListQueryDto = z.infer<typeof CampaignListQuerySchema>;

/**
 * Création d'une évaluation dans une campagne.
 * - 1er cycle : le directeur crée UN Assessment par matière
 * - 2e cycle : l'enseignant crée PLUSIEURS Assessments (DS, interros...)
 */
export const AssessmentCreateSchema = z.object({
  subjectId: z.string().uuid(),
  type: z.enum(["COMPOSITION", "DEVOIR", "INTERRO", "ORAL"]),
  title: z.string().min(1).max(150),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format YYYY-MM-DD"),
  maxScore: z.number().positive().max(100),
  coefficient: z.number().positive().max(10).default(1),
  durationMin: z.number().int().positive().optional(),
  observation: z.string().max(500).optional(),
});

export type AssessmentCreateDto = z.infer<typeof AssessmentCreateSchema>;

/**
 * Saisie des notes pour une évaluation (bulk).
 * Chaque entrée correspond à un élève.
 */
export const GradesSaveSchema = z.object({
  grades: z.array(
    z.object({
      studentId: z.string().uuid(),
      value: z.number().min(0).max(100).nullable(),
      isAbsent: z.boolean().default(false),
      isExempt: z.boolean().default(false),
      comment: z.string().max(500).optional(),
    }),
  ).min(1),
});

export type GradesSaveDto = z.infer<typeof GradesSaveSchema>;

/**
 * Validation par l'enseignant (par matière).
 */
export const ValidateTeacherSchema = z.object({
  subjectId: z.string().uuid(),
});

export type ValidateTeacherDto = z.infer<typeof ValidateTeacherSchema>;