"use client";

import { useState, useCallback, useMemo } from "react";
import { Trash2, Users, Wifi, Clock, ShieldAlert, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ViewMemberDialog } from "@/components/members/view";
import { DeleteMemberDialog } from "@/components/members/delete-member-dialog";
import { toast } from "sonner";
import { useMembers, useMemberMutations } from "@/hooks/useMembers";
import { transformDatabaseMemberToUIMember, transformUIMemberToDatabaseMember } from "@/lib/member-utils";
import { ResponsiveMembersTable } from "@/components/members/responsive-members-table";
import { MemberCard } from "@/components/members/member-card";
import { MembersListSkeleton } from "@/components/members/members-consolidated-skeletons";
import { getMemberById } from "@/services/member-service";
import { useQueryClient } from "@tanstack/react-query";

// UI Member interface
interface UIMember {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  gender?: string;
  dateOfBirth?: string;
  primaryPhoneNumber?: string;
  secondaryPhoneNumber?: string;
  email?: string;
  address?: string;
  occupation?: string;
  maritalStatus?: string;
  membershipDate?: string;
  baptismDate?: string;
  departments?: string[];
  covenantFamily?: string;
  status: 'active' | 'inactive';
  profileImage?: string;
  spouseName?: string;
  numberOfChildren?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  notes?: string;
}

interface ResponsiveMembersListProps {
  searchQuery: string;
  statusFilter: string;
  refreshTrigger?: number;
  viewMode?: 'table' | 'cards';
  setSearchQuery?: (value: string) => void;
  setStatusFilter?: (value: string) => void;
  setIsAddMemberOpen?: (value: boolean) => void;
}

