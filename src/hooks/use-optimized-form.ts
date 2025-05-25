"use client";

import { useState, useCallback } from "react";
import { useForm, UseFormReturn, FieldValues, DefaultValues, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface UseOptimizedFormOptions<TFormValues extends FieldValues> {
  schema: z.ZodSchema<TFormValues>;
  defaultValues: DefaultValues<TFormValues>;
  onSubmit: (values: TFormValues, form: UseFormReturn<TFormValues>) => Promise<void>;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  invalidateQueries?: string[];
  successMessage?: string;
  errorMessage?: string;
}

/**
 * A custom hook for optimized form handling with React Hook Form and Zod validation
 */
export function useOptimizedForm<TFormValues extends FieldValues>({
  schema,
  defaultValues,
  onSubmit,
  onSuccess,
  onError,
  invalidateQueries = [],
  successMessage = "Operation completed successfully",
  errorMessage = "An error occurred"
}: UseOptimizedFormOptions<TFormValues>) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  // Initialize form with Zod resolver
  const form = useForm<TFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: "onBlur" // Validate on blur for better UX
  });

  // Handle form submission
  const handleSubmit = useCallback<SubmitHandler<TFormValues>>(async (values) => {
    try {
      setIsSubmitting(true);
      await onSubmit(values, form);

      // Invalidate relevant queries
      if (invalidateQueries.length > 0) {
        invalidateQueries.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey: [queryKey] });
        });
      }

      // Show success message
      toast.success(successMessage);

      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Form submission error:", error);
      
      // Show error message
      toast.error(errorMessage + (error instanceof Error ? `: ${error.message}` : ""));
      
      // Call error callback if provided
      if (onError && error instanceof Error) {
        onError(error);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [onSubmit, form, invalidateQueries, queryClient, successMessage, errorMessage, onSuccess, onError]);

  return {
    form,
    isSubmitting,
    handleSubmit: form.handleSubmit(handleSubmit),
    reset: form.reset
  };
}
