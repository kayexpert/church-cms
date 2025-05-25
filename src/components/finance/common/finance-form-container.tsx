"use client";

import React, { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, XCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface FinanceFormContainerProps {
  title: string;
  description?: string;
  children: ReactNode;
  isSubmitting?: boolean;
  submitLabel?: string;
  onSubmit?: () => void;
  onCancel?: () => void;
  cancelLabel?: string;
  isDialog?: boolean;
  alertInfo?: {
    show: boolean;
    type: 'info' | 'warning' | 'error';
    message: string;
  };
  extraButtons?: ReactNode;
  className?: string;
}

/**
 * A reusable container for finance forms with consistent styling and behavior
 */
export function FinanceFormContainer({
  title,
  description,
  children,
  isSubmitting = false,
  submitLabel = "Submit",
  onSubmit,
  onCancel,
  cancelLabel = "Cancel",
  isDialog = false,
  alertInfo,
  extraButtons,
  className = "",
}: FinanceFormContainerProps) {
  // Alert type to variant mapping
  const alertVariantMap = {
    info: "info",
    warning: "warning",
    error: "destructive",
  } as const;

  return (
    <Card className={`border shadow-sm ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-xl font-semibold">{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {isDialog && onCancel && (
            <Button variant="ghost" size="icon" onClick={onCancel} className="h-8 w-8">
              <XCircle className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Alert message if provided */}
        {alertInfo?.show && (
          <Alert
            variant={alertVariantMap[alertInfo.type]}
            className="mb-4"
          >
            <AlertTitle>
              {alertInfo.type === 'info' && 'Information'}
              {alertInfo.type === 'warning' && 'Warning'}
              {alertInfo.type === 'error' && 'Error'}
            </AlertTitle>
            <AlertDescription>{alertInfo.message}</AlertDescription>
          </Alert>
        )}

        {/* Form content */}
        {children}
      </CardContent>

      {/* Only render footer if we have submit or cancel actions */}
      {(onSubmit || onCancel || extraButtons) && (
        <CardFooter className="flex justify-between pt-0">
          <div className="flex gap-2">
            {extraButtons}
          </div>
          <div className="flex gap-2 ml-auto">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                {cancelLabel}
              </Button>
            )}
            {onSubmit && (
              <Button
                type="submit"
                form="finance-form"
                disabled={isSubmitting}
                onClick={(e) => {
                  // If this is a form submit button, don't call onSubmit directly
                  // as it will be called by the form's onSubmit handler
                  if (e.currentTarget.form) {
                    return;
                  }
                  // If no form is associated, call onSubmit directly
                  onSubmit();
                }}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {submitLabel}
              </Button>
            )}
          </div>
        </CardFooter>
      )}
    </Card>
  );
}

/**
 * A mobile-optimized form container with better spacing for small screens
 */
export function MobileOptimizedForm({
  title,
  description,
  children,
  onSubmit,
  isSubmitting = false,
  submitLabel = "Submit",
  className = "",
  extraButtons,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  onSubmit: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  className?: string;
  extraButtons?: ReactNode;
}) {
  return (
    <Card className={`border shadow-sm ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-xl font-semibold">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
      <CardFooter className="flex justify-between pt-0">
        <div className="flex gap-2">
          {extraButtons}
        </div>
        <Button
          type="submit"
          disabled={isSubmitting}
          onClick={onSubmit}
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
      </CardFooter>
    </Card>
  );
}
