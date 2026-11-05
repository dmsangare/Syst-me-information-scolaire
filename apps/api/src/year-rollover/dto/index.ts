import { z } from "zod";

// ============================================================
// BLOC G — DTO du wizard de passage a l'annee
// ============================================================

export const PeriodsToCloneEnum = z.enum(["TRIMESTRE", "SEMESTRE", "MOIS"]);

export const StructureToCloneSchema = z.object({
  classes: z.boolean().default(true),
  teacherAssignments: z.boolean().default(true),
  feeStructures: z.boolean().default(true),
  timetable: z.boolean().default(false),
});

export const DecisionOverrideSchema = z.object({
  studentId: z.string().uuid(),
  decision: z.enum([
    "ADMIS",           // passe au niveau superieur
    "REDOUBLE",        // reste dans le meme niveau
    "QUITTE_ECOLE",    // dernier niveau sans lycee
    "DIPLOME",         // sortie avec diplome (DEF/BAC)
    "NON_INSCRIT",     // pas inscrit (exclu, transfere, absent)
    "EN_ATTENTE_DEF",  // 9eme en attente resultat DEF
    "EN_ATTENTE_BAC",  // Terminale en attente resultat BAC
  ]),
  targetClassId: z.string().uuid().optional(),  // override de classe cible
});

export const PreviewYearRolloverSchema = z.object({
  fromYearId: z.string().uuid(),
  newLabel: z.string().min(4).max(20),
  newStartDate: z.string(),   // ISO date
  newEndDate: z.string(),     // ISO date
  periodsToClone: z.array(PeriodsToCloneEnum).default(["TRIMESTRE", "MOIS"]),
  structureToClone: StructureToCloneSchema.default({ classes: true, teacherAssignments: true, feeStructures: true, timetable: true }),
  feeIncreasePercent: z.number().min(-100).max(100).default(0),
});

export const ExecuteYearRolloverSchema = PreviewYearRolloverSchema.extend({
  decisions: z.array(DecisionOverrideSchema).default([]),
});

export type PeriodsToClone = z.infer<typeof PeriodsToCloneEnum>;
export type StructureToClone = z.infer<typeof StructureToCloneSchema>;
export type DecisionOverride = z.infer<typeof DecisionOverrideSchema>;
export type PreviewYearRolloverDto = z.infer<typeof PreviewYearRolloverSchema>;
export type ExecuteYearRolloverDto = z.infer<typeof ExecuteYearRolloverSchema>;
