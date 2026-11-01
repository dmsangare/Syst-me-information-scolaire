import { z } from "zod";

/**
 * Schema de creation d'une affectation Matiere-Classe-Annee.
 * Les 3 references (class, subject, academicYear) forment l'identite
 * de l'affectation et ne peuvent pas etre modifiees apres creation.
 */
export const ClassSubjectCreateSchema = z.object({
  classId: z.string().uuid(),
  subjectId: z.string().uuid(),
  academicYearId: z.string().uuid(),
  displayOrder: z.number().int().min(0).default(0),
  scale: z.union([z.literal(10), z.literal(20)]).default(10),
  isMandatory: z.boolean().default(true),
  isActive: z.boolean().default(true),
});

/**
 * Schema de mise a jour : seuls les champs non structurants
 * (ordre, echelle, obligatoire, actif) sont modifiables.
 * L'identite (classId, subjectId, academicYearId) est immuable.
 */
export const ClassSubjectUpdateSchema = z.object({
  displayOrder: z.number().int().min(0).optional(),
  scale: z.union([z.literal(10), z.literal(20)]).optional(),
  isMandatory: z.boolean().optional(),
  isActive: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: "Au moins un champ doit etre fourni pour la mise a jour",
});

/**
 * Schema de creation en masse : utiliser pour affecter plusieurs
 * matieres d'un coup a une classe lors de la configuration initiale.
 */
export const ClassSubjectBulkCreateSchema = z.object({
  classId: z.string().uuid(),
  academicYearId: z.string().uuid(),
  subjects: z.array(z.object({
    subjectId: z.string().uuid(),
    displayOrder: z.number().int().min(0).default(0),
    scale: z.union([z.literal(10), z.literal(20)]).default(10),
    isMandatory: z.boolean().default(true),
  })).min(1, "Au moins une matiere doit etre fournie"),
});

/**
 * Schema de reordonnancement en masse (drag & drop).
 */
export const ClassSubjectReorderSchema = z.object({
  items: z.array(z.object({
    id: z.string().uuid(),
    displayOrder: z.number().int().min(0),
  })).min(1),
});

export type ClassSubjectCreateDto = z.infer<typeof ClassSubjectCreateSchema>;
export type ClassSubjectUpdateDto = z.infer<typeof ClassSubjectUpdateSchema>;
export type ClassSubjectBulkCreateDto = z.infer<typeof ClassSubjectBulkCreateSchema>;
export type ClassSubjectReorderDto = z.infer<typeof ClassSubjectReorderSchema>;