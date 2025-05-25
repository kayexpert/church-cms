"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { authService } from "@/services/auth-service";

const resetPasswordSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(data: ResetPasswordFormValues) {
    setIsLoading(true);
    try {
      // First, try to get the CSRF token
      let csrfToken = '';
      try {
        const csrfResponse = await fetch('/api/auth/reset-password', {
          method: 'GET',
        });

        if (csrfResponse.ok) {
          const data = await csrfResponse.json();
          csrfToken = data.csrfToken;
        } else {
          console.warn('Failed to get CSRF token, continuing without it');
        }
      } catch (csrfError) {
        console.warn('Error fetching CSRF token:', csrfError);
        // Continue without CSRF token in development
      }

      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add CSRF token if available
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
      }

      // Call the API endpoint for password reset
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email: data.email,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to request password reset');
      }

      // Show success message
      toast.success(result.message || "Password reset instructions sent");
      setIsSubmitted(true);
    } catch (error: any) {
      console.error("Password reset error:", error);

      // Check for specific errors
      if (error.message?.includes("CSRF")) {
        toast.error("Security validation failed. Please refresh the page and try again.");
      } else if (error.message?.includes("Too many")) {
        toast.error(error.message || "Too many attempts. Please try again later.");
      } else {
        // Even if there's an error, we don't want to expose whether the email exists
        // So we show a generic success message anyway (security best practice)
        toast.success("If an account exists with this email, a reset link has been sent.");
        setIsSubmitted(true);
      }
    } finally {
      setIsLoading(false);
    }
  }

  if (isSubmitted) {
    return (
      <div className="space-y-4 text-center">
        <h3 className="text-lg font-medium">Check your email</h3>
        <p className="text-muted-foreground">
          If an account exists with the email you provided, you will receive password reset instructions.
        </p>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => router.push("/")}
        >
          Return to login
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="email"
                    placeholder="your.email@example.com"
                    disabled={isLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending reset instructions...
            </>
          ) : (
            "Reset Password"
          )}
        </Button>

        <div className="text-center">
          <Button
            variant="link"
            className="text-sm"
            onClick={() => router.push("/")}
            disabled={isLoading}
          >
            Back to login
          </Button>
        </div>
      </form>
    </Form>
  );
}
