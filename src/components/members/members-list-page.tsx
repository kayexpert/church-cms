"use client";

import { Suspense, useEffect, useState } from "react";
import { Search, Filter, UserPlus, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ResponsiveMembersList } from "@/components/members/responsive-members-list";
import { MembersListSkeleton } from "@/components/members/members-consolidated-skeletons";
import { useQueryClient } from "@tanstack/react-query";
import { memberKeys } from "@/providers/query-config";

interface MembersListPageProps {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  refreshTrigger: number;
  setIsAddMemberOpen: (value: boolean) => void;
}

/**
 * MembersListPage component
 * This component is used to display the members list page
 * It includes the header section with search, filter, and add button
 * And the members list itself
 */
export function MembersListPage({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  refreshTrigger,
  setIsAddMemberOpen
}: MembersListPageProps) {
  // State to track if a refresh is in progress
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Get the query client for cache invalidation
  const queryClient = useQueryClient();

  // Local refresh trigger to force re-renders
  const [localRefreshTrigger, setLocalRefreshTrigger] = useState(refreshTrigger);

  // Keep local refresh trigger in sync with parent's refresh trigger
  useEffect(() => {
    setLocalRefreshTrigger(refreshTrigger);
  }, [refreshTrigger]);

  // Function to manually refresh the members list
  const handleRefresh = async () => {
    setIsRefreshing(true);

    try {
      // Invalidate all member-related queries
      await queryClient.invalidateQueries({ queryKey: memberKeys.lists() });

      // Increment the local refresh trigger to force a re-render
      setLocalRefreshTrigger(prev => prev + 1);
    } finally {
      // Set a small timeout to ensure the loading state is visible
      setTimeout(() => {
        setIsRefreshing(false);
      }, 500);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Members List</CardTitle>
            <CardDescription>
              Manage and view all church members
            </CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-[300px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search members..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Members</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button
                  onClick={handleRefresh}
                  variant="outline"
                  size="icon"
                  className="flex-shrink-0"
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span className="sr-only">Refresh</span>
                </Button>
                <Button onClick={() => setIsAddMemberOpen(true)} className="whitespace-nowrap flex-shrink-0">
                  <UserPlus className="h-4 w-4 mr-2 hidden sm:inline" />
                  <span className="hidden sm:inline">Add Member</span>
                  <UserPlus className="h-4 w-4 sm:hidden" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Use the ResponsiveMembersList directly with local refresh trigger */}
        <div className="animate-in fade-in duration-300">
          <ResponsiveMembersList
            searchQuery={searchQuery}
            statusFilter={statusFilter}
            refreshTrigger={localRefreshTrigger}
            viewMode="cards"
            setSearchQuery={setSearchQuery}
            setStatusFilter={setStatusFilter}
            setIsAddMemberOpen={setIsAddMemberOpen}
          />
        </div>
      </CardContent>
    </Card>
  );
}
