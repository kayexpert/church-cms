"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, AlertCircle, BarChart3, XCircle } from "lucide-react";
import { toast } from "sonner";
import { CostTrackingSkeleton } from "./message-settings-skeleton";

interface WigalBalance {
  balance: number;
  currency: string;
  lastUpdated: Date;
}

interface MessageStatistics {
  totalSent: number;
  totalCost: number;
  averageCost: number;
  totalSegments: number;
  statusCounts?: Record<string, number>;
}

interface FetchState {
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
}

function CostTrackingTab() {
  // Data states
  const [balance, setBalance] = useState<WigalBalance | null>(null);
  const [messageStats, setMessageStats] = useState<MessageStatistics>({
    totalSent: 0,
    totalCost: 0,
    averageCost: 0,
    totalSegments: 0
  });

  // Fetch states
  const [balanceFetch, setBalanceFetch] = useState<FetchState>({
    isLoading: true,
    isError: false
  });

  const [statsFetch, setStatsFetch] = useState<FetchState>({
    isLoading: true,
    isError: false
  });

  // Derived state for overall loading
  const isLoading = balanceFetch.isLoading || statsFetch.isLoading;
  const hasError = balanceFetch.isError || statsFetch.isError;
  const isInitialLoad = balanceFetch.isLoading && statsFetch.isLoading;

  // Fetch Wigal balance
  const fetchWigalBalance = async (showToast = true) => {
    setBalanceFetch({ isLoading: true, isError: false });
    try {
      console.log('Fetching Wigal balance...');
      const response = await fetch('/api/messaging/wigal-balance');

      // Get the response text for debugging
      const responseText = await response.text();

      // Try to parse the JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Error parsing Wigal balance response:', parseError);
        if (showToast) toast.error("Invalid response from server");
        setBalanceFetch({
          isLoading: false,
          isError: true,
          errorMessage: "Failed to parse server response"
        });
        return;
      }

      if (data.success && data.balance) {
        setBalance({
          balance: data.balance.amount,
          currency: data.balance.currency || 'GHS',
          lastUpdated: new Date()
        });
        setBalanceFetch({ isLoading: false, isError: false });
      } else {
        console.error('Wigal balance error:', data.error || 'Unknown error');
        if (showToast) toast.error(data.error || "Could not retrieve your Wigal balance");
        setBalanceFetch({
          isLoading: false,
          isError: true,
          errorMessage: data.error || "Could not retrieve balance"
        });
      }
    } catch (error) {
      console.error('Error fetching Wigal balance:', error);
      if (showToast) toast.error("Failed to fetch Wigal balance. Please try again later.");
      setBalanceFetch({
        isLoading: false,
        isError: true,
        errorMessage: "Network error. Please check your connection."
      });
    }
  };

  // Fetch message statistics from Wigal API
  const fetchMessageStats = async (showToast = true) => {
    setStatsFetch({ isLoading: true, isError: false });
    try {
      console.log('Fetching message statistics from Wigal...');

      // Get the current date and 30 days ago
      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(now.getDate() - 30);

      // Format dates as YYYY-MM-DD
      const formatDate = (date: Date) => {
        return date.toISOString().split('T')[0];
      };

      // Prepare the request payload
      const payload = {
        datefrom: formatDate(thirtyDaysAgo),
        dateto: formatDate(now),
      };

      // Make the API request to our backend endpoint
      const response = await fetch('/api/messaging/wigal-history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      // Get the response text for debugging
      const responseText = await response.text();

      // Try to parse the JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Error parsing Wigal history response:', parseError);
        if (showToast) toast.error("Invalid response from server");
        setStatsFetch({
          isLoading: false,
          isError: true,
          errorMessage: "Failed to parse server response"
        });
        return;
      }

      if (data.success && data.statistics) {
        // Update the message stats with real data from Wigal
        setMessageStats({
          totalSent: data.statistics.totalMessages || 0,
          totalCost: data.statistics.totalCost || 0,
          averageCost: data.statistics.averageCost || 0,
          totalSegments: data.statistics.totalSegments || 0,
          statusCounts: data.statistics.statusCounts || {}
        });
        setStatsFetch({ isLoading: false, isError: false });

        // Show success toast only on manual refresh
        if (showToast) toast.success(`Loaded statistics for ${data.statistics.totalMessages} messages`);
      } else {
        console.error('Wigal history error:', data.error || 'Unknown error');
        if (showToast) toast.error(data.error || "Could not retrieve message statistics");

        // Set default values on error
        setMessageStats({
          totalSent: 0,
          totalCost: 0,
          averageCost: 0,
          totalSegments: 0
        });

        setStatsFetch({
          isLoading: false,
          isError: true,
          errorMessage: data.error || "Could not retrieve message statistics"
        });
      }
    } catch (error) {
      console.error('Error fetching message stats:', error);
      if (showToast) toast.error("Failed to fetch message statistics. Please try again later.");

      // Set default values on error
      setMessageStats({
        totalSent: 0,
        totalCost: 0,
        averageCost: 0,
        totalSegments: 0
      });

      setStatsFetch({
        isLoading: false,
        isError: true,
        errorMessage: "Network error. Please check your connection."
      });
    }
  };

  // Refresh all data
  const refreshAllData = () => {
    fetchWigalBalance(true);
    fetchMessageStats(true);
  };

  // Initialize data
  useEffect(() => {
    fetchWigalBalance(false);
    fetchMessageStats(false);
  }, []);

  // If we're still in the initial loading state, show the skeleton
  if (isInitialLoad) {
    return <CostTrackingSkeleton />;
  }

  // If there are critical errors with both API calls, show a full error state
  if (balanceFetch.isError && statsFetch.isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <XCircle className="h-16 w-16 text-destructive mb-4" />
        <h3 className="text-xl font-medium mb-2">Failed to Load Cost Tracking Data</h3>
        <p className="text-muted-foreground mb-6 max-w-md">
          We couldn't retrieve your SMS cost tracking information. This could be due to network issues or a problem with the Wigal API.
        </p>
        <Button onClick={refreshAllData}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Wigal Balance Card - Full Width */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Wigal SMS Balance</CardTitle>
          <CardDescription>Your current SMS credit balance</CardDescription>
        </CardHeader>
        <CardContent>
          {balanceFetch.isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : balanceFetch.isError ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mb-4 text-destructive" />
              <p className="text-lg">{balanceFetch.errorMessage || "Could not retrieve balance"}</p>
            </div>
          ) : balance ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="text-5xl font-bold mb-4">{balance.currency} {balance.balance.toFixed(2)}</div>
              <p className="text-sm text-muted-foreground">
                Last updated: {balance.lastUpdated.toLocaleString()}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mb-4" />
              <p className="text-lg">No balance information available</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => fetchWigalBalance(true)}
            disabled={balanceFetch.isLoading}
            className="w-full max-w-xs"
          >
            {balanceFetch.isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh Balance
          </Button>
        </CardFooter>
      </Card>

      {/* Message Statistics Card - Full Width */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Message Statistics</CardTitle>
          <CardDescription>Overview of your messaging activity (last 30 days)</CardDescription>
        </CardHeader>
        <CardContent>
          {statsFetch.isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : statsFetch.isError ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mb-4 text-destructive" />
              <p className="text-lg">{statsFetch.errorMessage || "Could not retrieve message statistics"}</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Main statistics - Full Width Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="flex flex-col items-center space-y-2 p-4 bg-muted/20 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Messages</p>
                  <p className="text-3xl font-bold">{messageStats.totalSent}</p>
                </div>
                <div className="flex flex-col items-center space-y-2 p-4 bg-muted/20 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Cost</p>
                  <p className="text-3xl font-bold">GHS {messageStats.totalCost.toFixed(2)}</p>
                </div>
                <div className="flex flex-col items-center space-y-2 p-4 bg-muted/20 rounded-lg">
                  <p className="text-sm text-muted-foreground">Avg. Cost/SMS</p>
                  <p className="text-3xl font-bold">GHS {messageStats.averageCost.toFixed(3)}</p>
                </div>
                <div className="flex flex-col items-center space-y-2 p-4 bg-muted/20 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Segments</p>
                  <p className="text-3xl font-bold">{messageStats.totalSegments}</p>
                </div>
              </div>

              {/* Status breakdown */}
              {messageStats.statusCounts && Object.keys(messageStats.statusCounts).length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2" />
                    <h3 className="text-lg font-medium">Message Status Breakdown</h3>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {Object.entries(messageStats.statusCounts).map(([status, count]) => (
                      <div key={status} className="flex flex-col p-3 border rounded-md">
                        <span className="text-sm text-muted-foreground">{status}</span>
                        <span className="text-xl font-semibold">{count}</span>
                        <span className="text-xs text-muted-foreground">
                          {messageStats.totalSent > 0
                            ? `${((count / messageStats.totalSent) * 100).toFixed(1)}%`
                            : '0%'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No data message */}
              {messageStats.totalSent === 0 && !statsFetch.isError && (
                <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mb-2" />
                  <p>No message data available for the last 30 days</p>
                  <p className="text-sm mt-1">Send messages to see statistics here</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => fetchMessageStats(true)}
            disabled={statsFetch.isLoading}
            className="w-full max-w-xs"
          >
            {statsFetch.isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh Stats
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export default CostTrackingTab;
