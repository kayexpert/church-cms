import { z } from 'zod';

/**
 * Schema for validating message data
 */
// Define the common fields for all message types
const baseMessageFields = {
  name: z.string().min(1, "Message name is required"),
  content: z.string().min(1, "Message content is required"),
  frequency: z.enum(['one-time', 'daily', 'weekly', 'monthly'], {
    required_error: "Frequency is required",
  }), // Database only allows these values
  schedule_time: z.date({
    required_error: "Schedule time is required",
  }),
  end_date: z.date().optional(),
  status: z.enum(['active', 'inactive', 'scheduled', 'pending', 'processing']).default('active'),
  error_message: z.string().optional(),
  template_id: z.union([
    z.literal("none"),
    z.string().uuid("Invalid UUID format")
  ]).optional(),
};

// Define the recipients schema
const recipientsSchema = z.object({
  type: z.enum(['individual', 'group'], {
    required_error: "Recipient type is required",
  }),
  ids: z.array(z.string().uuid("Invalid UUID format")),
});

// Define the recipients schema with validation for regular messages
const regularRecipientsSchema = recipientsSchema.refine(
  (data) => data.ids.length >= 1,
  {
    message: "At least one recipient is required",
    path: ["ids"],
  }
);

// Create a single schema that handles all message types with conditional validation
export const messageSchema = z.object({
  ...baseMessageFields,
  type: z.enum(['quick', 'group', 'birthday'], {
    required_error: "Message type is required",
  }),
  recipients: recipientsSchema,
  days_before: z.number().int().min(0).max(30).optional(),
}).refine(
  (data) => {
    // For birthday messages, we don't need to validate recipients
    // Note: We're using 'group' type for birthday messages due to database constraints,
    // but we need to identify them by name or content
    if (data.name.toLowerCase().includes('birthday') || data.content.toLowerCase().includes('birthday')) {
      return true;
    }

    // For other message types, ensure there's at least one recipient
    return data.recipients.ids.length >= 1;
  },
  {
    message: "At least one recipient is required for non-birthday messages",
    path: ["recipients", "ids"],
  }
);

/**
 * Schema for creating a new message
 */
export const createMessageSchema = messageSchema;

/**
 * Schema for updating an existing message
 * Makes all fields optional
 */
export const updateMessageSchema = z.object({
  name: z.string().min(1, "Message name is required").optional(),
  content: z.string().min(1, "Message content is required").optional(),
  type: z.enum(['quick', 'group', 'birthday'], {
    required_error: "Message type is required",
  }).optional(),
  frequency: z.enum(['one-time', 'daily', 'weekly', 'monthly'], {
    required_error: "Frequency is required",
  }).optional(), // Database only allows these values
  schedule_time: z.date({
    required_error: "Schedule time is required",
  }).optional(),
  end_date: z.date().optional(),
  status: z.enum(['active', 'inactive', 'scheduled', 'pending', 'processing']).optional(),
  error_message: z.string().optional(),
  recipients: recipientsSchema.optional(),
  template_id: z.union([
    z.literal("none"),
    z.string().uuid("Invalid UUID format")
  ]).optional(),
  days_before: z.number().int().min(0).max(30).optional(),
});

/**
 * Schema for validating message template data
 */
export const messageTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  content: z.string().min(1, "Template content is required"),
  message_type: z.enum(['text', 'unicode', 'flash']).default('text'),
  supports_scheduling: z.boolean().default(false),
  personalization_tokens: z.array(z.string()).optional(),
});

/**
 * Schema for creating a new message template
 */
export const createMessageTemplateSchema = messageTemplateSchema;

/**
 * Schema for updating an existing message template
 * Makes all fields optional
 */
export const updateMessageTemplateSchema = messageTemplateSchema.partial();

/**
 * Type definitions for the schema inputs
 */
export type CreateMessageInput = z.infer<typeof createMessageSchema>;
export type UpdateMessageInput = z.infer<typeof updateMessageSchema>;
export type CreateMessageTemplateInput = z.infer<typeof createMessageTemplateSchema>;
export type UpdateMessageTemplateInput = z.infer<typeof updateMessageTemplateSchema>;
