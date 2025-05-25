"use client";

import { memo, useMemo } from "react";
import { format } from "date-fns";
import { Trash2, Eye, Send, Loader2 } from "lucide-react";
import { Message } from "@/types/messaging";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

interface MessageCardProps {
  message: Message;
  onView: (message: Message) => void;
  onDelete: (message: Message) => void;
  onSendNow?: (message: Message) => void;
  sendingMessageId?: string | null;
}

function MessageCardComponent({
  message,
  onView,
  onDelete,
  onSendNow,
  sendingMessageId
}: MessageCardProps) {
  // Validate message object
  if (!message?.id) {
    return (
      <Card className="mb-3">
        <CardContent className="pt-4">
          <div className="space-y-3">
            <div className="flex justify-between items-start">
              <h3 className="font-medium text-sm truncate">Invalid Message Data</h3>
              <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">Error</Badge>
            </div>
            <div className="text-xs">
              <p className="text-muted-foreground">Error</p>
              <p className="truncate">This message has invalid data and cannot be displayed</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Utility functions - memoized to prevent unnecessary recalculations
  const frequencyLabel = useMemo(() => {
    const frequency = message.frequency;
    switch (frequency) {
      case 'one-time': return 'One-time';
      case 'daily': return 'Daily';
      case 'weekly': return 'Weekly';
      case 'monthly': return 'Monthly';
      default: return frequency;
    }
  }, [message.frequency]);

  const statusBadge = useMemo(() => {
    switch (message.status) {
      case 'active':
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Active</Badge>;
      case 'scheduled':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">Scheduled</Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Pending</Badge>;
      case 'processing':
        return <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">Processing</Badge>;
      case 'inactive':
      default:
        return <Badge variant="outline" className="bg-gray-500/10 text-gray-500 border-gray-500/20">Inactive</Badge>;
    }
  }, [message.status]);

  // Get message type label
  const typeLabel = useMemo(() => {
    switch (message.type) {
      case 'quick': return 'Quick Message';
      case 'group': return 'Group Message';
      case 'birthday': return 'Birthday Message';
      default: return message.type;
    }
  }, [message.type]);

  // Memoize the formatted schedule time
  const formattedScheduleTime = useMemo(() => {
    return format(new Date(message.schedule_time), 'PPP p');
  }, [message.schedule_time]);

  // Memoize the card content
  const cardContent = useMemo(() => (
    <CardContent className="pt-4">
      <div className="space-y-3">
        <div className="flex justify-between items-start">
          <h3 className="font-medium text-sm truncate">{message.name}</h3>
          {statusBadge}
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-muted-foreground">Type</p>
            <p>{typeLabel}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Frequency</p>
            <p>{frequencyLabel}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 text-xs">
          <div>
            <p className="text-muted-foreground">Schedule</p>
            <p>{formattedScheduleTime}</p>
          </div>
        </div>

        <div className="text-xs">
          <p className="text-muted-foreground">Content</p>
          <p className="truncate">{message.content}</p>
        </div>

        {message.error_message && (
          <div className="text-xs mt-2">
            <p className="text-destructive font-medium">Error</p>
            <p className="truncate text-destructive">{message.error_message}</p>
          </div>
        )}
      </div>
    </CardContent>
  ), [message.name, statusBadge, typeLabel, frequencyLabel, formattedScheduleTime, message.content, message.error_message]);

  // Memoize the card footer with action buttons
  const cardFooter = useMemo(() => (
    <CardFooter className="flex justify-end gap-2 pt-0 pb-3">
      {onSendNow && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSendNow(message)}
          title="Send Now"
          disabled={sendingMessageId === message.id}
          className="text-primary hover:text-primary"
        >
          {sendingMessageId === message.id ? (
            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5 mr-1" />
          )}
          Send
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onView(message)}
        title="View Message"
      >
        <Eye className="h-3.5 w-3.5 mr-1" />
        View
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onDelete(message)}
        title="Delete Message"
        className="text-destructive hover:text-destructive"
      >
        <Trash2 className="h-3.5 w-3.5 mr-1" />
        Delete
      </Button>
    </CardFooter>
  ), [message, onSendNow, sendingMessageId, onView, onDelete]);

  return (
    <Card className="mb-3">
      {cardContent}
      {cardFooter}
    </Card>
  );
}

// Export memoized component to prevent unnecessary re-renders
export const MessageCard = memo(MessageCardComponent);
