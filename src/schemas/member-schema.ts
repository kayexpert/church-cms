import { z } from 'zod';

/**
 * Schema for validating member data
 */
export const memberSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  middle_name: z.string().optional(),
  last_name: z.string().min(1, "Last name is required"),
  date_of_birth: z.string().optional().nullable(),
  gender: z.enum(['male', 'female', 'other', '']).optional().nullable(),
  marital_status: z.enum(['single', 'married', 'divorced', 'widowed', '']).optional().nullable(),
  spouse_name: z.string().optional().nullable(),
  number_of_children: z.string().optional().nullable(),
  primary_phone_number: z.string().optional().nullable(),
  secondary_phone_number: z.string().optional().nullable(),
  email: z.string().email("Invalid email format").optional().nullable(),
  address: z.string().optional().nullable(),
  occupation: z.string().optional().nullable(),
  profile_image: z.string().optional().nullable(),
  covenant_family_id: z.string().uuid("Invalid UUID format").optional().nullable(),
  status: z.enum(['active', 'inactive']),
  membership_date: z.string().optional().nullable(),
  baptism_date: z.string().optional().nullable(),
  emergency_contact_name: z.string().optional().nullable(),
  emergency_contact_relationship: z.string().optional().nullable(),
  emergency_contact_phone: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

/**
 * Schema for creating a new member
 * Omits id, created_at, and updated_at which are handled by the database
 */
export const createMemberSchema = memberSchema.extend({
  departments: z.array(z.string().uuid("Invalid department UUID")).optional(),
  certificates: z.array(z.string().uuid("Invalid certificate UUID")).optional(),
});

/**
 * Schema for updating an existing member
 * Makes all fields optional
 */
export const updateMemberSchema = memberSchema.partial().extend({
  departments: z.array(z.string().uuid("Invalid department UUID")).optional(),
  certificates: z.array(z.string().uuid("Invalid certificate UUID")).optional(),
});

// Type definitions derived from the schemas
export type MemberInput = z.infer<typeof memberSchema>;
export type CreateMemberInput = z.infer<typeof createMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
