"use client";

import { useState, useEffect, useCallback, memo, useMemo, startTransition } from "react";
import { format } from "date-fns";
import { Trash2, Eye, Send, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useMessages, useMessageMutations } from "@/hooks/use-messaging";
import { sendMessageImmediately } from "@/services/enhanced-messaging-service";
import { Message } from "@/types/messaging";
import { PaginatedTable } from "@/components/ui/paginated-table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { MessageCard } from "@/components/messaging/message-card";
import { EmptyMessageState } from "@/components/messaging/empty-message-state";
import { useMediaQuery } from "@/hooks/use-media-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

interface MessageListProps {
  type: 'quick' | 'group' | 'birthday';
  refreshTrigger?: number;
}

function MessageListComponent({ type, refreshTrigger = 0 }: MessageListProps) {
  const [page, setPage] = useState(1);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [sendingMessageId, setSendingMessageId] = useState<string | null>(null);
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);

  // Check if we're on mobile
  const isMobile = useMediaQuery("(max-width: 768px)");

  const pageSize = 10;

  // Set up filters based on message type
  const filters = useMemo(() => {
    return { type };
  }, [type]);

  const { data, isLoading, refetch } = useMessages(page, pageSize, filters);
  const { deleteMessage, deleteMessages } = useMessageMutations();

  // Refetch when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger > 0) {
      refetch();
    }
  }, [refreshTrigger, refetch]);

  // Use data directly since filtering is now handled by the API
  const filteredData = useMemo(() => {
    if (!data?.data) {
      return { data: [], count: 0 };
    }
    return data;
  }, [data]);

  // Memoized handlers to prevent unnecessary re-renders with transition for better UX
  const handlePageChange = useCallback((newPage: number) => {
    startTransition(() => {
      setPage(newPage);
    });
  }, []);

  const handleView = useCallback((message: Message) => {
    setSelectedMessage(message);
    setIsViewDialogOpen(true);
  }, []);

  const handleDelete = useCallback((message: Message) => {
    setSelectedMessage(message);
    setIsDeleteDialogOpen(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (selectedMessage) {
      await deleteMessage.mutateAsync(selectedMessage.id);
      setIsDeleteDialogOpen(false);
      refetch();
    }
  }, [selectedMessage, deleteMessage, refetch]);

  // Toggle selection of a single message
  const toggleMessageSelection = useCallback((messageId: string) => {
    setSelectedMessages(prev =>
      prev.includes(messageId)
        ? prev.filter(id => id !== messageId)
        : [...prev, messageId]
    );
  }, []);

  // Toggle selection of all messages
  const toggleAllMessages = useCallback(() => {
    if (!data?.data) return;

    if (selectedMessages.length === data.data.length) {
      // If all are selected, deselect all
      setSelectedMessages([]);
    } else {
      // Otherwise, select all
      setSelectedMessages(data.data.map(message => message.id));
    }
  }, [data?.data, selectedMessages.length]);

  // Handle bulk delete
  const confirmBulkDelete = useCallback(async () => {
    if (selectedMessages.length === 0) return;

    try {
      // Delete messages in bulk
      await deleteMessages.mutateAsync(selectedMessages);

      // Clear selection and close dialog
      setSelectedMessages([]);
      setIsBulkDeleteDialogOpen(false);

      // Refresh the list
      refetch();
    } catch (error) {
      console.error("Error deleting messages:", error);
      toast.error("Failed to delete messages");
    }
  }, [selectedMessages, deleteMessages, refetch]);

  // Function to send a message immediately using the enhanced service
  const handleSendNow = useCallback(async (message: Message) => {
    // Validate message ID
    if (!message?.id) {
      toast.error('Cannot send message: Invalid message data');
      return;
    }

    let loadingToastId: string | null = null;

    try {
      setSendingMessageId(message.id);

      // Show a loading toast for group messages
      if (message.type === 'group') {
        loadingToastId = toast.loading('Sending group message...', {
          description: 'Please wait while we send your message to all recipients.',
          duration: 60000 // 1 minute timeout
        });
      }

      // Check if SMS provider is configured
      try {
        const configResponse = await fetch('/api/messaging/debug-sms-config');
        const configData = await configResponse.json();

        if (!configData.success) {
          // Show error with action to fix
          toast.error('SMS provider not configured. Click to fix.', {
            duration: 10000,
            action: {
              label: 'Fix Now',
              onClick: async () => {
                try {
                  // First try to normalize the SMS configuration
                  const normalizeResponse = await fetch('/api/messaging/normalize-sms-config', {
                    method: 'POST'
                  });

                  let fixResponse, fixData;

                  // If normalization fails, try the fix endpoint
                  if (!normalizeResponse.ok) {
                    fixResponse = await fetch('/api/messaging/fix-sms-config', {
                      method: 'POST'
                    });
                    fixData = await fixResponse.json();
                  } else {
                    fixResponse = normalizeResponse;
                    fixData = await normalizeResponse.json();
                  }

                  if (fixResponse.ok && fixData.success) {
                    toast.success('SMS provider configured successfully. Try sending again.');
                  } else {
                    toast.error(`Failed to fix SMS provider: ${fixData.error || 'Unknown error'}`);
                  }
                } catch (fixError) {
                  toast.error(`Error fixing SMS provider: ${fixError instanceof Error ? fixError.message : 'Unknown error'}`);
                }
              }
            }
          });
          return;
        }
      } catch (configError) {
        // Continue with the send attempt even if config check fails
      }

      // Use the enhanced messaging service to send the message
      const response = await sendMessageImmediately(message);

      if (response.error) {
        // Special handling for no provider configured
        if (response.noProviderConfigured) {
          toast.error('No SMS provider configured', {
            description: 'You need to set up an SMS provider in settings before you can send messages.',
            duration: 8000,
            action: {
              label: 'Settings',
              onClick: () => {
                window.location.href = '/settings?tab=messages';
              }
            }
          });
          throw new Error('No SMS provider configured. Please set up an SMS provider in settings.');
        }

        throw response.error;
      }

      // Dismiss loading toast if it exists
      if (loadingToastId) {
        toast.dismiss(loadingToastId);
      }

      // Check if we're using a mock provider
      const isMockProvider = response.data?.mockWarning ||
                            (response.data?.smsProvider?.isMock === true);
      const bulkSendStats = response.data?.bulkSendStats;
      const isGroupMessage = message.type === 'group';

      if (isMockProvider) {
        // Show warning toast for mock provider
        toast.warning('Message created but NOT actually sent! Using mock SMS provider.', {
          description: 'Configure a real SMS provider in settings to send actual messages.',
          duration: 8000,
          action: {
            label: 'Settings',
            onClick: () => {
              window.location.href = '/settings?tab=messages';
            }
          }
        });
      } else if (bulkSendStats) {
        // Show success toast with bulk send stats
        const { totalSent, totalFailed, totalRecipients } = bulkSendStats;

        toast.success('Group message sent successfully!', {
          description: `Sent to ${totalSent} of ${totalRecipients} recipients${totalFailed ? ` (${totalFailed} failed)` : ''}`,
          duration: 8000,
          action: isGroupMessage ? {
            label: 'View Logs',
            onClick: () => {
              window.location.href = `/messaging/logs?message_id=${message.id}`;
            }
          } : undefined
        });
      } else if (isGroupMessage) {
        // Show success toast for group message without stats
        toast.success('Group message sent successfully!', {
          description: 'The message has been sent to all eligible members in the selected group(s).',
          duration: 5000
        });
      } else {
        // Show success toast for regular message
        toast.success('Message sent successfully', {
          duration: 5000,
        });
      }

      // Refetch to update the list
      refetch();
    } catch (error) {
      // Dismiss loading toast if it exists
      if (loadingToastId) {
        toast.dismiss(loadingToastId);
      }

      // Create a more user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      let errorTitle = 'Failed to send message';
      let errorDescription = '';
      let errorAction = null;

      // Map common error messages to user-friendly messages
      if (errorMessage.includes('404') || errorMessage.includes('not found') || errorMessage.includes('Message not found')) {
        errorTitle = 'Message not found';
        errorDescription = `The message may have been deleted.`;
        // Refresh the list to remove the deleted message
        refetch();
      } else if (errorMessage.includes('No recipients')) {
        errorTitle = 'No recipients';
        errorDescription = 'This message has no recipients. Please add recipients and try again.';
      } else if (errorMessage.includes('No SMS provider configured')) {
        errorTitle = 'No SMS provider';
        errorDescription = 'No SMS provider is configured. Please configure an SMS provider in the settings.';
        errorAction = {
          label: 'Settings',
          onClick: () => {
            window.location.href = '/settings?tab=messages';
          }
        };
      } else if (errorMessage.includes('Invalid SMS provider configuration')) {
        errorTitle = 'Invalid configuration';
        errorDescription = 'SMS provider configuration is invalid. Please update your SMS provider settings.';
        errorAction = {
          label: 'Settings',
          onClick: () => {
            window.location.href = '/settings?tab=messages';
          }
        };
      } else if (errorMessage.includes('Member not found')) {
        errorTitle = 'Member not found';
        errorDescription = 'One or more members were not found in the database. They may have been deleted.';
      } else if (errorMessage.includes('Member is not active')) {
        errorTitle = 'Inactive member';
        errorDescription = 'One or more members are not active and cannot receive messages.';
      } else if (errorMessage.includes('Member has no phone number')) {
        errorTitle = 'Missing phone number';
        errorDescription = 'One or more members do not have a phone number and cannot receive SMS messages.';
      } else if (errorMessage.includes('Failed to create/send message for all recipients')) {
        errorTitle = 'All recipients failed';
        errorDescription = 'Could not send the message to any of the recipients.';
      } else if (errorMessage.includes('Group not found')) {
        errorTitle = 'Group not found';
        errorDescription = 'One or more groups were not found in the database. They may have been deleted.';
      } else if (errorMessage.includes('No active members')) {
        errorTitle = 'No active members';
        errorDescription = 'One or more groups have no active members. Add active members to the group and try again.';
      } else if (errorMessage.includes('No members with phone numbers')) {
        errorTitle = 'No phone numbers';
        errorDescription = 'One or more groups have no members with phone numbers. Add phone numbers to the members and try again.';
      } else if (errorMessage.includes('Error getting members for group')) {
        errorTitle = 'Error getting group members';
        errorDescription = 'There was an error retrieving members from one or more groups. Please try again later.';
      }

      // Show the error toast
      toast.error(errorTitle, {
        description: errorDescription || errorMessage,
        duration: 8000,
        action: errorAction
      });
    } finally {
      setSendingMessageId(null);
    }
  }, [refetch]);

  // Memoized utility functions to prevent unnecessary re-renders
  const getFrequencyLabel = useCallback((frequency: string) => {
    switch (frequency) {
      case 'one-time':
        return 'One-time';
      case 'daily':
        return 'Daily';
      case 'weekly':
        return 'Weekly';
      case 'monthly':
        return 'Monthly';
      case 'yearly':
        return 'Yearly';
      default:
        return frequency;
    }
  }, []);

  const getStatusBadge = useCallback((status: string) => {
    switch (status) {
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
  }, []);

  // Memoized columns to prevent unnecessary re-renders
  const columns = useMemo(() => [
    {
      key: 'selection',
      label: '',
      width: 40,
      render: (_: any, row: Message) => (
        <Checkbox
          checked={selectedMessages.includes(row.id)}
          onCheckedChange={() => toggleMessageSelection(row.id)}
          aria-label={`Select message ${row.name}`}
          className="data-[state=checked]:bg-primary"
        />
      ),
    },
    {
      key: 'name',
      label: 'Name',
      render: (value: string) => <span className="font-medium">{value}</span>,
    },
    {
      key: 'frequency',
      label: 'Frequency',
      render: (value: string) => getFrequencyLabel(value),
    },
    {
      key: 'schedule_time',
      label: 'Schedule',
      render: (value: string, row: Message) => {
        // For birthday messages, show "Daily Check" instead of schedule time
        if (row.name?.startsWith('[Birthday]') || row.type === 'birthday') {
          return <span className="text-muted-foreground">Daily Check</span>;
        }
        // For other messages, show the formatted schedule time
        return value ? format(new Date(value), 'PPP p') : <span className="text-muted-foreground">Not scheduled</span>;
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: string) => getStatusBadge(value),
    },
  ], [getFrequencyLabel, getStatusBadge, selectedMessages, toggleMessageSelection]);

  // Memoized actions function to prevent unnecessary re-renders
  const actions = useMemo(() => (message: Message) => {
    // Validate message object
    if (!message?.id) {
      return (
        <div className="flex items-center gap-2 justify-end">
          <Button
            variant="ghost"
            size="icon"
            disabled={true}
            title="Invalid message data"
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 justify-end">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleSendNow(message)}
          title="Send Now"
          disabled={sendingMessageId === message.id}
          className="text-primary hover:text-primary"
        >
          {sendingMessageId === message.id ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleView(message)}
          title="View Message"
        >
          <Eye className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleDelete(message)}
          title="Delete Message"
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    );
  }, [handleView, handleDelete, handleSendNow, sendingMessageId]);

  // Function to handle create message button click
  const handleCreateMessage = useCallback(() => {
    window.location.href = '/messaging/create';
  }, []);

  // Render mobile card view
  const renderMobileView = useMemo(() => {
    if (!filteredData?.data || filteredData.data.length === 0) {
      return (
        <EmptyMessageState
          type={type}
          onCreateClick={handleCreateMessage}
        />
      );
    }

    return (
      <div className="space-y-4">
        {/* Mobile bulk actions toolbar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="select-all-mobile"
              checked={selectedMessages.length === filteredData.data.length && filteredData.data.length > 0}
              onCheckedChange={toggleAllMessages}
              aria-label="Select all messages"
              className="data-[state=checked]:bg-primary"
            />
            <label
              htmlFor="select-all-mobile"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {selectedMessages.length === 0
                ? "Select all"
                : `Selected ${selectedMessages.length}`}
            </label>
          </div>

          {selectedMessages.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setIsBulkDeleteDialogOpen(true)}
              disabled={deleteMessage.isPending}
            >
              {deleteMessage.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete ({selectedMessages.length})
                </>
              )}
            </Button>
          )}
        </div>

        <div className="space-y-2">
          {filteredData.data.map((message) => (
            <div key={message.id} className="flex items-start space-x-2">
              <Checkbox
                checked={selectedMessages.includes(message.id)}
                onCheckedChange={() => toggleMessageSelection(message.id)}
                aria-label={`Select message ${message.name}`}
                className="mt-4 data-[state=checked]:bg-primary"
              />
              <div className="flex-1">
                <MessageCard
                  message={message}
                  onView={handleView}
                  onDelete={handleDelete}
                  onSendNow={handleSendNow}
                  sendingMessageId={sendingMessageId}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Mobile Pagination */}
        <div className="flex flex-col items-center gap-4 py-2">
          <div className="text-xs text-muted-foreground">
            Showing {filteredData.data.length > 0 ? (page - 1) * pageSize + 1 : 0} to{" "}
            {Math.min(page * pageSize, filteredData.count || 0)} of {filteredData.count || 0} entries
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(Math.max(page - 1, 1))}
              disabled={page === 1}
              className="h-8 w-8 p-0"
            >
              <span className="sr-only">Previous</span>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-xs font-medium">
              Page {page} of {Math.ceil((filteredData?.count || 0) / pageSize) || 1}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(Math.min(page + 1, Math.ceil((filteredData?.count || 0) / pageSize)))}
              disabled={page === Math.ceil((filteredData?.count || 0) / pageSize) || Math.ceil((filteredData?.count || 0) / pageSize) === 0}
              className="h-8 w-8 p-0"
            >
              <span className="sr-only">Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }, [filteredData, selectedMessages, toggleAllMessages, deleteMessage.isPending, toggleMessageSelection, handleView, handleDelete, handleSendNow, sendingMessageId, page, pageSize, handlePageChange, type, handleCreateMessage]);

  // Desktop view with bulk actions toolbar and paginated table
  const desktopView = useMemo(() => {
    if (!filteredData?.data || filteredData.data.length === 0) {
      return (
        <EmptyMessageState
          type={type}
          onCreateClick={handleCreateMessage}
        />
      );
    }

    return (
      <>
        {/* Bulk actions toolbar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="select-all"
              checked={selectedMessages.length === filteredData.data.length && filteredData.data.length > 0}
              onCheckedChange={toggleAllMessages}
              aria-label="Select all messages"
              className="data-[state=checked]:bg-primary"
            />
            <label
              htmlFor="select-all"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {selectedMessages.length === 0
                ? "Select all"
                : `Selected ${selectedMessages.length} of ${filteredData.data.length}`}
            </label>
          </div>

          {selectedMessages.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setIsBulkDeleteDialogOpen(true)}
              disabled={deleteMessage.isPending}
            >
              {deleteMessage.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Selected ({selectedMessages.length})
                </>
              )}
            </Button>
          )}
        </div>

        <PaginatedTable
          data={filteredData.data}
          columns={columns}
          keyField="id"
          actions={actions}
          emptyMessage={`No ${type} messages found`}
          page={page}
          pageSize={pageSize}
          totalItems={filteredData.count || 0}
          totalPages={Math.ceil((filteredData.count || 0) / pageSize)}
          onPageChange={handlePageChange}
        />
      </>
    );
  }, [filteredData, selectedMessages, toggleAllMessages, deleteMessage.isPending, columns, actions, type, page, pageSize, handlePageChange, handleCreateMessage]);

  return (
    <div>
      {isMobile ? renderMobileView : desktopView}

      {/* View Message Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Message Details</DialogTitle>
            <DialogDescription>
              View the details of this message
            </DialogDescription>
          </DialogHeader>
          {selectedMessage && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs sm:text-sm font-medium text-muted-foreground">Name</h4>
                  <p className="text-sm sm:text-base">{selectedMessage.name}</p>
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-medium text-muted-foreground">Type</h4>
                  <p className="text-sm sm:text-base capitalize">{selectedMessage.type}</p>
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-medium text-muted-foreground">Frequency</h4>
                  <p className="text-sm sm:text-base">{getFrequencyLabel(selectedMessage.frequency)}</p>
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-medium text-muted-foreground">Status</h4>
                  <p className="text-sm sm:text-base">{getStatusBadge(selectedMessage.status)}</p>
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-medium text-muted-foreground">Schedule Time</h4>
                  <p className="text-sm sm:text-base">{format(new Date(selectedMessage.schedule_time), 'PPP p')}</p>
                </div>
                {selectedMessage.end_date && (
                  <div>
                    <h4 className="text-xs sm:text-sm font-medium text-muted-foreground">End Date</h4>
                    <p className="text-sm sm:text-base">{format(new Date(selectedMessage.end_date), 'PPP')}</p>
                  </div>
                )}
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-medium text-muted-foreground">Content</h4>
                <div className="mt-1 p-3 bg-muted rounded-md whitespace-pre-wrap text-sm sm:text-base">
                  {selectedMessage.content}
                </div>
              </div>
              {selectedMessage.error_message && (
                <div>
                  <h4 className="text-xs sm:text-sm font-medium text-destructive">Error Message</h4>
                  <div className="mt-1 p-3 bg-destructive/10 text-destructive rounded-md whitespace-pre-wrap text-sm sm:text-base">
                    {selectedMessage.error_message}
                  </div>
                </div>
              )}
              <DialogFooter className="mt-4 sm:mt-6">
                <Button
                  onClick={() => handleSendNow(selectedMessage)}
                  disabled={sendingMessageId === selectedMessage.id}
                  className="w-full sm:w-auto"
                >
                  {sendingMessageId === selectedMessage.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send Now
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this message and all associated logs.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMessage.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedMessages.length} messages?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedMessages.length} messages and all associated logs.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMessage.isPending ? "Deleting..." : `Delete ${selectedMessages.length} Messages`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Export memoized component to prevent unnecessary re-renders
export const MessageList = memo(MessageListComponent);
