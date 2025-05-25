"use client";

import { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface OptimizedFinanceFormProps {
  title: string;
  description?: string;
  children: ReactNode;
  onSubmit: () => void;
  onCancel?: () => void;
  isSubmitting: boolean;
  isDialog?: boolean;
  className?: string;
  footerClassName?: string;
}

/**
 * A reusable form container component for finance forms
 * Provides consistent styling and behavior across all finance forms
 */
export function OptimizedFinanceForm({
  title,
  description,
  children,
  onSubmit,
  onCancel,
  isSubmitting,
  isDialog = false,
  className,
  footerClassName
}: OptimizedFinanceFormProps) {
  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
      <CardFooter className={cn("flex justify-between gap-2", footerClassName)}>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          onClick={onSubmit}
          disabled={isSubmitting}
          className={cn("flex-1", isDialog && !onCancel ? "w-full" : "")}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
