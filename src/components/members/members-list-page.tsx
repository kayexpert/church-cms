"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { Search, Filter, UserPlus } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
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
import dynamic from "next/dynamic";
import { MembersListSkeleton } from "@/components/members/members-consolidated-skeletons";

// Dynamically import ResponsiveMembersList to prevent hydration issues
const ResponsiveMembersList = dynamic(
  () => import("@/components/members/responsive-members-list").then(mod => ({ default: mod.ResponsiveMembersList })),
  {
    ssr: false, // Disable SSR to prevent hydration mismatches
    loading: () => <MembersListSkeleton />
  }
);

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
  // Local refresh trigger to force re-renders
  const [localRefreshTrigger, setLocalRefreshTrigger] = useState(refreshTrigger);

  // Debounce search query for better performance
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Keep local refresh trigger in sync with parent's refresh trigger
  useEffect(() => {
    setLocalRefreshTrigger(refreshTrigger);
  }, [refreshTrigger]);

  // Memoized handlers to prevent unnecessary re-renders
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, [setSearchQuery]);

  const handleStatusChange = useCallback((value: string) => {
    setStatusFilter(value);
  }, [setStatusFilter]);

  const handleAddMember = useCallback(() => {
    setIsAddMemberOpen(true);
  }, [setIsAddMemberOpen]);

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
                onChange={handleSearchChange}
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={handleStatusChange}
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
            <Button onClick={handleAddMember} className="whitespace-nowrap flex-shrink-0">
              <UserPlus className="h-4 w-4 mr-2 hidden sm:inline" />
              <span className="hidden sm:inline">Add Member</span>
              <UserPlus className="h-4 w-4 sm:hidden" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Use the ResponsiveMembersList directly with local refresh trigger */}
        <div className="animate-in fade-in duration-300">
          <ResponsiveMembersList
            searchQuery={debouncedSearchQuery}
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
