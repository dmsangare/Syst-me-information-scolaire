import { z } from "zod";

export const DocumentTemplateCreateSchema = z.object({
  schoolId: z.string().uuid(),
  code: z.string().min(2).max(50),
  name: z.string().min(2).max(150),
  type: z.enum([
    "CERTIFICATE", "ATTESTATION", "RECEIPT", "REPORT_CARD", "TRANSCRIPT",
    "ENROLLMENT_FORM", "STUDENT_SHEET", "TRANSFER", "DECISION", "PV", "CLASS_LIST",
  ]),
  htmlTemplate: z.string().min(10),
  isActive: z.boolean().optional().default(true),
});

export const DocumentGenerateSchema = z.object({
  templateId: z.string().uuid(),
  studentId: z.string().uuid().optional().nullable(),
  reference: z.string().optional(),
  data: z.record(z.string(), z.any()).optional(),
});

export type DocumentTemplateCreateDto = z.infer<typeof DocumentTemplateCreateSchema>;
export type DocumentGenerateDto = z.infer<typeof DocumentGenerateSchema>;
export { DocumentTemplateCreateSchema as DocumentTemplateCreateSchemaExport, DocumentGenerateSchema as DocumentGenerateSchemaExport };
