import { z } from "zod";

// Schema for creating a new event
export const createEventSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  description: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be in YYYY-MM-DD format").optional(),
  location: z.string().optional(),
  type: z.string().optional(),
  organizer: z.string().optional(),
  category_id: z.string().uuid("Invalid category ID").optional(),
  status: z.enum(['upcoming', 'ongoing', 'completed', 'cancelled']).default('upcoming'),
  recurrence: z.enum(['none', 'daily', 'weekly', 'monthly', 'yearly']).default('none'),
  color: z.string().optional(),
  department_id: z.string().uuid("Invalid department ID").optional(),
  is_all_day: z.boolean().default(false),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
});

// Schema for updating an existing event
export const updateEventSchema = createEventSchema.partial().required({
  title: true,
  date: true,
});

// Types derived from the schemas
export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
