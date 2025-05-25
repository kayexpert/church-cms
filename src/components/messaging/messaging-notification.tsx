"use client";

import { useState, useEffect } from "react";
import { 
  Bell, 
  X, 
  Info, 
  AlertCircle, 
  CheckCircle2, 
  AlertTriangle,
  Settings
} from "lucide-react";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { useMessaging } from "@/contexts/messaging-context";
import { MessageNotification } from "@/types/messaging";

export function MessagingNotification() {
  const { notifications, dismissNotification, navigateToSettings } = useMessaging();
  const [open, setOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  
  // Check for unread notifications
  useEffect(() => {
    if (notifications.length > 0) {
      setHasUnread(true);
    }
  }, [notifications]);
  
  // Reset unread status when popover is opened
  useEffect(() => {
    if (open) {
      setHasUnread(false);
    }
  }, [open]);
  
  // Get notification icon based on type
  const getNotificationIcon = (type?: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'info':
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };
  
  // Format timestamp
  const formatTime = (timestamp?: string) => {
    if (!timestamp) return '';
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (error) {
      return '';
    }
  };
  
  // Navigate to settings
  const handleNavigateToSettings = () => {
    navigateToSettings('messages');
    setOpen(false);
  };
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative"
          aria-label="Messaging notifications"
        >
          <Bell className="h-5 w-5" />
          {hasUnread && (
            <Badge 
              className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center bg-primary text-primary-foreground text-[10px]"
              aria-label="New notifications"
            >
              {notifications.length > 9 ? '9+' : notifications.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-medium">Messaging Notifications</h3>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8" 
            onClick={handleNavigateToSettings}
            title="Go to Message Settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
        
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            <p>No notifications</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="divide-y">
              {notifications.map((notification) => (
                <NotificationItem 
                  key={notification.id} 
                  notification={notification}
                  onDismiss={dismissNotification}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}

interface NotificationItemProps {
  notification: MessageNotification;
  onDismiss: (id: string) => void;
}

function NotificationItem({ notification, onDismiss }: NotificationItemProps) {
  return (
    <div className="p-4 relative hover:bg-muted/50 transition-colors">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-6 w-6 opacity-60 hover:opacity-100"
        onClick={() => onDismiss(notification.id!)}
        title="Dismiss notification"
      >
        <X className="h-3 w-3" />
      </Button>
      
      <div className="flex gap-3 pr-6">
        <div className="mt-0.5">
          {getNotificationIcon(notification.type)}
        </div>
        <div className="space-y-1">
          <p className={cn(
            "text-sm font-medium",
            notification.type === 'error' && "text-destructive"
          )}>
            {notification.title}
          </p>
          <p className="text-xs text-muted-foreground">
            {notification.message}
          </p>
          {notification.timestamp && (
            <p className="text-xs text-muted-foreground/70">
              {formatTime(notification.timestamp)}
            </p>
          )}
          {notification.action && (
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs"
              onClick={notification.action.onClick}
            >
              {notification.action.label}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper function to get notification icon based on type
function getNotificationIcon(type?: string) {
  switch (type) {
    case 'success':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    case 'error':
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    case 'info':
    default:
      return <Info className="h-4 w-4 text-blue-500" />;
  }
}
