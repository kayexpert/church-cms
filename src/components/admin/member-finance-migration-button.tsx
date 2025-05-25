"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";

export function MemberFinanceMigrationButton({
  onSuccess,
  onError
}: {
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [isExecuting, setIsExecuting] = useState(false);

  const handleExecuteMigration = async () => {
    try {
      setIsExecuting(true);
      
      const response = await fetch('/api/execute-member-migration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to execute migration');
      }

      if (data.success) {
        toast.success('Member finance migration executed successfully');
        onSuccess(data.message || 'Migration completed successfully');
      } else {
        toast.error('Member finance migration failed');
        onError(data.error || 'Migration failed');
      }
    } catch (error) {
      console.error('Error executing migration:', error);
      toast.error(`Failed to execute migration: ${(error as Error).message}`);
      onError((error as Error).message);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <Button 
      onClick={handleExecuteMigration} 
      disabled={isExecuting}
      className="w-full"
    >
      {isExecuting ? (
        "Running Migration..."
      ) : (
        <>
          Add Member ID to Income <ArrowRight className="ml-2 h-4 w-4" />
        </>
      )}
    </Button>
  );
}
