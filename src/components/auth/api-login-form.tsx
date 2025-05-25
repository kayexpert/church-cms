"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  rememberMe: z.boolean().default(false),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface ApiLoginFormProps {
  redirectPath?: string | null;
}

export function ApiLoginForm({ redirectPath }: ApiLoginFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  async function onSubmit(data: LoginFormValues) {
    setIsLoading(true);
    try {
      console.log("API Login form submitted with email:", data.email);

      // First, try to get the CSRF token
      let csrfToken = '';
      try {
        const csrfResponse = await fetch('/api/auth/login', {
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

      // Use the API endpoint for login
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          redirectTo: redirectPath || '/dashboard',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Login failed');
      }

      // Show success message
      toast.success("Logged in successfully");
      console.log("API Login successful, redirecting to:", result.redirectTo);

      // Wait a moment to show the success message
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Navigate to the redirect URL
      window.location.href = result.redirectTo;
    } catch (error: any) {
      console.error("API Login error:", error.message || error);

      // Show a more user-friendly error message
      if (error.message?.includes("Invalid login credentials")) {
        toast.error("Invalid email or password. Please try again.");
      } else if (error.message?.includes("CSRF")) {
        toast.error("Security validation failed. Please refresh the page and try again.");
      } else {
        toast.error(error.message || "Failed to login. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="your.email@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    {...field}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                    <span className="sr-only">
                      {showPassword ? "Hide password" : "Show password"}
                    </span>
                  </Button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex items-center justify-between">
          <FormField
            control={form.control}
            name="rememberMe"
            render={({ field }) => (
              <FormItem className="flex items-center space-x-2 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel className="text-sm font-medium cursor-pointer">
                  Remember me
                </FormLabel>
              </FormItem>
            )}
          />
          <Button variant="link" className="px-0 text-sm" asChild>
            <a href="/auth/reset-password">Forgot password?</a>
          </Button>
        </div>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            "Sign in"
          )}
        </Button>

      </form>
    </Form>
  );
}