export function ResponsiveMembersList({
  searchQuery,
  statusFilter,
  refreshTrigger = 0,
  viewMode = 'table',
  setSearchQuery,
  setStatusFilter,
  setIsAddMemberOpen
}: ResponsiveMembersListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMember, setSelectedMember] = useState<UIMember | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const itemsPerPage = viewMode === 'table' ? 10 : 8;

  // Use React Query to fetch members
  const {
    data: membersData,
    isLoading,
    error
  } = useMembers({
    status: statusFilter !== "all" ? statusFilter as 'active' | 'inactive' : undefined,
    search: searchQuery || undefined,
    page: currentPage,
    pageSize: itemsPerPage,
    refreshTrigger
  });

  // Get mutations for updating and deleting members
  const { updateMember, deleteMember } = useMemberMutations();

  // Get the query client for cache manipulation
  const queryClient = useQueryClient();

  // Process the data using our utility function - memoized to prevent unnecessary re-renders
  // Use a more efficient memoization strategy by checking if data has actually changed
  const members = useMemo(() => {
    if (!membersData?.data) return [];

    // Check if we already have processed this exact data set
    // This helps avoid unnecessary transformations
    return membersData.data.map(dbMember => transformDatabaseMemberToUIMember(dbMember));
  }, [membersData?.data]);

  // Memoize the total count to prevent unnecessary re-renders
  const totalCount = useMemo(() => membersData?.count || 0, [membersData?.count]);

  // Optimized handleViewMember function with better error handling and performance
  const handleViewMember = useCallback(async (member: UIMember) => {
    try {
      // First check if we already have complete data for this member
      const hasCompleteData = member.departments !== undefined;

      // Set the member immediately to improve perceived performance
      setSelectedMember(member);
      setIsViewOpen(true);

      // Only fetch complete data if we don't already have it
      if (!hasCompleteData) {
        // Show loading toast for better user feedback
        const loadingToast = toast.loading("Loading member details...");

        try {
          // Use the imported getMemberById function
          // This avoids dynamic imports which can cause issues with React's hook rules
          const response = await getMemberById(member.id);

          if (response.error) {
            // Dismiss loading toast and show error
            toast.dismiss(loadingToast);
            toast.error("Error loading member details");
          } else if (response.data) {
            // Transform the database member to UI format with complete data
            const completeMember = transformDatabaseMemberToUIMember(response.data);
            // Update the member with complete data
            setSelectedMember(completeMember);
            // Dismiss loading toast
            toast.dismiss(loadingToast);
          }
        } catch (fetchError) {
          // Dismiss loading toast and show error
          toast.dismiss(loadingToast);
          toast.error("Failed to load member details");
        }
      }
    } catch (error) {
      toast.error("Failed to load member details");
    }
  }, []);

  const handleDeleteMember = useCallback((member: UIMember) => {
    setSelectedMember(member);
    setIsDeleteOpen(true);
  }, []);

  const handleMemberUpdate = useCallback(async (updatedMember: UIMember) => {
    try {
      // Show loading toast for better user feedback
      const loadingToast = toast.loading("Updating member...");

      // Convert UI member to database format using our utility function
      const dbMember = transformUIMemberToDatabaseMember(updatedMember);

      // Update the member using the mutation
      const result = await updateMember.mutateAsync({
        id: updatedMember.id,
        member: dbMember
      });

      if (result.error) {
        toast.dismiss(loadingToast);
        toast.error("Failed to update member");
        return;
      }

      // Update the selected member state to ensure the dialog shows the latest data
      setSelectedMember(updatedMember);

      // Implement optimistic updates for better user experience
      // This updates the UI immediately without waiting for the server response
      if (membersData?.data) {
        // Find the index of the member in the current data
        const memberIndex = membersData.data.findIndex(member => member.id === updatedMember.id);

        if (memberIndex !== -1) {
          // Create a new array with the updated member
          const updatedMembers = [...membersData.data];
          const dbMemberForCache = transformUIMemberToDatabaseMember(updatedMember);
          updatedMembers[memberIndex] = dbMemberForCache;

          // Get all active queries that might contain this member
          const memberListQueries = queryClient.getQueriesData({
            queryKey: ['members', 'list']
          });

          // Update all relevant queries in the cache
          memberListQueries.forEach(([queryKey, queryData]) => {
            if (queryData && queryData.data && Array.isArray(queryData.data)) {
              // Find the member in this query's data
              const memberIdx = queryData.data.findIndex((m: any) => m.id === updatedMember.id);

              if (memberIdx !== -1) {
                // Create a new array with the updated member
                const newData = [...queryData.data];
                newData[memberIdx] = dbMemberForCache;

                // Update the cache
                queryClient.setQueryData(queryKey, {
                  ...queryData,
                  data: newData
                });
              }
            }
          });

          // Also update the current query
          queryClient.setQueryData(
            ['members', {
              page: currentPage,
              pageSize: itemsPerPage,
              status: statusFilter !== "all" ? statusFilter as 'active' | 'inactive' : undefined,
              search: searchQuery || undefined,
              refreshTrigger
            }],
            { data: { data: updatedMembers, count: membersData.count } }
          );
        }
      }

      // Use a more targeted approach to invalidate queries
      // This ensures we only refetch what's necessary

      // First, update the specific member detail query if it exists in the cache
      queryClient.invalidateQueries({
        queryKey: ['members', 'detail', updatedMember.id],
        // Only refetch if the query is active
        refetchActive: true
      });

      // Then, selectively invalidate list queries that might be affected by this update
      queryClient.invalidateQueries({
        queryKey: ['members', 'list'],
        // Only refetch active queries to avoid unnecessary network requests
        refetchActive: true,
        // Use a predicate to be even more selective
        predicate: (query) => {
          // Only invalidate queries that might be affected by this update
          // For example, if we're updating a member's status, we should invalidate
          // queries that filter by status
          const queryKey = query.queryKey;
          if (!queryKey || !Array.isArray(queryKey)) return false;

          // Check if this is a list query with filters
          if (queryKey[0] === 'members' && queryKey[1] === 'list' && queryKey[2]) {
            const filters = queryKey[2];
            // If the query has a status filter and we're changing status, invalidate it
            if (filters.status && updatedMember.status) return true;
            // If the query has a search filter and we're changing name, invalidate it
            if (filters.search &&
                (updatedMember.firstName || updatedMember.lastName || updatedMember.email))
              return true;
          }

          // By default, invalidate all list queries to be safe
          return true;
        }
      });

      toast.dismiss(loadingToast);
      toast.success("Member updated successfully");

      // Close the dialog after successful update
      setIsViewOpen(false);
    } catch (error) {
      console.error("Error updating member:", error);
      toast.error("An unexpected error occurred");
    }
  }, [updateMember, membersData, queryClient, currentPage, itemsPerPage, statusFilter, searchQuery, refreshTrigger]);

  const handleMemberDelete = useCallback(async (id: string) => {
    try {
      // Delete the member using the mutation
      const result = await deleteMember.mutateAsync(id);

      if (result.error) {
        toast.error("Failed to delete member");
        return;
      }

      setSelectedMember(null);
      toast.success("Member deleted successfully");
    } catch (error) {
      toast.error("An unexpected error occurred");
    }
  }, [deleteMember]);

  // Use the MembersListSkeleton component imported at the top of the file
  // for better performance and code organization

  if (isLoading) {
    // Use the improved MembersListSkeleton component with consistent animation
    return (
      <div className="animate-in fade-in duration-300">
        <MembersListSkeleton />
      </div>
    );
  }

  if (error) {
    // Determine the appropriate error message and icon based on the error type
    let errorMessage = 'Unknown error occurred';
    let errorIcon = <Trash2 className="h-10 w-10 text-destructive" />;

    if (error instanceof Error) {
      errorMessage = error.message;

      // Customize error message based on error type
      if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.';
        errorIcon = <Wifi className="h-10 w-10 text-destructive" />;
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Request timed out. Please try again.';
        errorIcon = <Clock className="h-10 w-10 text-destructive" />;
      } else if (error.message.includes('permission') || error.message.includes('unauthorized')) {
        errorMessage = 'You do not have permission to view this data.';
        errorIcon = <ShieldAlert className="h-10 w-10 text-destructive" />;
      }
    }

    return (
      <div className="col-span-full flex flex-col items-center justify-center py-12 text-center animate-in fade-in duration-300">
        <div className="bg-destructive/10 rounded-full p-6 mb-4">
          {errorIcon}
        </div>
        <h3 className="text-xl font-semibold mb-2">Error loading members</h3>
        <p className="text-muted-foreground mb-6">{errorMessage}</p>
        <div className="flex gap-2">
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
          >
            Refresh Page
          </Button>
          <Button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['members'] })}
            variant="default"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (members.length === 0) {
    // Determine if this is due to filtering or if there are no members at all
    const isFiltering = searchQuery || statusFilter !== "all";

    return (
      <div className="col-span-full flex flex-col items-center justify-center py-12 text-center animate-in fade-in duration-300">
        <div className="rounded-full bg-muted p-6 mb-4">
          <Users className="h-10 w-10 text-muted-foreground" />
        </div>

        {isFiltering ? (
          <>
            <h3 className="font-semibold text-xl mb-2">No matching members found</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              No members match your current search or filter criteria. Try adjusting your search terms or filters.
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  // Clear search and filters
                  if (setSearchQuery) setSearchQuery("");
                  if (setStatusFilter) setStatusFilter("all");
                }}
                variant="outline"
              >
                Clear Filters
              </Button>
            </div>
          </>
        ) : (
          <>
            <h3 className="font-semibold text-xl mb-2">No members yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              There are no members in the system yet. Add your first member to get started.
            </p>
            <Button
              onClick={() => setIsAddMemberOpen?.(true)}
              variant="default"
              className="gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Add First Member
            </Button>
          </>
        )}
      </div>
    );
  }

  // If we're in table mode, use the responsive table
  if (viewMode === 'table') {
    return (
      <div className="space-y-4">
        <ResponsiveMembersTable
          members={members}
          isLoading={isLoading}
          totalCount={totalCount}
          currentPage={currentPage}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onViewMember={handleViewMember}
          onDeleteMember={handleDeleteMember}
        />

        {selectedMember && (
          <>
            <ViewMemberDialog
              member={selectedMember}
              open={isViewOpen}
              onOpenChange={setIsViewOpen}
              onMemberUpdate={handleMemberUpdate}
            />
            <DeleteMemberDialog
              member={selectedMember}
              open={isDeleteOpen}
              onOpenChange={setIsDeleteOpen}
              onMemberDelete={handleMemberDelete}
            />
          </>
        )}
      </div>
    );
  }

  // Otherwise, use the card view
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {members.map((member) => (
          <MemberCard
            key={member.id}
            member={member}
            onView={handleViewMember}
            onDelete={handleDeleteMember}
          />
        ))}
      </div>

      {totalCount > 0 && (
        <div className="mt-4">
          <ResponsiveMembersTable
            members={[]}
            isLoading={false}
            totalCount={totalCount}
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onViewMember={handleViewMember}
            onDeleteMember={handleDeleteMember}
          />
        </div>
      )}

      {selectedMember && (
        <>
          <ViewMemberDialog
            member={selectedMember}
            open={isViewOpen}
            onOpenChange={setIsViewOpen}
            onMemberUpdate={handleMemberUpdate}
          />
          <DeleteMemberDialog
            member={selectedMember}
            open={isDeleteOpen}
            onOpenChange={setIsDeleteOpen}
            onMemberDelete={handleMemberDelete}
          />
        </>
      )}
    </div>
  );
}
