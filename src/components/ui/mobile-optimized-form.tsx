"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface MobileOptimizedFormProps {
  title: string;
  children: React.ReactNode;
  onSubmit: (e: React.FormEvent) => void;
  submitLabel?: string;
  cancelLabel?: string;
  onCancel?: () => void;
  isSubmitting?: boolean;
  className?: string;
  footerClassName?: string;
  isDialog?: boolean;
  extraButtons?: React.ReactNode;
}

export function MobileOptimizedForm({
  title,
  children,
  onSubmit,
  submitLabel = "Submit",
  cancelLabel = "Cancel",
  onCancel,
  isSubmitting = false,
  className,
  footerClassName,
  isDialog = false,
  extraButtons,
}: MobileOptimizedFormProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  // Check if we're on the client side before accessing window
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Initial check
    checkMobile();

    // Add event listener for window resize
    window.addEventListener("resize", checkMobile);

    // Cleanup
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Detect keyboard open on mobile
  useEffect(() => {
    if (!isMobile) return;

    const detectKeyboard = () => {
      // On mobile, when keyboard opens, the viewport height decreases
      const viewportHeight = window.innerHeight;
      const windowHeight = window.outerHeight;

      // If the viewport height is significantly less than window height, keyboard is likely open
      setIsKeyboardOpen(viewportHeight < windowHeight * 0.8);
    };

    window.addEventListener("resize", detectKeyboard);

    // Check on focus events for input elements
    const handleFocus = () => {
      if (isMobile) {
        setTimeout(detectKeyboard, 300); // Delay to allow keyboard to open
      }
    };

    const handleBlur = () => {
      if (isMobile) {
        setTimeout(() => setIsKeyboardOpen(false), 300);
      }
    };

    const inputs = document.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      input.addEventListener('focus', handleFocus);
      input.addEventListener('blur', handleBlur);
    });

    return () => {
      window.removeEventListener("resize", detectKeyboard);
      inputs.forEach(input => {
        input.removeEventListener('focus', handleFocus);
        input.removeEventListener('blur', handleBlur);
      });
    };
  }, [isMobile]);

  return (
    <Card className={cn("border shadow-sm", className)}>
      <div className="form-container">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={cn(
            "space-y-4",
            isMobile && "pb-20" // Add padding at bottom for mobile to ensure content isn't hidden behind fixed footer
          )}>
            {children}
          </div>
        </CardContent>
        <CardFooter
          className={cn(
            "flex justify-end gap-2 pt-2",
            isMobile && isKeyboardOpen && "fixed bottom-0 left-0 right-0 bg-background border-t p-3 z-50",
            isMobile && isDialog && "fixed bottom-0 left-0 right-0 bg-background border-t p-3 z-50",
            footerClassName
          )}
        >
          {extraButtons}
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className={cn(
                "flex-1 md:flex-none",
                isMobile && "h-12" // Taller buttons on mobile for easier touch
              )}
            >
              {cancelLabel}
            </Button>
          )}
          <Button
            type="submit"
            onClick={(e) => {
              e.preventDefault();
              onSubmit(e);
            }}
            disabled={isSubmitting}
            className={cn(
              "flex-1 md:flex-none",
              isMobile && "h-12" // Taller buttons on mobile for easier touch
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              submitLabel
            )}
          </Button>
        </CardFooter>
      </div>
    </Card>
  );
}
