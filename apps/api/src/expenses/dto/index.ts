import { z } from "zod";

// ============================================================
// SCHEMAS
// ============================================================

export const ExpenseCreateSchema = z.object({
  schoolId: z.string().uuid().optional(),
  categoryId: z.string().uuid("Categorie invalide"),
  amount: z.coerce.number().positive("Le montant doit etre positif"),
  description: z.string().min(2, "Description requise (min. 2 caracteres)").max(500),
  beneficiary: z.string().max(150).optional(),
  receiptUrl: z.string().url().optional().or(z.literal("")),
  spentAt: z.iso.datetime().optional(),
  cashSessionId: z.string().uuid().optional().nullable(),
});

export const ExpenseUpdateSchema = ExpenseCreateSchema.partial();

export const ExpenseListFiltersSchema = z.object({
  categoryId: z.string().uuid().optional(),
  cashierId: z.string().uuid().optional(),
  cashSessionId: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  q: z.string().optional(),
  limit: z.coerce.number().int().positive().max(200).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export type ExpenseCreateDto = z.infer<typeof ExpenseCreateSchema>;
export type ExpenseUpdateDto = z.infer<typeof ExpenseUpdateSchema>;
export type ExpenseListFilters = z.infer<typeof ExpenseListFiltersSchema>;
