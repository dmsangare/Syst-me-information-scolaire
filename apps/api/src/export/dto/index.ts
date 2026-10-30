import { z } from 'zod';

export const ExcelSheetSchema = z.object({
  name: z.string().min(1).max(31),
  rows: z.array(z.record(z.string(), z.any())),
});

export const ExportExcelSchema = z.object({
  filename: z.string().min(1).max(100),
  sheets: z.array(ExcelSheetSchema).min(1),
});

export type ExportExcelInput = z.infer<typeof ExportExcelSchema>;
