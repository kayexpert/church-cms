"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function ExecuteMigrationButton() {
  const [isExecuting, setIsExecuting] = useState(false);

  const handleExecuteMigration = async () => {
    try {
      setIsExecuting(true);
      
      const response = await fetch('/api/execute-migration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to execute migration');
      }

      toast.success('Migration executed successfully');
      
      // Reload the page to reflect the changes
      window.location.reload();
    } catch (error) {
      console.error('Error executing migration:', error);
      toast.error(`Failed to execute migration: ${(error as Error).message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <Button 
      onClick={handleExecuteMigration} 
      disabled={isExecuting}
      variant="default"
    >
      {isExecuting ? 'Executing Migration...' : 'Execute Member Finance Migration'}
    </Button>
  );
}
