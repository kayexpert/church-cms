"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { format } from "date-fns";
import { Eye, AlertCircle, Search, Filter, X, XCircle, Loader2 } from "lucide-react";
import { useMessageLogs } from "@/hooks/use-messaging";
import { MessageLog } from "@/types/messaging";
import { PaginatedTable } from "@/components/ui/paginated-table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { MessageLogListSkeleton } from "./message-settings-skeleton";

interface MessageLogListProps {
  messageId?: string;
  refreshTrigger?: number;
}

interface FetchState {
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
}

function MessageLogList({ messageId, refreshTrigger = 0 }: MessageLogListProps) {
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<MessageLog | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // Search and filtering
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // Debounce search term to improve performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Use useRef for caching to persist across renders
  const recipientNamesCache = useRef<Record<string, string>>({});
  const messageNamesCache = useRef<Record<string, string>>({});

  // State for UI updates
  const [recipientNames, setRecipientNames] = useState<Record<string, string>>({});
  const [messageNames, setMessageNames] = useState<Record<string, string>>({});

  // Enhanced loading states
  const [namesFetch, setNamesFetch] = useState<FetchState>({
    isLoading: true,  // Start with loading state true
    isError: false
  });

  const pageSize = 10;
  const filters = messageId ? { message_id: messageId } : {};
  const { data, isLoading: isLoadingLogs, error: logsError, refetch } = useMessageLogs(page, pageSize, filters);

  // Derived loading state
  const isLoading = isLoadingLogs || namesFetch.isLoading;
  const isError = !!logsError || namesFetch.isError;

  // Consider it an initial load if either:
  // 1. We're still loading the logs and don't have data yet
  // 2. We have logs data but are still loading the names for the first time
  const isInitialLoad = (isLoadingLogs && !data) ||
                        (data && data.data && data.data.length > 0 && namesFetch.isLoading);

  // Refetch when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger > 0) {
      refetch();
    }
  }, [refreshTrigger, refetch]);

  // Load recipient and message names with caching
  useEffect(() => {
    async function loadNames() {
      // If we have no data, set loading to false since there's nothing to load
      if (!data?.data || data.data.length === 0) {
        setNamesFetch({ isLoading: false, isError: false });
        return;
      }

      // Set loading state
      setNamesFetch({ isLoading: true, isError: false });

      try {
        // Get unique recipient IDs that aren't already in the cache
        const allRecipientIds = [...new Set(data.data.map(log => log.recipient_id))];
        const uncachedRecipientIds = allRecipientIds.filter(id => !recipientNamesCache.current[id]);

        // Get unique message IDs that aren't already in the cache
        const allMessageIds = [...new Set(data.data.map(log => log.message_id))];
        const uncachedMessageIds = allMessageIds.filter(id => !messageNamesCache.current[id]);

        // Prepare combined results
        const combinedRecipientNames: Record<string, string> = { ...recipientNamesCache.current };
        const combinedMessageNames: Record<string, string> = { ...messageNamesCache.current };

        // Fetch uncached recipient names
        if (uncachedRecipientIds.length > 0) {
          const { data: members, error: recipientError } = await supabase
            .from('members')
            .select('id, first_name, last_name')
            .in('id', uncachedRecipientIds);

          if (recipientError) {
            console.error('Error fetching recipient names:', recipientError);
            throw new Error(`Failed to fetch recipient names: ${recipientError.message}`);
          }

          if (members) {
            members.forEach(member => {
              const fullName = `${member.first_name} ${member.last_name}`;
              combinedRecipientNames[member.id] = fullName;
              recipientNamesCache.current[member.id] = fullName;
            });
          }
        }

        // Fetch uncached message names
        if (uncachedMessageIds.length > 0) {
          const { data: messages, error: messageError } = await supabase
            .from('messages')
            .select('id, name')
            .in('id', uncachedMessageIds);

          if (messageError) {
            console.error('Error fetching message names:', messageError);
            throw new Error(`Failed to fetch message names: ${messageError.message}`);
          }

          if (messages) {
            messages.forEach(message => {
              combinedMessageNames[message.id] = message.name;
              messageNamesCache.current[message.id] = message.name;
            });
          }
        }

        // Update state with combined results (cached + newly fetched)
        setRecipientNames(combinedRecipientNames);
        setMessageNames(combinedMessageNames);

        // Set success state
        setNamesFetch({ isLoading: false, isError: false });
      } catch (error) {
        console.error('Error loading names:', error);
        setNamesFetch({
          isLoading: false,
          isError: true,
          errorMessage: error instanceof Error ? error.message : 'Failed to load message details'
        });
      }
    }

    loadNames();
  }, [data?.data]);

  // Memoize event handlers to prevent unnecessary re-renders
  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handleView = useCallback((log: MessageLog) => {
    setSelectedLog(log);
    setIsViewDialogOpen(true);
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Sent</Badge>;
      case 'delivered':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">Delivered</Badge>;
      case 'failed':
        return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">Failed</Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Pending</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20">Rejected</Badge>;
      case 'expired':
        return <Badge variant="outline" className="bg-gray-500/10 text-gray-500 border-gray-500/20">Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const columns = [
    {
      key: 'message_id',
      label: 'Message',
      render: (value: string) => <span className="font-medium">{messageNames[value] || value}</span>,
    },
    {
      key: 'recipient_id',
      label: 'Recipient',
      render: (value: string) => recipientNames[value] || value,
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: string) => getStatusBadge(value),
    },
    {
      key: 'sent_at',
      label: 'Sent At',
      render: (value: string) => format(new Date(value), 'PPP p'),
    },
  ];

  const actions = (log: MessageLog) => (
    <div className="flex items-center gap-2 justify-end">
      {log.status === 'failed' && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleView(log)}
          title="View Error"
          aria-label={`View error details for message to ${recipientNames[log.recipient_id] || log.recipient_id}`}
          className="text-destructive hover:text-destructive"
        >
          <AlertCircle className="h-4 w-4" />
          <span className="sr-only">View Error Details</span>
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => handleView(log)}
        title="View Log"
        aria-label={`View message log details for message to ${recipientNames[log.recipient_id] || log.recipient_id}`}
      >
        <Eye className="h-4 w-4" />
        <span className="sr-only">View Message Log Details</span>
      </Button>
    </div>
  );

  // Filter and search logic - memoized for performance
  const filteredData = useMemo(() => {
    return data?.data.filter(log => {
      // Search term filter
      const recipientName = recipientNames[log.recipient_id] || '';
      const messageName = messageNames[log.message_id] || '';
      const matchesSearch = debouncedSearchTerm === "" ||
        recipientName.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        messageName.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        log.recipient_id.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        log.message_id.toLowerCase().includes(debouncedSearchTerm.toLowerCase());

      // Status filter
      const matchesStatus = statusFilter === null || log.status === statusFilter;

      return matchesSearch && matchesStatus;
    }) || [];
  }, [data?.data, debouncedSearchTerm, statusFilter, recipientNames, messageNames]);

  // Reset filters - memoized
  const resetFilters = useCallback(() => {
    setSearchTerm("");
    setStatusFilter(null);
  }, []);

  // If we're still in the initial loading state, show the skeleton
  if (isInitialLoad) {
    return <MessageLogListSkeleton />;
  }

  // If there are critical errors with the API calls, show a full error state
  if (isError && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <XCircle className="h-16 w-16 text-destructive mb-4" />
        <h3 className="text-xl font-medium mb-2">Failed to Load Message Logs</h3>
        <p className="text-muted-foreground mb-6 max-w-md">
          We couldn't retrieve your message logs. This could be due to network issues or a database problem.
        </p>
        <Button onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div>
      {/* Search and Filter UI */}
      <div className="mb-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Label htmlFor="search-logs" className="sr-only">Search message logs</Label>
            <Input
              id="search-logs"
              placeholder="Search by recipient or message..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
              aria-label="Search message logs"
              disabled={isLoading}
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            {searchTerm && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                onClick={() => setSearchTerm("")}
                aria-label="Clear search"
                disabled={isLoading}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Clear search</span>
              </Button>
            )}
          </div>

          <div className="w-full sm:w-[180px]">
            <Label htmlFor="status-filter" className="sr-only">Filter by status</Label>
            <Select
              value={statusFilter || "all"}
              onValueChange={(v) => setStatusFilter(v === "all" ? null : v)}
              name="status-filter"
              aria-label="Filter messages by status"
              disabled={isLoading}
            >
              <SelectTrigger id="status-filter">
                <div className="flex items-center">
                  <Filter className="mr-2 h-4 w-4" aria-hidden="true" />
                  <SelectValue placeholder="All statuses" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(searchTerm || statusFilter) && (
            <Button
              variant="ghost"
              onClick={resetFilters}
              className="sm:w-auto"
              aria-label="Clear all search filters"
              disabled={isLoading}
            >
              Clear filters
            </Button>
          )}
        </div>

        {/* Filter summary */}
        {(searchTerm || statusFilter) && (
          <div className="text-sm text-muted-foreground">
            Showing {filteredData.length} filtered results
            {statusFilter && <span> with status: <Badge variant="outline">{statusFilter}</Badge></span>}
            {searchTerm && <span> matching: <Badge variant="outline">{searchTerm}</Badge></span>}
          </div>
        )}
      </div>

      {/* Loading overlay */}
      {isLoading && !isInitialLoad && (
        <div className="relative">
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10 rounded-md">
            <div className="flex flex-col items-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
              <p className="text-sm text-muted-foreground">Loading message logs...</p>
            </div>
          </div>
        </div>
      )}

      <PaginatedTable
        data={filteredData}
        columns={columns}
        keyField="id"
        actions={actions}
        emptyMessage={
          isLoading ? "Loading message logs..." :
          searchTerm || statusFilter
            ? "No message logs match your filters"
            : "No message logs found"
        }
        page={page}
        pageSize={pageSize}
        totalItems={filteredData.length}
        totalPages={Math.ceil(filteredData.length / pageSize)}
        onPageChange={handlePageChange}
      />

      {/* View Log Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Message Log Details</DialogTitle>
            <DialogDescription>
              View the details of this message log
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Message</h4>
                  <p>{messageNames[selectedLog.message_id] || selectedLog.message_id}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Recipient</h4>
                  <p>{recipientNames[selectedLog.recipient_id] || selectedLog.recipient_id}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Status</h4>
                  <p>{getStatusBadge(selectedLog.status)}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Sent At</h4>
                  <p>{format(new Date(selectedLog.sent_at), 'PPP p')}</p>
                </div>

                {selectedLog.delivered_at && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Delivered At</h4>
                    <p>{format(new Date(selectedLog.delivered_at), 'PPP p')}</p>
                  </div>
                )}

                {selectedLog.delivery_status && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Delivery Status</h4>
                    <p>{selectedLog.delivery_status}</p>
                  </div>
                )}

                {selectedLog.segments && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Segments</h4>
                    <p>{selectedLog.segments}</p>
                  </div>
                )}

                {selectedLog.cost && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Cost</h4>
                    <p>GHS {selectedLog.cost.toFixed(2)}</p>
                  </div>
                )}

                {selectedLog.message_id_from_provider && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Provider Message ID</h4>
                    <p className="text-xs font-mono">{selectedLog.message_id_from_provider}</p>
                  </div>
                )}
              </div>

              {selectedLog.error_message && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Error Message</h4>
                  <div className="mt-1 p-3 bg-destructive/10 text-destructive rounded-md whitespace-pre-wrap">
                    {selectedLog.error_message}
                  </div>
                </div>
              )}

              {selectedLog.delivery_status_details && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Delivery Status Details</h4>
                  <div className="mt-1 p-3 bg-muted rounded-md whitespace-pre-wrap">
                    {selectedLog.delivery_status_details}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default MessageLogList;
