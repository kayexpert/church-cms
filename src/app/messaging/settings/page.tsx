"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function MessageSettingsRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the new location
    router.push("/settings?tab=messages");
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin mb-4" />
      <p className="text-muted-foreground">Redirecting to Message Settings...</p>
    </div>
  );
}
