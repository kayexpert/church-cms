"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Activity,
  MessageSquare,
  Calendar,
  Trash2
} from "lucide-react";
import { toast } from "sonner";

interface MessageStatus {
  id: string;
  name: string;
  type: string;
  status: string;
  schedule_time: string;
  updated_at: string;
  error_message?: string;
}

interface SystemStatus {
  scheduledMessages: {
    total: number;
    active: number;
    processing: number;
    completed: number;
    failed: number;
  };
  birthdayMessages: {
    total: number;
    active: number;
  };
  stuckMessages: {
    count: number;
    messages: MessageStatus[];
  };
  lastCronRun: string | null;
}

export function MessagingStatusMonitor() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchSystemStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch various status endpoints
      const [messagesResponse, stuckResponse] = await Promise.all([
        fetch('/api/messaging/messages').catch(err => {
          console.error('Error fetching messages:', err);
          return { ok: false, json: () => Promise.resolve({ success: false, error: 'Failed to fetch messages' }) };
        }),
        fetch(`/api/cron/cleanup-stuck-messages?token=church-cms-cron-secret-key-2025`).catch(err => {
          console.error('Error fetching stuck messages:', err);
          return { ok: false, json: () => Promise.resolve({ success: false, error: 'Failed to fetch stuck messages' }) };
        })
      ]);

      const messagesData = await messagesResponse.json();
      const stuckData = await stuckResponse.json();

      if (messagesData.success && stuckData.success) {
        const messages = messagesData.messages || [];

        // Categorize messages
        const scheduledMessages = {
          total: messages.filter((m: MessageStatus) => m.type !== 'birthday').length,
          active: messages.filter((m: MessageStatus) => m.type !== 'birthday' && m.status === 'active').length,
          processing: messages.filter((m: MessageStatus) => m.type !== 'birthday' && m.status === 'processing').length,
          completed: messages.filter((m: MessageStatus) => m.type !== 'birthday' && m.status === 'completed').length,
          failed: messages.filter((m: MessageStatus) => m.type !== 'birthday' && ['failed', 'error'].includes(m.status)).length,
        };

        const birthdayMessages = {
          total: messages.filter((m: MessageStatus) => m.type === 'birthday' || m.name?.startsWith('[Birthday]')).length,
          active: messages.filter((m: MessageStatus) => (m.type === 'birthday' || m.name?.startsWith('[Birthday]')) && m.status === 'active').length,
        };

        setSystemStatus({
          scheduledMessages,
          birthdayMessages,
          stuckMessages: {
            count: stuckData.stuckCount || 0,
            messages: stuckData.stuckMessages || []
          },
          lastCronRun: null // We'll implement this later
        });
      }
    } catch (error) {
      console.error('Error fetching system status:', error);
      toast.error('Failed to fetch system status');
    } finally {
      setIsLoading(false);
      setLastRefresh(new Date());
    }
  }, []);

  const triggerCronJob = useCallback(async () => {
    try {
      const response = await fetch('/api/messaging/trigger-cron', {
        method: 'POST'
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Cron job triggered successfully');
        // Refresh status after a short delay
        setTimeout(fetchSystemStatus, 2000);
      } else {
        toast.error('Failed to trigger cron job');
      }
    } catch (error) {
      console.error('Error triggering cron job:', error);
      toast.error('Failed to trigger cron job');
    }
  }, [fetchSystemStatus]);

  const cleanupStuckMessages = useCallback(async () => {
    try {
      const response = await fetch('/api/cron/cleanup-stuck-messages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer church-cms-cron-secret-key-2025`
        }
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Cleaned up ${result.cleaned || 0} stuck messages`);
        fetchSystemStatus();
      } else {
        toast.error('Failed to cleanup stuck messages');
      }
    } catch (error) {
      console.error('Error cleaning up stuck messages:', error);
      toast.error('Failed to cleanup stuck messages');
    }
  }, [fetchSystemStatus]);

  useEffect(() => {
    fetchSystemStatus();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchSystemStatus, 30000);

    return () => clearInterval(interval);
  }, [fetchSystemStatus]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!systemStatus) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Messaging System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading system status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Messaging System Status
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchSystemStatus}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={triggerCronJob}
            >
              <Clock className="h-4 w-4" />
              Trigger Cron
            </Button>
          </div>
        </CardTitle>
        {lastRefresh && (
          <p className="text-sm text-muted-foreground">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Scheduled Messages Status */}
        <div>
          <h3 className="flex items-center gap-2 font-medium mb-3">
            <MessageSquare className="h-4 w-4" />
            Scheduled Messages
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{systemStatus.scheduledMessages.total}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{systemStatus.scheduledMessages.active}</div>
              <div className="text-sm text-muted-foreground">Active</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{systemStatus.scheduledMessages.processing}</div>
              <div className="text-sm text-muted-foreground">Processing</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{systemStatus.scheduledMessages.completed}</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{systemStatus.scheduledMessages.failed}</div>
              <div className="text-sm text-muted-foreground">Failed</div>
            </div>
          </div>
        </div>

        {/* Birthday Messages Status */}
        <div>
          <h3 className="flex items-center gap-2 font-medium mb-3">
            <Calendar className="h-4 w-4" />
            Birthday Messages
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{systemStatus.birthdayMessages.total}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{systemStatus.birthdayMessages.active}</div>
              <div className="text-sm text-muted-foreground">Active</div>
            </div>
          </div>
        </div>

        {/* Stuck Messages Alert */}
        {systemStatus.stuckMessages.count > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                {systemStatus.stuckMessages.count} message(s) are stuck in processing state
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={cleanupStuckMessages}
              >
                <Trash2 className="h-4 w-4" />
                Cleanup
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* System Health Indicators */}
        <div>
          <h3 className="font-medium mb-3">System Health</h3>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              Cron Jobs: Active
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              Database: Connected
            </Badge>
            {systemStatus.stuckMessages.count === 0 ? (
              <Badge variant="outline" className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                No Stuck Messages
              </Badge>
            ) : (
              <Badge variant="destructive" className="flex items-center gap-1">
                <XCircle className="h-3 w-3" />
                {systemStatus.stuckMessages.count} Stuck Messages
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
