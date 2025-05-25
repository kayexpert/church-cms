import { z } from "zod";

// Schema for message shortening request
export const shortenMessageSchema = z.object({
  message: z.string().min(1, "Message is required"),
});

// Schema for SMS Provider Configuration
export const messagingConfigSchema = z.object({
  provider_name: z.literal('wigal', {
    required_error: "Provider name is required",
  }),
  api_key: z.string().min(1, "API key is required"),
  api_secret: z.string().optional(),
  base_url: z.string().optional().default('https://frogapi.wigal.com.gh'),
  auth_type: z.literal('api_key').optional().default('api_key'),
  sender_id: z.string().min(3, "Sender ID must be at least 3 characters").max(11, "Sender ID must be at most 11 characters").optional(),
  is_default: z.boolean().optional(),
}).superRefine((data, ctx) => {
  // Wigal-specific validations

  // API secret (USERNAME) is required for Wigal
  if (!data.api_secret) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Username is required for Wigal SMS",
      path: ["api_secret"]
    });
  }

  // Sender ID is required for Wigal
  if (!data.sender_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Sender ID is required",
      path: ["sender_id"]
    });
  }
});
