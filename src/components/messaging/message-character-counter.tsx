"use client";

import { useState, memo, useCallback, useMemo } from "react";
import { Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useMessageShortener } from "@/hooks/use-messaging-config";
import { toast } from "sonner";

interface MessageCharacterCounterProps {
  content: string;
  onChange: (content: string) => void;
}

function MessageCharacterCounterComponent({ content, onChange }: MessageCharacterCounterProps) {
  const [isLoading, setIsLoading] = useState(false);

  // Fixed character limit for SMS messages
  const characterLimit = 160;

  // Calculate character count and status - memoized to prevent unnecessary recalculations
  const { characterCount, isOverLimit, remainingCharacters } = useMemo(() => {
    const count = content.length;
    return {
      characterCount: count,
      isOverLimit: count > characterLimit,
      remainingCharacters: characterLimit - count
    };
  }, [content, characterLimit]);

  // Get the message shortener hook
  const { shortenMessage } = useMessageShortener();

  // Handle rephrasing/optimizing the message - memoized to prevent unnecessary re-renders
  const handleRephraseMessage = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent any form submission
    e.stopPropagation(); // Stop event propagation

    if (!content || content.length === 0) return;

    setIsLoading(true);
    try {
      // Always try to rephrase for better clarity, even if under the limit
      console.log("Rephrasing message:", content);
      const rephrasedMessage = await shortenMessage.mutateAsync(content);

      if (rephrasedMessage) {
        console.log("Received rephrased message:", rephrasedMessage);
        onChange(rephrasedMessage);
      } else {
        console.error("Received empty rephrased message");
        toast.error("Failed to rephrase message");
      }
    } catch (error) {
      console.error('Error rephrasing message:', error);
      toast.error("Failed to rephrase message. Please try again.");

      // Simple fallback: truncate with ellipsis if over limit
      if (content.length > characterLimit) {
        const truncated = content.substring(0, characterLimit - 3) + '...';
        onChange(truncated);
      }
    } finally {
      setIsLoading(false);
    }
  }, [content, onChange, shortenMessage]);

  return (
    <div className="flex items-center justify-between text-xs text-muted-foreground mt-1.5">
      <div className="flex items-center">
        {isOverLimit ? (
          <AlertCircle className="h-3.5 w-3.5 text-destructive mr-1.5" />
        ) : null}
        <span className={isOverLimit ? "text-destructive" : ""}>
          {characterCount} / {characterLimit} characters
          {isOverLimit ? ` (${Math.abs(remainingCharacters)} over limit)` : ""}
        </span>
      </div>

      {/* Always show the refine button if content exists */}
      {content.length > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isOverLimit ? "default" : "ghost"}
                size="sm"
                className={`h-6 px-2 text-xs ${isOverLimit ? "bg-primary text-primary-foreground" : ""}`}
                onClick={handleRephraseMessage}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin mr-1">⟳</span>
                    Processing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5 mr-1" />
                    {isOverLimit ? 'Rephrase & Shorten' : 'Rephrase Message'}
                  </>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isOverLimit
                ? `AI will rephrase your message while preserving meaning (${characterLimit} chars)`
                : "AI will rephrase your message for clarity and conciseness"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

// Export memoized component to prevent unnecessary re-renders
export const MessageCharacterCounter = memo(MessageCharacterCounterComponent);
