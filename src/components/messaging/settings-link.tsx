"use client";

import { memo, useCallback } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMessaging } from "@/contexts/messaging-context";

// Memoized component to prevent unnecessary re-renders
export const MessagingSettingsLink = memo(function MessagingSettingsLink() {
  const { navigateToSettings } = useMessaging();

  // Memoize the click handler to prevent recreation on every render
  const handleClick = useCallback(() => {
    navigateToSettings('messages');
  }, [navigateToSettings]);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={handleClick}
            aria-label="Message Settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Message Settings</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});
