'use client';

import { MessageSquarePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';

interface EmptyMessageStateProps {
  type?: string;
  onCreateClick?: () => void;
}

import { memo } from 'react';

function EmptyMessageStateComponent({ type, onCreateClick }: EmptyMessageStateProps) {
  return (
    <Card className="w-full border-dashed">
      <CardContent className="pt-6 text-center">
        <div className="flex justify-center mb-4">
          <MessageSquarePlus className="h-12 w-12 text-muted-foreground/50" />
        </div>
        <h3 className="text-lg font-medium mb-2">No messages found</h3>
        <p className="text-muted-foreground mb-4">
          {type
            ? `You haven't created any ${type} messages yet.`
            : "You haven't created any messages yet."}
        </p>
        <p className="text-sm text-muted-foreground/80 mb-6">
          Messages allow you to send SMS notifications to individuals or groups.
          {type === 'birthday' && " Birthday messages are sent automatically on members' birthdays."}
        </p>
      </CardContent>
      <CardFooter className="flex justify-center pb-6">
        <Button
          onClick={onCreateClick}
          className="w-full sm:w-auto"
        >
          <MessageSquarePlus className="mr-2 h-4 w-4" />
          Create your first message
        </Button>
      </CardFooter>
    </Card>
  );
}

// Export memoized component to prevent unnecessary re-renders
export const EmptyMessageState = memo(EmptyMessageStateComponent);
