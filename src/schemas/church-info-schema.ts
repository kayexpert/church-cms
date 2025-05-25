import { z } from 'zod';

/**
 * Schema for validating church information
 */
export const churchInfoSchema = z.object({
  name: z.string().min(1, "Church name is required"),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email("Invalid email format").optional().nullable(),
  website: z.string().url("Invalid URL format").optional().nullable(),
  description: z.string().optional().nullable(),
  founded_year: z.string().optional().nullable(),
  denomination: z.string().optional().nullable(),
  mission: z.string().optional().nullable(),
  vision: z.string().optional().nullable(),
});

/**
 * Schema for updating church information
 * Makes all fields optional
 */
export const updateChurchInfoSchema = churchInfoSchema.partial();

// Type definitions derived from the schemas
export type ChurchInfoInput = z.infer<typeof churchInfoSchema>;
export type UpdateChurchInfoInput = z.infer<typeof updateChurchInfoSchema>;
