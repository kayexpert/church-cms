"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

/**
 * This component provides direct access to the dashboard
 * It checks authentication directly and redirects if needed
 */
export function DirectAccess({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if the user is authenticated
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Error checking session:", error);
          redirectToLogin();
          return;
        }
        
        if (data.session) {
          console.log("Direct access: User is authenticated");
          setIsAuthenticated(true);
        } else {
          console.log("Direct access: User is not authenticated");
          redirectToLogin();
        }
      } catch (error) {
        console.error("Unexpected error checking auth:", error);
        redirectToLogin();
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, []);
  
  const redirectToLogin = () => {
    // Get the current path to redirect back after login
    const currentPath = window.location.pathname;
    
    // Redirect to login page with the current path as a redirect parameter
    window.location.href = `/?redirectTo=${encodeURIComponent(currentPath)}`;
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Redirecting to login...</h2>
          <p className="text-muted-foreground">You need to be logged in to view this page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
