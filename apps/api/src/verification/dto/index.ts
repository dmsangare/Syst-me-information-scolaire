import { z } from "zod";

export const SignDocumentSchema = z.object({
  type: z.enum([
    "ID_CARD",
    "BULLETIN",
    "RECEIPT",
    "INVOICE",
    "ATTESTATION",
    "CERTIFICATE",
  ]),
  referenceId: z.string().uuid(),
  meta: z.record(z.string(), z.any()).optional(),
  expiresAt: z.coerce.date().optional(),
});

export const RevokeDocumentSchema = z.object({
  shortCode: z.string().min(1),
  reason: z.string().max(200).optional(),
});

export type SignDocumentDto = z.infer<typeof SignDocumentSchema>;
export type RevokeDocumentDto = z.infer<typeof RevokeDocumentSchema>;
