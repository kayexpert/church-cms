import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ResetPasswordPage() {
  try {
    // Check if the user is already logged in
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();

    // If the user is already logged in, redirect to dashboard
    if (data?.user) {
      redirect("/dashboard");
    }

    // Otherwise, show the reset password form
    return (
      <div className="container flex h-screen w-screen flex-col items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
            <CardDescription>
              Enter your email address and we'll send you instructions to reset your password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResetPasswordForm />
          </CardContent>
        </Card>
      </div>
    );
  } catch (error) {
    console.error("Error in ResetPasswordPage:", error);
    // If there's an error, redirect to the main page
    redirect("/");
  }
}
