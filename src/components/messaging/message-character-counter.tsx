"use client";

import { memo, useMemo } from "react";
import { AlertCircle } from "lucide-react";

interface MessageCharacterCounterProps {
  content: string;
  onChange: (content: string) => void;
}

function MessageCharacterCounterComponent({ content }: MessageCharacterCounterProps) {
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
    </div>
  );
}

// Export memoized component to prevent unnecessary re-renders
export const MessageCharacterCounter = memo(MessageCharacterCounterComponent);
