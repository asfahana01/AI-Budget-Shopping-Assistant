import { z } from "zod";

export const chatSchema = z.object({
  sessionId: z.string().min(8).max(80).optional(),
  message: z.string().min(1).max(4000)
});

export const knowledgeQuerySchema = z.object({
  query: z.string().trim().min(1).max(1000)
});

export const graphQuerySchema = z.object({
  query: z.string().trim().min(1).max(1000)
});

export const toolRequestSchema = z.object({
  input: z.record(z.unknown())
});

export const imagePreviewSchema = z.object({
  productIds: z.array(z.string().trim().min(1).max(80).regex(/^[a-z0-9_-]+$/i)).min(1).max(8),
  style: z.string().trim().max(160).optional().default("")
});

export const recommendSchema = z.object({
  sessionId: z.string().min(8).max(80).optional(),
  budget: z.number().positive().max(10_000_000),
  currency: z.string().max(8).optional(),
  items: z.array(z.string().min(1).max(40)).min(1).max(8),
  preferences: z.array(z.string().max(80)).max(12).optional(),
  visualContext: z.record(z.any()).optional()
});

export const optimizeSchema = z.object({
  budget: z.number().positive().max(10_000_000),
  items: z.array(z.string().min(1).max(40)).min(1).max(8),
  preferences: z.array(z.string().max(80)).max(12).optional()
});

export function validate(schema, payload) {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    const error = new Error("VALIDATION_ERROR");
    error.details = parsed.error.flatten();
    throw error;
  }
  return parsed.data;
}
