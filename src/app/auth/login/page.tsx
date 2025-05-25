import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";

// Force dynamic rendering for auth pages
export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  try {
    // Check if the user is already logged in
    // using a method that doesn't rely on cookies directly
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();

    // If the user is already logged in, redirect to dashboard
    if (data?.user) {
      redirect("/dashboard");
    }

    // Otherwise, redirect to the main page which has the login form
    redirect("/");
  } catch (error) {
    console.error("Error in LoginPage:", error);
    // If there's an error, redirect to the main page
    redirect("/");
  }
}
